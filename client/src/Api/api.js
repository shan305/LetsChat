import io from 'socket.io-client';
import { useState, useEffect } from 'react';

export const url = 'http://localhost:3001'
export const wsURL = 'ws://localhost:3001'

export const socket = io(url, {
    reconnection: true,
    reconnectionAttempts: 10,
    timeout: 5000,
});


const SOCKET_URL = 'http://localhost:3001';

const useSocket = () => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const newSocket = io(SOCKET_URL, {
            reconnection: true,
            reconnectionAttempts: 5,
            timeout: 5000,
        });

        newSocket.on('connect', () => {
            console.log('Socket connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log(`Socket disconnected: ${reason}`);
            setIsConnected(false);
        });

        newSocket.on('reconnect', (attemptNumber) => {
            console.log(`Socket reconnected after attempt ${attemptNumber}`);
            setIsConnected(true);
        });

        newSocket.on('reconnect_failed', () => {
            console.error('Socket reconnection failed');
            setIsConnected(false);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
            setIsConnected(false);
        };
    }, []);

    return { socket, isConnected };
};

export default useSocket;