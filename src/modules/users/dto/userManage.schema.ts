import Joi from 'joi';
import { paginationQuerySchema } from '../../../shared/dto/pagination.schema';
import { PROFILE_FIELDS } from './user.schema';
import type { ManagedRole } from '../../../shared/utils/roleHierarchy';

const DOCUMENT_TYPE_VALUES = ['IDENTITY_CARD', 'PASSPORT', 'LICENSE', 'OTHER'];

// Query del catálogo global de usuarios — page/limit + search (nombre o correo) + filtros exactos
// opcionales por rol y país.
export const listUsersQuerySchema = paginationQuerySchema.keys({
    search: Joi.string().trim().max(150).allow('')
        .messages({ 'string.max': 'La búsqueda no puede superar 150 caracteres' }),

    role: Joi.string().trim().max(50).allow('')
        .messages({ 'string.max': 'El rol no es válido' }),

    countryId: Joi.number().integer().positive()
        .messages({
            'number.base': 'El país seleccionado no es válido',
            'number.integer': 'El país seleccionado no es válido',
            'number.positive': 'El país seleccionado no es válido',
        }),
});

// ── Campos ──────────────────────────────────────────────────────────────────────────────────

const PERSONAL_CREATE = {
    first_name: PROFILE_FIELDS.first_name.required()
        .messages({ 'string.empty': 'El nombre es requerido', 'any.required': 'El nombre es requerido' }),
    last_name: PROFILE_FIELDS.last_name.required()
        .messages({ 'string.empty': 'El apellido es requerido', 'any.required': 'El apellido es requerido' }),
    date_birth: PROFILE_FIELDS.date_birth.allow(''),
    phone: Joi.string().trim().max(20).required()
        .messages({
            'string.empty': 'El teléfono celular es requerido',
            'string.max': 'El teléfono no puede superar 20 caracteres',
            'any.required': 'El teléfono celular es requerido',
        }),
};

// Roles con acceso al panel admin (system, super_admin, administrador, empleado): correo,
// contraseña y documento obligatorios.
const ADMIN_ACCESS_CREATE = {
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
    country_id: PROFILE_FIELDS.country_id.required()
        .messages({ 'any.required': 'El país es requerido' }),
    document_type: Joi.string().valid(...DOCUMENT_TYPE_VALUES).required()
        .messages({ 'any.only': 'Tipo de documento no válido', 'any.required': 'El tipo de documento es requerido' }),
    document_number: Joi.string().trim().max(50).required()
        .messages({
            'string.empty': 'El número de documento es requerido',
            'string.max': 'El número de documento no puede superar 50 caracteres',
            'any.required': 'El número de documento es requerido',
        }),
};

// Cliente (puede ser invitado): solo el país es obligatorio.
const CLIENT_ACCESS_CREATE = {
    email: PROFILE_FIELDS.email,
    password: Joi.string().min(8).max(100).allow('', null)
        .messages({
            'string.min': 'La contraseña debe tener al menos 8 caracteres',
            'string.max': 'La contraseña no puede superar 100 caracteres',
        }),
    country_id: PROFILE_FIELDS.country_id.required()
        .messages({ 'any.required': 'El país es requerido' }),
    document_type: PROFILE_FIELDS.document_type,
    document_number: PROFILE_FIELDS.document_number,
};

const SUCURSAL_ROLE = Joi.string().valid('administrador', 'empleado')
    .messages({ 'any.only': 'El rol debe ser administrador o empleado' });

const SUCURSALES = Joi.array().items(Joi.string().guid()).min(1).unique()
    .messages({
        'array.base': 'Las sucursales no son válidas',
        'array.min': 'Seleccioná al menos una sucursal',
        'array.unique': 'Hay sucursales repetidas',
        'string.guid': 'Alguna de las sucursales seleccionadas no es válida',
        'any.required': 'Seleccioná al menos una sucursal',
    });

const PROFILE_UPDATE = {
    ...PROFILE_FIELDS,
    date_birth: PROFILE_FIELDS.date_birth.allow(''),
    is_enabled: Joi.boolean()
        .messages({ 'boolean.base': 'Habilitado debe ser verdadero o falso' }),
};

// En los roles con acceso al panel el correo es el usuario de login — no se puede vaciar.
const ADMIN_EMAIL_UPDATE = {
    email: Joi.string().trim().email()
        .messages({ 'string.empty': 'El correo es requerido', 'string.email': 'El correo no es válido' }),
};

const partialUpdate = (keys: Joi.PartialSchemaMap) => Joi.object(keys).min(1).messages({
    'object.min': 'Debe enviar al menos un campo para actualizar',
});

// ── Schemas por rol ─────────────────────────────────────────────────────────────────────────

export const createUserSchemas: Record<ManagedRole, Joi.ObjectSchema> = {
    system: Joi.object({ ...PERSONAL_CREATE, ...ADMIN_ACCESS_CREATE }),
    super_admin: Joi.object({
        ...PERSONAL_CREATE,
        ...ADMIN_ACCESS_CREATE,
        company_tenant_id: Joi.string().guid().required()
            .messages({ 'string.guid': 'La empresa seleccionada no es válida', 'any.required': 'La empresa es requerida' }),
    }),
    administrador: Joi.object({ ...PERSONAL_CREATE, ...ADMIN_ACCESS_CREATE, sucursales: SUCURSALES.required() }),
    empleado: Joi.object({ ...PERSONAL_CREATE, ...ADMIN_ACCESS_CREATE, sucursales: SUCURSALES.required() }),
    cliente: Joi.object({ ...PERSONAL_CREATE, ...CLIENT_ACCESS_CREATE }),
};

export const updateUserSchemas: Record<ManagedRole, Joi.ObjectSchema> = {
    system: partialUpdate({ ...PROFILE_UPDATE, ...ADMIN_EMAIL_UPDATE }),
    super_admin: partialUpdate({ ...PROFILE_UPDATE, ...ADMIN_EMAIL_UPDATE }),
    administrador: partialUpdate({ ...PROFILE_UPDATE, ...ADMIN_EMAIL_UPDATE, role: SUCURSAL_ROLE, sucursales: SUCURSALES }),
    empleado: partialUpdate({ ...PROFILE_UPDATE, ...ADMIN_EMAIL_UPDATE, role: SUCURSAL_ROLE, sucursales: SUCURSALES }),
    cliente: partialUpdate(PROFILE_UPDATE),
};
