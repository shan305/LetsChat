const express = require('express');
const multer = require('multer');
const { MediaService, MessageService, PresenceService } = require('../services');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');
const { getIO } = require('../socket');

const router = express.Router();
const logger = createLogger('MediaRoute');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { receiverPhone, message, clientMessageId } = req.body;
    const senderPhone = req.user.phoneNumber;

    if (!receiverPhone) {
      return res.status(400).json({ error: 'Receiver phone number required' });
    }

    logger.debug('Media upload request', {
      senderPhone,
      receiverPhone,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });

    const media = await MediaService.saveFile({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      ownerId: req.user._id,
      type: 'image',
    });

    logger.debug('Media saved', { mediaId: media._id.toString() });

    const result = await MessageService.sendMessageByPhone({
      senderPhone,
      receiverPhone,
      text: message || '',
      type: 'image',
      mediaId: media._id,
      clientMessageId,
    });

    const base64Content = await MediaService.getFileBase64(media._id);
    const metadata = await MediaService.getMetadata(media._id);

    const responseData = {
      ...result.message,
      senderPhone,
      receiverPhone,
      message: message || '',
      text: message || '',
      messageType: 'image',
      type: 'image',
      clientMessageId,
      media: {
        content: base64Content,
        contentType: metadata.mimeType,
      },
    };

    const io = getIO();
    const receiverUser = await User.findByPhone(receiverPhone);
    
    if (receiverUser) {
      const receiverUserId = receiverUser._id.toString();

      let receiverSockets = [];
      try {
        receiverSockets = await PresenceService.getUserSockets(receiverUserId);
      } catch (e) {
        logger.warn('PresenceService.getUserSockets failed', { error: e.message });
      }

      if (receiverSockets && receiverSockets.length > 0) {
        for (const socketId of receiverSockets) {
          io.to(socketId).emit('newMessage', responseData);
        }
      }

      io.to(`user:${receiverUserId}`).emit('newMessage', responseData);

      io.to(`user:${receiverUserId}`).emit('newNotification', {
        type: 'message',
        senderPhone,
        sender: senderPhone,
        message: 'You have a new message!',
        preview: 'Image',
      });
    }

    logger.info('Media message sent', {
      from: senderPhone,
      to: receiverPhone,
      mediaId: media._id.toString(),
      messageId: responseData._id,
    });

    res.json({
      success: true,
      message: responseData,
    });

  } catch (error) {
    logger.error('Media upload failed', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

router.get('/:mediaId', async (req, res) => {
  try {
    const { stream, mimeType, size, originalName } = await MediaService.getFileStream(req.params.mediaId);
    
    res.set({
      'Content-Type': mimeType,
      'Content-Length': size,
      'Content-Disposition': `inline; filename="${originalName}"`,
    });
    
    stream.pipe(res);
  } catch (error) {
    logger.error('Media fetch failed', { error: error.message });
    res.status(404).json({ error: 'Media not found' });
  }
});

router.get('/:mediaId/download', async (req, res) => {
  try {
    const { stream, mimeType, size, originalName } = await MediaService.getFileStream(req.params.mediaId);
    
    res.set({
      'Content-Type': mimeType,
      'Content-Length': size,
      'Content-Disposition': `attachment; filename="${originalName}"`,
    });
    
    stream.pipe(res);
  } catch (error) {
    logger.error('Media download failed', { error: error.message });
    res.status(404).json({ error: 'Media not found' });
  }
});

router.get('/:mediaId/base64', authenticateToken, async (req, res) => {
  try {
    const base64 = await MediaService.getFileBase64(req.params.mediaId);
    const metadata = await MediaService.getMetadata(req.params.mediaId);

    res.json({
      content: base64,
      contentType: metadata.mimeType,
      originalName: metadata.originalName,
    });
  } catch (error) {
    logger.error('Media base64 fetch failed', { error: error.message });
    res.status(404).json({ error: 'Media not found' });
  }
});

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

module.exports = router;