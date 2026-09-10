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
        .messages({ 'number.base': 'El país seleccionado no es válido' }),

    isEnabled: Joi.string().valid('A', 'I', 'P').allow('')
        .messages({ 'any.only': 'El estado debe ser A, I o P' }),
});

const DOCUMENT_TYPE_VALUES = ['IDENTITY_CARD', 'PASSPORT', 'LICENSE', 'OTHER'];

// Alta de empresa (wizard de 3 pasos) — payload anidado, un objeto por paso del frontend.
// `system` es el único rol que llega a este endpoint — ver company.service.ts → register.
export const registerCompanySchema = Joi.object({
    company: Joi.object({
        name: Joi.string().trim().min(2).max(200).required()
            .messages({ 'string.min': 'El nombre debe tener al menos 2 caracteres' }),
        document: Joi.string().trim().min(6).max(20).required()
            .messages({ 'string.min': 'El documento no es válido' }),
        country_id: Joi.number().integer().positive().required()
            .messages({ 'number.base': 'El país es requerido' }),
        ubigeo_id: Joi.number().integer().positive().required()
            .messages({ 'number.base': 'El distrito es requerido' }),
        address: Joi.string().trim().min(5).max(255).required(),
        phone_cell: Joi.string().trim().max(20).required(),
        phone: Joi.string().trim().max(20).allow('', null),
    }).required(),

    owner: Joi.object({
        first_name: Joi.string().trim().min(2).max(100).required(),
        last_name: Joi.string().trim().min(2).max(100).required(),
        // Requerido acá (a diferencia de la edición de usuario) — es el usuario de acceso del
        // dueño nuevo, a diferencia de un usuario invitado que ya existe y puede no tener correo.
        email: Joi.string().trim().email().required()
            .messages({ 'string.email': 'El correo no es válido' }),
        password: Joi.string().min(8).max(100).required()
            .messages({ 'string.min': 'La contraseña debe tener al menos 8 caracteres' }),
        phone: Joi.string().trim().max(20).required(),
        country_id: Joi.number().integer().positive().required(),
        document_type: Joi.string().valid(...DOCUMENT_TYPE_VALUES).required()
            .messages({ 'any.only': 'Tipo de documento no válido' }),
        document_number: Joi.string().trim().max(50).required(),
        // String, no Joi.date() — mismo motivo que updateUserSchema: evita el corrimiento de
        // un día que introduce la conversión de zona horaria al guardar un DATEONLY.
        date_birth: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow('', null)
            .messages({ 'string.pattern.base': 'Formato de fecha inválido, usar YYYY-MM-DD' }),
    }).required(),

    plan: Joi.object({
        plan_id: Joi.number().integer().positive().required()
            .messages({ 'number.base': 'El plan es requerido' }),
        billing_period: Joi.string().valid('monthly', 'yearly').required()
            .messages({ 'any.only': 'El período de facturación debe ser monthly o yearly' }),
    }).required(),
});
