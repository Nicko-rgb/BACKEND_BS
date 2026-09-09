/**
 * MigrationMeta - Control de ejecución de migraciones.
 *
 * Registra qué migraciones ya corrieron en la tabla dsg_bss_migration_meta.
 * Si el nombre de la migración ya existe con status 'applied', se salta su
 * ejecución (ver `scripts/migrationRunner.ts`).
 *
 * Su tabla se garantiza con `.sync({ force: false })` desde el runner —no
 * solo con la migración baseline de este mismo archivo— porque el runner
 * necesita poder consultarla ANTES de poder ejecutar cualquier migración,
 * incluida la que crea esta misma tabla (problema de huevo y gallina). La
 * migración baseline (`000_baseline_migration_meta.ts`) igual existe para
 * que quede versionada y visible en `migrate:status`, pero en la práctica
 * siempre la encuentra con la tabla ya creada por el sync y no hace nada.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';

export class MigrationMeta extends Model<InferAttributes<MigrationMeta>, InferCreationAttributes<MigrationMeta>> {
    declare id: CreationOptional<number>;
    declare migration_name: string;
    declare module: string;
    declare batch: number;
    declare checksum: string;
    declare executed_at: CreationOptional<Date>;
    declare rolled_back_at: CreationOptional<Date | null>;
    declare status: CreationOptional<string>;
    declare execution_time_ms: number | null;
}

MigrationMeta.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    migration_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Nombre completo del archivo de migración'
    },
    module: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Módulo al que pertenece la migración (users, companys, etc.)'
    },
    batch: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Número de batch — agrupa migraciones ejecutadas juntas'
    },
    checksum: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'SHA-256 del archivo al momento de ejecución'
    },
    executed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha y hora de ejecución'
    },
    rolled_back_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Fecha y hora de rollback (null si no fue revertida)'
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'applied',
        comment: "'applied' o 'rolled_back'"
    },
    execution_time_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Duración de la migración en milisegundos'
    }
}, {
    sequelize,
    tableName: 'dsg_bss_migration_meta',
    timestamps: false,
    comment: 'Registro de migraciones ejecutadas — evita re-ejecuciones y permite rollback'
});
