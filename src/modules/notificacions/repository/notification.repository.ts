import type { CreationAttributes } from 'sequelize';
import { Notification } from '../database/models';

// Crea el registro de notificación — deja rastro de cada envío (email, whatsapp, etc.).
export const create = async (data: CreationAttributes<Notification>) => {
    return Notification.create(data);
};
