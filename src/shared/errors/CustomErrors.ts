/**
 * Errores personalizados para toda la aplicación.
 * Estos errores son manejados por el GlobalErrorHandler.
 */

/** Error de validación — usado para errores de validación de datos */
export class ValidationError extends Error {
    errors: unknown[];
    details: unknown[];
    statusCode: number;

    constructor(message: string, errors: unknown[] = []) {
        super(message);
        this.name = 'ValidationError';
        this.errors = errors;
        this.details = errors;
        this.statusCode = 400;
    }
}

/** Error de recurso no encontrado */
export class NotFoundError extends Error {
    statusCode: number;

    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

/** Error de conflicto — usado para duplicados o violaciones de reglas de negocio */
export class ConflictError extends Error {
    statusCode: number;

    constructor(message: string) {
        super(message);
        this.name = 'ConflictError';
        this.statusCode = 409;
    }
}

/** Error de autorización — usuario no autenticado */
export class UnauthorizedError extends Error {
    statusCode: number;

    constructor(message = 'No autorizado') {
        super(message);
        this.name = 'UnauthorizedError';
        this.statusCode = 401;
    }
}

/** Error de permisos — usuario autenticado pero sin permisos */
export class ForbiddenError extends Error {
    statusCode: number;
    details: unknown;

    constructor(message = 'Acceso prohibido', details: unknown = null) {
        super(message);
        this.name = 'ForbiddenError';
        this.statusCode = 403;
        this.details = details;
    }
}

/** Error de solicitud incorrecta */
export class BadRequestError extends Error {
    statusCode: number;

    constructor(message: string) {
        super(message);
        this.name = 'BadRequestError';
        this.statusCode = 400;
    }
}
