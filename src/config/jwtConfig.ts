import jwt from 'jsonwebtoken';

export const validateJwtDurations = (): void => {
    for (const variable of ['JWT_EXPIRES', 'JWT_EXPIRES_BOOKING'] as const) {
        try {
            const token = jwt.sign({}, process.env.JWT_SECRET as string, {
                expiresIn: process.env[variable] as jwt.SignOptions['expiresIn'],
            });
            const payload = jwt.decode(token) as jwt.JwtPayload;
            if (!payload.exp || !payload.iat || payload.exp <= payload.iat) throw new Error('Invalid duration');
        } catch {
            throw new Error(`[ENV] ${variable} debe indicar una duración positiva válida, por ejemplo 24h o 7d.`);
        }
    }
};
