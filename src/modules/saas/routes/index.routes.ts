import { createRouter } from '../../../shared/utils/createRouter';
import webhookRoutes from './webhook.route';
import planUsageRoutes from './planUsage.route';
import planRoutes from './plan.route';

const router = createRouter();

// Prefijo base del módulo — app.ts solo hace app.use('/api', saasRoutes),
// sin conocer las subrutas internas. Cada recurso nuevo del módulo se suma
// acá con su propio *.route.ts.
router.use('/saas', webhookRoutes);
router.use('/saas', planRoutes);
router.use('/saas/plan-usage', planUsageRoutes);

export default router;
