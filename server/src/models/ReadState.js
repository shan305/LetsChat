// src/models/ReadState.js
// Per-user read state for each conversation
// Supports unread counts + read receipts without bloating Message docs

const mongoose = require('mongoose');
const { Schema } = mongoose;

const readStateSchema = new Schema({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Last message this user has read
  lastReadMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
  },
  lastReadAt: {
    type: Date,
  },
  // Last message delivered to this user's device
  lastDeliveredMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
  },
  lastDeliveredAt: {
    type: Date,
  },
  // Cached unread count (denormalized for performance)
  unreadCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Mute settings
  isMuted: {
    type: Boolean,
    default: false,
  },
  mutedUntil: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Unique compound index
readStateSchema.index({ conversationId: 1, userId: 1 }, { unique: true });
readStateSchema.index({ userId: 1, updatedAt: -1 });

// Static: Get or create read state
readStateSchema.statics.getOrCreate = async function(conversationId, userId) {
  let state = await this.findOne({ conversationId, userId });
  
  if (!state) {
    state = await this.create({ conversationId, userId });
  }
  
  return state;
};

readStateSchema.statics.markRead = async function (
  conversationId,
  userId,
  messageId,
  messageCreatedAt
) {
  return this.findOneAndUpdate(
    {
      conversationId,
      userId,
      $or: [
        { lastReadAt: { $lt: messageCreatedAt } },
        { lastReadAt: { $exists: false } },
      ],
    },
    {
      lastReadMessageId: messageId,
      lastReadAt: messageCreatedAt,
      unreadCount: 0,
      $setOnInsert: { conversationId, userId },
    },
    { upsert: true, new: true }
  );
};


// Static: Mark messages as delivered
readStateSchema.statics.markDelivered = async function(conversationId, userId, messageId) {
  return this.findOneAndUpdate(
    { conversationId, userId },
    {
      lastDeliveredMessageId: messageId,
      lastDeliveredAt: new Date(),
      $setOnInsert: { conversationId, userId },
    },
    { upsert: true, new: true }
  );
};

// Static: Increment unread count
readStateSchema.statics.incrementUnread = async function(conversationId, userIds) {
  return this.updateMany(
    { conversationId, userId: { $in: userIds } },
    { $inc: { unreadCount: 1 } }
  );
};

// Static: Get unread counts for user's conversations
readStateSchema.statics.getUnreadCounts = async function(userId) {
  const states = await this.find(
    { userId, unreadCount: { $gt: 0 } },
    { conversationId: 1, unreadCount: 1 }
  );
  
  return states.reduce((acc, state) => {
    acc[state.conversationId.toString()] = state.unreadCount;
    return acc;
  }, {});
};

// Static: Get total unread count for user
readStateSchema.statics.getTotalUnread = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isMuted: false } },
    { $group: { _id: null, total: { $sum: '$unreadCount' } } }
  ]);
  
  return result[0]?.total || 0;
};

// Static: Mute conversation
readStateSchema.statics.mute = async function(conversationId, userId, duration = null) {
  const update = { isMuted: true };
  
  if (duration) {
    update.mutedUntil = new Date(Date.now() + duration);
  }
  
  return this.findOneAndUpdate(
    { conversationId, userId },
    { ...update, $setOnInsert: { conversationId, userId } },
    { upsert: true, new: true }
  );
};

// Static: Unmute conversation
readStateSchema.statics.unmute = async function(conversationId, userId) {
  return this.findOneAndUpdate(
    { conversationId, userId },
    { isMuted: false, mutedUntil: null },
    { new: true }
  );
};

module.exports = mongoose.model('ReadState', readStateSchema);