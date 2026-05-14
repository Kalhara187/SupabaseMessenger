import { io } from 'socket.io-client';
import { getApiHost } from './api';

let socket;

export const connectSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  const host = getApiHost();
  socket = io(host, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
