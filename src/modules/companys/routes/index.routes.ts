import { createRouter } from '../../../shared/utils/createRouter';
import companyRoutes from './company.route';
import sucursalRoutes from './sucursal.route';
import sucursalConfigRoutes from './sucursalConfig.route';

const router = createRouter();


router.use('/companys', companyRoutes);
router.use('/sucursals', sucursalRoutes);
router.use('/sucursal-configurations', sucursalConfigRoutes);

// router.use('/config-company', configCompanyRoutes);


export default router;
