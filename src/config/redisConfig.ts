/**
 * Cliente Redis singleton — caching + locks distribuidos.
 * Se degrada de forma segura: si Redis está deshabilitado o falla la
 * conexión, todos los métodos devuelven un fallback en vez de lanzar error
 * (fail-open), para que la app siga funcionando sin caching.
 */
import { createClient } from 'redis';
import chalk from 'chalk';
import logger from './logger';

type RedisClientInstance = ReturnType<typeof createClient>;

class RedisClient {
    private client: RedisClientInstance | null = null;
    private isConnected = false;
    private readonly isEnabled = process.env.REDIS_ENABLED === 'true';
    private connectionAttempted = false;

    async connect(): Promise<void> {
        if (!this.isEnabled) {
            logger.warn('Redis está deshabilitado en las variables de entorno');
            return;
        }

        if (this.connectionAttempted) return;
        this.connectionAttempted = true;

        try {
            this.client = createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                socket: {
                    reconnectStrategy: (retries: number) => {
                        if (retries > 3) {
                            logger.error('Abandonando intentos de conexión a Redis después de 3 intentos');
                            return new Error('No se pudo conectar a Redis después de múltiples intentos');
                        }
                        return Math.min(retries * 100, 3000);
                    },
                    connectTimeout: 5000
                }
            });

            this.client.on('error', (err: any) => {
                if (err.code === 'ECONNREFUSED') {
                    logger.warn('Redis no está disponible. La aplicación continuará sin caching.');
                } else {
                    logger.error('Error de Redis', { error: err.message });
                }
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log(chalk.green('✅ Redis: conectado'));
                this.isConnected = true;
            });

            await this.client.connect();
        } catch (error) {
            logger.warn('No se pudo conectar a Redis. La aplicación continuará sin caching.');
            this.isConnected = false;
        }
    }

    async get<T = unknown>(key: string): Promise<T | null> {
        try {
            if (!this.isConnected || !this.client) {
                return null;
            }
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error: any) {
            logger.error('Error al obtener dato de Redis', { error: error.message });
            return null;
        }
    }

    async set(key: string, value: unknown, ttl = 3600): Promise<boolean> {
        try {
            if (!this.isConnected || !this.client) {
                return false;
            }
            await this.client.set(key, JSON.stringify(value), { EX: ttl });
            return true;
        } catch (error: any) {
            logger.error('Error al guardar dato en Redis', { error: error.message });
            return false;
        }
    }

    async del(key: string): Promise<boolean> {
        try {
            if (!this.isConnected || !this.client) {
                return false;
            }
            await this.client.del(key);
            return true;
        } catch (error: any) {
            logger.error('Error al eliminar dato de Redis', { error: error.message });
            return false;
        }
    }

    async delByPattern(pattern: string): Promise<boolean> {
        try {
            if (!this.isConnected || !this.client) {
                return false;
            }
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
            }
            return true;
        } catch (error: any) {
            logger.error('Error al eliminar datos por patrón en Redis', { error: error.message });
            return false;
        }
    }

    /**
     * Intenta adquirir un lock distribuido (SET NX PX).
     * Devuelve true si se adquirió, false si otro proceso ya lo tiene.
     * Ante falla de Redis permite la ejecución (fail-open) para no bloquear el job.
     */
    async setNX(key: string, ttlMs: number): Promise<boolean> {
        try {
            if (!this.isConnected || !this.client) return true; // sin Redis → permitir ejecución
            const result = await this.client.set(key, '1', { NX: true, PX: ttlMs });
            return result === 'OK';
        } catch (error: any) {
            logger.error('Error al adquirir lock en Redis', { error: error.message });
            return true; // ante falla, permitir ejecución para no bloquear el job
        }
    }

    async disconnect(): Promise<void> {
        try {
            if (this.client) {
                await this.client.disconnect();
                this.isConnected = false;
                logger.warn('Desconectado de Redis');
            }
        } catch (error: any) {
            logger.error('Error al desconectar de Redis', { error: error.message });
        }
    }
}

// Exportar instancia singleton
const redisClient = new RedisClient();
export default redisClient;
