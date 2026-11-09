import type { PaginationQuery } from '../../../shared/types/pagination';
import type { CreateBookingClientInput } from '../../users/interfaces/userManageBooking.interface';

export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED', 'NO_SHOW', 'REJECTED'] as const;

export interface CreateManualBookingInput {
    client: CreateBookingClientInput;
    booking_date: string;
    start_time: string;
    end_time: string;
    total_amount: number;
    payment_type_id: number;
    payment_status: 'PENDING' | 'PAID';
    notes?: string | null;
}

export interface ListSpaceBookingsQuery extends PaginationQuery {
    start_date: string;
    end_date: string;
    status?: typeof BOOKING_STATUSES[number];
}
