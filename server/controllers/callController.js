// callController.js

const { User } = require('../src/models/users');

const handleCall = async(io, socket, data) => {
    const { caller, receiver } = data;

    try {
        // Fetch user details for both caller and receiver
        const callerUser = await User.findOne({ phoneNumber: caller });
        const receiverUser = await User.findOne({ phoneNumber: receiver });

        if (!callerUser || !receiverUser) {
            socket.emit('callError', { message: 'Invalid users for the call' });
            return;
        }

        const receiverSocketId = onlineUsers[receiver];

        if (receiverSocketId) {
            io.to(receiverSocketId).emit('incomingCall', { caller: callerUser, receiver: receiverUser });
        } else {
            socket.emit('callError', { message: 'User is not online' });
        }
    } catch (error) {
        console.error('Error during call:', error.message);
        socket.emit('callError', { message: 'Error during call' });
    }
};

const handleAnswer = async(io, socket, data) => {
    const { caller, receiver } = data;

    try {
        const callerUser = await User.findOne({ phoneNumber: caller });
        const receiverUser = await User.findOne({ phoneNumber: receiver });

        if (!callerUser || !receiverUser) {
            socket.emit('callError', { message: 'Invalid users for the call' });
            return;
        }

        const callerSocketId = onlineUsers[caller];

        if (callerSocketId) {
            io.to(callerSocketId).emit('callAccepted', { caller: callerUser, receiver: receiverUser });
        }
    } catch (error) {
        console.error('Error during answer:', error.message);
        socket.emit('callError', { message: 'Error during answer' });
    }
};

const handleReject = async(io, socket, data) => {
    const { caller, receiver } = data;

    try {
        const callerUser = await User.findOne({ phoneNumber: caller });
        const receiverUser = await User.findOne({ phoneNumber: receiver });

        if (!callerUser || !receiverUser) {
            socket.emit('callError', { message: 'Invalid users for the call' });
            return;
        }

        const callerSocketId = onlineUsers[caller];

        if (callerSocketId) {
            io.to(callerSocketId).emit('callRejected', { caller: callerUser, receiver: receiverUser });
        }
    } catch (error) {
        console.error('Error during reject:', error.message);
        socket.emit('callError', { message: 'Error during reject' });
    }
};

const handleHangUp = async(io, socket, data) => {
    const { caller, receiver } = data;

    try {
        const callerUser = await User.findOne({ phoneNumber: caller });
        const receiverUser = await User.findOne({ phoneNumber: receiver });

        if (!callerUser || !receiverUser) {
            socket.emit('callError', { message: 'Invalid users for the call' });
            return;
        }

        const receiverSocketId = onlineUsers[receiver];

        if (receiverSocketId) {
            io.to(receiverSocketId).emit('callEnded', { caller: callerUser, receiver: receiverUser });
        }
    } catch (error) {
        console.error('Error during hang-up:', error.message);
        socket.emit('callError', { message: 'Error during hang-up' });
    }
};

module.exports = { handleCall, handleAnswer, handleReject, handleHangUp };