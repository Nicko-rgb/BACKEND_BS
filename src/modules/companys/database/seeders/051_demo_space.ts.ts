/**
 * Seed demo: espacio deportivo en la sucursal de ejemplo (solo desarrollo).
 *
 * Crea un espacio deportivo (cancha de fútbol 5) bajo la sucursal creada por
 * demoCompanySeed (050), heredando su tenant_id. Requiere que demoCompanySeed
 * haya corrido antes (order 50 > 49).
 *
 * Idempotente: si ya existe un espacio con este nombre en la sucursal, no crea nada.
 * `environment: 'demo'` — seederRunner solo lo ejecuta cuando NODE_ENV !== 'production'.
 * `dependsOnSystemUser: true` — recibe el user_id del system para user_create.
 */
import { idPublicId } from '../../../../shared/utils/ids';
import type { SeederConfig } from '../../../../../scripts/seederRunner';
import sequelize from '../../../../config/db';
import * as CompanyRepository from '../../repository/company.repository';
import * as SpaceRepository from '../../repository/space.repository';
import { Company } from '../../database/models';
import { SurfaceType, SportType, SportCategory } from '../../../system/database/models';

const COMPANY_DOCUMENT = '20123456789';
const SUCURSAL_NAME = 'Sucursal Pucallpa';
const SPACE_NAME = 'Cancha Fútbol 5';

const seedFn = async (systemUserId?: number): Promise<void> => {
    if (!systemUserId) {
        throw new Error('demoSpaceSeed necesita systemUserId — seederRunner lo provee con dependsOnSystemUser.');
    }

    // 1. Empresa matriz por RUC (creada por demoCompanySeed).
    const company = await CompanyRepository.findByDocument(COMPANY_DOCUMENT);
    if (!company) {
        throw new Error(`No existe empresa con RUC ${COMPANY_DOCUMENT} — corré demoCompanySeed antes que demoSpaceSeed.`);
    }

    // 2. Sucursal bajo esa empresa.
    const sucursal = await Company.findOne({
        where: { name: SUCURSAL_NAME, parent_company_id: company.company_id },
        attributes: ['company_id', 'public_id', 'name', 'tenant_id'],
    });
    if (!sucursal) {
        throw new Error(`No se encontró la sucursal '${SUCURSAL_NAME}' bajo la empresa ${company.company_id}.`);
    }

    // 3. Idempotencia — si ya existe este espacio en la sucursal, no duplicar.
    const existingSpaces = await SpaceRepository.findBySucursalId(Number(sucursal.company_id));
    if (existingSpaces.some((s) => s.name === SPACE_NAME)) return;

    // 4. Catálogos (deben haber sido sembrados por los seeds de system: orders 14-16).
    const surfaceType = await SurfaceType.findOne({ where: { code: 'SYNTHETIC_GRASS' } });
    const sportType = await SportType.findOne({ where: { code: 'FOOTBALL', is_active: true } });
    const sportCategory = await SportCategory.findOne({ where: { code: 'TEAM_SPORTS' } });

    if (!surfaceType) {
        throw new Error('Superficie SYNTHETIC_GRASS no encontrada — corré surfaceTypeSeed antes que demoSpaceSeed.');
    }
    if (!sportType) {
        throw new Error('Deporte FOOTBALL no encontrado o inactivo — corré sportTypeSeed antes que demoSpaceSeed.');
    }
    if (!sportCategory) {
        throw new Error('Categoría TEAM_SPORTS no encontrada — corré sportCategorySeed antes que demoSpaceSeed.');
    }

    await sequelize.transaction(async (transaction) => {
        await SpaceRepository.create({
            sucursal_id: Number(sucursal.company_id),
            tenant_id: sucursal.tenant_id,
            public_id: idPublicId(),
            name: SPACE_NAME,
            surface_type_id: surfaceType.surface_type_id,
            sport_type_id: sportType.sport_type_id,
            sport_category_id: sportCategory.sport_category_id,
            status_space: 'ACTIVE',
            description: 'Cancha de fútbol 5 de demostración',
            capacity: 10,
            dimensions: '30x15 metros',
            equipment: 'Porterías, arcos, iluminación LED',
            minimum_booking_minutes: 60,
            maximum_booking_minutes: 120,
            user_create: systemUserId,
            user_update: null,
        }, transaction);
    });
};

const config: SeederConfig = {
    seedName: 'demoSpaceSeed',
    seedFn,
    environment: 'demo', // seederRunner solo lo corre si NODE_ENV !== 'production'
    dependsOnSystemUser: true,
    order: 50, // después de demoCompanySeed (49)
};

module.exports = config;
