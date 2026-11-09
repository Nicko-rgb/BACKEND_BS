import { idPublicId } from '../../../shared/utils/ids';
import sequelize from '../../../config/db';
import * as SucursalConfigRepository from '../repository/sucursalConfig.repository';
import { resolveSucursalForUser } from './entityScope.service';
import { BadRequestError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { SaveSucursalConfigInput } from '../interfaces/sucursalConfig.interface';

// Payload del upsert — horarios obligatorios, resto opcional (PUT parcial con min(1) en el schema).
// El estado de la sucursal NO se toca acá: vive en dsg_bss_company y se cambia por su
// propio endpoint (PATCH /sucursals/:publicId/status — ver sucursal.service.ts::toggleStatus).

// 'HH:mm[:ss]' → 'HH:mm' — la columna TIME devuelve los segundos.
const toShortTime = (value: string): string => value.slice(0, 5);

// 'HH:mm[:ss]' → minutos, para validar cierre posterior a apertura.
const toMinutes = (value: string): number => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Cierre a medianoche: '00:00' y '24:00' son el mismo instante (fin del día) y
 * el front manda cualquiera de los dos. Se guarda siempre como '24:00' — mismo
 * criterio que BusinessHour.end_time, y así la validación de horarios del
 * espacio (hour.service.ts) lo compara como 1440 minutos.
 */
const normalizeClosingTime = (value: string): string => (toShortTime(value) === '00:00' ? '24:00' : toShortTime(value));

export const getBySucursalPublicId = async (sucursalPublicId: string, user: AuthenticatedUser) => {
    const sucursal = await resolveSucursalForUser(sucursalPublicId, user);

    const configuration = await SucursalConfigRepository.findBySucursalId(sucursal.company_id);
    if (!configuration) throw new NotFoundError('La sucursal todavía no tiene configuración');

    return { configuration };
};

export const saveBySucursalPublicId = async (sucursalPublicId: string, data: SaveSucursalConfigInput, user: AuthenticatedUser) => {
    const sucursal = await resolveSucursalForUser(sucursalPublicId, user);

    if (!data.opening_time || !data.closing_time) {
        throw new BadRequestError('El horario de apertura y cierre son requeridos');
    }

    // '00:00' y '24:00' son fin del día: se normalizan ANTES de comparar para
    // que no se lean como el minuto 0 del inicio del día.
    const openingTime = toShortTime(data.opening_time);
    const closingTime = normalizeClosingTime(data.closing_time);

    if (toMinutes(closingTime) <= toMinutes(openingTime)) {
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
        opening_time: openingTime,
        closing_time: closingTime,
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
