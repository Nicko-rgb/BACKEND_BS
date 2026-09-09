import type { Request, Response, NextFunction } from 'express';
import type { Schema } from 'joi';
import { ValidationError } from '../errors/CustomErrors';

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
