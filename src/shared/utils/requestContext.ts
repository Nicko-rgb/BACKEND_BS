import { AsyncLocalStorage } from 'async_hooks';

/**
 * Contexto por-request para correlacionar eventos que ocurren en capas más
 * profundas (ej: un hit/miss de cacheUtility.withCache) con el request HTTP
 * que los originó — sin tener que pasar el request/logger a mano por todas
 * las capas (service → repository). Se arma en app.ts envolviendo toda la
 * cadena de middlewares con runWithRequestContext, y se lee al final (evento
 * 'finish' de la response) para loguear un resumen.
 */
export interface CacheEvent {
    prefix: string;
    source: 'redis' | 'db';
}

interface RequestContextStore {
    cacheEvents: CacheEvent[];
}

const storage = new AsyncLocalStorage<RequestContextStore>();

export function runWithRequestContext<T>(fn: () => T): T {
    return storage.run({ cacheEvents: [] }, fn);
}

export function recordCacheEvent(event: CacheEvent): void {
    storage.getStore()?.cacheEvents.push(event);
}

export function getCacheEvents(): CacheEvent[] {
    return storage.getStore()?.cacheEvents ?? [];
}
