const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config');

/**
 * Strict authentication middleware
 * - Requires valid JWT
 * - Attaches req.user and req.userId
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : null;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, config.jwt.secret);

    const userId =
      decoded.sub ||
      decoded.userId ||
      decoded.id;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional authentication middleware
 * - Attaches user if token is valid
 * - Never blocks request
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : null;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, config.jwt.secret);

    const userId =
      decoded.sub ||
      decoded.userId ||
      decoded.id;

    if (!userId) {
      return next();
    }

    const user = await User.findById(userId);

    if (user) {
      req.user = user;
      req.userId = user._id;
    }

    next();
  } catch (error) {
    // Silent fail — optional auth must never block
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
};
