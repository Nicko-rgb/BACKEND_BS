import Joi from 'joi';
import type { SaaSPlan } from '../../saas/database/models';

export const toPlanDto = (plan: SaaSPlan, referencesCount = 0) => ({
    id: plan.plan_id,
    name: plan.name,
    code: plan.code,
    priceMonthly: plan.price_monthly,
    priceYearly: plan.price_yearly,
    maxSubsidiaries: plan.max_subsidiaries,
    maxSpaces: plan.max_spaces,
    maxUsers: plan.max_users,
    hasStripeConnect: plan.has_stripe_connect,
    maxInvoicesMonthly: plan.max_invoices_monthly,
    notificationsTier: plan.notifications_tier,
    hasAdvancedReports: plan.has_advanced_reports,
    allowsMultiCompany: plan.allows_multi_company,
    features: plan.features,
    isActive: plan.is_active,
    referencesCount,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
});

// PUT reemplaza el registro completo — todos los campos son requeridos. Los IDs de MercadoPago
// quedan fuera de este formulario por su complejidad/no exposición en el DTO de lectura.
export const updatePlanSchema = Joi.object({
    name: Joi.string().min(2).max(100).required()
        .messages({
            'string.base': 'El nombre es requerido',
            'string.empty': 'El nombre es requerido',
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede superar 100 caracteres',
            'any.required': 'El nombre es requerido',
        }),

    code: Joi.string().min(2).max(50).uppercase().pattern(/^[A-Z0-9_]+$/).required()
        .messages({
            'string.base': 'El código es requerido',
            'string.empty': 'El código es requerido',
            'string.min': 'El código debe tener al menos 2 caracteres',
            'string.max': 'El código no puede superar 50 caracteres',
            'string.pattern.base': 'El código solo puede tener mayúsculas, números y guion bajo',
            'any.required': 'El código es requerido',
        }),

    price_monthly: Joi.number().precision(2).min(0).required()
        .messages({
            'number.base': 'El precio mensual es requerido',
            'number.min': 'El precio mensual no puede ser negativo',
            'any.required': 'El precio mensual es requerido',
        }),

    price_yearly: Joi.number().precision(2).min(0).required()
        .messages({
            'number.base': 'El precio anual es requerido',
            'number.min': 'El precio anual no puede ser negativo',
            'any.required': 'El precio anual es requerido',
        }),

    max_subsidiaries: Joi.number().integer().min(0).required()
        .messages({
            'number.base': 'El máximo de sucursales es requerido',
            'number.min': 'El máximo de sucursales no puede ser negativo',
            'any.required': 'El máximo de sucursales es requerido',
        }),

    max_spaces: Joi.number().integer().min(0).required()
        .messages({
            'number.base': 'El máximo de espacios es requerido',
            'number.min': 'El máximo de espacios no puede ser negativo',
            'any.required': 'El máximo de espacios es requerido',
        }),

    max_users: Joi.number().integer().min(0).required()
        .messages({
            'number.base': 'El máximo de usuarios es requerido',
            'number.min': 'El máximo de usuarios no puede ser negativo',
            'any.required': 'El máximo de usuarios es requerido',
        }),

    has_stripe_connect: Joi.boolean().required()
        .messages({
            'boolean.base': 'Stripe Connect debe ser verdadero o falso',
            'any.required': 'Stripe Connect es requerido',
        }),

    max_invoices_monthly: Joi.number().integer().min(0).required()
        .messages({
            'number.base': 'El máximo de facturas mensuales es requerido',
            'number.min': 'El máximo de facturas mensuales no puede ser negativo',
            'any.required': 'El máximo de facturas mensuales es requerido',
        }),

    // Valores conocidos hoy — un nivel nuevo es un cambio de código (agregar acá), nunca una
    // migración de DB, porque la columna es STRING libre a propósito (ver 027_baseline_saas_plans).
    notifications_tier: Joi.string().valid('basic', 'full').required()
        .messages({
            'string.empty': 'El nivel de notificaciones es requerido',
            'any.only': 'El nivel de notificaciones debe ser basic o full',
            'any.required': 'El nivel de notificaciones es requerido',
        }),

    has_advanced_reports: Joi.boolean().required()
        .messages({
            'boolean.base': 'Reportes avanzados debe ser verdadero o falso',
            'any.required': 'Reportes avanzados es requerido',
        }),

    allows_multi_company: Joi.boolean().required()
        .messages({
            'boolean.base': 'Multi empresa debe ser verdadero o falso',
            'any.required': 'Multi empresa es requerido',
        }),

    is_active: Joi.boolean().required()
        .messages({
            'boolean.base': 'El estado activo debe ser verdadero o falso',
            'any.required': 'El estado activo es requerido',
        }),

    features: Joi.array().items(
        Joi.string().trim().min(1).max(200).messages({
            'string.empty': 'Cada característica debe tener texto',
            'string.max': 'Cada característica no puede superar 200 caracteres',
        })
    ).required()
        .messages({
            'array.base': 'Las características deben ser una lista',
            'any.required': 'Las características son requeridas',
        }),
});
