import Joi from 'joi';

// Query compartida por cualquier endpoint de listado paginado.
export const paginationQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
});
