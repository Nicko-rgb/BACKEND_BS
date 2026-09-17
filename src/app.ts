/**
 * Configuración del Express app: seguridad, rate limiting, parsing de body,
 * archivos estáticos, rutas y manejo de errores.
 */
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';
import crypto from 'crypto';
import * as Sentry from '@sentry/node';
import logger from './config/logger';
import { runWithRequestContext, getCacheEvents } from './shared/utils/requestContext';
import GlobalErrorHandler from './shared/handlers/GlobalErrorHandler';
import authRoutes from './modules/auth/routes/index.routes';
import systemRoutes from './modules/system/routes/index.routes';
import companysRoutes from './modules/companys/routes/index.routes';
import usersRoutes from './modules/users/routes/index.routes';
import saasRoutes from './modules/saas/routes/index.routes';

export function createApp(): Express {
    const app = express();
    const isDev = process.env.NODE_ENV === 'development';
    const corsOrigins = (process.env.CORS_ORIGIN as string).split(',').map(origin => origin.trim());

    // Confiar en el primer proxy (Nginx) para leer la IP real del cliente ─────────
    app.set('trust proxy', 1);

    // Contexto por-request (AsyncLocalStorage)
    app.use((_req: Request, _res: Response, next: NextFunction) => {
        runWithRequestContext(() => next());
    });

    // Seguridad — headers HTTP protectores (XSS, clickjacking, MIME sniffing, etc.)
    app.use(helmet());

    // Compresión gzip/deflate — reduce el tamaño de las respuestas JSON hasta un 80%
    app.use(compression({ level: 6, threshold: 1024 }));

    // CORS — múltiples frontends permitidos vía variable de entorno
    app.use(cors({
        origin: isDev ? '*' : corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));

    /**
     * Rate limiting — límite general para toda la API.
     * 100 requests por IP cada 15 minutos.
     */
    const generalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        // En desarrollo subimos el límite para no bloquearnos con hot-reload y StrictMode
        max: process.env.NODE_ENV === 'production' ? 100 : 2000,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Demasiadas solicitudes desde esta IP, intenta en 15 minutos.' }
    });

    /**
     * Rate limiting estricto para endpoints de autenticación.
     * 10 intentos por IP cada 15 minutos — protege contra fuerza bruta.
     */
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Demasiados intentos de autenticación, intenta en 15 minutos.' }
    });

    /**
     * Rate limiting para recuperación de contraseña.
     * 5 solicitudes por IP cada 15 minutos — evita el abuso del envío de correos.
     */
    const passwordResetLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 5,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Demasiadas solicitudes de recuperación, intenta en 15 minutos.' }
    });

    app.use('/api/', generalLimiter);
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
    app.use('/api/auth/password-request', passwordResetLimiter);
    app.use('/api/auth/password-reset', passwordResetLimiter);

    /**
     * Request ID — asigna un ID único a cada request para correlacionar logs.
     * Disponible en req.id y en el header de respuesta X-Request-Id.
     */
    app.use((req: Request, res: Response, next: NextFunction) => {
        req.id = crypto.randomUUID();
        res.setHeader('X-Request-Id', req.id);
        next();
    });

    // Log de cada request — se emite al terminar (evento 'finish' de la response)
    app.use((req: Request, res: Response, next: NextFunction) => {
        const startedAt = process.hrtime.bigint();

        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
            const cache = getCacheEvents();

            logger.info(`${req.method} ${req.path} - ${res.statusCode}`, {
                requestId: req.id,
                ip: req.ip,
                durationMs: Math.round(durationMs),
                ...(cache.length > 0 && { cache })
            });
        });

        next();
    });

    // Middleware para parsear JSON
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Servir archivos estáticos (uploads)
    // Cross-Origin-Resource-Policy: cross-origin — permite que frontends en otros puertos
    app.use('/uploads', (_req, res: Response, next: NextFunction) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        next();
    }, express.static(path.join(__dirname, '..', 'uploads')));

    // ============================================
    // RUTAS DE LA API
    // ============================================

    // Ruta de salud del servidor
    app.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'OK', timestamp: new Date().toISOString(), version: process.env.npm_package_version });
    });

    // Cada índice de rutas se agrega acá a medida que su módulo completa la
    // capa routes/controller/service/repository
    app.use('/api', authRoutes);
    app.use('/api', systemRoutes);
    app.use('/api', companysRoutes);
    app.use('/api', usersRoutes);
    app.use('/api', saasRoutes);

    // Manejo de 404 y errores globales
    app.use(GlobalErrorHandler.notFound);
    // Sentry captura errores antes de que el GlobalErrorHandler responda al cliente
    if (process.env.SENTRY_DSN) {
        app.use(Sentry.expressErrorHandler());
    }
    app.use(GlobalErrorHandler.handleError);

    return app;
}
