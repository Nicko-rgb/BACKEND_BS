/**
 * Seed: ubigeo de Perú (departamentos, provincias, distritos) — dsg_bss_ubigeo.
 * Lee data/ubigeo.json (2094 filas: 25 departamentos, 196 provincias, 1873 distritos),
 * extraído del dump del backend anterior (BACKEND_BOOKING/.../seeders/ubigeo.sql). Mismo
 * JSON sirve para poblar en producción, sin depender de una base vieja disponible.
 *
 * Necesita el país Perú ya creado (countrySeed, order 13) — busca su country_id por
 * iso_country. Los 3 niveles se insertan en pasadas separadas porque cada nivel necesita
 * el ubigeo_id (autoincremental) del nivel padre ya insertado para resolver `parent_id` —
 * el código (ej. '0101') identifica la relación en el JSON, no el id de la fila.
 *
 * Para repetirlo a mano: DELETE FROM dsg_bss_seed_meta WHERE seed_name = 'ubigeoSeed'.
 */
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import { Country, Ubigeo } from '../models';
import ubigeoData from './ubigeo.json';

const CHUNK_SIZE = 500;

const chunk = <T>(items: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
    return chunks;
};

const seedFn = async (): Promise<void> => {
    const peru = await Country.findOne({ where: { iso_country: 'PE' } });
    if (!peru) {
        throw new Error('No se encontró el país Perú (PE) — corré countrySeed antes que ubigeoSeed.');
    }

    const t = await sequelize.transaction();
    try {
        await Ubigeo.destroy({ where: { country_id: peru.country_id }, transaction: t });

        // Nivel 1 — departamentos, sin padre.
        await Ubigeo.bulkCreate(
            ubigeoData.departments.map((d) => ({ code: d.code, name: d.name, level: 1, parent_id: null, country_id: peru.country_id })),
            { transaction: t }
        );
        const departmentRows = await Ubigeo.findAll({ where: { country_id: peru.country_id, level: 1 }, attributes: ['ubigeo_id', 'code'], transaction: t });
        const departmentIdByCode = new Map(departmentRows.map((r) => [r.code, r.ubigeo_id]));

        // Nivel 2 — provincias, parent_id resuelto contra el departamento por su code.
        await Ubigeo.bulkCreate(
            ubigeoData.provinces.map((p) => ({ code: p.code, name: p.name, level: 2, parent_id: departmentIdByCode.get(p.parent_code) ?? null, country_id: peru.country_id })),
            { transaction: t }
        );
        const provinceRows = await Ubigeo.findAll({ where: { country_id: peru.country_id, level: 2 }, attributes: ['ubigeo_id', 'code'], transaction: t });
        const provinceIdByCode = new Map(provinceRows.map((r) => [r.code, r.ubigeo_id]));

        // Nivel 3 — distritos, parent_id resuelto contra la provincia por su code. En lotes:
        // son ~1870 filas, más liviano para el driver que un solo INSERT gigante.
        for (const batch of chunk(ubigeoData.districts, CHUNK_SIZE)) {
            await Ubigeo.bulkCreate(
                batch.map((d) => ({ code: d.code, name: d.name, level: 3, parent_id: provinceIdByCode.get(d.parent_code) ?? null, country_id: peru.country_id })),
                { transaction: t }
            );
        }

        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

const config: SeederConfig = {
    seedName: 'ubigeoSeed',
    seedFn,
    environment: 'essential',
    order: 48, // después de countrySeed (order 13) — necesita el country_id de Perú
};

module.exports = config;
