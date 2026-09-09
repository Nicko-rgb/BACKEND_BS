/**
 * Índice de modelos del módulo `bookings`.
 * Centraliza la importación de los modelos y sus asociaciones, tanto
 * internas como hacia `users`, `companys` y `system` — los tres se importan
 * acá sin problema porque ninguno de ellos importa `bookings` de vuelta.
 */
import { User } from '../../../users/database/models';
import { Space, Rating } from '../../../companys/database/models';
import { PaymentType } from '../../../system/database/models';
import { Booking, associateBooking } from './Booking';
import { PaymentBooking, associatePaymentBooking } from './PaymentBooking';
import { BookingHold } from './BookingHold';

export { Booking, PaymentBooking, BookingHold };

associateBooking({ User, Space, PaymentBooking, Rating });
associatePaymentBooking({ PaymentType, Booking });

// Lado inverso de asociaciones definidas en `companys` — se wirea acá y no
// allá porque `companys` no puede importar `bookings` sin crear una
// dependencia circular (bookings ya importa companys arriba).
Space.hasMany(Booking, { foreignKey: 'space_id', as: 'bookings' });
Rating.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });
