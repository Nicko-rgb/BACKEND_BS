/**
 * createRouter — Router de Express donde get/post/put/patch/delete envuelven
 * automáticamente cada handler recibido en GlobalErrorHandler.asyncHandler.
 *
 * Por qué: Express 4 no atrapa una promesa rechazada dentro de un handler
 * `async` — si un controller async lanza y nadie lo envolvió a mano en
 * asyncHandler, el request queda colgado sin respuesta en vez de devolver el
 * JSON de error esperado. Usar createRouter() en vez de Router() elimina esa
 * clase de bug de raíz: no depende de que cada desarrollador se acuerde de
 * envolver cada ruta.
 *
 * Los middlewares síncronos (verificarTokenAuth, validateDTO, etc.) no
 * cambian de comportamiento al quedar envueltos — Express 4 ya atrapa sus
 * throws síncronos, y pasarlos por asyncHandler es un no-op seguro.
 *
 * Uso: igual que un Router normal.
 *   const router = createRouter();
 *   router.post('/ruta', verificarTokenAuth, verificarPermiso('booking.confirm'), validateDTO(dto), miController);
 */
import { Router } from 'express';
import type { RequestHandler } from 'express';
import GlobalErrorHandler from '../handlers/GlobalErrorHandler';

const WRAPPED_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

export function createRouter(): Router {
    const router = Router();

    for (const method of WRAPPED_METHODS) {
        const original = router[method].bind(router);

        (router as any)[method] = (path: string, ...handlers: RequestHandler[]) => {
            const wrapped = handlers.map(h => GlobalErrorHandler.asyncHandler(h));
            return original(path, ...wrapped);
        };
    }

    return router;
}
