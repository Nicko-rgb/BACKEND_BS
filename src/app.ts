/**
 * Configuración del Express app: seguridad, rate limiting, parsing de body,
 * archivos estáticos, rutas y manejo de errores.
 *
 * No incluye el arranque del servidor HTTP ni la orquestación de conexiones
 * (DB/Redis/Socket.IO) — eso vive en server.ts, el entrypoint. Separarlo así
 * deja `createApp()` testeable con supertest sin necesidad de levantar un
 * puerto real.
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
import ApiResponse from './shared/utils/ApiResponse';
import GlobalErrorHandler from './shared/handlers/GlobalErrorHandler';
import authRoutes from './modules/auth/routes/index.routes';
import systemRoutes from './modules/system/routes/index.routes';
import companysRoutes from './modules/companys/routes/index.routes';
import usersRoutes from './modules/users/routes/index.routes';
import saasRoutes from './modules/saas/routes/index.routes';

export function createApp(): Express {
    const app = express();

    // Se calculan acá adentro (no a nivel de módulo) para que corran recién
    // cuando server.ts llama a createApp() — después de que ya validó que
    // las variables de entorno requeridas existen.
    const isDev = process.env.NODE_ENV === 'development';
    const corsOrigins = (process.env.CORS_ORIGIN as string).split(',').map(origin => origin.trim());

    // Confiar en el primer proxy (Nginx) para leer la IP real del cliente ─────────
    // Sin esto, req.ip siempre sería 127.0.0.1 (Nginx → Node)
    app.set('trust proxy', 1);

    // Seguridad — headers HTTP protectores (XSS, clickjacking, MIME sniffing, etc.)
    app.use(helmet());

    // Compresión gzip/deflate — reduce el tamaño de las respuestas JSON hasta un 80%
    // Solo comprime respuestas mayores a 1KB; threshold evita overhead en respuestas pequeñas
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
     * 200 requests por IP cada 15 minutos.
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

    app.use('/api/', generalLimiter);
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);

    /**
     * Request ID — asigna un ID único a cada request para correlacionar logs.
     * Disponible en req.id y en el header de respuesta X-Request-Id.
     */
    app.use((req: Request, res: Response, next: NextFunction) => {
        req.id = crypto.randomUUID();
        res.setHeader('X-Request-Id', req.id);
        next();
    });

    // Log de cada request entrante ────────────────────────────────────────────────
    app.use((req: Request, _res: Response, next: NextFunction) => {
        logger.info(`${req.method} ${req.path}`, { requestId: req.id, ip: req.ip });
        next();
    });

    // Middleware para parsear JSON
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Servir archivos estáticos (uploads)
    // Cross-Origin-Resource-Policy: cross-origin — permite que frontends en otros puertos
    // carguen imágenes directamente (necesario cuando helmet() setea same-origin por defecto)
    app.use('/uploads', (_req: Request, res: Response, next: NextFunction) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        next();
    }, express.static(path.join(__dirname, '..', 'uploads')));

    // ============================================
    // RUTAS DE LA API
    // ============================================

    // Ruta de salud del servidor
    app.get('/health', (_req: Request, res: Response) => {
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version
        });
    });

    // Cada índice de rutas se agrega acá a medida que su módulo completa la
    // capa routes/controller/service/repository, siguiendo el mismo patrón
    // del backend anterior: cada índice declara sus propios sub-prefijos
    // (/auth, /users, /companies, etc.) y se monta bajo /api.
    app.use('/api', authRoutes);
    app.use('/api', systemRoutes);
    app.use('/api', companysRoutes);
    app.use('/api', usersRoutes);
    app.use('/api', saasRoutes);
    //
    // app.use('/api', bookingsRoutes);
    // app.use('/api', notificacionsRoutes);

    // Manejo de 404 y errores globales
    app.use(GlobalErrorHandler.notFound);
    // Sentry captura errores antes de que el GlobalErrorHandler responda al cliente
    if (process.env.SENTRY_DSN) {
        app.use(Sentry.expressErrorHandler());
    }
    app.use(GlobalErrorHandler.handleError);

    return app;
}
