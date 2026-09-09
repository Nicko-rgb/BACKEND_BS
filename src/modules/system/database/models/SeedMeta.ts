/**
 * SeedMeta - Control de ejecución de seeds.
 *
 * Registra qué seeds ya corrieron en la tabla dsg_bss_seed_meta. Si el
 * nombre del seed ya existe, se salta su ejecución; si no existe, lo
 * ejecuta y lo registra (ver `runOnce` abajo, usado por
 * `scripts/seederRunner.ts`).
 *
 * Su tabla se garantiza con `.sync({ force: false })` en `runOnce` y en
 * `getSeederStatus` —no solo con la migración baseline de este archivo—
 * por la misma razón que MigrationMeta: hace falta poder consultarla antes
 * de poder correr cualquier seed. La migración baseline
 * (`000_baseline_seed_meta.ts`) existe para que quede versionada y visible
 * en `migrate:status`, pero en la práctica siempre encuentra la tabla ya
 * creada por el sync.
 *
 * Para re-ejecutar un seed manualmente:
 *   DELETE FROM dsg_bss_seed_meta WHERE seed_name = 'mySeed';
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';

export class SeedMeta extends Model<InferAttributes<SeedMeta>, InferCreationAttributes<SeedMeta>> {
    declare id: CreationOptional<number>;
    declare seed_name: string;
    declare executed_at: CreationOptional<Date>;
}

SeedMeta.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    seed_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Identificador único del seed — equivale al nombre del archivo'
    },
    executed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha y hora en que el seed fue ejecutado por primera vez'
    }
}, {
    sequelize,
    tableName: 'dsg_bss_seed_meta',
    timestamps: false,
    comment: 'Registro de seeds ejecutados — evita re-ejecuciones duplicadas'
});

/**
 * Ejecuta un seed solo si no fue ejecutado previamente.
 * Silencia console.log durante la ejecución para mantener logs limpios —
 * solo imprime una línea de resultado por seed.
 * console.warn y console.error permanecen activos para no ocultar problemas.
 */
export async function runOnce(seedName: string, seedFn: () => Promise<void>): Promise<void> {
    // Garantizar que la tabla exista antes de consultarla ─────────────────────
    await SeedMeta.sync({ force: false });

    const existing = await SeedMeta.findOne({ where: { seed_name: seedName } });

    if (existing) {
        console.log(`   ⏭️  [${seedName}] ya ejecutado, saltando`);
        return;
    }

    // Silenciar logs y warnings internos del seed ────────────────────────────
    // console.error permanece activo para no ocultar errores reales
    const originalLog = console.log;
    const originalWarn = console.warn;
    console.log = () => {};
    console.warn = () => {};

    try {
        await seedFn();
    } finally {
        // Restaurar siempre, incluso si el seed lanza error ───────────────────
        console.log = originalLog;
        console.warn = originalWarn;
    }

    await SeedMeta.create({ seed_name: seedName, executed_at: new Date() });
    console.log(`   ✅ [${seedName}] ejecutado`);
}
