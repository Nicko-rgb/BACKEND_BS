/**
 * Lectura segura de errores `unknown`.
 * Con `strict`, el `catch` ya entrega `unknown` — estos helpers evitan el
 * `as any` repetido en cada archivo que solo quiere loguear el error.
 */

/** Mensaje legible de un error desconocido — para logs. Nunca lanza. */
export const toErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Error desconocido';
};

/** Lee una prop de un error desconocido (`status`, `code`, ...) — undefined si no existe. */
export const readErrorProp = (error: unknown, key: string): unknown => {
    if (typeof error === 'object' && error !== null && key in error) {
        return (error as Record<string, unknown>)[key];
    }
    return undefined;
};
