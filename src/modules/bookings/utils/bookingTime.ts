import { BadRequestError } from '../../../shared/errors/CustomErrors';

export const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`;

/** Incluye el día anterior/siguiente si el margen entre reservas cruza medianoche. */
export const overlapWindows = (date: string, start: string, end: string, buffer: number) => {
    const from = toMinutes(start) - buffer;
    const to = toMinutes(end) + buffer;
    const windows = [];
    for (let offset = Math.floor(from / 1440); offset < Math.ceil(to / 1440); offset += 1) {
        const day = new Date(`${date}T00:00:00Z`);
        day.setUTCDate(day.getUTCDate() + offset);
        windows.push({
            date: day.toISOString().slice(0, 10),
            start: toTime(Math.max(0, from - offset * 1440)),
            end: toTime(Math.min(1440, to - offset * 1440)),
        });
    }
    return windows;
};

interface ScheduleBlock {
    start_time: string;
    end_time: string;
    is_closed: boolean;
}

/** Permite bloques contiguos, pero nunca huecos ni bloques cerrados. */
export const assertOpenSchedule = (start: number, end: number, blocks: ScheduleBlock[]): void => {
    let coveredUntil = start;
    for (const block of [...blocks].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))) {
        const blockStart = toMinutes(block.start_time);
        const blockEnd = toMinutes(block.end_time) || 1440;
        if (block.is_closed) {
            if (blockStart < end && blockEnd > start) throw new BadRequestError('La reserva incluye un horario cerrado');
            continue;
        }
        if (blockStart <= coveredUntil && blockEnd > coveredUntil) coveredUntil = blockEnd;
    }
    if (coveredUntil < end) throw new BadRequestError('La reserva está fuera del horario de atención del espacio');
};

/** Compara el reloj local del país de la sucursal, nunca el del servidor. */
export const assertFutureBooking = (date: string, start: string, timeZone: string, now = new Date()): void => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now);
    const part = (type: string) => parts.find((item) => item.type === type)!.value;
    const today = `${part('year')}-${part('month')}-${part('day')}`;
    const time = `${part('hour')}:${part('minute')}`;
    if (date < today || (date === today && start < time)) {
        throw new BadRequestError('No se pueden registrar reservas en un horario pasado');
    }
};
