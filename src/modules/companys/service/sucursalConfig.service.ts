import { idPublicId } from '../../../shared/utils/ids';
import sequelize from '../../../config/db';
import * as CompanyRepository from '../repository/company.repository';
import * as ConfigurationRepository from '../repository/configuration.repository';
import { assertCompanyScope } from '../../../shared/utils/accessScope';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';

type SucursalStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

// Payload del upsert — horarios obligatorios, resto opcional (PUT parcial con min(1) en el schema).
// `status` es de la sucursal (dsg_bss_company), no de la config: si viene se actualiza en la
// misma transacción del upsert (todo o nada).
export interface SaveSucursalConfigInput {
    social_facebook?: string | null;
    social_instagram?: string | null;
    social_tiktok?: string | null;
    social_youtube?: string | null;
    social_whatsapp?: string | null;
    whatsapp_message?: string | null;
    opening_time?: string;
    closing_time?: string;
    min_price?: number | null;
    features?: string | null;
    status?: SucursalStatus;
}

// Scope sobre la sucursal ya resuelta — system entra a cualquiera, otro rol solo
// si está en su company_ids (ver accessScope.ts).
const assertSucursalAccess = (sucursalCompanyId: number, user: AuthenticatedUser) => {
    assertCompanyScope(user, Number(sucursalCompanyId), 'No tenés acceso a esta sucursal');
};

// Sucursal por public_id — findSucursalByPublicId ya filtra parent_company_id NOT NULL,
// así que si resuelve es sucursal sí o sí (nunca una empresa madre).
const findSucursalOrFail = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await CompanyRepository.findSucursalByPublicId(sucursalPublicId);
    if (!sucursal) throw new NotFoundError('Sucursal no encontrada');

    assertSucursalAccess(Number(sucursal.company_id), user);
    return sucursal;
};

// 'HH:mm[:ss]' → minutos, para validar cierre posterior a apertura.
const toMinutes = (value: string): number => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
};

export const getBySucursalPublicId = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await findSucursalOrFail(sucursalPublicId, user);

    const configuration = await ConfigurationRepository.findBySucursalId(Number(sucursal.company_id));
    if (!configuration) throw new NotFoundError('La sucursal todavía no tiene configuración');

    return { configuration, status: sucursal.status as SucursalStatus | null };
};

export const saveBySucursalPublicId = async (sucursalPublicId: string, data: SaveSucursalConfigInput, user: AuthenticatedUser) => {
    const sucursal = await findSucursalOrFail(sucursalPublicId, user);

    if (!data.opening_time || !data.closing_time) {
        throw new BadRequestError('El horario de apertura y cierre son requeridos');
    }
    if (toMinutes(data.closing_time) <= toMinutes(data.opening_time)) {
        throw new BadRequestError('El cierre debe ser posterior a la apertura');
    }

    // '' → null en opcionales de texto; la DB no guarda strings vacíos.
    const fields = {
        social_facebook: data.social_facebook || null,
        social_instagram: data.social_instagram || null,
        social_tiktok: data.social_tiktok || null,
        social_youtube: data.social_youtube || null,
        social_whatsapp: data.social_whatsapp || null,
        whatsapp_message: data.whatsapp_message || null,
        opening_time: data.opening_time,
        closing_time: data.closing_time,
        // DECIMAL(10,2) viaja como string en pg — el schema valida number, se convierte acá.
        min_price: data.min_price != null ? String(data.min_price) : null,
        features: data.features || null,
    };

    const { configuration } = await sequelize.transaction(async (transaction) => {
        if (data.status) {
            await CompanyRepository.update(sucursal, { status: data.status, user_update: user.user_id }, transaction);
        }

        const existing = await ConfigurationRepository.findBySucursalId(Number(sucursal.company_id), transaction);
        if (existing) {
            const updated = await ConfigurationRepository.update(existing, { ...fields, user_update: user.user_id }, transaction);
            return { configuration: updated };
        }

        const created = await ConfigurationRepository.create({
            sucursal_id: Number(sucursal.company_id),
            tenant_id: sucursal.tenant_id,
            public_id: idPublicId(),
            ...fields,
            user_create: user.user_id,
            user_update: null,
        }, transaction);
        return { configuration: created };
    });

    const freshSucursal = await CompanyRepository.findSucursalByPublicId(sucursalPublicId);
    return { configuration, status: (freshSucursal?.status ?? sucursal.status) as SucursalStatus | null };
};
