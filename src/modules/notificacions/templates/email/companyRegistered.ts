import { base } from './base';

export interface CompanyRegisteredData {
    ownerName: string;
    companyName: string;
    planName: string;
    adminPanelUrl: string;
}

// Email de bienvenida — la empresa ya quedó activa (alta directa, sin paso de pago).
export const companyRegisteredTemplate = ({ ownerName, companyName, planName, adminPanelUrl }: CompanyRegisteredData): string => base({
    title: '¡Bienvenido a Booking Sport!',
    content: `
        <h2 style="margin:0 0 6px;font-size:20px;color:#2c9d75;">¡Felicidades, ${ownerName}!</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#1a202c;font-weight:600;">
            Tu empresa <strong>${companyName}</strong> ya está activa en Booking Sport, con el plan <strong>${planName}</strong>.
        </p>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
            Ya podés ingresar al panel administrativo para configurar tus sucursales, tus espacios
            y empezar a recibir reservas.
        </p>
        <div style="text-align:center;margin:28px 0;">
            <a href="${adminPanelUrl}"
               style="background:#2c9d75;color:#ffffff;padding:13px 28px;text-decoration:none;
                      border-radius:6px;font-weight:700;font-size:15px;display:inline-block;">
                Ir al panel de administrador
            </a>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-top:8px;">
            <p style="margin:0;font-size:13px;color:#166534;">
                💡 Primeros pasos: creá tus sucursales → configurá los espacios → establecé horarios y precios.
            </p>
        </div>
    `,
});
