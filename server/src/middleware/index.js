// src/middleware/index.js
// Central export for middleware

const { createRateLimiter, checkEventLimit, rateLimits } = require('./rateLimiter');

module.exports = {
  createRateLimiter,
  checkEventLimit,
  rateLimits,
};