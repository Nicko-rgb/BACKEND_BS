import { createRouter } from '../../../shared/utils/createRouter';
import webhookRoutes from './webhook.route';

const router = createRouter();

// Prefijo base del módulo — app.ts solo hace app.use('/api', saasRoutes),
// sin conocer las subrutas internas. Cada recurso nuevo del módulo se suma
// acá con su propio *.route.ts.
router.use('/saas', webhookRoutes);

export default router;
