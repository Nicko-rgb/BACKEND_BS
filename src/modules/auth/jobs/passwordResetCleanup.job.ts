import cron from 'node-cron';
import logger from '../../../config/logger';
import * as PasswordResetTokenRepository from '../repository/passwordResetToken.repository';

// Limpieza diaria de madrugada (tráfico mínimo). Acepta expresión de 5 campos;
// se puede pisar con env sin tocar código.
const DEFAULT_CRON_EXPRESSION = '0 3 * * *';
const cronExpression = process.env.PASSWORD_RESET_CLEANUP_CRON || DEFAULT_CRON_EXPRESSION;

if (!cron.validate(cronExpression)) {
    throw new Error(`[PasswordResetCleanup] Expresión cron inválida: "${cronExpression}" (PASSWORD_RESET_CLEANUP_CRON)`);
}

/**
 * Purga diaria de tokens de recuperación vencidos — `node-cron`, sin infra externa.
 * Idempotente (un DELETE por índice), así que es seguro si corren varias instancias
 * (PM2 cluster): todas borran lo mismo, sin efectos laterales.
 * Corre una vez al arrancar (limpia lo acumulado durante downtime) y luego según el
 * cron. Devuelve la tarea para detenerla en el graceful shutdown.
 */
export const startPasswordResetCleanup = () => {
    let running = false;

    const run = async () => {
        if (running) return;
        running = true;
        try {
            const deleted = await PasswordResetTokenRepository.purgeExpired();
            if (deleted > 0) logger.info(`[PasswordResetCleanup] ${deleted} token(s) vencidos purgados`);
        } catch (error: any) {
            logger.error('[PasswordResetCleanup] Purga falló', { error: error.message });
        } finally {
            running = false;
        }
    };

    void run();
    const task = cron.schedule(cronExpression, () => { void run(); });
    logger.info(`[PasswordResetCleanup] Programado: "${cronExpression}"`);

    return task;
};
