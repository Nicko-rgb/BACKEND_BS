import { createRouter } from '../../../shared/utils/createRouter';
import companyRoutes from './company.route';
import sucursalRoutes from './sucursal.route';
import sucursalConfigRoutes from './sucursalConfig.route';
import spaceRoutes from './space.route';

const router = createRouter();


router.use('/companys', companyRoutes);
router.use('/sucursals', sucursalRoutes);
router.use('/sucursal-configurations', sucursalConfigRoutes);
router.use('/spaces', spaceRoutes);

// router.use('/config-company', configCompanyRoutes);


export default router;
