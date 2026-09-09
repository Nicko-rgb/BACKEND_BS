/**
 * Extiende Express.Request con las propiedades que agregan los middlewares
 * compartidos, para poder usar req.user/req.id/req.validatedData con tipado
 * en vez de castear `as any` en cada controller.
 */
import type { AuthenticatedUser } from './auth';

declare global {
    namespace Express {
        interface Request {
            /** UUID asignado por el middleware de request-id en server.ts */
            id?: string;
            /** Payload del JWT — null si el token es opcional y no vino, undefined si aún no pasó por el middleware */
            user?: AuthenticatedUser | null;
            /** Body ya validado por validateDTO — la forma exacta depende del schema Joi de cada ruta */
            validatedData?: any;
            /** Query params ya validados por validateQuery — la forma exacta depende del schema Joi de cada ruta */
            validatedQuery?: any;
        }
    }
}

export {};
