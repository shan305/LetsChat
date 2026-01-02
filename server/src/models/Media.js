// src/models/Media.js
// Metadata only - actual files stored in filesystem
// BACKWARD-COMPATIBLE, SAFE, PRODUCTION-READY

const mongoose = require('mongoose');
const { Schema } = mongoose;
const path = require('path');
const config = require('../config');

const mediaSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      index: true,
    },

    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'file', 'avatar'],
      required: true,
      index: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      maxlength: 255,
    },

    sizeBytes: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * Relative path from upload dir
     * Example:
     *   image/2026/01/65a9e5b8e3f9c8f1a4c9b7d2.jpg
     *
     * IMPORTANT:
     * - Existing records keep their path
     * - New uploads use deterministic ObjectId-based paths
     */
    path: {
      type: String,
      required: true,
    },

    /**
     * SHA256 hash for deduplication
     * Scoped per owner to avoid cross-user collisions
     */
    sha256: {
      type: String,
      index: true,
      sparse: true,
    },

    // Optional metadata
    width: Number,
    height: Number,
    duration: Number,

    // Internal thumbnail path (not exposed)
    thumbnailPath: String,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;

        // Never expose internal filesystem paths
        delete ret.path;
        delete ret.thumbnailPath;

        return ret;
      },
    },
  }
);

/* ============================
 * Indexes
 * ============================ */

// Owner media browsing
mediaSchema.index({ ownerId: 1, createdAt: -1 });

// Conversation media browsing
mediaSchema.index({ conversationId: 1, createdAt: -1 });

// Deduplication (scoped by owner)
mediaSchema.index(
  { ownerId: 1, sha256: 1 },
  { unique: true, sparse: true }
);

/* ============================
 * Virtuals
 * ============================ */

// Absolute filesystem path (INTERNAL USE ONLY)
mediaSchema.virtual('fullPath').get(function () {
  if (!this.path) return null;

  // Normalize and protect against path traversal
  const safePath = path.normalize(this.path).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(config.upload.dir, safePath);
});

// Public media URL
mediaSchema.virtual('url').get(function () {
  return `/api/media/${this._id}`;
});

// Public thumbnail URL
mediaSchema.virtual('thumbnailUrl').get(function () {
  if (!this.thumbnailPath) return null;
  return `/api/media/${this._id}/thumbnail`;
});

/* ============================
 * Statics
 * ============================ */

// Deterministic storage path (used ONLY for new uploads)
mediaSchema.statics.generatePath = function (type, filename, mediaId = null) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const ext = path.extname(filename) || '';

  // Use ObjectId if provided, else generate one
  const id = mediaId ? mediaId.toString() : new mongoose.Types.ObjectId().toString();

  return `${type}/${year}/${month}/${id}${ext}`;
};

// Deduplication lookup (scoped per owner)
mediaSchema.statics.findByHash = function (ownerId, sha256) {
  if (!sha256) return null;
  return this.findOne({ ownerId, sha256 });
};

/* ============================
 * Instance Methods
 * ============================ */

// Human-readable size
mediaSchema.methods.getReadableSize = function () {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = this.sizeBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

module.exports = mongoose.model('Media', mediaSchema);
