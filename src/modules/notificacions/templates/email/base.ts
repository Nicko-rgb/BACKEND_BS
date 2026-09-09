export interface EmailBaseOptions {
    title: string;
    content: string;
}

// Wrapper HTML compartido por todos los templates de email — header de marca + footer.
export const base = ({ title, content }: EmailBaseOptions): string => `
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
</head>

<body style="margin:0;padding:0;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:0;">
        <tr>
            <td align="center">
                <table width="600" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 5px 10px rgba(0,0,0,0.08);">

                    <tr>
                        <td style="background:#2c9d75;padding:18px 40px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">
                                🏟 Booking Sport
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:32px 40px;">
                            ${content}
                        </td>
                    </tr>

                    <tr>
                        <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                            <p style="margin:0;font-size:12px;color:#94a3b8;">
                                © ${new Date().getFullYear()} Booking Sport. Todos los derechos reservados.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>

</html>`;
