/**
 * Configuración de PM2 para producción en VPS Elastika.
 * Instancias: 1 porque PostgreSQL y Redis también corren en el mismo VPS —
 * escalar a 2 requeriría que el job de expiración tenga distributed lock activo (ver MEJORAS_PENDIENTES #8).
 */
module.exports = {
    apps: [
        {
            name: 'booking-backend',
            script: './server.ts',
            // Corre el .ts directo sin paso de compilación previo — requiere que
            // `tsx` esté instalado en el servidor (hoy es devDependency: si el
            // deploy usa `npm ci --omit=dev` esto falla). Alternativa a futuro:
            // compilar con `tsc` a dist/ y apuntar `script` al .js compilado.
            interpreter: 'tsx',

            // Una sola instancia — comparte VPS con PostgreSQL y Redis
            instances: 1,
            exec_mode: 'fork',

            // Reiniciar automáticamente si supera 512 MB de RAM
            max_memory_restart: '512M',

            // No vigilar cambios de archivo en producción
            watch: false,

            // Variables de entorno de producción
            env_production: {
                NODE_ENV: 'production',
                PORT: 5010,
            },

            // Logs separados con fecha para facilitar debugging
            error_file: './logs/pm2-err.log',
            out_file: './logs/pm2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            merge_logs: true,

            // Reintentos antes de marcar como error y no seguir ciclando
            max_restarts: 10,
            min_uptime: '10s',
        },
    ],
};
