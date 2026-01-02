const {
  MessageService,
  ConversationService,
  MediaService,
  TypingService,
  PresenceService,
} = require('../../services');
const { createLogger } = require('../../utils/logger');
const { checkEventLimit } = require('../../middleware/rateLimiter');
const { User, Message } = require('../../models');

const logger = createLogger('ChatHandler');

const registerChatHandlers = (io, socket) => {

  /**
   * SEND MESSAGE
   */
  socket.on('chatMessage', async (data) => {
    try {
      const allowed = await checkEventLimit(socket, 'message');
      if (!allowed) {
        socket.emit('chatMessageError', 'Rate limited');
        return;
      }

      if (!socket.userId || !socket.phoneNumber) {
        socket.emit('chatMessageError', 'Not authenticated');
        return;
      }

      const {
        receiver,
        message,
        messageType,
        mediaFile,
        clientMessageId,
      } = data;

      const senderPhone = socket.phoneNumber;

      logger.debug('chatMessage received', {
        from: senderPhone,
        to: receiver,
        hasMedia: !!mediaFile,
      });

      let mediaId = null;

      // Media upload (still socket-based, unchanged behavior)
      if (mediaFile && mediaFile.buffer && Array.isArray(mediaFile.buffer)) {
        const senderUser = await User.findByPhone(senderPhone);
        if (!senderUser) {
          socket.emit('chatMessageError', 'Sender not found');
          return;
        }

        const buffer = Buffer.from(mediaFile.buffer);

        const media = await MediaService.saveFile({
          buffer,
          mimetype: mediaFile.mimetype || 'image/jpeg',
          originalname: mediaFile.originalname || 'image.jpg',
          ownerId: senderUser._id,
          type: 'image',
        });

        mediaId = media._id;
      }

      const result = await MessageService.sendMessageByPhone({
        senderPhone,
        receiverPhone: receiver,
        text: message || '',
        type: mediaId ? 'image' : (messageType || 'text'),
        mediaId,
        clientMessageId,
      });

      // Idempotent duplicate
      if (result.isDuplicate) {
        socket.emit('chatMessageSuccess', result.message);
        return;
      }

      const response = {
        ...result.message,
        senderPhone,
        receiverPhone: receiver,
      };

      socket.emit('chatMessageSuccess', response);

      // Notify receiver (room-based only)
      const receiverUser = await User.findByPhone(receiver);
      if (receiverUser) {
        io.to(`user:${receiverUser._id}`).emit('newMessage', response);
        io.to(`user:${receiverUser._id}`).emit('newNotification', {
          type: 'message',
          sender: senderPhone,
          preview: message
            ? message.substring(0, 50)
            : 'Media message',
        });
      }

      logger.info('Message sent', {
        from: senderPhone,
        to: receiver,
        messageId: response._id,
      });

    } catch (error) {
      logger.error('chatMessage failed', {
        error: error.message,
        stack: error.stack,
      });
      socket.emit('chatMessageError', error.message);
    }
  });

  /**
   * GET CHAT MESSAGES
   */
  socket.on('getChatMessages', async ({ userPhoneNumber, friendPhoneNumber, limit, before }) => {
    try {
      const messages = await MessageService.getMessagesByPhone(
        userPhoneNumber,
        friendPhoneNumber,
        { limit: limit || 50, before }
      );

      const enriched = await Promise.all(
        messages.map(async (msg) => {
          if (!msg.mediaId) return msg;

          try {
            const meta = await MediaService.getMetadata(msg.mediaId);
            return {
              ...msg,
              media: {
                url: meta.url,
                mimeType: meta.mimeType,
              },
            };
          } catch {
            return msg;
          }
        })
      );

      socket.emit('getChatMessagesSuccess', enriched);
    } catch (error) {
      logger.error('getChatMessages failed', { error: error.message });
      socket.emit('getChatMessagesError', error.message);
    }
  });

  /**
   * EDIT MESSAGE
   */
  socket.on('editMessage', async ({ messageId, newText }) => {
    try {
      if (!socket.userId) {
        socket.emit('editMessageError', 'Not authenticated');
        return;
      }

      const message = await MessageService.editMessage(
        messageId,
        socket.userId,
        newText
      );

      socket.emit('editMessageSuccess', message);

      const participants = await ConversationService.getParticipantIds(
        message.conversationId,
        socket.userId
      );

      participants.forEach((userId) => {
        io.to(`user:${userId}`).emit('messageEdited', message);
      });

    } catch (error) {
      socket.emit('editMessageError', error.message);
    }
  });

  /**
   * DELETE MESSAGE
   */
  socket.on('deleteMessage', async ({ messageId }) => {
    try {
      if (!socket.userId) {
        socket.emit('deleteMessageError', 'Not authenticated');
        return;
      }

      const msg = await Message.findById(messageId);
      if (!msg) {
        socket.emit('deleteMessageError', 'Message not found');
        return;
      }

      await MessageService.deleteMessage(messageId, socket.userId);
      socket.emit('deleteMessageSuccess', { messageId });

      const participants = await ConversationService.getParticipantIds(
        msg.conversationId,
        socket.userId
      );

      participants.forEach((userId) => {
        io.to(`user:${userId}`).emit('messageDeleted', {
          messageId,
          conversationId: msg.conversationId,
        });
      });

    } catch (error) {
      socket.emit('deleteMessageError', error.message);
    }
  });

  /**
   * MARK READ
   */
  socket.on('markRead', async ({ conversationId, messageId }) => {
    try {
      if (!socket.userId) return;

      await MessageService.markRead(conversationId, socket.userId, messageId);

      const participants = await ConversationService.getParticipantIds(
        conversationId,
        socket.userId
      );

      participants.forEach((userId) => {
        io.to(`user:${userId}`).emit('messagesRead', {
          conversationId,
          userId: socket.userId,
          messageId,
        });
      });

    } catch (error) {
      logger.error('markRead failed', { error: error.message });
    }
  });

  /**
   * TYPING
   */
  socket.on('typing', async ({ conversationId }) => {
    try {
      if (!socket.userId || !conversationId) return;

      const result = await TypingService.setTyping(
        conversationId,
        socket.userId
      );

      result.participants.forEach((userId) => {
        io.to(`user:${userId}`).emit('typing', {
          conversationId,
          userId: socket.userId,
        });
      });
    } catch {}
  });

  socket.on('stopTyping', async ({ conversationId }) => {
    try {
      if (!socket.userId || !conversationId) return;

      const result = await TypingService.clearTyping(
        conversationId,
        socket.userId
      );

      result.participants.forEach((userId) => {
        io.to(`user:${userId}`).emit('stopTyping', {
          conversationId,
          userId: socket.userId,
        });
      });
    } catch {}
  });

};

module.exports = { registerChatHandlers };
