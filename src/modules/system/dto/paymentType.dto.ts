import Joi from 'joi';
import type { PaymentType } from '../database/models';

// isActive normaliza is_enabled (nombre real de la columna) para que el front no tenga que conocer esa diferencia por recurso.
export const toPaymentTypeDto = (paymentType: PaymentType, referencesCount = 0) => ({
    id: paymentType.payment_type_id,
    countryId: paymentType.country_id,
    countryName: paymentType.country?.country ?? null,
    name: paymentType.name,
    code: paymentType.code,
    category: paymentType.category,
    provider: paymentType.provider,
    description: paymentType.description,
    iconUrl: paymentType.icon_url,
    isActive: paymentType.is_enabled,
    processingTime: paymentType.processing_time,
    commissionPercentage: paymentType.commission_percentage,
    fixedCommission: paymentType.fixed_commission,
    minAmount: paymentType.min_amount,
    maxAmount: paymentType.max_amount,
    referencesCount,
    createdAt: paymentType.created_at,
    updatedAt: paymentType.updated_at,
});

const PAYMENT_CATEGORIES = [
    'tarjeta_credito', 'tarjeta_debito', 'transferencia_bancaria',
    'billetera_digital', 'efectivo', 'criptomoneda',
];

// PUT reemplaza el registro completo — los campos obligatorios en el modelo son requeridos acá,
// los que el modelo permite null quedan opcionales + .allow(null).
export const updatePaymentTypeSchema = Joi.object({
    country_id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'El país es requerido',
            'any.required': 'El país es requerido',
        }),

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

    category: Joi.string().valid(...PAYMENT_CATEGORIES).required()
        .messages({
            'string.empty': 'La categoría es requerida',
            'any.only': 'La categoría no es válida',
            'any.required': 'La categoría es requerida',
        }),

    provider: Joi.string().max(100).allow('', null)
        .messages({
            'string.max': 'El proveedor no puede superar 100 caracteres',
        }),

    description: Joi.string().max(1000).allow('', null)
        .messages({
            'string.max': 'La descripción no puede superar 1000 caracteres',
        }),

    icon_url: Joi.string().uri().max(255).allow('', null)
        .messages({
            'string.uri': 'La URL del ícono debe ser una URL válida',
            'string.max': 'La URL del ícono no puede superar 255 caracteres',
        }),

    is_enabled: Joi.boolean().required()
        .messages({
            'boolean.base': 'El estado habilitado debe ser verdadero o falso',
            'any.required': 'El estado habilitado es requerido',
        }),

    processing_time: Joi.string().max(50).allow('', null)
        .messages({
            'string.max': 'El tiempo de procesamiento no puede superar 50 caracteres',
        }),

    commission_percentage: Joi.number().precision(4).min(0).max(1).allow(null)
        .messages({
            'number.base': 'La comisión porcentual debe ser un número',
            'number.min': 'La comisión porcentual no puede ser negativa',
            'number.max': 'La comisión porcentual no puede superar 1 (100%)',
        }),

    fixed_commission: Joi.number().precision(2).min(0).allow(null)
        .messages({
            'number.base': 'La comisión fija debe ser un número',
            'number.min': 'La comisión fija no puede ser negativa',
        }),

    min_amount: Joi.number().precision(2).min(0).allow(null)
        .messages({
            'number.base': 'El monto mínimo debe ser un número',
            'number.min': 'El monto mínimo no puede ser negativo',
        }),

    max_amount: Joi.number().precision(2).min(0).allow(null)
        .messages({
            'number.base': 'El monto máximo debe ser un número',
            'number.min': 'El monto máximo no puede ser negativo',
        }),
});

// POST creación — mismos campos que el PUT, salvo is_enabled que es opcional (default true, igual que el modelo).
export const createPaymentTypeSchema = updatePaymentTypeSchema.keys({
    is_enabled: Joi.boolean().default(true)
        .messages({
            'boolean.base': 'El estado habilitado debe ser verdadero o falso',
        }),
});
