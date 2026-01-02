// src/models/Passcode.js
// Simple passcode storage (for your existing auth flow)
// Consider upgrading to proper auth later (JWT, sessions, etc.)

const mongoose = require('mongoose');
const { Schema } = mongoose;

const passcodeSchema = new Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  passcode: {
    type: String,  // Changed to String for hashing support
    required: true,
  },
  // For OTP-style codes with expiration
  expiresAt: {
    type: Date,
    default: null,
  },
  // Track failed attempts (security)
  failedAttempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// TTL index for auto-expiring OTPs
passcodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static: Verify passcode
passcodeSchema.statics.verify = async function(phoneNumber, passcode) {
  const record = await this.findOne({ phoneNumber });
  
  if (!record) {
    return { valid: false, reason: 'not_found' };
  }
  
  // Check if locked
  if (record.lockedUntil && record.lockedUntil > new Date()) {
    return { valid: false, reason: 'locked', until: record.lockedUntil };
  }
  
  // Check expiration
  if (record.expiresAt && record.expiresAt < new Date()) {
    return { valid: false, reason: 'expired' };
  }
  
  // Check passcode
  // TODO: Use bcrypt.compare() for hashed passcodes
  if (record.passcode !== passcode.toString()) {
    record.failedAttempts += 1;
    
    // Lock after 5 failed attempts
    if (record.failedAttempts >= 5) {
      record.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    }
    
    await record.save();
    return { valid: false, reason: 'invalid' };
  }
  
  // Reset failed attempts on success
  record.failedAttempts = 0;
  record.lockedUntil = null;
  await record.save();
  
  return { valid: true };
};

// Static: Create or update passcode
passcodeSchema.statics.setPasscode = async function(phoneNumber, passcode, expiresInMs = null) {
  const update = {
    passcode: passcode.toString(), // TODO: bcrypt.hash() for production
    failedAttempts: 0,
    lockedUntil: null,
  };
  
  if (expiresInMs) {
    update.expiresAt = new Date(Date.now() + expiresInMs);
  }
  
  return this.findOneAndUpdate(
    { phoneNumber },
    update,
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Passcode', passcodeSchema);