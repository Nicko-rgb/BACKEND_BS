/**
 * Índice de modelos del módulo `auth`.
 * Solo asocia hacia `users` — `users` no importa `auth` de vuelta.
 */
import { User } from '../../../users/database/models';
import { PasswordResetToken, associatePasswordResetToken } from './PasswordResetToken';

export { PasswordResetToken };

associatePasswordResetToken({ User });
