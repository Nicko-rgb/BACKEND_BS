/**
 * Servidor principal del sistema de reservas deportivas.
 *
 * Orquesta el arranque: Sentry, guards globales de proceso, validación de
 * entorno, base de datos (migraciones/seeders), Redis, Socket.IO, y el
 * ciclo de vida del proceso (listen + graceful shutdown).
 */

// Sentry debe inicializarse antes que todo lo demás para capturar errores desde el arranque
import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        // Captura el 100% de transacciones en desarrollo, ajustar en producción
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    });
    console.log(chalk.green('✅ Sentry: inicializado'));
} else {
    console.log(chalk.yellow('⚠️ Sentry: no configurado'));
}


import http from 'http';
import chalk from 'chalk';
import dotenv from 'dotenv';
import sequelize from './src/config/db';
import logger from './src/config/logger';
import { runPendingMigrations } from './scripts/migrationRunner';
import { startAllJobs } from './src/jobs';
import redisClient from './src/config/redisConfig';
import { initSocket } from './src/config/socketConfig';
import { createApp } from './src/app';

dotenv.config();

/**
 * Red de seguridad para errores que ocurren FUERA del ciclo request/response
 * de Express (jobs en segundo plano, timers, callbacks) — GlobalErrorHandler
 * solo atrapa errores dentro de una request. Sin esto, un throw en uno de
 * esos lugares tumba el proceso entero sin dejar rastro en los logs.
 * Se registran lo antes posible para cubrir también errores durante el arranque.
 * Node deja el proceso en un estado no confiable después de uno de estos —
 * se loguea, se reporta a Sentry si está configurado, y se sale con código de
 * error para que el process manager (PM2/systemd) lo reinicie limpio.
 */
process.on('uncaughtException', (error) => {
    logger.error('uncaughtException — error no capturado, cerrando proceso', { error: error.message, stack: error.stack });
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('unhandledRejection — promesa rechazada sin catch, cerrando proceso', { error: error.message, stack: error.stack });
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
    process.exit(1);
});

// Validación temprana de variables de entorno requeridas ──────────────────────
// Falla rápido en el arranque en lugar de errores críticos en runtime
const REQUIRED_ENV_VARS = [
    'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'MAIL_FROM',
    'JWT_SECRET', 'JWT_EXPIRES_BOOKING', 'CORS_ORIGIN', 'PORT', 'NODE_ENV', 'MP_CREDENTIALS_ENCRYPTION_KEY',
    'FRONT_ADMIN_BOOKING', 'FRONT_BOOKING_APP',
];
const missingVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.error(`[ENV] ❌ Variables de entorno requeridas faltantes: ${missingVars.join(', ')}`);
    console.error('[ENV] Revisa tu archivo .env o las variables del sistema.');
    process.exit(1);
}

const isDev = process.env.NODE_ENV === 'development';

const app = createApp();
const server = http.createServer(app);

/** Verifica la conexión a la base de datos y corre las migraciones pendientes */
async function inicializarBaseDatos(): Promise<void> {
    try {
        await sequelize.authenticate();
        console.log(chalk.green('✅ Base de datos: conectada (PostgreSQL)'));

        // ── 1. Ejecutar migraciones pendientes ────
        if (isDev) {
            console.log(chalk.yellow('📦 Migraciones: omitidas en desarrollo'));
        } else {
            console.log(chalk.cyan('📦 Migraciones: verificando pendientes...'));
            const { applied, failed } = await runPendingMigrations();

            if (failed) {
                throw new Error(`Migración falló: ${failed} — el servidor no puede arrancar`);
            }

            if (applied > 0) {
                console.log(chalk.green(`📦 Migraciones: ${applied} aplicada(s)`));
            } else {
                console.log(chalk.green('📦 Migraciones: esquema al día, sin pendientes'));
            }
        }

        // ── 2. Seeders — siempre manuales ─────
        console.log(chalk.yellow('🌱 Seeders: no se ejecutan automáticamente'));
    } catch (error: any) {
        logger.error('Error al inicializar la base de datos', { error: error.message });
        throw error;
    }
}

/**
 * Función principal para iniciar el servidor
 */
async function iniciarServidor(): Promise<void> {
    try {
        console.log(chalk.bgBlue('\n🔌 CONEXIONES A DB'));
        await inicializarBaseDatos();
        const stopAllJobs = startAllJobs();
        await redisClient.connect();
        await initSocket(server);
        const PORT = process.env.PORT;
        const HOST = isDev ? '0.0.0.0' : (process.env.HOST);

        // Iniciar servidor
        server.listen(Number(PORT), HOST, () => {
            console.log(chalk.bgBlue('\n🎉 SERVIDOR INICIADO EXITOSAMENTE'));

            if (HOST === '0.0.0.0') {
                const os = require('os');
                const interfaces = os.networkInterfaces();
                let localIP = 'localhost';

                for (const name of Object.keys(interfaces)) {
                    for (const iface of interfaces[name]) {
                        if (iface.family === 'IPv4' && !iface.internal) {
                            localIP = iface.address;
                        }
                    }
                }

                console.log(chalk.cyan(`🚀 Servidor corriendo en:`));
                console.log(chalk.cyan(`   - Local:   http://localhost:${PORT}`));
                console.log(chalk.cyan(`   - Red:     http://${localIP}:${PORT}`));
            } else {
                console.log(chalk.cyan(`🚀 Servidor corriendo en: http://${HOST}:${PORT}`));
            }

            console.log(chalk.cyan(`🏥 Health check: http://localhost:${PORT}/health`));
            console.log(chalk.yellow(`🌍 Entorno: ${process.env.NODE_ENV}`));
            console.log(chalk.green('✅ ¡Sistema listo para recibir requests!\n'));
        });

        /**
         * Graceful shutdown — cierra conexiones en orden correcto:
         * 1. Deja de aceptar nuevas conexiones (server.close)
         * 2. Espera que las queries en vuelo terminen (pool de DB)
         */
        const gracefulShutdown = async (signal: string) => {
            logger.info(`Señal ${signal} recibida — iniciando graceful shutdown...`);
            stopAllJobs();

            server.close(async () => {
                try {
                    await sequelize.close();
                    logger.info('Pool de base de datos cerrado');
                    await redisClient.disconnect();
                    logger.info('Conexión Redis cerrada');
                    logger.info('Servidor cerrado correctamente');
                    process.exit(0);
                } catch (err: any) {
                    logger.error('Error durante el graceful shutdown', { error: err.message });
                    process.exit(1);
                }
            });

            // Forzar cierre si tarda más de 15 segundos
            setTimeout(() => {
                logger.error('Graceful shutdown superó el tiempo límite — forzando cierre');
                process.exit(1);
            }, 15000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error: any) {
        logger.error('Error crítico al iniciar el servidor', { error: error.message });
        process.exit(1);
    }
}

// Iniciar el servidor
iniciarServidor();
