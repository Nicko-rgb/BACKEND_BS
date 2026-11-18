/**
 * Seed: tipos de pago activos (dsg_bss_payment_types) — mismo set de datos que
 * usaba el backend anterior (BACKEND_BOOKING/src/modules/system/database/seeders/006_payment_types.js).
 * Necesita el país Perú ya creado (countrySeed, order 13) — busca su country_id por
 * iso_country en vez de hardcodearlo, porque el id es autoincremental y puede variar.
 *
 * Yape, Plin y tarjeta se registran por país: proveedor, cuenta y comisión son
 * locales (cada país cobra con su propia pasarela y en su moneda). Solo efectivo
 * es global (country_id null) porque no depende de ningún proveedor.
 * Actualiza o crea por país/código conservando IDs — para repetirlo a mano: DELETE FROM
 * dsg_bss_seed_meta WHERE seed_name = 'paymentTypesSeed'.
 */
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import { Country, PaymentType } from '../models';

const seedFn = async (): Promise<void> => {
    const peru = await Country.findOne({ where: { iso_country: 'PE' } });
    if (!peru) {
        throw new Error('No se encontró el país Perú (PE) — corré countrySeed antes que paymentTypesSeed.');
    }

    const PAYMENT_TYPES = [
        { country_id: peru.country_id, name: 'Yape', code: 'YAPE', category: 'billetera_digital' as const, provider: 'Mercado Pago', description: 'Pago automático con Yape: autoriza el cobro desde tu app con tu número y código de aprobación.', icon_url: 'https://www.yape.com.pe/favicon.ico', processing_time: 'Inmediato', is_enabled: true, commission_percentage: '0.0349', fixed_commission: '1.00' },
        { country_id: peru.country_id, name: 'Plin', code: 'PLIN', category: 'billetera_digital' as const, provider: 'Interbank/BBVA/Scotiabank', description: 'Pago mediante escaneo de código QR o número celular a través de Plin.', icon_url: 'https://plin.com.pe/favicon.ico', processing_time: 'Inmediato', is_enabled: true },
        { country_id: null, name: 'Efectivo', code: 'CASH', category: 'efectivo' as const, provider: 'Local', description: 'Pago presencial en la sucursal.', icon_url: null, processing_time: 'Inmediato', is_enabled: true },
        { country_id: peru.country_id, name: 'Tarjeta de Crédito/Débito', code: 'CARD_ONLINE', category: 'tarjeta_credito' as const, provider: 'Mercado Pago', description: 'Pago en línea con tarjeta Visa, Mastercard, AMEX, etc.', icon_url: null, processing_time: 'Inmediato', is_enabled: true, commission_percentage: '0.0399', fixed_commission: '1.00' },
    ];

    const t = await sequelize.transaction();
    try {
        for (const data of PAYMENT_TYPES) {
            const [paymentType, created] = await PaymentType.findOrCreate({
                where: { country_id: data.country_id, code: data.code },
                defaults: data, transaction: t,
            });
            if (!created) await paymentType.update(data, { transaction: t });
        }
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

const config: SeederConfig = {
    seedName: 'paymentTypesSeed',
    seedFn,
    environment: 'essential',
    order: 17, // después de countrySeed (order 13) — necesita el country_id de Perú
};

module.exports = config;
