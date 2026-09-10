/**
 * Seed: categorías deportivas (dsg_bss_sport_category) — mismo set de datos que usaba el
 * backend anterior (BACKEND_BOOKING/src/modules/system/database/seeders/005_sports.js).
 * TRUNCATE + insert dentro de una transacción — para repetirlo a mano: DELETE FROM
 * dsg_bss_seed_meta WHERE seed_name = 'sportCategorySeed'.
 */
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import { SportCategory } from '../models';

const SPORT_CATEGORIES = [
    { code: 'TEAM_SPORTS', name: 'Deportes de Equipo' },
    { code: 'INDIVIDUAL_SPORTS', name: 'Deportes Individuales' },
    { code: 'RACKET_SPORTS', name: 'Deportes de Raqueta' },
    { code: 'WATER_SPORTS', name: 'Deportes Acuáticos' },
    { code: 'COMBAT_SPORTS', name: 'Deportes de Combate' },
    { code: 'FITNESS', name: 'Fitness y Acondicionamiento' },
];

const seedFn = async (): Promise<void> => {
    const t = await sequelize.transaction();
    try {
        await SportCategory.destroy({ truncate: true, cascade: true, restartIdentity: true, transaction: t });
        await SportCategory.bulkCreate(SPORT_CATEGORIES, { transaction: t });
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

const config: SeederConfig = {
    seedName: 'sportCategorySeed',
    seedFn,
    environment: 'essential',
    order: 14,
};

module.exports = config;
