// src/models/Conversation.js
// Supports both DM (1:1) and Group chats

const mongoose = require('mongoose');
const { Schema } = mongoose;

const conversationSchema = new Schema({
  type: {
    type: String,
    enum: ['dm', 'group'],
    required: true,
    index: true,
  },
  // Deterministic key for DM uniqueness: sorted participant IDs joined
  // e.g., "507f1f77bcf86cd7994390a1:507f1f77bcf86cd7994390a2"
  dmKey: {
    type: String,
    unique: true,
    sparse: true,  // Only for DMs
    index: true,
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  // Group-only fields
  admins: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Group title cannot exceed 100 characters'],
  },
  avatarMediaId: {
    type: Schema.Types.ObjectId,
    ref: 'Media',
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  // Last message tracking for chat list
  lastMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  lastMessagePreview: {
    type: String,
    maxlength: 100,
  },
  // Optimistic locking
  version: {
    type: Number,
    default: 0,
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

// Indexes
conversationSchema.index({ participants: 1 });  // Find user's conversations
conversationSchema.index({ participants: 1, updatedAt: -1 });  // User's recent chats
conversationSchema.index({ type: 1, dmKey: 1 });  // DM lookup

// Static: Generate DM key from two user IDs
conversationSchema.statics.generateDmKey = function(userIdA, userIdB) {
  const ids = [userIdA.toString(), userIdB.toString()].sort();
  return ids.join(':');
};

conversationSchema.statics.findOrCreateDM = async function (userIdA, userIdB) {
  const dmKey = this.generateDmKey(userIdA, userIdB);

  try {
    return await this.create({
      type: 'dm',
      dmKey,
      participants: [userIdA, userIdB],
    });
  } catch (err) {
    if (err.code === 11000) {
      return this.findOne({ type: 'dm', dmKey });
    }
    throw err;
  }
};

// Static: Create group conversation
conversationSchema.statics.createGroup = async function(creatorId, participantIds, title) {
  const allParticipants = [...new Set([creatorId, ...participantIds])];
  
  return this.create({
    type: 'group',
    participants: allParticipants,
    admins: [creatorId],
    title,
  });
};

// Static: Get user's conversations (paginated)
conversationSchema.statics.getUserConversations = function(userId, { limit = 20, before = null } = {}) {
  const query = { participants: userId };
  
  if (before) {
    query.lastMessageAt = { $lt: before };
  }
  
  return this.find(query)
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .populate('participants', 'username phoneNumber avatarMediaId')
    .populate('lastMessageId');
};

// Instance: Update last message
conversationSchema.methods.updateLastMessage = async function(message) {
  this.lastMessageId = message._id;
  this.lastMessageAt = message.createdAt;
  this.lastMessagePreview = message.text 
    ? message.text.substring(0, 100) 
    : `[${message.type}]`;
  this.version += 1;
  return this.save();
};

// Instance: Add participant (groups only)
conversationSchema.methods.addParticipant = async function(userId) {
  if (this.type !== 'group') {
    throw new Error('Cannot add participants to DM');
  }
if (!this.participants.some(p => p.toString() === userId.toString())) {
  this.participants.push(userId);
}
  return this;
};

// Instance: Remove participant (groups only)
conversationSchema.methods.removeParticipant = async function(userId) {
  if (this.type !== 'group') {
    throw new Error('Cannot remove participants from DM');
  }
  this.participants = this.participants.filter(
    p => p.toString() !== userId.toString()
  );
  this.admins = this.admins.filter(
    a => a.toString() !== userId.toString()
  );
  return this.save();
};

// Instance: Check if user is participant
conversationSchema.methods.hasParticipant = function(userId) {
  return this.participants.some(
    p => p.toString() === userId.toString()
  );
};

// Instance: Check if user is admin
conversationSchema.methods.isAdmin = function(userId) {
  return this.admins.some(
    a => a.toString() === userId.toString()
  );
};

module.exports = mongoose.model('Conversation', conversationSchema);