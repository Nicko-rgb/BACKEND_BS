/**
 * Notificación entrante de la pasarela, ya normalizada desde el request HTTP.
 * La autenticidad no viaja acá como tipo: se valida por firma en el service.
 */
export interface WebhookNotification {
    dataId?: string;
    type?: string;
    xSignature?: string;
    xRequestId?: string;
}
