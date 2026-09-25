import logger from '../config/logger';
import { startPasswordResetCleanup } from '../modules/auth/jobs/passwordResetCleanup.job';
import chalk from 'chalk';

// Cada job expone `start*()` que devuelve algo con `.stop()` (ej. ScheduledTask de
// node-cron). Agregar un job nuevo = 1 línea acá (import + entrada en `jobStarters`);
// server.ts no se toca: llama a `startAllJobs()` al arrancar y a `stopAllJobs()` en
// el graceful shutdown, sin importar cuántos haya.
const jobStarters: Array<() => { stop: () => void }> = [
    startPasswordResetCleanup,
];

/** Arranca todos los jobs registrados. Llamar una vez, después de conectar la DB. */
export const startAllJobs = (): (() => void) => {
    const tasks = jobStarters.map((start) => start());
    console.log(chalk.green(`[JOBS] - ${tasks.length} job(s) iniciados`))

    return () => {
        for (const task of tasks) {
            try {
                task.stop();
            } catch (error: any) {
                logger.error('[Jobs] Error deteniendo un job', { error: error.message });
            }
        }
    };
};
