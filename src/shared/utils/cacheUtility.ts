import redisClient from '../../config/redisConfig';

/**
 * Utilidad para manejar operaciones de cache con Redis.
 * Proporciona métodos para generar claves, obtener, establecer y eliminar
 * datos de cache.
 */
class CacheUtility {
    private readonly isEnabled: boolean;
    private readonly defaultTTL: number;

    constructor() {
        this.isEnabled = process.env.REDIS_ENABLED === 'true';
        this.defaultTTL = parseInt(process.env.REDIS_TTL as string, 10) || 3600;
    }

    /**
     * Genera una clave de cache única basada en un prefijo y parámetros.
     */
    generateKey(prefix: string, params: object = {}): string {
        if (typeof prefix !== 'string') {
            throw new Error('El prefijo debe ser una cadena');
        }

        const paramsString = Object.keys(params).length > 0
            ? `:${JSON.stringify(params)}`
            : '';

        return `${prefix}${paramsString}`;
    }

    /** Obtiene un valor de cache */
    async get<T = unknown>(key: string): Promise<T | null> {
        if (!this.isEnabled) {
            return null;
        }
        return await redisClient.get<T>(key);
    }

    /** Establece un valor en cache */
    async set(key: string, value: unknown, ttl: number = this.defaultTTL): Promise<boolean> {
        if (!this.isEnabled) {
            return false;
        }
        return await redisClient.set(key, value, ttl);
    }

    /** Elimina un valor de cache */
    async del(key: string): Promise<boolean> {
        if (!this.isEnabled) {
            return false;
        }
        return await redisClient.del(key);
    }

    /** Elimina todos los valores de cache que coincidan con un patrón */
    async delByPattern(pattern: string): Promise<boolean> {
        if (!this.isEnabled) {
            return false;
        }
        return await redisClient.delByPattern(pattern);
    }

    /**
     * Método para manejar operaciones de cache en un solo lugar.
     * Ideal para métodos que obtienen datos de una fuente y los cachean.
     */
    async withCache<T>(prefix: string, params: object, fetchFn: () => Promise<T>, ttl: number = this.defaultTTL): Promise<T> {
        if (!this.isEnabled) {
            return await fetchFn();
        }

        const key = this.generateKey(prefix, params);
        const cachedData = await this.get<T>(key);

        if (cachedData) {
            return cachedData;
        }

        const data = await fetchFn();
        await this.set(key, data, ttl);

        return data;
    }
}

// Exportar instancia singleton
const cacheUtility = new CacheUtility();
export default cacheUtility;
