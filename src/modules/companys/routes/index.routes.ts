import { createRouter } from '../../../shared/utils/createRouter';
import companyRoutes from './company.route';
import sucursalRoutes from './sucursal.route';

const router = createRouter();


router.use('/companys', companyRoutes);
router.use('/sucursals', sucursalRoutes);

// router.use('/config-company', configCompanyRoutes);


export default router;
