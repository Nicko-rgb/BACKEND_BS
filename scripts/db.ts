#!/usr/bin/env node

/**
 * scripts/db.ts
 * CLI para gestión de base de datos — migraciones, seeders y utilidades.
 *
 * Uso:
 *   tsx scripts/db.ts migrate              — Ejecuta migraciones pendientes
 *   tsx scripts/db.ts migrate:status       — Muestra estado de migraciones
 *   tsx scripts/db.ts migrate:rollback     — Revierte el último batch
 *   tsx scripts/db.ts migrate:create       — Genera archivo de migración
 *   tsx scripts/db.ts seed                 — Ejecuta seeders pendientes
 *   tsx scripts/db.ts seed:status          — Muestra estado de seeders
 *   tsx scripts/db.ts seed:create          — Genera archivo de seeder
 *   tsx scripts/db.ts db:setup             — migrate + seed en secuencia
 *   tsx scripts/db.ts db:create            — Crea la BD si no existe, luego migrate + seed
 *   tsx scripts/db.ts db:reset             — Elimina TODO, re-migra y re-siembra (solo desarrollo)
 *
 * Opciones:
 *   --module=<nombre>    Módulo destino (para migrate:create / seed:create)
 *   --name=<descripcion> Nombre descriptivo (para migrate:create / seed:create)
 *   --batch=<numero>     Batch específico (para migrate:rollback)
 *   --force              Saltar confirmación de db:reset
 */
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ─── Rutas base ─────────────────────────────────────────────────────────────
const ROOT_DIR = path.join(__dirname, '..');

// ─── Parseo de argumentos ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const command = args[0];

/**
 * Extrae el valor de un flag --key=value de los argumentos
 */
function getFlag(key: string): string | null {
    const arg = args.find(a => a.startsWith(`--${key}=`));
    return arg ? arg.split('=')[1] : null;
}

// Verifica si un flag booleano está presente (--force) ───────────────────────
function hasFlag(key: string): boolean {
    return args.includes(`--${key}`);
}

// ─── Confirmación interactiva ───────────────────────────────────────────────

/**
 * Solicita confirmación al usuario vía stdin.
 */
function confirm(message: string): Promise<boolean> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(`${message} (y/N): `, answer => {
            rl.close();
            resolve(answer.trim().toLowerCase() === 'y');
        });
    });
}

// ─── Comando: migrate:create ────────────────────────────────────────────────

/**
 * Genera un archivo de migración con boilerplate en el módulo indicado.
 * Uso: npm run migrate:create <modulo> <nombre>
 * Nombrado automático: NNN_<nombre>.ts, donde NNN = siguiente meta.order global
 * (el más alto de todo el árbol de migraciones + 1). El orden de ejecución lo
 * define meta.order, no la carpeta ni la fecha — ver scripts/migrationRunner.ts.
 */
async function createMigration(): Promise<void> {
    // Argumentos posicionales: migrate:create <modulo> <nombre> ───────────────
    const moduleName = args[1];
    const migrationName = args[2];
    const { discoverModuleNames } = await import('./discoverModules');

    if (!moduleName || !migrationName) {
        console.error('❌ Uso: npm run migrate:create <modulo> <nombre>');
        console.error(`   Módulos existentes: ${discoverModuleNames().join(', ')}`);
        console.error('   Ejemplo: npm run migrate:create booking add_recurring_fields');
        process.exit(1);
    }

    // Verificar que el directorio del módulo existe ──────────────────────────
    const modulesDir = path.join(ROOT_DIR, 'src', 'modules');
    const moduleDir = path.join(modulesDir, moduleName);

    if (!fs.existsSync(moduleDir)) {
        console.error(`❌ Directorio del módulo no encontrado: src/modules/${moduleName}/`);
        console.error(`   Módulos existentes: ${discoverModuleNames().join(', ')}`);
        console.error('   Si es un módulo nuevo, creá primero su carpeta en src/modules/.');
        process.exit(1);
    }

    // Crear directorio de migraciones si no existe ────────────────────────────
    const migrationsDir = path.join(moduleDir, 'database', 'migrations');
    fs.mkdirSync(migrationsDir, { recursive: true });

    // Calcular el siguiente order global (el más alto de TODO el árbol + 1) ───
    // Una migración nueva casi siempre depende de todo lo anterior, así que va al final ──
    const { discoverMigrations } = await import('./migrationRunner');
    const existingMigrations = await discoverMigrations();
    const maxOrder = existingMigrations.reduce((max, m) => Math.max(max, m.order), 0);
    const nextOrder = maxOrder + 1;
    const paddedOrder = String(nextOrder).padStart(3, '0');
    const fileName = `${paddedOrder}_${migrationName}.ts`;

    // Escribir el boilerplate ─────────────────────────────────────────────────
    const template = `/**
 * Migración: ${migrationName}
 * Módulo: ${moduleName}
 * Creada: ${new Date().toISOString()}
 */
import type { QueryInterface, Sequelize, Transaction } from 'sequelize';
import type { MigrationFile } from '../../../../../scripts/migrationRunner';

const migration: MigrationFile = {
    meta: {
        description: '${migrationName.replace(/_/g, ' ')}',
        module: '${moduleName}',
        order: ${nextOrder}
    },

    async up(queryInterface: QueryInterface, sequelize: Sequelize, transaction: Transaction) {
        // TODO: implementar migración
    },

    async down(queryInterface: QueryInterface, sequelize: Sequelize, transaction: Transaction) {
        // TODO: implementar rollback
    }
};

module.exports = migration;
`;

    const filePath = path.join(migrationsDir, fileName);
    fs.writeFileSync(filePath, template, 'utf8');

    const relativePath = path.relative(ROOT_DIR, filePath);
    console.log(`\n✅ Migración creada: ${relativePath}\n`);
}

// ─── Comando: seed:create ───────────────────────────────────────────────────

/**
 * Genera un archivo de seeder con boilerplate en el módulo indicado.
 * Uso: npm run seed:create <modulo> <nombre>
 * Nombrado del archivo: NNN_<nombre>.ts, donde NNN = `order` global (mismo criterio
 * que migrate:create) — el prefijo del archivo y el `order` del SeederConfig son
 * siempre el mismo número, para que el nombre del archivo ya diga en qué posición
 * corre. El `order` de un seeder depende de sus dependencias de DATOS con otros
 * seeders (ej. necesita el systemUserId, o una fila que crea otro seed) — nunca del
 * `order` de ninguna migración, son dos numeraciones independientes.
 */
async function createSeed(): Promise<void> {
    // Argumentos posicionales: seed:create <modulo> <nombre> ──────────────────
    const moduleName = args[1];
    const seedFileName = args[2];
    const { discoverModuleNames } = await import('./discoverModules');

    if (!moduleName || !seedFileName) {
        console.error('❌ Uso: npm run seed:create <modulo> <nombre>');
        console.error(`   Módulos existentes: ${discoverModuleNames().join(', ')}`);
        console.error('   Ejemplo: npm run seed:create system permission_catalog');
        process.exit(1);
    }

    // Verificar que el directorio del módulo existe ──────────────────────────
    const modulesDir = path.join(ROOT_DIR, 'src', 'modules');
    const moduleDir = path.join(modulesDir, moduleName);

    if (!fs.existsSync(moduleDir)) {
        console.error(`❌ Directorio del módulo no encontrado: src/modules/${moduleName}/`);
        console.error(`   Módulos existentes: ${discoverModuleNames().join(', ')}`);
        console.error('   Si es un módulo nuevo, creá primero su carpeta en src/modules/.');
        process.exit(1);
    }

    // Crear directorio de seeders si no existe ───────────────────────────────
    const seedersDir = path.join(moduleDir, 'database', 'seeders');
    fs.mkdirSync(seedersDir, { recursive: true });

    // Order global siguiente (el más alto de TODO el árbol de seeders + 1) — se usa
    // tanto para el prefijo del archivo como para `order` en el SeederConfig. Ajustar
    // a mano el `order` generado si este seed depende de datos de otro seed que no sea
    // necesariamente el último (ver 006_country.ts: depende de systemUserSeed, no del
    // último seed creado) — ahí también hay que renombrar el archivo para que siga
    // coincidiendo con el `order` final.
    const { discoverSeeders } = await import('./seederRunner');
    const existingSeeders = discoverSeeders();
    const maxOrder = existingSeeders.reduce((max, s) => Math.max(max, s.config.order || 0), 0);
    const nextOrder = maxOrder + 1;
    const paddedOrder = String(nextOrder).padStart(3, '0');
    const fileName = `${paddedOrder}_${seedFileName}.ts`;

    // seedName: camelCase + sufijo Seed (ej. permission_catalog -> permissionCatalogSeed) ─
    const seedName = seedFileName
        .split('_')
        .map((part, i) => (i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join('') + 'Seed';

    // Escribir el boilerplate ─────────────────────────────────────────────────
    const template = `/**
 * Seed: ${seedFileName.replace(/_/g, ' ')}
 * Módulo: ${moduleName}
 * Creado: ${new Date().toISOString()}
 */
import type { SeederConfig } from '../../../../../scripts/seederRunner';

const seedFn = async (): Promise<void> => {
    // TODO: implementar seed
};

const config: SeederConfig = {
    seedName: '${seedName}',
    seedFn,
    environment: 'essential', // 'essential' corre siempre | 'demo' se salta en producción
    order: ${nextOrder}, // ajustar a mano según de qué otros seeds dependa esta data — si cambia, renombrar el archivo para que el prefijo siga coincidiendo
};

module.exports = config;
`;

    const filePath = path.join(seedersDir, fileName);
    fs.writeFileSync(filePath, template, 'utf8');

    const relativePath = path.relative(ROOT_DIR, filePath);
    console.log(`\n✅ Seeder creado: ${relativePath}\n`);
}

// ─── Helpers: conexión a postgres para crear BD ─────────────────────────────

/**
 * Crea la base de datos si no existe, conectándose primero a 'postgres' (BD por defecto).
 * Retorna true si la creó, false si ya existía.
 */
async function ensureDatabaseExists(): Promise<boolean> {
    const { Client } = require('pg');
    const dbName = process.env.DB_NAME || 'db_sport';

    // Conectar a la BD por defecto de Postgres, no a la BD objetivo ────────────
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'postgres',
    });

    await client.connect();

    try {
        // Verificar si ya existe ──────────────────────────────────────────────
        const res = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [dbName]
        );

        if (res.rowCount === 0) {
            // CREATE DATABASE no admite prepared statements, usar identifiers seguros
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`✅ Base de datos '${dbName}' creada.`);
            return true;
        }

        console.log(`ℹ️  Base de datos '${dbName}' ya existe.`);
        return false;
    } finally {
        await client.end();
    }
}

// ─── Comando: db:create ─────────────────────────────────────────────────────

/**
 * Crea la base de datos si no existe y ejecuta migrate + seed desde cero.
 * Equivale a un onboarding completo para un entorno nuevo.
 */
async function dbCreate(): Promise<void> {
    try {
        console.log('\n🗄️  Verificando base de datos...\n');
        await ensureDatabaseExists();
    } catch (error: any) {
        console.error('❌ No se pudo crear la base de datos:', error.message);
        process.exit(1);
    }

    // Con la BD garantizada, ejecutar setup completo ───────────────────────────
    await dbSetup();
}

// ─── Comando: db:reset ─────────────────────────────────────────────────────

/**
 * Elimina todas las tablas de la base de datos, re-ejecuta migraciones
 * y re-siembra los datos. SOLO para desarrollo — bloqueado en producción.
 */
async function dbReset(): Promise<void> {
    // Bloquear en producción ──────────────────────────────────────────────────
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ db:reset está BLOQUEADO en producción.');
        console.error('   Este comando elimina TODOS los datos de la base de datos.');
        process.exit(1);
    }

    // Confirmación interactiva (saltable con --force) ─────────────────────────
    if (!hasFlag('force')) {
        console.log('\n⚠️  ADVERTENCIA: Este comando va a:');
        console.log('   1. Crear la base de datos si no existe');
        console.log('   2. Eliminar TODAS las tablas existentes');
        console.log('   3. Re-ejecutar TODAS las migraciones');
        console.log('   4. Re-ejecutar TODOS los seeders\n');
        console.log(`   Base de datos: ${process.env.DB_NAME || 'desconocida'}`);
        console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}\n`);

        const confirmed = await confirm('¿Estás seguro?');
        if (!confirmed) {
            console.log('   Cancelado.');
            process.exit(0);
        }
    }

    // Garantizar que la BD existe antes de intentar limpiarla ─────────────────
    try {
        console.log('\n🗄️  Verificando base de datos...\n');
        await ensureDatabaseExists();
    } catch (error: any) {
        console.error('❌ No se pudo crear la base de datos:', error.message);
        process.exit(1);
    }

    const sequelize = require('../src/config/db').default;

    try {
        console.log('\n🗑️  Eliminando todas las tablas...\n');

        // Desactivar restricciones FK para poder eliminar en cualquier orden ──
        await sequelize.query('SET session_replication_role = replica;');

        // Obtener todas las tablas del schema public ─────────────────────────
        const [tables] = await sequelize.query(
            `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
        );

        if (tables.length === 0) {
            console.log('   No hay tablas para eliminar.');
        } else {
            // Eliminar cada tabla ─────────────────────────────────────────────
            for (const { tablename } of tables) {
                await sequelize.query(`DROP TABLE IF EXISTS "public"."${tablename}" CASCADE`);
                console.log(`   🗑️  Eliminada: ${tablename}`);
            }
            console.log(`\n   ✅ ${tables.length} tabla(s) eliminada(s)`);
        }

        // Restaurar restricciones FK ─────────────────────────────────────────
        await sequelize.query('SET session_replication_role = DEFAULT;');

        // Re-ejecutar migraciones ─────────────────────────────────────────────
        console.log('\n📦 Re-ejecutando migraciones...\n');
        const { runPendingMigrations } = await import('./migrationRunner');
        const migrateResult = await runPendingMigrations();

        if (migrateResult.failed) {
            console.error(`\n❌ Migración falló: ${migrateResult.failed}`);
            process.exit(1);
        }

        // Re-ejecutar seeders ─────────────────────────────────────────────────
        console.log('\n🌱 Re-ejecutando seeders...\n');
        const { runAllSeeds } = await import('./seederRunner');
        await runAllSeeds();

        console.log('\n🎉 Base de datos reseteada exitosamente.\n');

    } catch (error: any) {
        console.error('\n❌ Error durante db:reset:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// ─── Comando: db:setup ──────────────────────────────────────────────────────

/**
 * Ejecuta migraciones pendientes y luego seeders. Atajo para configuración inicial.
 */
async function dbSetup(): Promise<void> {
    const sequelize = require('../src/config/db').default;

    try {
        await sequelize.authenticate();
    } catch (error: any) {
        console.error('❌ No se pudo conectar a la base de datos:', error.message);
        process.exit(1);
    }

    try {
        // Migraciones ─────────────────────────────────────────────────────────
        console.log('\n📦 Ejecutando migraciones pendientes...\n');
        const { runPendingMigrations } = await import('./migrationRunner');
        const result = await runPendingMigrations();

        if (result.failed) {
            console.error(`\n❌ Migración falló: ${result.failed}`);
            process.exit(1);
        }

        // Seeders ─────────────────────────────────────────────────────────────
        console.log('\n🌱 Ejecutando seeders pendientes...\n');
        const { runAllSeeds } = await import('./seederRunner');
        await runAllSeeds();

        console.log('\n🎉 Base de datos configurada exitosamente.\n');

    } catch (error: any) {
        console.error('\n❌ Error durante db:setup:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// ─── Mostrar ayuda ──────────────────────────────────────────────────────────

function showHelp(): void {
    console.log(`
📚 CLI de Base de Datos — Comandos disponibles:

  Migraciones:
    migrate              Ejecuta migraciones pendientes
    migrate:status       Muestra estado de todas las migraciones
    migrate:rollback     Revierte el último batch (--batch=N para uno específico)
    migrate:create       Genera archivo de migración (<modulo> <nombre>)

  Seeders:
    seed                 Ejecuta seeders pendientes
    seed:status          Muestra estado de todos los seeders
    seed:create          Genera archivo de seeder (<modulo> <nombre>)

  Utilidades:
    db:create            Crea la BD si no existe, luego migrate + seed (entorno nuevo)
    db:setup             Ejecuta migrate + seed en secuencia (BD ya existente)
    db:reset             Elimina TODO, re-migra y re-siembra (solo desarrollo)
                         Usa --force para saltar confirmación

  Ejemplos:
    npm run migrate
    npm run migrate:create booking add_recurring_fields
    npm run migrate:rollback -- --batch=3
    npm run seed:create system permission_catalog
    npm run db:create
    npm run db:reset
    npm run db:reset -- --force
`);
}

// ─── Dispatcher principal ───────────────────────────────────────────────────

async function main(): Promise<void> {
    // Comandos que no necesitan conexión a la DB ──────────────────────────────
    if (command === 'migrate:create') {
        await createMigration();
        return;
    }

    if (command === 'seed:create') {
        await createSeed();
        return;
    }

    if (!command || command === 'help' || command === '--help') {
        showHelp();
        return;
    }

    // db:create maneja su propia conexión ────────────────────────────────────
    if (command === 'db:create') {
        await dbCreate();
        return;
    }

    // db:reset maneja su propia conexión ──────────────────────────────────────
    if (command === 'db:reset') {
        await dbReset();
        return;
    }

    // db:setup maneja su propia conexión ──────────────────────────────────────
    if (command === 'db:setup') {
        await dbSetup();
        return;
    }

    // Los demás comandos necesitan conexión compartida ────────────────────────
    const sequelize = require('../src/config/db').default;

    try {
        await sequelize.authenticate();
    } catch (error: any) {
        console.error('❌ No se pudo conectar a la base de datos:', error.message);
        process.exit(1);
    }

    try {
        switch (command) {
            // ── Migraciones ─────────────────────────────────────────────────
            case 'migrate': {
                const { runPendingMigrations } = await import('./migrationRunner');
                const result = await runPendingMigrations();
                if (result.failed) process.exitCode = 1;
                break;
            }

            case 'migrate:status': {
                const { getMigrationStatus } = await import('./migrationRunner');
                await getMigrationStatus();
                break;
            }

            case 'migrate:rollback': {
                // Bloquear en producción — el rollback puede eliminar columnas o tablas ──
                if (process.env.NODE_ENV === 'production') {
                    console.error('❌ migrate:rollback está BLOQUEADO en producción.');
                    console.error('   Crea una migración forward para revertir cambios de forma segura.');
                    process.exitCode = 1;
                    break;
                }
                const { rollbackBatch } = await import('./migrationRunner');
                const batchFlag = getFlag('batch');
                const batch = batchFlag ? parseInt(batchFlag, 10) : null;
                await rollbackBatch(batch);
                break;
            }

            // ── Seeders ─────────────────────────────────────────────────────
            case 'seed': {
                const { runAllSeeds } = await import('./seederRunner');
                await runAllSeeds();
                break;
            }

            case 'seed:status': {
                const { getSeederStatus } = await import('./seederRunner');
                await getSeederStatus();
                break;
            }

            // ── Comando no reconocido ───────────────────────────────────────
            default:
                console.error(`❌ Comando no reconocido: '${command}'`);
                showHelp();
                process.exitCode = 1;
        }
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

main();
