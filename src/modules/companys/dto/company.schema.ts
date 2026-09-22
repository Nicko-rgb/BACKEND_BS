import Joi from 'joi';
import { paginationQuerySchema } from '../../../shared/dto/pagination.schema';

// Query del listado de empresas — page/limit de paginationQuerySchema + search opcional (nombre o
// documento) + filtros exactos opcionales por país y estado.
export const listCompaniesQuerySchema = paginationQuerySchema.keys({
    search: Joi.string().trim().max(100).allow('')
        .messages({
            'string.max': 'La búsqueda no puede superar 100 caracteres',
        }),

    countryId: Joi.number().integer().positive()
        .messages({
            'number.base': 'El país seleccionado no es válido',
            'number.integer': 'El país seleccionado no es válido',
            'number.positive': 'El país seleccionado no es válido',
        }),

    isEnabled: Joi.string().valid('A', 'I', 'P').allow('')
        .messages({ 'any.only': 'El estado debe ser A, I o P' }),
});

const DOCUMENT_TYPE_VALUES = ['IDENTITY_CARD', 'PASSPORT', 'LICENSE', 'OTHER'];

// Campos de la empresa compartidos entre el alta (dentro de registerCompanySchema.company) y la
// autoedición (updateCompanySchema) — la única diferencia es qué campos son `.required()`.
// Cada regla trae su propio mensaje explícito, nunca el texto genérico de Joi.
const COMPANY_FIELDS = {
    name: Joi.string().trim().min(2).max(200)
        .messages({
            'string.empty': 'El nombre es requerido',
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede superar 200 caracteres',
            'any.required': 'El nombre es requerido',
        }),
    document: Joi.string().trim().min(6).max(20)
        .messages({
            'string.empty': 'El documento es requerido',
            'string.min': 'El documento no es válido',
            'string.max': 'El documento no es válido',
            'any.required': 'El documento es requerido',
        }),
    country_id: Joi.number().integer().positive()
        .messages({
            'number.base': 'El país es requerido',
            'number.integer': 'El país seleccionado no es válido',
            'number.positive': 'El país seleccionado no es válido',
            'any.required': 'El país es requerido',
        }),
    ubigeo_id: Joi.number().integer().positive()
        .messages({
            'number.base': 'El distrito es requerido',
            'number.integer': 'El distrito seleccionado no es válido',
            'number.positive': 'El distrito seleccionado no es válido',
            'any.required': 'El distrito es requerido',
        }),
    address: Joi.string().trim().min(5).max(255)
        .messages({
            'string.empty': 'La dirección es requerida',
            'string.min': 'La dirección debe tener al menos 5 caracteres',
            'string.max': 'La dirección no puede superar 255 caracteres',
            'any.required': 'La dirección es requerida',
        }),
    phone_cell: Joi.string().trim().max(20)
        .messages({
            'string.empty': 'El teléfono celular es requerido',
            'string.max': 'El teléfono celular no puede superar 20 caracteres',
            'any.required': 'El teléfono celular es requerido',
        }),
    phone: Joi.string().trim().max(20).allow('', null)
        .messages({
            'string.max': 'El teléfono fijo no puede superar 20 caracteres',
        }),
};

// Alta de empresa (wizard de 3 pasos) — payload anidado, un objeto por paso del frontend.
// `system` es el único rol que llega a este endpoint — ver company.service.ts → register.
export const registerCompanySchema = Joi.object({
    company: Joi.object({
        name: COMPANY_FIELDS.name.required(),
        document: COMPANY_FIELDS.document.required(),
        country_id: COMPANY_FIELDS.country_id.required(),
        ubigeo_id: COMPANY_FIELDS.ubigeo_id.required(),
        address: COMPANY_FIELDS.address.required(),
        phone_cell: COMPANY_FIELDS.phone_cell.required(),
        phone: COMPANY_FIELDS.phone,
    }).required().messages({ 'any.required': 'Los datos de la empresa son requeridos' }),

    owner: Joi.object({
        first_name: Joi.string().trim().min(2).max(100).required()
            .messages({
                'string.empty': 'El nombre del dueño es requerido',
                'string.min': 'El nombre del dueño debe tener al menos 2 caracteres',
                'string.max': 'El nombre del dueño no puede superar 100 caracteres',
                'any.required': 'El nombre del dueño es requerido',
            }),
        last_name: Joi.string().trim().min(2).max(100).required()
            .messages({
                'string.empty': 'El apellido del dueño es requerido',
                'string.min': 'El apellido del dueño debe tener al menos 2 caracteres',
                'string.max': 'El apellido del dueño no puede superar 100 caracteres',
                'any.required': 'El apellido del dueño es requerido',
            }),
        // Requerido acá (a diferencia de la edición de usuario) — es el usuario de acceso del
        // dueño nuevo, a diferencia de un usuario invitado que ya existe y puede no tener correo.
        email: Joi.string().trim().email().required()
            .messages({
                'string.empty': 'El correo es requerido',
                'string.email': 'El correo no es válido',
                'any.required': 'El correo es requerido',
            }),
        password: Joi.string().min(8).max(100).required()
            .messages({
                'string.empty': 'La contraseña es requerida',
                'string.min': 'La contraseña debe tener al menos 8 caracteres',
                'string.max': 'La contraseña no puede superar 100 caracteres',
                'any.required': 'La contraseña es requerida',
            }),
        phone: Joi.string().trim().max(20).required()
            .messages({
                'string.empty': 'El teléfono del dueño es requerido',
                'string.max': 'El teléfono del dueño no puede superar 20 caracteres',
                'any.required': 'El teléfono del dueño es requerido',
            }),
        country_id: Joi.number().integer().positive().required()
            .messages({
                'number.base': 'El país del dueño es requerido',
                'number.integer': 'El país seleccionado no es válido',
                'number.positive': 'El país seleccionado no es válido',
                'any.required': 'El país del dueño es requerido',
            }),
        document_type: Joi.string().valid(...DOCUMENT_TYPE_VALUES).required()
            .messages({
                'any.only': 'Tipo de documento no válido',
                'any.required': 'El tipo de documento es requerido',
            }),
        document_number: Joi.string().trim().max(50).required()
            .messages({
                'string.empty': 'El número de documento es requerido',
                'string.max': 'El número de documento no puede superar 50 caracteres',
                'any.required': 'El número de documento es requerido',
            }),
        // String, no Joi.date() — mismo motivo que updateUserSchema: evita el corrimiento de
        // un día que introduce la conversión de zona horaria al guardar un DATEONLY.
        date_birth: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null)
            .messages({ 'string.pattern.base': 'Formato de fecha inválido, usar YYYY-MM-DD' }),
    }).required().messages({ 'any.required': 'Los datos del dueño son requeridos' }),

    plan: Joi.object({
        plan_public_id: Joi.string().guid().required()
            .messages({
                'string.guid': 'El plan seleccionado no es válido',
                'any.required': 'El plan es requerido',
            }),
        billing_period: Joi.string().valid('monthly', 'yearly').required()
            .messages({
                'any.only': 'El período de facturación debe ser monthly o yearly',
                'any.required': 'El período de facturación es requerido',
            }),
    }).required().messages({ 'any.required': 'Los datos del plan son requeridos' }),
});

// Autoedición de la propia empresa — todo opcional (PUT parcial). `document` (RUC) incluido
// para poder corregir un dato mal cargado al registrar — el Service revalida que no choque con
// el de otra empresa, mismo criterio que al registrar (ver company.service.ts → updateByPublicId).
export const updateCompanySchema = Joi.object(COMPANY_FIELDS).min(1).messages({
    'object.min': 'Debe enviar al menos un campo para actualizar',
});
