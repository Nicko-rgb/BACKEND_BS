/**
 * Configuración de Socket.IO — tiempo real para disponibilidad de espacios.
 */
import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import chalk from 'chalk';
import logger from './logger';

let io: Server | undefined;

interface SpaceRoomPayload {
    spaceId?: string | number;
    date?: string;
}

/**
 * Envuelve un handler de evento de socket en try/catch. A diferencia de
 * Express, Socket.IO no tiene un next(err) que reenvíe a un error-handler
 * global — si un handler lanza acá sin capturarlo, Node lo trata como
 * excepción no capturada y tumba TODO el proceso, no solo esa conexión.
 */
function safeSocketHandler<T extends unknown[]>(socket: Socket, eventName: string, handler: (...args: T) => void) {
    return (...args: T) => {
        try {
            handler(...args);
        } catch (error: any) {
            logger.error(`[Socket] Error en handler '${eventName}'`, { socketId: socket.id, error: error.message });
        }
    };
}

/**
 * Inicializa Socket.IO con el servidor HTTP.
 * Si Redis está habilitado, conecta el Redis adapter para soportar
 * múltiples instancias del servidor (escalado horizontal).
 */
export const initSocket = async (server: HttpServer): Promise<Server> => {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Redis adapter — necesario para que los eventos de socket se propaguen
    // entre múltiples instancias del servidor detrás de un load balancer.
    // Si Redis no está disponible, Socket.IO funciona en modo single-server.
    if (process.env.REDIS_ENABLED === 'true' && process.env.REDIS_URL) {
        try {
            const { createAdapter } = await import('@socket.io/redis-adapter');
            const { createClient } = await import('redis');

            // Pub/sub requiere conexiones dedicadas — no reutilizar el cliente principal
            const pubClient = createClient({ url: process.env.REDIS_URL });
            const subClient = pubClient.duplicate();

            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter(createAdapter(pubClient, subClient));

            console.log(chalk.green('✅ Socket.IO: Redis adapter conectado (modo multi-servidor)'));
        } catch (error: any) {
            // No bloquear el arranque si Redis falla — degradar a single-server
            logger.warn(`Redis adapter no disponible. Socket.IO en modo single-server. (${error.message})`);
        }
    }

    io.on('connection', (socket: Socket) => {
        logger.debug(`Usuario conectado: ${socket.id}`);

        // Unirse a una sala específica por espacio + fecha
        // Recibe { spaceId, date } → sala "space:42:2026-03-01"
        socket.on('join_space', safeSocketHandler(socket, 'join_space', ({ spaceId, date }: SpaceRoomPayload = {}) => {
            if (!spaceId || !date) return;
            const room = `space:${String(spaceId)}:${date}`;
            socket.join(room);
            logger.debug(`[Socket] ${socket.id} se unió a la sala: ${room}`);
            socket.emit('join_space_success', { room, socketId: socket.id });
        }));

        // Salir de una sala por espacio + fecha
        socket.on('leave_space', safeSocketHandler(socket, 'leave_space', ({ spaceId, date }: SpaceRoomPayload = {}) => {
            if (!spaceId || !date) return;
            const room = `space:${String(spaceId)}:${date}`;
            socket.leave(room);
            logger.debug(`[Socket] ${socket.id} salió de la sala: ${room}`);
        }));

        socket.on('disconnect', safeSocketHandler(socket, 'disconnect', () => {
            logger.debug(`Usuario desconectado: ${socket.id}`);
        }));
    });

    return io;
};

/**
 * Obtiene la instancia de io ya inicializada
 */
export const getIO = (): Server => {
    if (!io) {
        throw new Error('Socket.IO no ha sido inicializado!');
    }
    return io;
};
