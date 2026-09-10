/**
 * Seed: tipos de deporte activos (dsg_bss_sport_type) — mismo set de datos que usaba el
 * backend anterior (BACKEND_BOOKING/src/modules/system/database/seeders/005_sports.js).
 * TRUNCATE + insert dentro de una transacción — para repetirlo a mano: DELETE FROM
 * dsg_bss_seed_meta WHERE seed_name = 'sportTypeSeed'.
 */
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import { SportType } from '../models';

const SPORT_TYPES = [
    { code: 'FOOTBALL', name: 'Fútbol' }, { code: 'BASKETBALL', name: 'Básquetbol' },
    { code: 'VOLLEYBALL', name: 'Vóleibol' }, { code: 'TENNIS', name: 'Tenis' },
    { code: 'PADDLE', name: 'Pádel' }, { code: 'SQUASH', name: 'Squash' },
    { code: 'BADMINTON', name: 'Bádminton' }, { code: 'TABLE_TENNIS', name: 'Tenis de Mesa' },
    { code: 'SWIMMING', name: 'Natación' }, { code: 'BOXING', name: 'Boxeo' },
    { code: 'MARTIAL_ARTS', name: 'Artes Marciales' }, { code: 'GYM', name: 'Gimnasio' },
    { code: 'CROSSFIT', name: 'CrossFit' }, { code: 'YOGA', name: 'Yoga' },
    { code: 'PILATES', name: 'Pilates' }, { code: 'FUTSAL', name: 'Fútsal' },
    { code: 'HANDBALL', name: 'Handball' }, { code: 'RUGBY', name: 'Rugby' },
    { code: 'AMERICAN_FOOTBALL', name: 'Fútbol Americano' }, { code: 'BASEBALL', name: 'Béisbol' },
];

const seedFn = async (): Promise<void> => {
    const t = await sequelize.transaction();
    try {
        await SportType.destroy({ truncate: true, cascade: true, restartIdentity: true, transaction: t });
        await SportType.bulkCreate(SPORT_TYPES.map((s) => ({ ...s, is_active: true })), { transaction: t });
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

const config: SeederConfig = {
    seedName: 'sportTypeSeed',
    seedFn,
    environment: 'essential',
    order: 15,
};

module.exports = config;
