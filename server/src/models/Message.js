const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'system'],
    default: 'text',
  },
  text: {
    type: String,
    maxlength: [10000, 'Message too long'],
    trim: true,
  },
  mediaId: {
    type: Schema.Types.ObjectId,
    ref: 'Media',
  },
  replyToMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
  },
  clientMessageId: {
    type: String,
    index: true,
  },
  editedAt: {
    type: Date,
    default: null,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  deletedFor: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
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

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, _id: 1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index(
  { conversationId: 1, senderId: 1, clientMessageId: 1 }, 
  { unique: true, sparse: true }
);

messageSchema.statics.createMessage = async function (data) {
  try {
    const message = await this.create(data);
    return { message, isDuplicate: false };
  } catch (err) {
    if (err.code === 11000 && data.clientMessageId) {
      const existing = await this.findOne({
        conversationId: data.conversationId,
        senderId: data.senderId,
        clientMessageId: data.clientMessageId,
      });
      return { message: existing, isDuplicate: true };
    }
    throw err;
  }
};

messageSchema.statics.getConversationMessages = function(
  conversationId, 
  userId,
  { limit = 50, before = null, after = null } = {}
) {
  const query = {
    conversationId,
    deletedAt: null,
    deletedFor: { $ne: userId },
  };
  
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  } else if (after) {
    query.createdAt = { $gt: new Date(after) };
  }
  
  return this.find(query)
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('senderId', 'username phoneNumber avatarMediaId')
    .populate('replyToMessageId');
};

messageSchema.methods.edit = async function(newText, editorId) {
  if (this.senderId.toString() !== editorId.toString()) {
    throw new Error('Only sender can edit message');
  }
  if (this.deletedAt) {
    throw new Error('Cannot edit deleted message');
  }
  
  this.text = newText;
  this.editedAt = new Date();
  return this.save();
};

messageSchema.methods.softDelete = async function(deleterId) {
  if (this.senderId.toString() !== deleterId.toString()) {
    throw new Error('Only sender can delete message');
  }
  
  this.deletedAt = new Date();
  return this.save();
};

messageSchema.methods.deleteForUser = async function(userId) {
  if (!this.deletedFor.includes(userId)) {
    this.deletedFor.push(userId);
  }
  return this.save();
};

messageSchema.methods.isDeletedFor = function(userId) {
  return this.deletedAt !== null || this.deletedFor.includes(userId);
};

module.exports = mongoose.model('Message', messageSchema);