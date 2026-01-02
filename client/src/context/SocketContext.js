import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import socketApi, { socket } from '../api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
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

  const value = {
    socket,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }
  return context;
};

export default SocketContext;