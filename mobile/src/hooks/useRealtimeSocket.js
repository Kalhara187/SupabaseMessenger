import { useEffect } from 'react';
import { connectSocket, disconnectSocket } from '../services/socketService';

const useRealtimeSocket = (token) => {
  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return undefined;
    }

    const socket = connectSocket(token);

    return () => {
      if (socket) {
        disconnectSocket();
      }
    };
  }, [token]);
};

export default useRealtimeSocket;