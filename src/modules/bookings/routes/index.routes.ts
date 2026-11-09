import { createRouter } from '../../../shared/utils/createRouter';
import bookingAdminRoutes from './bookingAdmin.route';

const router = createRouter();
router.use('/bookings/admin', bookingAdminRoutes);

export default router;
