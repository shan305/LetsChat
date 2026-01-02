const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    index: true,
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Username must be at least 2 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    index: true,
  },
  avatarMediaId: {
    type: Schema.Types.ObjectId,
    ref: 'Media',
    default: null,
  },
  friends: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  deletedAt: {
    type: Date,
    default: null,
  },passcodeHash: {
  type: String,
  required: true,
  select: false, // IMPORTANT
},
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.deletedAt;
      return ret;
    }
  }
});

userSchema.index({ createdAt: -1 });
userSchema.index({ deletedAt: 1, phoneNumber: 1 });

userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    username: this.username,
    phoneNumber: this.phoneNumber,
    avatarMediaId: this.avatarMediaId,
  };
};

userSchema.statics.findByPhone = function(phoneNumber) {
  return this.findOne({ phoneNumber, deletedAt: null });
};

userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username, deletedAt: null });
};

userSchema.statics.escapeRegex = function(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

userSchema.statics.searchUsers = function(query, limit = 20) {
  const escaped = this.escapeRegex(query);
  const regex = new RegExp(escaped, 'i');
  return this.find({
    deletedAt: null,
    $or: [
      { username: regex },
      { phoneNumber: regex }
    ]
  }).limit(limit);
};

userSchema.pre('save', function(next) {
  if (this.isModified('phoneNumber')) {
    this.phoneNumber = this.phoneNumber.replace(/\s/g, '');
  }
  next();
});

module.exports = mongoose.model('User', userSchema);