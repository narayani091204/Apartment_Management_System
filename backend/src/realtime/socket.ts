import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer, type Socket } from 'socket.io';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../utils/jwt.js';
import type { Role } from '../models/User.js';
import { logger } from '../utils/logger.js';

let io: SocketServer | null = null;

/* Room helpers — keep room naming in one place. */
export const userRoom = (userId: string) => `user:${userId}`;
export const roleRoom = (role: Role) => `role:${role}`;

interface AuthedSocket extends Socket {
  data: { userId: string; role: Role };
}

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  /* Authenticate every connection from the JWT passed in the handshake. */
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = verifyAccessToken(token);
      (socket as AuthedSocket).data = { userId: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, role } = (socket as AuthedSocket).data;
    socket.join(userRoom(userId));
    socket.join(roleRoom(role));
    logger.info(`Socket connected: user=${userId} role=${role}`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: user=${userId}`);
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

/* Emit to a single user across all their devices. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  getIO().to(userRoom(userId)).emit(event, payload);
}

/* Emit to every connected user of a given role. */
export function emitToRole(role: Role, event: string, payload: unknown): void {
  getIO().to(roleRoom(role)).emit(event, payload);
}
