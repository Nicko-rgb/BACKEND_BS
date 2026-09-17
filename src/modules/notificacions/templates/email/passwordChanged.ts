import { base } from './base';

export interface PasswordChangedData {
    name: string;
    loginUrl: string;
}

// Aviso de que la contraseña de la cuenta se cambió.
export const passwordChangedTemplate = ({ name, loginUrl }: PasswordChangedData): string => base({
    title: 'Tu contraseña fue cambiada',
    content: `
        <h2 style="margin:0 0 6px;font-size:20px;color:#2c9d75;">Hola, ${name}</h2>
        <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
            La contraseña de tu cuenta en Booking Sport se cambió correctamente. Desde ahora, es la que
            tenés que usar para ingresar.
        </p>
        <div style="text-align:center;margin:28px 0;">
            <a href="${loginUrl}"
               style="background:#2c9d75;color:#ffffff;padding:13px 28px;text-decoration:none;
                      border-radius:6px;font-weight:700;font-size:15px;display:inline-block;">
                Ir a iniciar sesión
            </a>
        </div>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px 20px;">
            <p style="margin:0;font-size:13px;color:#9a3412;">
                ¿No fuiste vos? Entrá a "¿Olvidaste tu contraseña?" para recuperar tu cuenta cuanto antes
                y revisá quién tiene acceso a este correo.
            </p>
        </div>
    `,
});
