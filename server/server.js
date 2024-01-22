// server.js
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const compression = require('compression');
require('dotenv').config();
const app = express();
const server = http.createServer(app);
const { handleRegister, handleSendCode, handleSignIn, handleSearchFriend, handleAddFriend, handleGetFriends, handleSearchExistingFriend, handleUserProfile } = require('./controllers/userController');
const { handleChatMessage, handleGetChatMessages } = require('./controllers/chatController');
const chatController = require('./controllers/chatControllerModified');
const redis = require('redis/dist');
const { handleCall, handleAnswer, handleReject, handleHangUp } = require('./controllers/callController');



const connectToDatabase = async() => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
};

connectToDatabase();



const io = socketIo(server, {
    cors: {
        origin: process.env.ORIGIN_URL,
        methods: ['GET', 'POST'],
        pingTimeout: 60000,
        pingInterval: 25000,
    },
});

// Connect to Redis
const redisAdapter = require('socket.io-redis');
const { createClient } = require('redis/dist');
const { createAdapter } = require('@socket.io/redis-adapter/dist');


//subClient.psubscribe = subClient.pSubscribe

const pubClient = createClient({ host: "localhost", port: 6379 });
const subClient = pubClient.duplicate();

io.adapter(redisAdapter(pubClient, subClient));

pubClient.on('connect', () => {
    console.log('pubClient connected:', pubClient.connected);
});

subClient.on('connect', () => {
    console.log('subClient connected:', subClient.connected);
});
app.use(cors({
    origin: process.env.ORIGIN_URL,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    credentials: true


}));

app.use(compression());
app.use(express.static('public'));

const gc = () => {
    console.log('Performing garbage collection');
};
const onlineUsers = {};

mongoose.connection.once('open', () => {


    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on("disconnect", () => {
            const lastToDisconnect = io.of("/").sockets.size === 0;
            if (lastToDisconnect) {
                gc();
            }
        });
        socket.on("monitor", function() {
            // Monitoring logic here
            const connectedClients = io.engine.clientsCount;
            const messagesSent = io.sockets.adapter.rooms.get(socket.id).size || 0;
            const startTime = socket.monitorStartTime || Date.now();
            const currentTime = Date.now();
            const elapsedTime = currentTime - startTime;
            const averageResponseTime = elapsedTime / messagesSent;

            socket.monitorStartTime = currentTime;

            socket.emit('serverPerformance', {
                connectedClients,
                messagesSent,
                averageResponseTime,
            });
        });

        socket.on('logout', () => {
            console.log('User logged out');
            socket.disconnect();
        });
        socket.on('signIn', async(userData) => {
            try {
                await handleSignIn(io, socket, userData);
                onlineUsers[userData.phoneNumber] = true;
                onlineUsers[userData.userId] = socket.id;

                io.emit('updateOnlineUsers', Object.keys(onlineUsers));
            } catch (error) {
                console.error('Error during signIn:', error.message);
                socket.emit('error', { message: 'Error during signIn' });
            }
        });

        socket.on('searchFriend', async(data) => {
            try {
                await handleSearchFriend(io, socket, data);
            } catch (error) {
                console.error('Error during search Friend :', error.message);
                socket.emit('error', { message: 'Error finding friend check number again' });

            }
        });
        socket.on('addFriend', async(data) => {
            try { await handleAddFriend(io, socket, data); } catch (error) {
                console.error('Error during adding Friend :', error.message);
                socket.emit('error', { message: 'Error adding friend' });

            }
        });
        socket.on('searchExistingFriends', (data) => {
            handleSearchExistingFriend(io, socket, data);
        });
        socket.on('getFriends', (user) => {
            handleGetFriends(io, socket, user);
        });
        socket.on("chatMessage", async(data) => {
            try {
                console.log("Received chat message from", data.sender, "to", data.receiver, ":", data.message);
                handleChatMessage(io, socket, data);
                // Emit the message to the sender
                io.to(data.sender).emit('newMessage', data);
                console.log("Emitting 'newMessage' event to receiver:", data.receiver);

                io.to(data.receiver).emit('newMessage', data);
            } catch (error) {

                console.error('Error in chatMessage :', error.message);
                socket.emit('error', { message: 'Error in chatMessage' });

            }

        });


        socket.on('register', async(userData) => {
            try {
                await handleRegister(io, socket, userData);
                console.log('Received userData on server:', userData);

            } catch (error) {
                console.error('Error during registration :', error.message);
                socket.emit('error', { message: 'Errorduring registration' });

            }

        });
        socket.on('send code', (phoneNumber) => handleSendCode(io, socket, phoneNumber));
        socket.on('getChatMessages', ({ userPhoneNumber, friendPhoneNumber }) => {
            handleGetChatMessages(io, socket, userPhoneNumber, friendPhoneNumber);


        });
        socket.on('getUserProfile', (userId) => {
            handleUserProfile(io, socket, userId);
        });
        socket.on('typing', ({ sender, receiver }) => {
            socket.broadcast.emit('typing', { sender, receiver });
        });

        socket.on('stopTyping', ({ sender, receiver }) => {
            socket.broadcast.emit('stopTyping', { sender, receiver });
        });


        socket.on('call', (data) => {
            handleCall(io, socket, data);
        });

        socket.on('answer', (data) => {
            handleAnswer(io, socket, data);
        });

        socket.on('reject', (data) => {
            handleReject(io, socket, data);
        });

        socket.on('hangUp', (data) => {
            handleHangUp(io, socket, data);
        });






        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);

            const disconnectedUser = Object.keys(onlineUsers).find(
                (key) => onlineUsers[key] === socket.id
            );
            if (disconnectedUser) {
                delete onlineUsers[disconnectedUser];
                io.emit('updateOnlineUsers', Object.keys(onlineUsers));
            }
        });





    });

    process.on('SIGINT', () => {
        mongoose.connection.close(() => {
            console.log('MongoDB connection closed due to app termination');
            process.exit(0);
        });
    });
    const PORT = process.env.PORT || 3001;

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});