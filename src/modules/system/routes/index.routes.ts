import { createRouter } from '../../../shared/utils/createRouter';
import permissionRoutes from './permission.route';
import menuItemRoutes from './menuItem.route';
import roleRoutes from './role.route';
import countryRoutes from './country.route';
import sportTypeRoutes from './sportType.route';
import sportCategoryRoutes from './sportCategory.route';
import surfaceTypeRoutes from './surfaceType.route';
import paymentTypeRoutes from './paymentType.route';
import ubigeoRoutes from './ubigeo.route';

const router = createRouter();

// Prefijo base del módulo — app.ts solo hace app.use('/api', systemRoutes),
// sin conocer las subrutas internas. Cada recurso nuevo del módulo se suma
// acá con su propio *.route.ts.
router.use('/system', permissionRoutes);
router.use('/system', menuItemRoutes);
router.use('/system', roleRoutes);
router.use('/system', countryRoutes);
router.use('/system', sportTypeRoutes);
router.use('/system', sportCategoryRoutes);
router.use('/system', surfaceTypeRoutes);
router.use('/system', paymentTypeRoutes);
router.use('/system', ubigeoRoutes);

export default router;
