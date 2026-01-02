import { useState, useEffect, useCallback } from 'react';
import socketApi, { socket } from '../api';

const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  const connect = useCallback(() => {
    socketApi.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketApi.disconnect();
  }, []);

  const emit = useCallback((event, data) => {
    socketApi.emit(event, data);
  }, []);

  const on = useCallback((event, callback) => {
    socket.on(event, callback);
  }, []);

  const off = useCallback((event, callback) => {
    socket.off(event, callback);
  }, []);

  return {
    socket,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
};

export default useSocket;