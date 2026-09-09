import { createRouter } from '../../../shared/utils/createRouter';
import companyRoutes from './company.route';

const router = createRouter();


router.use('/companys', companyRoutes);

// router.use('/config-company', configCompanyRoutes);


export default router;
