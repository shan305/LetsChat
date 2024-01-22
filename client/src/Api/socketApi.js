import io from 'socket.io-client';
import { url } from './api';

const socket = io(url, {
    reconnection: true,
    reconnectionAttempts: 5,
});

const socketApi = {
    connect: () => {
        socket.connect();
    },

    disconnect: () => {
        socket.disconnect();
    },

    on: (event, callback) => {
        socket.on(event, callback);
    },

    off: (event, callback) => {
        socket.off(event, callback);
    },

    emit: (event, data) => {
        try {
            socket.emit(event, data);
            console.log(`Emitted ${event} with data:`, data);
        } catch (error) {
            console.error(`Error emitting ${event}:`, error);
        }
    },

    // Additional utility methods

    isConnected: () => {
        return socket.connected;
    },
};

export default socketApi;