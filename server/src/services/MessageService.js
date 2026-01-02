const { Message, Conversation, ReadState, User } = require('../models');
const { publish } = require('../config/rabbitmq');
const config = require('../config');

class MessageService {

  /* ------------------------------------------------------------------ */
  /* Internal helpers                                                    */
  /* ------------------------------------------------------------------ */

  async assertConversation(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new Error('Conversation not found');
    if (!conversation.hasParticipant(userId)) {
      throw new Error('Not a participant of this conversation');
    }
    return conversation;
  }

  async safePublish(routingKey, payload) {
    try {
      await publish(config.rabbitmq.exchanges.chat, routingKey, payload);
    } catch (e) {
      // Best effort only — never break chat flow
      console.error(`[MessageService] publish ${routingKey} failed:`, e.message);
    }
  }

  normalizeId(value) {
    if (!value) return null;
    if (typeof value === 'object' && value._id) return value._id.toString();
    if (typeof value === 'object' && value.toString) return value.toString();
    return String(value);
  }

  /* ------------------------------------------------------------------ */
  /* Send / Edit / Delete                                                */
  /* ------------------------------------------------------------------ */

  async sendMessage({
    conversationId,
    senderId,
    text,
    type = 'text',
    mediaId = null,
    replyToMessageId = null,
    clientMessageId = null,
  }) {
    const conversation = await this.assertConversation(conversationId, senderId);

    if (replyToMessageId) {
      const replyTarget = await Message.findById(replyToMessageId);
      if (!replyTarget || replyTarget.conversationId.toString() !== conversationId.toString()) {
        throw new Error('Invalid reply target');
      }
    }

    const { message, isDuplicate } = await Message.createMessage({
      conversationId,
      senderId,
      type,
      text,
      mediaId,
      replyToMessageId,
      clientMessageId,
    });

    if (isDuplicate) {
      return { message: await this.formatMessage(message), isDuplicate: true };
    }

    await conversation.updateLastMessage(message);

    const otherParticipants = conversation.participants.filter(
      p => p.toString() !== senderId.toString()
    );

    if (otherParticipants.length) {
      await ReadState.incrementUnread(conversationId, otherParticipants);
    }

    this.safePublish('message.sent', {
      messageId: message._id,
      conversationId,
      senderId,
      type,
    });

    return { message: await this.formatMessage(message), isDuplicate: false };
  }

  async editMessage(messageId, userId, newText) {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');

    await message.edit(newText, userId);

    this.safePublish('message.edited', {
      messageId,
      conversationId: message.conversationId,
      editedBy: userId,
    });

    return this.formatMessage(message);
  }

  async deleteMessage(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');

    await message.softDelete(userId);

    this.safePublish('message.deleted', {
      messageId,
      conversationId: message.conversationId,
      deletedBy: userId,
    });

    return { deleted: true, messageId };
  }

  async deleteMessageForUser(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');

    await message.deleteForUser(userId);
    return { deleted: true, messageId, forUser: userId };
  }

  /* ------------------------------------------------------------------ */
  /* Fetching                                                           */
  /* ------------------------------------------------------------------ */

  async getMessages(conversationId, userId, opts = {}) {
    const conversation = await this.assertConversation(conversationId, userId);

    const messages = await Message.getConversationMessages(
      conversationId,
      userId,
      opts
    );

    const users = await User.find({ _id: { $in: conversation.participants } });
    const phoneMap = Object.fromEntries(
      users.map(u => [u._id.toString(), u.phoneNumber])
    );

    return Promise.all(messages.map(m => this.formatMessage(m, phoneMap)));
  }

  async getMessagesByPhone(userPhone, friendPhone, opts = {}) {
    const [user, friend] = await Promise.all([
      User.findByPhone(userPhone),
      User.findByPhone(friendPhone),
    ]);

    if (!user || !friend) throw new Error('User or friend not found');

    const dmKey = Conversation.generateDmKey(user._id, friend._id);
    const conversation = await Conversation.findOne({ type: 'dm', dmKey });
    if (!conversation) return [];

    const phoneMap = {
      [user._id.toString()]: userPhone,
      [friend._id.toString()]: friendPhone,
    };

    const messages = await Message.getConversationMessages(
      conversation._id,
      user._id,
      opts
    );

    return Promise.all(messages.map(m => this.formatMessage(m, phoneMap)));
  }

  /* ------------------------------------------------------------------ */
  /* Receipts / Unread                                                  */
  /* ------------------------------------------------------------------ */

  async markRead(conversationId, userId, messageId) {
    await this.assertConversation(conversationId, userId);
    await ReadState.markRead(conversationId, userId, messageId);

    this.safePublish('receipt.read', { conversationId, userId, messageId });
    return { marked: true, messageId };
  }

  async markDelivered(conversationId, userId, messageId) {
    await ReadState.markDelivered(conversationId, userId, messageId);

    this.safePublish('receipt.delivered', { conversationId, userId, messageId });
    return { delivered: true, messageId };
  }

  getUnreadCounts(userId) {
    return ReadState.getUnreadCounts(userId);
  }

  getTotalUnread(userId) {
    return ReadState.getTotalUnread(userId);
  }

  /* ------------------------------------------------------------------ */
  /* DTO formatting                                                     */
  /* ------------------------------------------------------------------ */

  async formatMessage(message, phoneMap = {}) {
    const msg = message.toObject ? message.toObject() : { ...message };

    const senderId = this.normalizeId(msg.senderId);

    const formatted = {
      _id: msg._id || msg.id,
      id: msg._id || msg.id,
      conversationId: msg.conversationId,
      senderId,
      sender: senderId,
      type: msg.type || 'text',
      messageType: msg.type || 'text',
      text: msg.text || '',
      message: msg.text || '',
      mediaId: msg.mediaId || null,
      replyTo: msg.replyToMessageId || null,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
      editedAt: msg.editedAt || null,
      isEdited: !!msg.editedAt,
      isDeleted: !!msg.deletedAt,
      clientMessageId: msg.clientMessageId || null,
      senderPhone: phoneMap[senderId] || null,
    };

    if (!formatted.senderPhone && senderId) {
      const user = await User.findById(senderId);
      if (user) formatted.senderPhone = user.phoneNumber;
    }

    return formatted;
  }
}

module.exports = new MessageService();
