import { Op } from 'sequelize';
import type { CreationAttributes, Transaction, WhereOptions } from 'sequelize';
import { Booking, BookingHold } from '../database/models';
import { Company } from '../../companys/database/models';
import type { ListSpaceBookingsQuery } from '../interfaces/booking.interface';
import { toSequelizePagination } from '../../../shared/utils/paginate';
import { overlapWindows } from '../utils/bookingTime';

export const findSucursal = (sucursalId: number, transaction?: Transaction) => Company.findByPk(sucursalId, {
    include: [{ association: 'country' }, { association: 'parentCompany' }], transaction,
});

const overlapWhere = (date: string, start: string, end: string, buffer: number) => ({
    [Op.or]: overlapWindows(date, start, end, buffer).map((window) => ({
        booking_date: window.date,
        start_time: { [Op.lt]: window.end }, end_time: { [Op.gt]: window.start },
    })),
});

export const findOverlap = (spaceId: number, date: string, start: string, end: string, transaction: Transaction, buffer = 0) => Booking.findOne({
    where: {
        space_id: spaceId, status: { [Op.in]: ['PENDING', 'CONFIRMED'] },
        ...overlapWhere(date, start, end, buffer),
    }, transaction,
});

export const findActiveHold = (spaceId: number, date: string, start: string, end: string, transaction: Transaction, buffer = 0) => BookingHold.findOne({
    where: {
        space_id: spaceId, status: 'ACTIVE', expires_at: { [Op.gt]: new Date() },
        ...overlapWhere(date, start, end, buffer),
    }, transaction,
});

export const create = (data: CreationAttributes<Booking>, transaction: Transaction) => Booking.create(data, { transaction });

export const listBySpace = (spaceId: number, query: ListSpaceBookingsQuery) => {
    const where: WhereOptions = {
        space_id: spaceId,
        booking_date: { [Op.between]: [query.start_date, query.end_date] },
        ...(query.status ? { status: query.status } : {}),
    };
    return Booking.findAndCountAll({
        where,
        include: [
            { association: 'user', attributes: ['public_id', 'first_name', 'last_name', 'email', 'phone'] },
            { association: 'payment', attributes: ['payment_id', 'payment_type_id', 'amount', 'method', 'status', 'moneda', 'payment_date'] },
        ],
        order: [['booking_date', 'ASC'], ['start_time', 'ASC'], ['booking_id', 'ASC']],
        ...toSequelizePagination(query),
    });
};
