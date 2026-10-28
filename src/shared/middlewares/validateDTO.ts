import type { Request, Response, NextFunction } from 'express';
import type { Schema } from 'joi';
import { publicIdSchema } from '../dto/publicId.schema';
import { NotFoundError, ValidationError } from '../errors/CustomErrors';

export const validateDTO = (schema: Schema) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (error) {
            const messages = error.details.map((e) => e.message);
            next(new ValidationError('Datos de entrada inválidos', messages));
            return;
        }
        req.validatedData = value;
        next();
    };
};

// Igual que validateDTO, pero elige el schema según un param de la ruta (ej. :role) — un valor
// sin schema registrado responde 404, como una ruta inexistente.
export const validateDTOByParam = (param: string, schemas: Record<string, Schema>) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const key = String(req.params[param]);
        if (!Object.prototype.hasOwnProperty.call(schemas, key)) {
            next(new NotFoundError('Recurso no encontrado'));
            return;
        }
        validateDTO(schemas[key])(req, res, next);
    };
};

// Valida que los params indicados sean public_id (UUID v7) — un valor con formato
// inválido nunca puede existir en la DB, así que responde 404 sin consultarla.
export const validatePublicId = (...params: string[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        for (const param of params) {
            const { error } = publicIdSchema.validate(String(req.params[param]));
            if (error) {
                next(new NotFoundError('Recurso no encontrado'));
                return;
            }
        }
        next();
    };
};

export const validateQuery = (schema: Schema) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
        if (error) {
            const messages = error.details.map((e) => e.message);
            next(new ValidationError('Parámetros de consulta inválidos', messages));
            return;
        }
        req.validatedQuery = value;
        next();
    };
};
