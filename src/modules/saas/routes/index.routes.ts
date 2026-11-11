import { createRouter } from '../../../shared/utils/createRouter';
import webhookRoutes from './webhook.route';
import planUsageRoutes from './planUsage.route';
import subscriptionRoutes from './subscription.route';
import planRoutes from './plan.route';

const router = createRouter();

// Prefijo base del módulo — app.ts solo hace app.use('/api/v2', saasRoutes),
// sin conocer las subrutas internas. Cada recurso nuevo del módulo se suma
// acá con su propio *.route.ts.
//
// El módulo queda partido por responsabilidad, no por tabla:
//   - /plans        → catálogo de planes (lectura pública + gestión system)
//   - /subscription → estado comercial y mutaciones de la suscripción de una empresa
//   - /plan-usage   → SOLO lectura de cupos (lo que consume cada límite del plan)
//   - /webhooks     → notificaciones de la pasarela (público, validado por firma)
router.use('/saas', webhookRoutes);
router.use('/saas', planRoutes);
router.use('/saas/subscription', subscriptionRoutes);
router.use('/saas/plan-usage', planUsageRoutes);

export default router;
