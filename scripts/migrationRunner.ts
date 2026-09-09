/**
 * migrationRunner.ts
 * Motor principal de migraciones — descubre, ordena y ejecuta archivos
 * de migración distribuidos por módulo.
 *
 * Flujo:
 *   1. Descubrir dinámicamente los módulos en src/modules/ (discoverModules.ts)
 *   2. Por cada módulo, glob de archivos .ts en database/migrations/
 *   3. Ordenar GLOBALMENTE por meta.order (mismo patrón que seederRunner.ts con config.order) —
 *      la carpeta donde vive el archivo ya no determina el orden de ejecución
 *   4. Filtrar las ya aplicadas (consultando dsg_bss_migration_meta)
 *   5. Ejecutar las pendientes en transacciones individuales
 *
 * Reglas:
 *   - Nunca importar modelos de la app dentro de migraciones
 *   - Cada migración se ejecuta en su propia transacción
 *   - Si una migración falla, las siguientes NO se ejecutan
 *   - Toda migración DEBE declarar meta.order (número) — sin eso, discoverMigrations() lanza error
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { QueryInterface, Sequelize, Transaction } from 'sequelize';
import sequelize from '../src/config/db';
import { MigrationMeta } from '../src/modules/system/database/models/MigrationMeta';
import { discoverModuleNames } from './discoverModules';

// Ruta base a los módulos ─────────────────────────────────────────────────────
const MODULES_DIR = path.join(__dirname, '..', 'src', 'modules');

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MigrationMetaDescriptor {
    description: string;
    module: string;
    order: number;
}

export interface MigrationFile {
    meta: MigrationMetaDescriptor;
    up: (queryInterface: QueryInterface, sequelize: Sequelize, transaction: Transaction) => Promise<void>;
    down?: (queryInterface: QueryInterface, sequelize: Sequelize, transaction: Transaction) => Promise<void>;
}

export interface DiscoveredMigration {
    name: string;
    module: string;
    filePath: string;
    order: number;
}

// ─── Funciones auxiliares ────────────────────────────────────────────────────

/**
 * Calcula SHA-256 del contenido de un archivo
 */
function computeChecksum(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Formatea milisegundos en formato legible (ej: "1.2s", "345ms")
 */
function formatTime(ms: number): string {
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

/**
 * Quita la extensión (.js o .ts) del nombre de una migración.
 * El tracking en dsg_bss_migration_meta identifica cada migración por este
 * nombre base — así una migración registrada como "012_baseline_user.js"
 * (corrida antes en JS) sigue reconociéndose como aplicada aunque el archivo
 * hoy sea "012_baseline_user.ts", sin importar qué runtime la ejecutó.
 */
function stripExt(name: string): string {
    return name.replace(/\.(js|ts)$/, '');
}

// ─── Descubrimiento de migraciones ──────────────────────────────────────────

/**
 * Descubre todas las migraciones disponibles y las ordena globalmente por
 * `meta.order` — el mismo patrón que usa seederRunner.ts con `config.order`.
 * Qué carpetas escanear se resuelve dinámicamente (discoverModuleNames);
 * el orden de ejecución no depende de la carpeta, así cada migración puede
 * vivir en la carpeta del módulo de su modelo sin importar de qué otras
 * tablas dependa.
 */
export async function discoverMigrations(): Promise<DiscoveredMigration[]> {
    const migrations: DiscoveredMigration[] = [];

    for (const moduleName of discoverModuleNames()) {
        const migrationsDir = path.join(MODULES_DIR, moduleName, 'database', 'migrations');

        // Si el módulo no tiene directorio de migraciones, saltar ─────────────
        if (!fs.existsSync(migrationsDir)) continue;

        // Orden alfabético dentro de la carpeta — solo desempata si dos
        // migraciones tuvieran el mismo `order` (no debería pasar) ───────────
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.ts'))
            .sort();

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const { meta }: MigrationFile = require(filePath);

            if (!meta || typeof meta.order !== 'number') {
                throw new Error(
                    `Migración sin "meta.order" válido: ${moduleName}/${file}. ` +
                    `Toda migración debe declarar meta.order (número) para participar del orden global de ejecución.`
                );
            }

            migrations.push({
                name: stripExt(file),
                module: moduleName,
                filePath,
                order: meta.order
            });
        }
    }

    // Orden global explícito por dependencia — desacopla carpeta de ejecución ──
    migrations.sort((a, b) => a.order - b.order);

    return migrations;
}

// ─── Ejecución de migraciones pendientes ────────────────────────────────────

export interface RunPendingMigrationsResult {
    pending: number;
    applied: number;
    failed: string | null;
}

/**
 * Ejecuta todas las migraciones pendientes en orden.
 * Cada migración corre dentro de su propia transacción PostgreSQL.
 */
export async function runPendingMigrations(): Promise<RunPendingMigrationsResult> {
    // Garantizar que la tabla de tracking exista ──────────────────────────────
    await MigrationMeta.sync({ force: false });

    // Obtener migraciones ya aplicadas ────────────────────────────────────────
    const appliedRows = await MigrationMeta.findAll({
        where: { status: 'applied' },
        attributes: ['migration_name']
    });
    const appliedSet = new Set(appliedRows.map(r => stripExt(r.migration_name)));

    // Descubrir todas las migraciones disponibles ─────────────────────────────
    const allMigrations = await discoverMigrations();

    // Filtrar las pendientes ──────────────────────────────────────────────────
    const pending = allMigrations.filter(m => !appliedSet.has(m.name));

    if (pending.length === 0) {
        console.log('  ✅ No hay migraciones pendientes');
        return { pending: 0, applied: 0, failed: null };
    }

    // Calcular siguiente batch ────────────────────────────────────────────────
    const maxBatchResult = await MigrationMeta.max('batch') as number | null;
    const nextBatch = (maxBatchResult || 0) + 1;

    console.log(`\n📦 Batch #${nextBatch} — ${pending.length} migración(es) pendiente(s)\n`);

    // Ejecutar cada migración en su propia transacción ────────────────────────
    let appliedCount = 0;
    const queryInterface = sequelize.getQueryInterface();

    for (const migration of pending) {
        const transaction = await sequelize.transaction();
        const startTime = Date.now();

        try {
            // Cargar el archivo de migración ─────────────────────────────────
            const migrationFile: MigrationFile = require(migration.filePath);

            // Calcular checksum ──────────────────────────────────────────────
            const checksum = computeChecksum(migration.filePath);

            // Ejecutar up() ──────────────────────────────────────────────────
            console.log(`  ⏳ [${migration.module}] ${migration.name}...`);
            await migrationFile.up(queryInterface, sequelize, transaction);

            const executionTime = Date.now() - startTime;

            // Registrar en la tabla de tracking ──────────────────────────────
            await MigrationMeta.create({
                migration_name: migration.name,
                module: migration.module,
                batch: nextBatch,
                checksum,
                executed_at: new Date(),
                status: 'applied',
                execution_time_ms: executionTime
            }, { transaction });

            await transaction.commit();
            appliedCount++;
            console.log(`  ✅ [${migration.module}] ${migration.name} (${formatTime(executionTime)})`);

        } catch (error: any) {
            await transaction.rollback();
            console.error(`\n  ❌ [${migration.module}] ${migration.name} — FALLÓ`);
            console.error(`     Error: ${error.message}\n`);
            return { pending: pending.length, applied: appliedCount, failed: migration.name };
        }
    }

    console.log(`\n✅ Batch #${nextBatch} completo — ${appliedCount} migración(es) aplicada(s)\n`);
    return { pending: pending.length, applied: appliedCount, failed: null };
}

// ─── Estado de migraciones ──────────────────────────────────────────────────

export interface MigrationStatusResult {
    total: number;
    applied: number;
    pending: number;
    modified: number;
}

/**
 * Muestra el estado de todas las migraciones descubiertas.
 * Indica cuáles están aplicadas, pendientes o tienen checksum modificado.
 */
export async function getMigrationStatus(): Promise<MigrationStatusResult> {
    // Garantizar que la tabla de tracking exista ──────────────────────────────
    await MigrationMeta.sync({ force: false });

    // Obtener migraciones aplicadas con su checksum ──────────────────────────
    const appliedRows = await MigrationMeta.findAll({
        where: { status: 'applied' },
        order: [['batch', 'ASC'], ['id', 'ASC']]
    });
    const appliedMap = new Map(appliedRows.map(r => [stripExt(r.migration_name), r]));

    // Descubrir todas las migraciones ─────────────────────────────────────────
    const allMigrations = await discoverMigrations();

    if (allMigrations.length === 0) {
        console.log('  No se encontraron archivos de migración.');
        return { total: 0, applied: 0, pending: 0, modified: 0 };
    }

    // Mostrar estado ─────────────────────────────────────────────────────────
    let pendingCount = 0;
    let modifiedCount = 0;
    let currentModule = '';

    console.log('\n📋 Estado de migraciones:\n');

    for (const migration of allMigrations) {
        // Encabezado por módulo ───────────────────────────────────────────────
        if (migration.module !== currentModule) {
            currentModule = migration.module;
            console.log(`  ── ${currentModule} ${'─'.repeat(50 - currentModule.length)}`);
        }

        const applied = appliedMap.get(migration.name);

        if (applied) {
            // Verificar checksum ─────────────────────────────────────────────
            const currentChecksum = computeChecksum(migration.filePath);
            const modified = currentChecksum !== applied.checksum;

            if (modified) {
                modifiedCount++;
                console.log(`  ⚠️  ${migration.name}  [Batch #${applied.batch}] — MODIFICADO después de aplicar`);
            } else {
                const date = new Date(applied.executed_at).toISOString().split('T')[0];
                console.log(`  ✅ ${migration.name}  [Batch #${applied.batch}, ${date}]`);
            }
        } else {
            pendingCount++;
            console.log(`  ⏳ ${migration.name}  — PENDIENTE`);
        }
    }

    // Resumen ─────────────────────────────────────────────────────────────────
    const appliedCount = appliedMap.size;
    console.log(`\n  Total: ${allMigrations.length} | Aplicadas: ${appliedCount} | Pendientes: ${pendingCount} | Modificadas: ${modifiedCount}\n`);

    return { total: allMigrations.length, applied: appliedCount, pending: pendingCount, modified: modifiedCount };
}

// ─── Rollback ───────────────────────────────────────────────────────────────

export interface RollbackResult {
    rolledBack: number;
}

/**
 * Revierte las migraciones del último batch (o de un batch específico).
 * Ejecuta down() en orden inverso y marca las migraciones como 'rolled_back'.
 */
export async function rollbackBatch(batchNumber: number | null = null): Promise<RollbackResult> {
    await MigrationMeta.sync({ force: false });

    // Determinar qué batch revertir ──────────────────────────────────────────
    let targetBatch = batchNumber;
    if (!targetBatch) {
        targetBatch = await MigrationMeta.max('batch', { where: { status: 'applied' } }) as number | null;
    }

    if (!targetBatch) {
        console.log('  No hay migraciones para revertir.');
        return { rolledBack: 0 };
    }

    // Obtener migraciones del batch en orden inverso ─────────────────────────
    const batchMigrations = await MigrationMeta.findAll({
        where: { batch: targetBatch, status: 'applied' },
        order: [['id', 'DESC']]
    });

    if (batchMigrations.length === 0) {
        console.log(`  No hay migraciones aplicadas en el batch #${targetBatch}.`);
        return { rolledBack: 0 };
    }

    console.log(`\n🔄 Revirtiendo batch #${targetBatch} — ${batchMigrations.length} migración(es)\n`);

    const queryInterface = sequelize.getQueryInterface();
    let rolledBackCount = 0;

    for (const record of batchMigrations) {
        // Buscar el archivo de migración correspondiente ─────────────────────
        const allMigrations = await discoverMigrations();
        const migration = allMigrations.find(m => m.name === stripExt(record.migration_name));

        if (!migration) {
            console.error(`  ❌ Archivo no encontrado: ${record.migration_name} — no se puede revertir`);
            continue;
        }

        const transaction = await sequelize.transaction();

        try {
            const migrationFile: MigrationFile = require(migration.filePath);

            if (typeof migrationFile.down !== 'function') {
                console.warn(`  ⚠️  [${record.module}] ${record.migration_name} — sin función down(), saltando`);
                await transaction.rollback();
                continue;
            }

            console.log(`  ⏳ Revirtiendo [${record.module}] ${record.migration_name}...`);
            await migrationFile.down(queryInterface, sequelize, transaction);

            // Actualizar estado en la tabla de tracking ───────────────────────
            await record.update({
                status: 'rolled_back',
                rolled_back_at: new Date()
            }, { transaction });

            await transaction.commit();
            rolledBackCount++;
            console.log(`  ✅ Revertido [${record.module}] ${record.migration_name}`);

        } catch (error: any) {
            await transaction.rollback();
            console.error(`  ❌ [${record.module}] ${record.migration_name} — rollback FALLÓ`);
            console.error(`     Error: ${error.message}`);
            break;
        }
    }

    console.log(`\n✅ Rollback completo — ${rolledBackCount} migración(es) revertida(s)\n`);
    return { rolledBack: rolledBackCount };
}
