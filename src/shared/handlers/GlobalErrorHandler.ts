/**
 * Handler de errores global para toda la aplicación
 * Centraliza el manejo de errores para evitar redundancia entre módulos
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import ApiResponse from '../utils/ApiResponse';
import logger from '../../config/logger';
import * as Sentry from '@sentry/node';

/**
 * Arma el texto principal del log a partir del error. Para ValidationError,
 * error.message queda genérico ("Datos de entrada inválidos") — el mensaje
 * real de Joi (incluidos los custom con .messages()) vive en error.details,
 * un array de strings. Cuando aplica, se usa eso para el log en vez del
 * genérico; para el resto de errores (details como objeto, o sin details)
 * se deja error.message tal cual.
 */
const buildLogMessage = (error: any): string => {
    if (Array.isArray(error.details) && error.details.length > 0 && error.details.every((d: unknown) => typeof d === 'string')) {
        return error.details.join(' | ');
    }
    return error.message;
};

class GlobalErrorHandler {
    /**
     * Maneja errores de manera centralizada
     */
    static handleError(error: any, req: Request, res: Response, _next: NextFunction) {
        const statusCode = error.statusCode || 500;

        // Log estructurado del error con contexto del request
        logger.error(buildLogMessage(error), {
            requestId: req.id,
            name: error.name,
            path: req.path,
            method: req.method,
            // Detalle estructurado (Joi, Sequelize, etc.) para debug/log aggregation
            ...(error.details && { details: error.details }),
            // Stack trace solo para errores 5xx (bug real) y solo en desarrollo —
            // un 4xx ya se explica solo con message/details, y en producción no
            // hay que exponer rutas de archivos ni estructura interna del server.
            ...(statusCode >= 500 && process.env.NODE_ENV !== 'production' && { stack: error.stack })
        });

        // Reportar a Sentry solo errores 5xx (internos) — excluir errores esperados de cliente
        if (statusCode >= 500 && process.env.SENTRY_DSN) {
            Sentry.captureException(error, {
                extra: { requestId: req.id, path: req.path, method: req.method }
            });
        }

        // Error de validación personalizado (desde validateDTO)
        if (error.name === 'ValidationError' && error.statusCode === 400) {
            return ApiResponse.error(req, res, 'VALIDATION_ERROR', error.message, error.details || error.errors, 400);
        }

        // Error de validación de Joi (directo si no pasa por validateDTO)
        if (error.name === 'ValidationError' && error.isJoi) {
            const details = error.details.map((detail: any) => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));
            return ApiResponse.error(req, res, 'VALIDATION_ERROR', 'Datos inválidos', details, 400);
        }

        // Error de Sequelize - Constraint único
        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = error.errors[0]?.path || 'campo';
            const details = { field, value: error.errors[0]?.value };
            return ApiResponse.error(req, res, 'DUPLICATE_ENTRY', `Ya existe un registro con este ${field}`, details, 409);
        }

        // Error de Sequelize - Validación
        if (error.name === 'SequelizeValidationError') {
            const details = error.errors.map((err: any) => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            return ApiResponse.error(req, res, 'VALIDATION_ERROR', 'Error de validación en la base de datos', details, 400);
        }

        // Error de Sequelize - Foreign Key
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            const details = { field: error.fields, table: error.table };
            return ApiResponse.error(req, res, 'FOREIGN_KEY_ERROR', 'Referencia inválida a otro registro', details, 400);
        }

        // Error de Sequelize - Database Connection
        if (error.name === 'SequelizeConnectionError') {
            return ApiResponse.error(req, res, 'DATABASE_CONNECTION_ERROR', 'Error de conexión con la base de datos', null, 503);
        }

        // Error de Sequelize - Timeout
        if (error.name === 'SequelizeTimeoutError') {
            return ApiResponse.error(req, res, 'DATABASE_TIMEOUT', 'Tiempo de espera agotado en la base de datos', null, 408);
        }

        // Error de Sequelize - Database Error (errores específicos de la base de datos)
        if (error.name === 'SequelizeDatabaseError') {
            // Error de tipo de dato inválido (ej: "get-companys" a bigint)
            if (error.parent && error.parent.code === '22P02') {
                const pgMessage = error.parent.message || error.message;
                return ApiResponse.error(req, res, 'INVALID_DATA_TYPE', pgMessage, { query: error.sql || null }, 400);
            }

            // Otros errores de base de datos
            return ApiResponse.error(req, res, 'DATABASE_ERROR', error.parent?.message || error.message, null, 500);
        }

        // Error de autenticación JWT
        if (error.name === 'TokenExpiredError') {
            return ApiResponse.error(req, res, 'TOKEN_EXPIRED', 'Token expirado', null, 401);
        }

        if (error.name === 'JsonWebTokenError') {
            return ApiResponse.error(req, res, 'INVALID_TOKEN', 'Token inválido', null, 401);
        }

        // Errores personalizados con statusCode
        if (error.statusCode) {
            const code = error.name || 'CUSTOM_ERROR';
            return ApiResponse.error(req, res, code, error.message, error.details || null, error.statusCode);
        }

        // Error genérico del servidor
        return ApiResponse.error(req, res, 'INTERNAL_SERVER_ERROR', 'Error interno del servidor', null, 500);
    }

    /**
     * Wrapper para funciones async (o sync) que reenvía cualquier error/rechazo
     * a next(). Acepta ambas firmas — envolver un handler síncrono es un no-op
     * seguro, así que `createRouter` (shared/utils/createRouter.ts) puede
     * envolver todo por igual sin distinguir cuáles son async.
     */
    static asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * Middleware para rutas no encontradas
     */
    static notFound(req: Request, _res: Response, next: NextFunction): void {
        const error: any = new Error(`Ruta no encontrada en el servidor - ${req.originalUrl}`);
        error.statusCode = 404;
        next(error);
    }
}

export default GlobalErrorHandler;
