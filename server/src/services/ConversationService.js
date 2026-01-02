// src/services/ConversationService.js
// Conversation management - DM and Group chats

const { Conversation, User, ReadState } = require('../models');

class ConversationService {

  /* =======================
   * DM CONVERSATIONS
   * ======================= */

  async getOrCreateDM(userIdA, userIdB) {
    if (!userIdA || !userIdB) {
      throw new Error('User IDs are required');
    }

    if (userIdA.toString() === userIdB.toString()) {
      throw new Error('Cannot create DM with self');
    }

    const [userA, userB] = await Promise.all([
      User.findById(userIdA),
      User.findById(userIdB),
    ]);

    if (!userA || !userB) {
      throw new Error('One or both users not found');
    }

    const conversation = await Conversation.findOrCreateDM(userIdA, userIdB);

    await Promise.all([
      ReadState.getOrCreate(conversation._id, userIdA),
      ReadState.getOrCreate(conversation._id, userIdB),
    ]);

    return this.formatConversation(conversation, userIdA);
  }

  async getDMByPhones(phoneA, phoneB) {
    if (!phoneA || !phoneB) {
      throw new Error('Phone numbers are required');
    }

    const [userA, userB] = await Promise.all([
      User.findByPhone(phoneA),
      User.findByPhone(phoneB),
    ]);

    if (!userA || !userB) {
      throw new Error('One or both users not found');
    }

    return this.getOrCreateDM(userA._id, userB._id);
  }

  /* =======================
   * GROUP CONVERSATIONS
   * ======================= */

  async createGroup(creatorId, participantIds, title) {
    if (!creatorId) {
      throw new Error('Creator ID is required');
    }

    if (!Array.isArray(participantIds)) {
      throw new Error('participantIds must be an array');
    }

    if (!title || !title.trim()) {
      throw new Error('Group title is required');
    }

    if (participantIds.length < 1) {
      throw new Error('At least one participant required');
    }

    const uniqueParticipantIds = [
      ...new Set(participantIds.map(id => id.toString())),
    ];

    const users = await User.find({
      _id: { $in: [...uniqueParticipantIds, creatorId] },
      deletedAt: null,
    });

    if (users.length !== uniqueParticipantIds.length + 1) {
      throw new Error('One or more participants not found');
    }

    const conversation = await Conversation.createGroup(
      creatorId,
      uniqueParticipantIds,
      title.trim()
    );

    await Promise.all(
      conversation.participants.map(userId =>
        ReadState.getOrCreate(conversation._id, userId)
      )
    );

    return this.formatConversation(conversation, creatorId);
  }

  /* =======================
   * FETCHING
   * ======================= */

  async getUserConversations(userId, { limit = 20, before = null } = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const conversations = await Conversation.getUserConversations(userId, {
      limit,
      before,
    });

    const unreadCounts = await ReadState.getUnreadCounts(userId);

    return Promise.all(
      conversations.map(async (conv) => {
        const formatted = await this.formatConversation(conv, userId);
        formatted.unreadCount =
          unreadCounts[conv._id.toString()] || 0;
        return formatted;
      })
    );
  }

  async getConversation(conversationId, userId) {
    if (!conversationId || !userId) {
      throw new Error('Conversation ID and user ID are required');
    }

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'username phoneNumber avatarMediaId')
      .populate('lastMessageId');

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (!conversation.hasParticipant(userId)) {
      throw new Error('Not a participant of this conversation');
    }

    return this.formatConversation(conversation, userId);
  }

  /* =======================
   * GROUP MANAGEMENT
   * ======================= */

  async addParticipant(conversationId, adminId, newUserId) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'group') {
      throw new Error('Cannot add participants to DM');
    }

    if (!conversation.isAdmin(adminId)) {
      throw new Error('Only admins can add participants');
    }

    const newUser = await User.findById(newUserId);
    if (!newUser) {
      throw new Error('User not found');
    }

    await conversation.addParticipant(newUserId);
    await ReadState.getOrCreate(conversationId, newUserId);

    return this.formatConversation(conversation, adminId);
  }

  async removeParticipant(conversationId, adminId, userToRemove) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'group') {
      throw new Error('Cannot remove participants from DM');
    }

    const isSelfRemoval =
      adminId.toString() === userToRemove.toString();

    if (!isSelfRemoval && !conversation.isAdmin(adminId)) {
      throw new Error('Only admins can remove participants');
    }

    await conversation.removeParticipant(userToRemove);

    return this.formatConversation(conversation, adminId);
  }

  async leaveGroup(conversationId, userId) {
    return this.removeParticipant(conversationId, userId, userId);
  }

  async updateGroup(conversationId, adminId, updates) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type !== 'group') {
      throw new Error('Cannot update DM');
    }

    if (!conversation.isAdmin(adminId)) {
      throw new Error('Only admins can update group');
    }

    if (updates.title !== undefined) {
      conversation.title = updates.title;
    }

    if (updates.description !== undefined) {
      conversation.description = updates.description;
    }

    await conversation.save();

    return this.formatConversation(conversation, adminId);
  }

  async makeAdmin(conversationId, adminId, newAdminId) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation || conversation.type !== 'group') {
      throw new Error('Group not found');
    }

    if (!conversation.isAdmin(adminId)) {
      throw new Error('Only admins can promote others');
    }

    if (!conversation.hasParticipant(newAdminId)) {
      throw new Error('User is not a participant');
    }

    if (!conversation.isAdmin(newAdminId)) {
      conversation.admins.push(newAdminId);
      await conversation.save();
    }

    return this.formatConversation(conversation, adminId);
  }

  /* =======================
   * HELPERS
   * ======================= */

  async getParticipantIds(conversationId, excludeUserId = null) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return [];

    return conversation.participants
      .map(p => p.toString())
      .filter(p => !excludeUserId || p !== excludeUserId.toString());
  }

  async formatConversation(conversation, currentUserId) {
    const conv = conversation.toJSON
      ? conversation.toJSON()
      : conversation;

    const result = {
      id: conv._id || conv.id,
      type: conv.type,
      participants: conv.participants,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      lastMessage: conv.lastMessageId || null,
      lastMessageAt: conv.lastMessageAt,
      lastMessagePreview: conv.lastMessagePreview,
    };

    if (conv.type === 'group') {
      result.title = conv.title;
      result.description = conv.description;
      result.admins = conv.admins;
      result.avatarMediaId = conv.avatarMediaId;
    } else {
      result.otherParticipant =
        conv.participants?.find(
          p => (p._id || p).toString() !== currentUserId?.toString()
        ) || null;
    }

    return result;
  }
}

module.exports = new ConversationService();
