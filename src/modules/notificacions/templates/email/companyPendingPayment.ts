import { base } from './base';

export interface CompanyPendingPaymentData {
    ownerName: string;
    companyName: string;
    planName: string;
    paymentUrl: string;
}

/**
 * Email al dueño recién registrado — su empresa quedó creada pero pendiente de pago hasta
 * que autorice la suscripción en MercadoPago. El link de pago abre el checkout de
 * MercadoPago directo (nunca pasa por este backend ni pide la tarjeta acá).
 */
export const companyPendingPaymentTemplate = ({ ownerName, companyName, planName, paymentUrl }: CompanyPendingPaymentData): string => base({
    title: 'Activa tu empresa en Booking Sport',
    content: `
        <h2 style="margin:0 0 6px;font-size:20px;color:#2c9d75;">¡Hola, ${ownerName}!</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#1a202c;font-weight:600;">
            Tu empresa <strong>${companyName}</strong> fue registrada con el plan <strong>${planName}</strong>.
        </p>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
            Falta un solo paso para activarla: autorizar el cobro de tu suscripción. Tenés
            <strong>7 días de prueba gratis</strong> — no se te cobra nada hasta que termine el trial.
        </p>
        <div style="text-align:center;margin:28px 0;">
            <a href="${paymentUrl}"
               style="background:#2c9d75;color:#ffffff;padding:13px 28px;text-decoration:none;
                      border-radius:6px;font-weight:700;font-size:15px;display:inline-block;">
                Activar mi empresa
            </a>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-top:8px;">
            <p style="margin:0;font-size:13px;color:#166534;">
                💳 Vas a cargar tu tarjeta directo en la página de MercadoPago — nunca pasa por Booking Sport.
            </p>
        </div>
    `,
});
