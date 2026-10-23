import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import sequelize from '../../../config/db';
import { BadRequestError } from '../../../shared/errors/CustomErrors';
import logger from '../../../config/logger';
import * as UserRepository from '../../users/repository/user.repository';
import * as PasswordResetTokenRepository from '../repository/passwordResetToken.repository';
import { notify } from '../../notificacions/service/notification.service';
import { NotificationEvents } from '../../notificacions/constants/notificationEvents';

const RESET_TOKEN_TTL_MINUTES = 30;
const RESET_REQUEST_COOLDOWN_MS = 2 * 60 * 1000;
const RESET_PASSWORD_PATH = '/auth/reset-password';
const LOGIN_PATH = '/auth/login';

// Hash SHA-256 (hex) del token — lo único que se guarda en la base
const hashResetToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');

// Clientes van al portal de reservas; el resto de roles, al panel admin
const frontUrlFor = (roleKey: string | undefined): string => {
    return (roleKey === 'cliente' ? process.env.FRONT_BOOKING_APP : process.env.FRONT_ADMIN_BOOKING) as string;
};

/**
 * Si el correo es de un usuario habilitado (y no pidió otro enlace hace poco), invalida sus
 * enlaces previos, guarda el hash de un token nuevo y le envía el enlace. Devuelve si se envió.
 */
export const processResetRequest = async (email: string): Promise<boolean> => {
    try {
        const user = await UserRepository.findByEmailForLogin(email);
        if (!user || !user.is_enabled) {
            return false
        }

        const userId = Number(user.user_id);
        const lastToken = await PasswordResetTokenRepository.findLatestByUser(userId);
        if (lastToken && Date.now() - lastToken.created_at.getTime() < RESET_REQUEST_COOLDOWN_MS) return false;

        const token = crypto.randomBytes(32).toString('base64url');

        await sequelize.transaction(async (transaction) => {
            await PasswordResetTokenRepository.invalidateActiveByUser(userId, transaction);
            await PasswordResetTokenRepository.create({
                user_id: userId,
                token_hash: hashResetToken(token),
                expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
            }, transaction);
        });

        const isSent = await notify(NotificationEvents.FORGOT_PASSWORD, '[PasswordReset]', {
            email,
            name: user.first_name || email,
            resetUrl: `${frontUrlFor(user.roleRef?.key)}${RESET_PASSWORD_PATH}#token=${token}`,
            expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
        });

        return isSent;
    } catch (error: any) {
        logger.error(`[PasswordReset] Correo de recuperación no enviado a ${email}`, { error: error.message });
        return false;
    }
};

// Comprueba que el enlace siga vigente, sin consumirlo — usado al abrir la página de nueva contraseña
export const validateResetToken = async (token: string): Promise<void> => {
    const resetToken = await PasswordResetTokenRepository.findActiveByHash(hashResetToken(token));
    if (!resetToken) throw new BadRequestError('El enlace no es válido o ya expiró');
};

/**
 * Consume el enlace (un solo uso) y guarda la nueva contraseña. Un token inexistente, vencido o
 * ya usado devuelve siempre el mismo error, sin distinguir cuál de los tres es.
 */
export const resetPassword = async (token: string, password: string): Promise<void> => {
    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await sequelize.transaction(async (transaction) => {
        const resetToken = await PasswordResetTokenRepository.consume(hashResetToken(token), transaction);
        if (!resetToken) throw new BadRequestError('El enlace no es válido o ya expiró');

        await UserRepository.updatePassword(resetToken.user_id, hashedPassword, transaction);
        return resetToken.user_id;
    });

    logger.info('[PasswordReset] Contraseña restablecida', { userId });

    // Aviso al dueño de la cuenta — un cambio que no hizo él tiene que saberlo
    const user = await UserRepository.findById(userId);
    if (!user?.email) return;

    await notify(NotificationEvents.PASSWORD_CHANGED, '[PasswordReset]', {
        email: user.email,
        name: user.first_name || user.email,
        loginUrl: `${frontUrlFor(user.roleRef?.key)}${LOGIN_PATH}`,
    });
};