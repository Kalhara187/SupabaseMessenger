import { io } from 'socket.io-client';
import * as Network from 'expo-network';
import { getApiHost } from './api';

let socket;
let networkSubscription;
let currentToken = null;

const attachNetworkListener = () => {
  if (networkSubscription || typeof Network.addNetworkStateListener !== 'function') {
    return;
  }

  networkSubscription = Network.addNetworkStateListener((state) => {
    if (!socket) {
      return;
    }

    if (state.isConnected === false) {
      socket.disconnect();
      return;
    }

    if (state.isConnected && !socket.connected) {
      socket.connect();
    }
  });
};

export const connectSocket = (token) => {
  if (socket && currentToken === token) {
    if (!socket.connected) {
      socket.connect();
    }

    return socket;
  }

  if (socket && currentToken !== token) {
    socket.disconnect();
    socket = null;
  }

  const host = getApiHost();
  socket = io(host, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 15000,
  });

  currentToken = token;
  attachNetworkListener();

  socket.on('connect', () => {
    console.log('[SOCKET] Connected', { id: socket.id, host });
  });

  socket.on('disconnect', (reason) => {
    console.log('[SOCKET] Disconnected', { reason });
  });

  socket.on('connect_error', (error) => {
    console.error('[SOCKET] Connect error', {
      message: error.message,
      description: error.description,
    });
  });

  socket.connect();

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentToken = null;

  if (networkSubscription?.remove) {
    networkSubscription.remove();
  }

  networkSubscription = null;
};
