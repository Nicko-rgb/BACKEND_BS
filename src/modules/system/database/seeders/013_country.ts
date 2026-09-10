/**
 * Seed: países activos del sistema (dsg_bss_country) — mismo set de datos que usaba el
 * backend anterior (BACKEND_BOOKING/src/modules/system/database/seeders/003_paises.js).
 * TRUNCATE + insert dentro de una transacción — para repetirlo a mano: DELETE FROM
 * dsg_bss_seed_meta WHERE seed_name = 'countrySeed'.
 */
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import { Country } from '../models';

const COUNTRIES = [
    { country: 'Argentina', iso_country: 'AR', phone_code: '+54', iso_currency: 'ARS', currency: 'Peso Argentino', currency_simbol: '$', time_zone: 'America/Argentina/Buenos_Aires', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/ar.svg' },
    { country: 'Brasil', iso_country: 'BR', phone_code: '+55', iso_currency: 'BRL', currency: 'Real Brasileño', currency_simbol: 'R$', time_zone: 'America/Sao_Paulo', language: 'pt', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/br.svg' },
    { country: 'Chile', iso_country: 'CL', phone_code: '+56', iso_currency: 'CLP', currency: 'Peso Chileno', currency_simbol: '$', time_zone: 'America/Santiago', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/cl.svg' },
    { country: 'Colombia', iso_country: 'CO', phone_code: '+57', iso_currency: 'COP', currency: 'Peso Colombiano', currency_simbol: '$', time_zone: 'America/Bogota', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/co.svg' },
    { country: 'México', iso_country: 'MX', phone_code: '+52', iso_currency: 'MXN', currency: 'Peso Mexicano', currency_simbol: '$', time_zone: 'America/Mexico_City', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/mx.svg' },
    { country: 'Perú', iso_country: 'PE', phone_code: '+51', iso_currency: 'PEN', currency: 'Sol Peruano', currency_simbol: 'S/', time_zone: 'America/Lima', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/pe.svg' },
    { country: 'Ecuador', iso_country: 'EC', phone_code: '+593', iso_currency: 'USD', currency: 'Dólar Estadounidense', currency_simbol: '$', time_zone: 'America/Guayaquil', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/ec.svg' },
    { country: 'Uruguay', iso_country: 'UY', phone_code: '+598', iso_currency: 'UYU', currency: 'Peso Uruguayo', currency_simbol: '$U', time_zone: 'America/Montevideo', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/uy.svg' },
    { country: 'Paraguay', iso_country: 'PY', phone_code: '+595', iso_currency: 'PYG', currency: 'Guaraní Paraguayo', currency_simbol: '₲', time_zone: 'America/Asuncion', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/py.svg' },
    { country: 'Bolivia', iso_country: 'BO', phone_code: '+591', iso_currency: 'BOB', currency: 'Boliviano', currency_simbol: 'Bs.', time_zone: 'America/La_Paz', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/bo.svg' },
];

const seedFn = async (systemUserId?: number): Promise<void> => {
    const t = await sequelize.transaction();
    try {
        await Country.destroy({ truncate: true, cascade: true, restartIdentity: true, transaction: t });
        await Country.bulkCreate(
            COUNTRIES.map((c) => ({ ...c, is_active: true, user_create: systemUserId!, user_update: systemUserId! })),
            { transaction: t }
        );
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

const config: SeederConfig = {
    seedName: 'countrySeed',
    seedFn,
    environment: 'essential',
    dependsOnSystemUser: true,
    // No usa el order de su baseline (001_baseline_country) — necesita correr después de
    // systemUserSeed (order 12, users/001_system_user.ts) para tener un user_create válido,
    // el order de un seed depende de sus dependencias de DATOS, no del de su tabla.
    order: 13,
};

module.exports = config;
