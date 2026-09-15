/**
 * Configuración de Sequelize — conexión a PostgreSQL con pool ajustable
 * por variables de entorno.
 */
import { Sequelize } from 'sequelize';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// BIGINT (OID 20, int8) llega por defecto como string para no perder precisión más allá de 2^53 —
// los ids autoincrementales nunca se acercan a ese límite, así que se parsean a number y la API los
// expone como números.
pg.types.setTypeParser(20, (value: string) => Number(value));

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
    process.env.DB_NAME as string,
    process.env.DB_USER as string,
    process.env.DB_PASSWORD as string,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
        dialect: 'postgres',
        logging: false,

        /**
         * Pool de conexiones — evita agotar el pool por defecto (5 conexiones)
         * al tener concurrencia alta. Ajustar DB_POOL_MAX según el plan del proveedor.
         */
        pool: {
            max: parseInt(process.env.DB_POOL_MAX as string, 10) || 20,     // conexiones activas máximas
            min: parseInt(process.env.DB_POOL_MIN as string, 10) || 5,      // conexiones siempre abiertas
            acquire: parseInt(process.env.DB_POOL_ACQUIRE as string, 10) || 30000, // ms esperando una conexión libre
            idle: parseInt(process.env.DB_POOL_IDLE as string, 10) || 10000  // ms antes de liberar conexión inactiva
        },

        // SSL obligatorio en producción (RDS, Supabase, Railway, etc.)
        dialectOptions: {
            ssl: isProduction
                ? { require: true, rejectUnauthorized: false }
                : false
        }
    }
);

export default sequelize;
