/**
 * Horarios de operación del espacio (BusinessHour) — registro, actualización y
 * bloqueo por bloque (is_closed). Mismo criterio que spaceGallery.service.ts:
 * la autorización real es la PERTENENCIA — el espacio tiene que estar dentro
 * del alcance del usuario (su sucursal en company_ids).
 *
 * Cada horario pertenece a un espacio y el espacio a una sucursal: un bloque
 * configura UN rango + precio y aplica a TODOS los su semana (es semanal, sin
 * fechas). Los bloques de un día NO se solapan entre sí y deben caer dentro
 * del mismo día (00:00 a 24:00).
 */
import * as SpaceRepository from '../repository/space.repository';
import * as HourRepository from '../repository/hour.repository';
import { assertCompanyScope } from '../../../shared/utils/accessScope';
import { BadRequestError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { BusinessHour, Space } from '../database/models';
import type { DayOfWeek, RegisterHourInput, UpdateHourInput } from '../interfaces/hour.interface';

/**
 * Resuelve el espacio por public_id y valida que esté dentro del alcance del
 * usuario — el scope se evalúa sobre la sucursal a la que pertenece el espacio.
 */
const resolveSpace = async (spacePublicId: string, user: AuthenticatedUser) => {
    const spaceId = await SpaceRepository.getSpaceIdByPublicId(spacePublicId);
    if (!spaceId) throw new NotFoundError('Espacio deportivo no encontrado');

    const space = await SpaceRepository.findById(spaceId);
    if (!space) throw new NotFoundError('Espacio deportivo no encontrado');

    assertCompanyScope(user, space.sucursal_id, 'No tenés acceso a este espacio');
    return space;
};

/** 'HH:mm' | '24:00' → minutos transcurridos del día ('24:00' = 1440). */
const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/** Normaliza 'HH:mm' al valor TIME completo que guarda la columna. */
const toTimeValue = (time: string): string => (time.length === 5 ? `${time}:00` : time);

/**
 * Coherencia del bloque: el cierre es después de la apertura y el horario cae
 * dentro del mismo día (nada cruza medianoche — 24:00 lo indica fin del día).
 */
const assertSameDayRange = (startTime: string, endTime: string): void => {
    if (toMinutes(endTime) <= toMinutes(startTime)) {
        throw new BadRequestError('La hora de cierre debe ser posterior a la apertura (los horarios no cruzan la medianoche)');
    }
};

/**
 * Un segundo bloque no se monto sobre otro del MISMO día del espacio. Si
 * `ignoreHourId` viene, ese bloque queda excluido (update del mismo bloque).
 */
const assertNoOverlap = async (
    spaceId: number,
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string,
    ignoreHourId?: number,
): Promise<void> => {
    const rows = await HourRepository.findBySpaceAndDay(spaceId, dayOfWeek);
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);

    for (const row of rows) {
        if (ignoreHourId !== undefined && row.hour_id === ignoreHourId) continue;

        const rowStart = toMinutes(row.start_time);
        const rowEnd = toMinutes(row.end_time);
        if (start < rowEnd && end > rowStart) {
            throw new BadRequestError(
                `El horario se cruza con otro bloque del día (${row.start_time.slice(0, 5)} – ${row.end_time.slice(0, 5)})`,
            );
        }
    }
};

/**
 * Resuelve el bloque por hour_id y verifica que sea de ESTE espacio — sin ese
 * chequeo, un usuario con acceso a un espacio podría tocar el horario de otro
 * espacio pasando el hour_id (el id es interno, no un dato expuesto).
 */
const resolveManagingSpace = async (
    spacePublicId: string,
    hourId: number,
    user: AuthenticatedUser,
): Promise<{ space: Space; hour: BusinessHour }> => {
    const space = await resolveSpace(spacePublicId, user);

    const hour = await HourRepository.findById(hourId);
    if (!hour || hour.space_id !== space.space_id) {
        throw new NotFoundError('Horario no encontrado');
    }

    return { space, hour };
};

/**
 * Bloques de horario del espacio — lista completa (el front agrupa por día).
 */
export const list = async (spacePublicId: string, user: AuthenticatedUser) => {
    const space = await resolveSpace(spacePublicId, user);
    return HourRepository.findBySpace(space.space_id as number);
};

/**
 * Registra un bloque de horario: día + rango dentro del mismo día + precio.
 * El bloque nace habilitado (is_closed false) y el juego de horarios aplica a
 * todas las semanas (día de la semana, sin fechas).
 */
export const register = async (spacePublicId: string, data: RegisterHourInput, user: AuthenticatedUser) => {
    const space = await resolveSpace(spacePublicId, user);

    assertSameDayRange(data.start_time, data.end_time);
    await assertNoOverlap(space.space_id as number, data.day_of_week, data.start_time, data.end_time);

    return HourRepository.create({
        space_id: space.space_id as number,
        tenant_id: space.tenant_id,
        day_of_week: data.day_of_week,
        start_time: toTimeValue(data.start_time),
        end_time: toTimeValue(data.end_time),
        price: data.price.toFixed(2),
        user_create: user.user_id,
    });
};

/**
 * Actualiza un bloque existente — los campos enviados pisan, el resto se
 * conserva; con los valores EFECTIVOS se revalidan rango y solapamiento.
 */
export const update = async (spacePublicId: string, hourId: number, data: UpdateHourInput, user: AuthenticatedUser) => {
    const { hour } = await resolveManagingSpace(spacePublicId, hourId, user);

    const dayOfWeek = (data.day_of_week ?? hour.day_of_week) as DayOfWeek;
    const startTime = toTimeValue(data.start_time ?? hour.start_time);
    const endTime = toTimeValue(data.end_time ?? hour.end_time);

    assertSameDayRange(startTime, endTime);
    // Comparación en 'HH:mm' — el propio bloque se excluye del chequeo.
    await assertNoOverlap(
        hour.space_id,
        dayOfWeek,
        startTime.length === 5 ? startTime : startTime.slice(0, 5),
        endTime.length === 5 ? endTime : endTime.slice(0, 5),
        hourId,
    );

    return HourRepository.update(hour, {
        ...(data.day_of_week !== undefined && { day_of_week: data.day_of_week }),
        ...(data.start_time !== undefined && { start_time: startTime }),
        ...(data.end_time !== undefined && { end_time: endTime }),
        ...(data.price !== undefined && { price: data.price.toFixed(2) }),
        user_update: user.user_id,
    });
};

/**
 * Habilita o deshabilita UN bloque (is_closed) — bloquea el bloque, no el día
 * entero: si el día tiene más bloques, esos siguen operando.
 */
export const toggleClosed = async (spacePublicId: string, hourId: number, user: AuthenticatedUser) => {
    const { hour } = await resolveManagingSpace(spacePublicId, hourId, user);
    return HourRepository.update(hour, {
        is_closed: !hour.is_closed,
        user_update: user.user_id,
    });
};
