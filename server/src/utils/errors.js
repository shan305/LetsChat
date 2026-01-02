// src/utils/errors.js
// Custom error classes for better error handling

class AppError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
      }
    };
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 400);
    this.field = field;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.resource = resource;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 'FORBIDDEN', 403);
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super('Too many requests', 'RATE_LIMITED', 429);
    this.retryAfter = retryAfter;
  }
}

// Socket error wrapper
const socketError = (socket, event, error) => {
  const errorResponse = {
    success: false,
    error: {
      message: error.message || 'An error occurred',
      code: error.code || 'UNKNOWN_ERROR',
    }
  };
  
  console.error(`[Socket Error] ${event}:`, error.message);
  socket.emit(`${event}Error`, errorResponse);
  
  return errorResponse;
};

// Async handler wrapper for socket events
const asyncHandler = (handler) => {
  return async (socket, ...args) => {
    try {
      await handler(socket, ...args);
    } catch (error) {
      const eventName = handler.name || 'unknown';
      socketError(socket, eventName, error);
    }
  };
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  socketError,
  asyncHandler,
};