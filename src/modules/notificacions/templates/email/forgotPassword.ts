import { base } from './base';

export interface ForgotPasswordData {
    name: string;
    resetUrl: string;
    expiresInMinutes: number;
}

// Email con el enlace de un solo uso para restablecer la contraseña.
export const forgotPasswordTemplate = ({ name, resetUrl, expiresInMinutes }: ForgotPasswordData): string => base({
    title: 'Recuperación de contraseña',
    content: `
        <h2 style="margin:0 0 6px;font-size:20px;color:#2c9d75;">Hola, ${name}</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en Booking Sport.
            El siguiente botón te lleva a crear una nueva.
        </p>
        <div style="text-align:center;margin:28px 0;">
            <a href="${resetUrl}"
               style="background:#2c9d75;color:#ffffff;padding:13px 28px;text-decoration:none;
                      border-radius:6px;font-weight:700;font-size:15px;display:inline-block;">
                Restablecer contraseña
            </a>
        </div>
        <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
            El enlace vence en <strong>${expiresInMinutes} minutos</strong> y solo puede usarse una vez.
        </p>
        <p style="margin:0 0 20px;font-size:12px;color:#94a3b8;line-height:1.6;word-break:break-all;">
            Si el botón no funciona, este es el enlace para abrir en el navegador:<br />
            <a href="${resetUrl}" style="color:#2c9d75;">${resetUrl}</a>
        </p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px 20px;">
            <p style="margin:0;font-size:13px;color:#9a3412;">
                ¿No solicitaste este cambio? No hace falta hacer nada: tu contraseña actual sigue siendo válida.
            </p>
        </div>
    `,
});
