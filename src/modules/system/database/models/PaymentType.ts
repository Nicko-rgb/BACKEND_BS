/**
 * Modelo PaymentType - Gestión de tipos de pago por país
 *
 * Almacena los diferentes métodos de pago disponibles en cada país,
 * incluyendo configuraciones específicas como comisiones, límites de
 * transacción y proveedores de pago.
 */
import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, NonAttribute } from 'sequelize';
import sequelize from '../../../../config/db';
import type { Country } from './Country';

type PaymentCategory = 'tarjeta_credito' | 'tarjeta_debito' | 'transferencia_bancaria' | 'billetera_digital' | 'efectivo' | 'criptomoneda';

export class PaymentType extends Model<InferAttributes<PaymentType>, InferCreationAttributes<PaymentType>> {
    declare payment_type_id: CreationOptional<number>;
    declare country_id: number;
    declare name: string;
    declare code: string;
    declare category: PaymentCategory;
    declare provider: string | null;
    declare description: string | null;
    declare icon_url: string | null;
    declare is_enabled: CreationOptional<boolean>;
    declare processing_time: string | null;
    declare commission_percentage: CreationOptional<string | null>;
    declare fixed_commission: CreationOptional<string | null>;
    declare min_amount: string | null;
    declare max_amount: string | null;
    declare api_config: unknown | null;
    declare readonly created_at: CreationOptional<Date>;
    declare readonly updated_at: CreationOptional<Date>;

    // Asociación (poblada por include, no columna propia) ────────────────────
    declare country?: NonAttribute<Country>;
}

PaymentType.init({
    payment_type_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    country_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: 'dsg_bss_country', key: 'country_id' },
        comment: 'Referencia al país donde está disponible este tipo de pago'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del tipo de pago (ej: Tarjeta de Crédito, PSE, Nequi, Yape)'
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Código único del tipo de pago (ej: CREDIT_CARD, PSE, NEQUI)'
    },
    category: {
        type: DataTypes.ENUM('tarjeta_credito', 'tarjeta_debito', 'transferencia_bancaria', 'billetera_digital', 'efectivo', 'criptomoneda'),
        allowNull: false,
        comment: 'Categoría del tipo de pago'
    },
    provider: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Proveedor del servicio de pago (ej: Mercado Pago, PayU, Stripe)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción detallada del tipo de pago'
    },
    icon_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'URL del icono representativo del tipo de pago'
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el tipo de pago está activo en el sistema'
    },
    processing_time: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Tiempo estimado de procesamiento (ej: Inmediato, 1-3 días)'
    },
    commission_percentage: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
        defaultValue: 0.0000,
        comment: 'Porcentaje de comisión (ej: 0.0350 = 3.5%)'
    },
    fixed_commission: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Comisión fija por transacción'
    },
    min_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Monto mínimo permitido para este tipo de pago'
    },
    max_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Monto máximo permitido para este tipo de pago'
    },
    api_config: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Configuración específica de la API del proveedor (JSON)'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    tableName: 'dsg_bss_payment_types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { unique: true, fields: ['country_id', 'code'], name: 'unique_payment_type_por_country' },
        { fields: ['category'], name: 'idx_category_payment_type' },
        { fields: ['is_enabled'], name: 'idx_is_enabled_payment_type' }
    ],
    comment: 'Tabla que almacena los tipos de pago disponibles por país'
});

// TODO: wire PaymentType→PaymentBooking cuando se porte `bookings`.
export function associatePaymentType(models: { Country: typeof Country }): void {
    PaymentType.belongsTo(models.Country, { foreignKey: 'country_id', as: 'country' });
}
