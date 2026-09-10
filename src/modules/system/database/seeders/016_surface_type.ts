/**
 * Seed: tipos de superficie (dsg_bss_surface_type) — mismo set de datos que usaba el
 * backend anterior (BACKEND_BOOKING/src/modules/system/database/seeders/005_sports.js).
 * TRUNCATE + insert dentro de una transacción — para repetirlo a mano: DELETE FROM
 * dsg_bss_seed_meta WHERE seed_name = 'surfaceTypeSeed'.
 */
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import { SurfaceType } from '../models';

const SURFACE_TYPES = [
    { code: 'NATURAL_GRASS', name: 'Césped Natural' }, { code: 'SYNTHETIC_GRASS', name: 'Césped Sintético' },
    { code: 'CONCRETE', name: 'Cemento' }, { code: 'ASPHALT', name: 'Asfalto' },
    { code: 'CLAY', name: 'Arcilla' }, { code: 'HARD_COURT', name: 'Cancha Dura' },
    { code: 'WOOD', name: 'Madera' }, { code: 'PARQUET', name: 'Parquet' },
    { code: 'RUBBER', name: 'Caucho' }, { code: 'SAND', name: 'Arena' },
    { code: 'WATER', name: 'Agua' }, { code: 'SYNTHETIC_COURT', name: 'Cancha Sintética' },
    { code: 'INDOOR_COURT', name: 'Cancha Techada' }, { code: 'OUTDOOR_COURT', name: 'Cancha al Aire Libre' },
    { code: 'MULTI_SURFACE', name: 'Superficie Múltiple' },
];

const seedFn = async (): Promise<void> => {
    const t = await sequelize.transaction();
    try {
        await SurfaceType.destroy({ truncate: true, cascade: true, restartIdentity: true, transaction: t });
        await SurfaceType.bulkCreate(SURFACE_TYPES, { transaction: t });
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

const config: SeederConfig = {
    seedName: 'surfaceTypeSeed',
    seedFn,
    environment: 'essential',
    order: 16,
};

module.exports = config;
