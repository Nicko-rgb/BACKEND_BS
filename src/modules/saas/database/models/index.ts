/**
 * Índice de modelos del módulo `saas`.
 * Centraliza la importación de los modelos y sus asociaciones, tanto
 * internas como hacia `companys` y `system` — ninguno de los dos importa
 * `saas` de vuelta.
 */
import { Company } from '../../../companys/database/models';
import { Country } from '../../../system/database/models';
import { SaaSPlan } from './SaaSPlan';
import { SaaSSubscription } from './SaaSSubscription';
import { SaaSSubscriptionCompany } from './SaaSSubscriptionCompany';
import { SaaSSeguimiento } from './SaaSSeguimiento';
import { SaaSInvoice } from './SaaSInvoice';

export { SaaSPlan, SaaSSubscription, SaaSSubscriptionCompany, SaaSSeguimiento, SaaSInvoice };

SaaSPlan.associate({ SaaSSubscription });
SaaSSubscription.associate({ SaaSPlan });
SaaSSubscriptionCompany.associate({ SaaSSubscription, Company });
SaaSSeguimiento.associate({ Country });
SaaSInvoice.associate({ SaaSSubscription, Company, SaaSPlan });

// Lado inverso de SaaSSubscriptionCompany — se wirea acá y no en `companys` porque ese
// módulo no puede importar `saas` sin crear una dependencia circular (saas ya importa
// companys arriba). Qué empresa(s) cubre una suscripción vive en la tabla puente, nunca
// en una FK directa entre Company y SaaSSubscription (ver nota en SaaSSubscription.ts).
SaaSSubscription.hasMany(SaaSSubscriptionCompany, { foreignKey: 'subscription_id', as: 'subscriptionCompanies' });
Company.hasMany(SaaSSubscriptionCompany, { foreignKey: 'company_id', as: 'companySubscriptions' });
