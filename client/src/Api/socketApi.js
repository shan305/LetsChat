import { socket } from './api';

const socketApi = {
    connect: () => {
        if (!socket.connected) {
            socket.connect();
        }
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

    isConnected: () => {
        return socket.connected;
    },

    getSocket: () => {
        return socket;
    },

    getId: () => {
        return socket.id;
    },
};

export default socketApi;