const { CallService } = require('../../services');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('CallHandler');

const registerCallHandlers = (io, socket) => {

  socket.on('call', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('callError', { message: 'Not authenticated' });
        return;
      }

      const { receiver } = data;

      const result = await CallService.initiateCall(socket.userId, receiver);

      for (const socketId of result.receiverSockets) {
        io.to(socketId).emit('incomingCall', {
          callId: result.callData.callId,
          caller: result.callData.caller,
          receiver: result.callData.receiver,
        });
      }

      socket.emit('callInitiated', {
        callId: result.callData.callId,
        receiver: result.callData.receiver,
      });

      logger.info('Call initiated', { 
        callId: result.callData.callId, 
        from: socket.userId, 
        to: receiver 
      });
    } catch (error) {
      logger.error('Call failed', { error: error.message });
      socket.emit('callError', { message: error.message });
    }
  });

  socket.on('answer', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('callError', { message: 'Not authenticated' });
        return;
      }

      const { caller, callId } = data;

      const result = await CallService.answerCall(callId, socket.userId, caller);

      for (const socketId of result.callerSockets) {
        io.to(socketId).emit('callAccepted', {
          callId: result.callData.callId,
          caller: result.callData.caller,
          answerer: result.callData.answerer,
        });
      }

      socket.emit('callConnected', {
        callId: result.callData.callId,
        caller: result.callData.caller,
      });

      logger.info('Call answered', { callId });
    } catch (error) {
      logger.error('Answer failed', { error: error.message });
      socket.emit('callError', { message: error.message });
    }
  });

  socket.on('reject', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('callError', { message: 'Not authenticated' });
        return;
      }

      const { caller, callId } = data;

      const result = await CallService.rejectCall(callId, socket.userId, caller);

      for (const socketId of result.callerSockets) {
        io.to(socketId).emit('callRejected', {
          callId: result.callData.callId,
          caller: result.callData.caller,
          rejecter: result.callData.rejecter,
        });
      }

      logger.info('Call rejected', { callId });
    } catch (error) {
      logger.error('Reject failed', { error: error.message });
      socket.emit('callError', { message: error.message });
    }
  });

  socket.on('hangUp', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('callError', { message: 'Not authenticated' });
        return;
      }

      const { receiver, caller, callId } = data;
      const otherUser = socket.phoneNumber === caller ? receiver : caller;

      const result = await CallService.hangUp(callId, socket.userId, otherUser);

      for (const socketId of result.otherUserSockets) {
        io.to(socketId).emit('callEnded', {
          callId: result.callData.callId,
          endedBy: result.callData.endedBy,
        });
      }

      socket.emit('callEnded', {
        callId: result.callData.callId,
      });

      logger.info('Call ended', { callId });
    } catch (error) {
      logger.error('Hang up failed', { error: error.message });
      socket.emit('callError', { message: error.message });
    }
  });

  socket.on('iceCandidate', (data) => {
    const { targetSocketId, candidate } = data;
    if (targetSocketId) {
      io.to(targetSocketId).emit('iceCandidate', {
        candidate,
        from: socket.id,
      });
    }
  });

  socket.on('offer', (data) => {
    const { targetSocketId, offer } = data;
    if (targetSocketId) {
      io.to(targetSocketId).emit('offer', {
        offer,
        from: socket.id,
      });
    }
  });

  socket.on('answer-webrtc', (data) => {
    const { targetSocketId, answer } = data;
    if (targetSocketId) {
      io.to(targetSocketId).emit('answer-webrtc', {
        answer,
        from: socket.id,
      });
    }
  });

};

module.exports = { registerCallHandlers };