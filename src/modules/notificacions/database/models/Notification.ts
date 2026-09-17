/**
 * Notification - Sistema de notificaciones
 *
 * Almacena las notificaciones para clientes a través de múltiples canales
 * (in-app, email, SMS, push) con seguimiento de entrega y programación.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from '../../../../config/db';
import type { User } from '../../../users/database/models';
import type { Company } from '../../../companys/database/models';

// Única fuente de verdad de los tipos de notificación — en la base es un VARCHAR, así que sumar
// uno nuevo no necesita migración.
type NotificationType =
    | 'BOOKING_CONFIRMATION' | 'BOOKING_REMINDER' | 'BOOKING_CANCELLATION'
    | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'PAYMENT_REMINDER'
    | 'FACILITY_UPDATE' | 'PROMOTION' | 'SYSTEM_MAINTENANCE'
    | 'WELCOME' | 'WELCOME_USER' | 'PASSWORD_RESET' | 'ACCOUNT_VERIFICATION' | 'GENERAL'
    | 'BOOKING_THANK_YOU';
type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
type Channel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH' | 'WHATSAPP';
type RelatedEntityType = 'BOOKING' | 'PAYMENT' | 'FACILITY' | 'USER' | 'SPACE';
type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';

export class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
    declare notification_id: CreationOptional<number>;
    declare client_id: number;
    declare company_id: number | null;
    declare tenant_id: string | null;
    declare title: string;
    declare message: string;
    declare notification_type: CreationOptional<NotificationType>;
    declare priority: CreationOptional<Priority>;
    declare channel: CreationOptional<Channel>;
    declare read_status: CreationOptional<boolean>;
    declare read_at: Date | null;
    declare sent_at: Date | null;
    declare scheduled_for: Date | null;
    declare expires_at: Date | null;
    declare related_entity_type: RelatedEntityType | null;
    declare related_entity_id: number | null;
    declare action_url: string | null;
    declare action_text: string | null;
    declare delivery_status: CreationOptional<DeliveryStatus>;
    declare delivery_attempts: CreationOptional<number>;
    declare metadata: unknown | null;
    declare user_create: number;
    declare user_update: number | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;
}

Notification.init({
    notification_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la notificación'
    },
    client_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'ID del cliente que recibe la notificación',
        references: { model: 'dsg_bss_user', key: 'user_id' }
    },
    company_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'ID de la compañía que envía la notificación — null si no pertenece a una empresa',
        references: { model: 'dsg_bss_company', key: 'company_id' }
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: true,
        comment: 'Identificador del tenant para multi-tenancy — null si no pertenece a una empresa'
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Título de la notificación'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Contenido del mensaje de la notificación'
    },
    notification_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'GENERAL',
        comment: 'Tipo de notificación — valores válidos en el tipo NotificationType'
    },
    priority: {
        type: DataTypes.ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT'),
        allowNull: false,
        defaultValue: 'NORMAL',
        comment: 'Nivel de prioridad'
    },
    channel: {
        type: DataTypes.ENUM('IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WHATSAPP'),
        allowNull: false,
        defaultValue: 'IN_APP',
        comment: 'Canal de entrega'
    },
    read_status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si la notificación ha sido leída'
    },
    read_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora en que se leyó la notificación'
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora en que se envió la notificación'
    },
    scheduled_for: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora programada para el envío'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora de expiración de la notificación'
    },
    related_entity_type: {
        type: DataTypes.ENUM('BOOKING', 'PAYMENT', 'FACILITY', 'USER', 'SPACE'),
        allowNull: true,
        comment: 'Tipo de entidad relacionada'
    },
    related_entity_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'ID de la entidad relacionada'
    },
    action_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL para la acción de la notificación'
    },
    action_text: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Texto del botón de acción'
    },
    delivery_status: {
        type: DataTypes.ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'),
        allowNull: false,
        defaultValue: 'PENDING',
        comment: 'Estado de entrega'
    },
    delivery_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Número de intentos de entrega'
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Metadatos adicionales de la notificación'
    },
    user_create: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario que creó el registro'
    },
    user_update: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: { model: 'dsg_bss_user', key: 'user_id' },
        comment: 'Usuario que actualizó el registro'
    },
    created_at: { type: DataTypes.DATE, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: true }
}, {
    sequelize,
    tableName: 'dsg_bss_notification',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { name: 'idx_notification_client', fields: ['client_id'] },
        { name: 'idx_notification_company', fields: ['company_id'] },
        { name: 'idx_notification_type', fields: ['notification_type'] },
        { name: 'idx_notification_status', fields: ['delivery_status'] },
        { name: 'idx_notification_read', fields: ['client_id', 'read_status'] },
        { name: 'idx_notification_scheduled', fields: ['scheduled_for'] },
        { name: 'idx_notification_tenant', fields: ['tenant_id'] }
    ],
    comment: 'Tabla de notificaciones del sistema'
});

export function associateNotification(models: { User: typeof User; Company: typeof Company }): void {
    Notification.belongsTo(models.User, { foreignKey: 'client_id', as: 'user' });
    Notification.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
}
