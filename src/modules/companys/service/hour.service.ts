/**
 * Horarios de operación del espacio (BusinessHour) — guardado de la semana
 * completa y bloqueo por bloque / por día (is_closed). Mismo criterio que
 * spaceGallery.service.ts: la autorización real es la PERTENENCIA — el espacio
 * tiene que estar dentro del alcance del usuario (su sucursal en company_ids).
 */
import sequelize from '../../../config/db';
import type { Transaction } from 'sequelize';
import * as HourRepository from '../repository/hour.repository';
import * as SucursalConfigRepository from '../repository/sucursalConfig.repository';
import { resolveSpaceForUser } from './entityScope.service';
import { BadRequestError, NotFoundError } from '../../../shared/errors/CustomErrors';
import type { AuthenticatedUser } from '../../../shared/types/auth';
import type { BusinessHour, Space } from '../database/models';
import type { DayOfWeek, SaveScheduleInput, ScheduleBlockInput } from '../interfaces/hour.interface';
import { DAY_LABELS } from '../interfaces/hour.interface';

/** 'HH:mm' | '24:00' → minutos transcurridos del día ('24:00' = 1440). */
const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/** Normaliza 'HH:mm' al valor TIME completo que guarda la columna. */
const toTimeValue = (time: string): string => (time.length === 5 ? `${time}:00` : time);

/** 'HH:mm' — el payload puede traer 'HH:mm:ss' si algún día se acepta, así se compara siempre igual. */
const toShortTime = (time: string): string => time.slice(0, 5);

/**
 * Cierre a medianoche: '00:00' y '24:00' son el mismo instante (fin del día) y
 * el front manda cualquiera de los dos. Se guarda siempre como '24:00' para no
 * confundirlo con un bloque que ABRE a las 00:00. Solo aplica al cierre.
 */
const normalizeEndTime = (time: string): string => (toShortTime(time) === '00:00' ? '24:00' : toShortTime(time));

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
 * Valida la semana completa ANTES de tocar la BD: cada bloque con cierre
 * posterior a la apertura y, dentro de cada día, sin solapamientos entre sí.
 */
const assertScheduleCoherent = (hours: ScheduleBlockInput[]): void => {
    const blocksByDay = new Map<DayOfWeek, ScheduleBlockInput[]>();

    for (const block of hours) {
        assertSameDayRange(block.start_time, block.end_time);

        const blocks = blocksByDay.get(block.day_of_week) ?? [];
        blocks.push(block);
        blocksByDay.set(block.day_of_week, blocks);
    }

    for (const [day, blocks] of blocksByDay) {
        const sorted = [...blocks].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

        for (let index = 1; index < sorted.length; index += 1) {
            const previous = sorted[index - 1];
            const current = sorted[index];

            if (toMinutes(current.start_time) < toMinutes(previous.end_time)) {
                throw new BadRequestError(
                    `Los horarios de ${DAY_LABELS[day]} se cruzan `
                    + `(${toShortTime(previous.start_time)} – ${toShortTime(previous.end_time)} `
                    + `con ${toShortTime(current.start_time)} – ${toShortTime(current.end_time)})`,
                );
            }
        }
    }
};

/**
 * Ventana operativa de la sucursal: `Configuration.opening_time` /
 * `closing_time` de la sucursal a la que pertenece el espacio.
 *
 *   - Sin configuración (o con alguno de los dos horarios en null) la sucursal
 *     no tiene ventana definida → no se pueden registrar horarios del espacio.
 *   - Con ventana, cada bloque tiene que caber COMPLETO dentro de ella: el
 *     inicio no puede ser antes de la apertura ni el fin posterior al cierre.
 *   - El cierre de la sucursal también puede ser fin del día ('24:00' o, por
 *     convención del front, '00:00'): se normaliza con normalizeEndTime y se
 *     compara como 1440, igual que el cierre de un bloque.
 *
 * Se compara en minutos y en el mismo formato ('HH:mm'), porque la columna TIME
 * devuelve 'HH:mm:ss' y el payload trae 'HH:mm'.
 */
const assertWithinSucursalHours = async (
    sucursalId: number,
    hours: ScheduleBlockInput[],
    transaction?: Transaction,
): Promise<void> => {
    const configuration = await SucursalConfigRepository.findBySucursalId(sucursalId, transaction);

    const openingTime = configuration?.opening_time ? toShortTime(configuration.opening_time) : null;
    const closingTime = configuration?.closing_time ? normalizeEndTime(configuration.closing_time) : null;

    if (!openingTime || !closingTime) {
        throw new BadRequestError(
            'La sucursal del espacio no tiene configurados los horarios de apertura y cierre. '
            + 'Configuralos antes de registrar horarios de atención',
        );
    }

    const openingMinutes = toMinutes(openingTime);
    const closingMinutes = toMinutes(closingTime);

    for (const block of hours) {
        const startMinutes = toMinutes(block.start_time);
        const endMinutes = toMinutes(block.end_time);

        if (startMinutes < openingMinutes || endMinutes > closingMinutes) {
            throw new BadRequestError(
                `El bloque del ${DAY_LABELS[block.day_of_week]} `
                + `(${toShortTime(block.start_time)} – ${toShortTime(block.end_time)}) está fuera del horario `
                + `de atención de la sucursal (${openingTime} – ${closingTime})`,
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
    transaction: Transaction,
): Promise<{ space: Space; hour: BusinessHour }> => {
    const space = await resolveSpaceForUser(spacePublicId, user, transaction);

    const hour = await HourRepository.findById(hourId, transaction);
    if (!hour || hour.space_id !== space.space_id) {
        throw new NotFoundError('Horario no encontrado');
    }

    return { space, hour };
};

/**
 * Bloques de horario del espacio — lista completa (el front los agrupa por día).
 */
export const list = async (spacePublicId: string, user: AuthenticatedUser) => {
    const space = await resolveSpaceForUser(spacePublicId, user);
    return HourRepository.findBySpace(space.space_id as number);
};

/**
 * Guarda la semana completa del espacio: crea o REEMPLAZA todos sus bloques.
 *   - El payload es el estado final del horario: un día sin bloques es un día
 *     ausente; `hours: []` deja el espacio sin horarios.
 *   - La apertura va en 'HH:mm' (00:00 a 23:59). El cierre acepta además
 *     '24:00' (fin del día) y '00:00' como sinónimo: se guarda como '24:00'.
 *   - `is_closed` viaja por bloque (default false) para que el guardado no pise
 *     lo que ya cerraron los toggles.
 *   - Los bloques tienen que caer dentro de la ventana de apertura/cierre de la
 *     sucursal del espacio (ver assertWithinSucursalHours). Sin ventana
 *     configurada no se permite registrar horarios; `hours: []` sí deja vaciar
 *     el horario porque no registra ningún bloque.
 *   - Reemplazo transaccional (delete + insert): o queda la semana nueva
 *     completa o la vieja intacta. Devuelve las filas nuevas con sus hour_id.
 */
export const replaceSchedule = async (spacePublicId: string, data: SaveScheduleInput, user: AuthenticatedUser) => sequelize.transaction(async (transaction) => {
    const space = await resolveSpaceForUser(spacePublicId, user, transaction);

    // El cierre '00:00' se normaliza a '24:00' ANTES de validar: si no, el
    // chequeo de rango lo vería como las 00:00 del inicio del día y lo rechazaría.
    const hours = data.hours.map((block) => ({
        ...block,
        start_time: toShortTime(block.start_time),
        end_time: normalizeEndTime(block.end_time),
    }));

    assertScheduleCoherent(hours);

    if (hours.length > 0) {
        await assertWithinSucursalHours(space.sucursal_id as number, hours, transaction);
    }

    const rows = hours.map((block) => ({
        space_id: space.space_id as number,
        tenant_id: space.tenant_id,
        day_of_week: block.day_of_week,
        start_time: toTimeValue(block.start_time),
        end_time: toTimeValue(block.end_time),
        price: block.price.toFixed(2),
        is_closed: block.is_closed ?? false,
        user_create: user.user_id,
    }));

    return HourRepository.replaceBySpace(space.space_id as number, rows, transaction);
});

/**
 * Habilita o deshabilita UN bloque (is_closed)
 */
export const toggleClosed = async (spacePublicId: string, hourId: number, user: AuthenticatedUser) => sequelize.transaction(async (transaction) => {
    const { hour } = await resolveManagingSpace(spacePublicId, hourId, user, transaction);
    return HourRepository.update(hour, {
        is_closed: !hour.is_closed,
        user_update: user.user_id,
    }, transaction);
});

/**
 * Habilita o deshabilita un DÍA completo — todos sus bloques, con su is_closed.
 */
export const toggleDayClosed = async (spacePublicId: string, day: DayOfWeek, user: AuthenticatedUser) => sequelize.transaction(async (transaction) => {
    const space = await resolveSpaceForUser(spacePublicId, user, transaction);
    const spaceId = space.space_id as number;

    const rows = await HourRepository.findBySpaceAndDay(spaceId, day, transaction);
    if (rows.length === 0) throw new NotFoundError('El día no tiene horarios registrados');

    const isDayClosed = rows.every((row) => row.is_closed);

    // Una sola sentencia para el día entero: no hay estado intermedio visible.
    return HourRepository.updateClosedByDay(spaceId, day, !isDayClosed, user.user_id, transaction);
});
