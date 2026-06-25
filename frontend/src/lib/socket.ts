import { io, type Socket } from 'socket.io-client';
import { tokenStore } from './tokenStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

let socket: Socket | null = null;

/**
 * Lazily create (or reuse) the singleton Socket.io connection, authenticating
 * with the current access token. The backend joins the socket to
 * `user:<id>` and `role:<role>` rooms and emits `notification:new`.
 */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(SOCKET_URL ?? '/', {
    autoConnect: false,
    transports: ['websocket'],
    auth: { token: tokenStore.getAccess() },
  });
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  s.auth = { token: tokenStore.getAccess() };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) socket.disconnect();
}
