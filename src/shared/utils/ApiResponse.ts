// Respuestas de la API
import type { Request, Response } from 'express';

// Marca '-server' para distinguir en dev si el mensaje vino del backend —
// nunca debe llegar al usuario final en producción.
const isProduction = process.env.NODE_ENV === 'production';
const tagMessage = (message: string): string => isProduction ? message : message + '-server';

// Respuesta exitosa
const ok = (res: Response, data: unknown = null, message = 'Operación exitosa', status = 200, extra: Record<string, unknown> = {}) => {
    const payload = {
        success: true,
        data,
        message: tagMessage(message),
        timestamp: new Date().toISOString(),
        ...extra
    };
    return res.status(status).json(payload);
};

// Respuesta de creación exitosa
const created = (res: Response, data: unknown = null, message = 'Creado exitosamente', extra: Record<string, unknown> = {}) => {
    return ok(res, data, message, 201, extra);
};

// Respuesta de error
const error = (req: Request | undefined, res: Response, code = 'ERROR', message = 'Error', details: unknown = null, status = 400) => {
    // details puede traer los mensajes reales (Joi, ValidationError) como array
    // de strings — el front los prioriza sobre `message` (genérico), así que
    // también necesitan el tag '-server' para distinguirse en dev.
    const taggedDetails = Array.isArray(details) && details.every(d => typeof d === 'string')
        ? details.map(tagMessage)
        : details;

    const payload = {
        success: false,
        error: {
            code,
            message: tagMessage(message),
            details: taggedDetails
        },
        timestamp: new Date().toISOString(),
        path: req?.path || null
    };
    return res.status(status).json(payload);
};

export default { ok, created, error };
