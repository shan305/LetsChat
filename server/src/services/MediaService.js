// src/services/MediaService.js
// File handling - upload, download, delete

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Media } = require('../models');
const config = require('../config');

class MediaService {
  constructor() {
    this.uploadDir = config.upload.dir;
    this.maxFileSize = config.upload.maxFileSizeMB * 1024 * 1024;
    this.allowedMimeTypes = config.upload.allowedMimeTypes;
  }

  /* ============================
   * Utils
   * ============================ */

  async ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
  }

  calculateHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  resolveSafePath(relativePath) {
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.uploadDir, normalized);
  }

  /* ============================
   * Save File
   * ============================ */

  async saveFile({
    buffer,
    mimetype,
    originalname,
    ownerId,
    conversationId = null,
    type = 'file',
  }) {
    if (!this.allowedMimeTypes.includes(mimetype)) {
      throw new Error(`File type not allowed: ${mimetype}`);
    }

    if (buffer.length > this.maxFileSize) {
      throw new Error(`File too large. Max: ${config.upload.maxFileSizeMB}MB`);
    }

    const sha256 = this.calculateHash(buffer);

    // Owner-scoped deduplication
    const existing = await Media.findByHash(ownerId, sha256);
    if (existing) {
      return existing;
    }

    // Pre-generate ID so path is deterministic
    const mediaId = new Media()._id;
    const relativePath = Media.generatePath(type, originalname, mediaId);
    const fullPath = this.resolveSafePath(relativePath);

    await this.ensureDir(path.dirname(fullPath));

    // Create DB record FIRST (prevents orphaned files)
    const media = await Media.create({
      _id: mediaId,
      ownerId,
      conversationId,
      type: this.inferMediaType(type, mimetype),
      mimeType: mimetype,
      originalName: originalname,
      sizeBytes: buffer.length,
      path: relativePath,
      sha256,
    });

    try {
      await fs.writeFile(fullPath, buffer);
    } catch (err) {
      // Rollback DB record if file write fails
      await Media.deleteOne({ _id: media._id }).catch(() => {});
      throw err;
    }

    return media;
  }

  inferMediaType(type, mimetype) {
    if (type !== 'file') return type;
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'file';
  }

  async saveUpload(file, ownerId, conversationId = null) {
    return this.saveFile({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      ownerId,
      conversationId,
    });
  }

  /* ============================
   * Read File
   * ============================ */

  async getFile(mediaId) {
    const media = await Media.findById(mediaId);
    if (!media) throw new Error('Media not found');

    const fullPath = this.resolveSafePath(media.path);

    if (!fsSync.existsSync(fullPath)) {
      throw new Error('File not found on disk');
    }

    const buffer = await fs.readFile(fullPath);
    return {
      buffer,
      mimeType: media.mimeType,
      originalName: media.originalName,
    };
  }

  async getFileBase64(mediaId) {
    const { buffer } = await this.getFile(mediaId);
    return buffer.toString('base64');
  }

  async getFileStream(mediaId) {
    const media = await Media.findById(mediaId);
    if (!media) throw new Error('Media not found');

    const fullPath = this.resolveSafePath(media.path);

    if (!fsSync.existsSync(fullPath)) {
      throw new Error('File not found on disk');
    }

    return {
      stream: fsSync.createReadStream(fullPath),
      mimeType: media.mimeType,
      size: media.sizeBytes,
      originalName: media.originalName,
    };
  }

  /* ============================
   * Metadata
   * ============================ */

  async getMetadata(mediaId) {
    const media = await Media.findById(mediaId);
    if (!media) throw new Error('Media not found');

    return {
      id: media._id,
      type: media.type,
      mimeType: media.mimeType,
      originalName: media.originalName,
      size: media.sizeBytes,
      readableSize: media.getReadableSize(),
      url: media.url,
      createdAt: media.createdAt,
    };
  }

  /* ============================
   * Delete
   * ============================ */

  async deleteMedia(mediaId, userId) {
    const media = await Media.findById(mediaId);
    if (!media) throw new Error('Media not found');

    if (media.ownerId.toString() !== userId.toString()) {
      throw new Error('Not authorized to delete this media');
    }

    // Check if other users reference same file (dedup safety)
    const references = await Media.countDocuments({
      sha256: media.sha256,
      _id: { $ne: media._id },
    });

    const fullPath = this.resolveSafePath(media.path);

    await media.deleteOne();

    if (references === 0 && fsSync.existsSync(fullPath)) {
      await fs.unlink(fullPath).catch(() => {});
    }

    return { deleted: true, mediaId };
  }

  /* ============================
   * Queries
   * ============================ */

  async getUserMedia(userId, { limit = 50, before = null } = {}) {
    const query = { ownerId: userId };
    if (before) query.createdAt = { $lt: before };

    const media = await Media.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    return media.map(m => ({
      id: m._id,
      type: m.type,
      mimeType: m.mimeType,
      originalName: m.originalName,
      size: m.sizeBytes,
      url: m.url,
      createdAt: m.createdAt,
    }));
  }

  async getConversationMedia(conversationId, { limit = 50, before = null, type = null } = {}) {
    const query = { conversationId };
    if (before) query.createdAt = { $lt: before };
    if (type) query.type = type;

    const media = await Media.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    return media.map(m => ({
      id: m._id,
      type: m.type,
      mimeType: m.mimeType,
      originalName: m.originalName,
      size: m.sizeBytes,
      url: m.url,
      createdAt: m.createdAt,
    }));
  }

  /* ============================
   * Init
   * ============================ */

  async init() {
    await this.ensureDir(this.uploadDir);
    console.log(`[MediaService] Upload directory ready: ${this.uploadDir}`);
  }
}

module.exports = new MediaService();
