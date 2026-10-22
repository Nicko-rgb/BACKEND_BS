import { idPublicId } from '../../../shared/utils/ids';
import sequelize from '../../../config/db';
import * as CompanyRepository from '../repository/company.repository';
import * as SucursalConfigRepository from '../repository/sucursalConfig.repository';
import { assertCompanyScope } from '../../../shared/utils/accessScope';
import { BadRequestError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { SaveSucursalConfigInput } from '../interfaces/sucursalConfig.interface';

// Payload del upsert — horarios obligatorios, resto opcional (PUT parcial con min(1) en el schema).
// El estado de la sucursal NO se toca acá: vive en dsg_bss_company y se cambia por su
// propio endpoint (PATCH /sucursals/:publicId/status — ver sucursal.service.ts::toggleStatus).

// Scope sobre la sucursal ya resuelta — system entra a cualquiera, otro rol solo
// si está en su company_ids (ver accessScope.ts).
const assertSucursalAccess = (sucursalCompanyId: number, user: AuthenticatedUser) => {
    assertCompanyScope(user, sucursalCompanyId, 'No tenés acceso a esta sucursal');
};

// Sucursal por public_id — findSucursalByPublicId ya filtra parent_company_id NOT NULL,
// así que si resuelve es sucursal sí o sí (nunca una empresa madre).
const findSucursalOrFail = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await CompanyRepository.findSucursalByPublicId(sucursalPublicId);
    if (!sucursal) throw new NotFoundError('Sucursal no encontrada');

    assertSucursalAccess(sucursal.company_id, user);
    return sucursal;
};

// 'HH:mm[:ss]' → minutos, para validar cierre posterior a apertura.
const toMinutes = (value: string): number => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
};

export const getBySucursalPublicId = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await findSucursalOrFail(sucursalPublicId, user);

    const configuration = await SucursalConfigRepository.findBySucursalId(sucursal.company_id);
    if (!configuration) throw new NotFoundError('La sucursal todavía no tiene configuración');

    return { configuration };
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
        const existing = await SucursalConfigRepository.findBySucursalId(sucursal.company_id, transaction);
        if (existing) {
            const updated = await SucursalConfigRepository.update(existing, { ...fields, user_update: user.user_id }, transaction);
            return { configuration: updated };
        }

        const created = await SucursalConfigRepository.create({
            sucursal_id: sucursal.company_id,
            tenant_id: sucursal.tenant_id,
            public_id: idPublicId(),
            ...fields,
            user_create: user.user_id,
            user_update: null,
        }, transaction);
        return { configuration: created };
    });

    return { configuration };
};
