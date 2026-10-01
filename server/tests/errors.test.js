const {
  AppError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  socketError,
  asyncHandler,
} = require('../src/utils/errors');

describe('AppError', () => {
  test('defaults to an internal error with status 500', () => {
    const err = new AppError('something broke');
    expect(err.message).toBe('something broke');
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.statusCode).toBe(500);
    expect(err).toBeInstanceOf(Error);
  });

  test('toJSON exposes only message and code', () => {
    const err = new AppError('oops', 'MY_CODE', 418);
    expect(err.toJSON()).toEqual({
      error: { message: 'oops', code: 'MY_CODE' },
    });
  });
});

describe('specific error subclasses', () => {
  test('ValidationError carries a field and 400 status', () => {
    const err = new ValidationError('bad input', 'email');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.field).toBe('email');
  });

  test('NotFoundError defaults to a generic resource message', () => {
    const err = new NotFoundError();
    expect(err.message).toBe('Resource not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
  });

  test('NotFoundError accepts a custom resource name', () => {
    const err = new NotFoundError('User');
    expect(err.message).toBe('User not found');
    expect(err.resource).toBe('User');
  });

  test('AuthenticationError defaults to a 401', () => {
    const err = new AuthenticationError();
    expect(err.code).toBe('AUTH_ERROR');
    expect(err.statusCode).toBe(401);
  });

  test('AuthorizationError defaults to a 403', () => {
    const err = new AuthorizationError();
    expect(err.code).toBe('FORBIDDEN');
    expect(err.statusCode).toBe(403);
  });

  test('RateLimitError defaults retryAfter to 60 seconds', () => {
    const err = new RateLimitError();
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.statusCode).toBe(429);
    expect(err.retryAfter).toBe(60);
  });
});

describe('socketError', () => {
  test('emits a formatted error payload on the given event', () => {
    const socket = { emit: jest.fn() };
    const error = new ValidationError('bad field', 'name');

    const result = socketError(socket, 'updateProfile', error);

    expect(socket.emit).toHaveBeenCalledWith('updateProfileError', {
      success: false,
      error: { message: 'bad field', code: 'VALIDATION_ERROR' },
    });
    expect(result).toEqual({
      success: false,
      error: { message: 'bad field', code: 'VALIDATION_ERROR' },
    });
  });

  test('falls back to defaults when the error has no message or code', () => {
    const socket = { emit: jest.fn() };

    socketError(socket, 'ping', {});

    expect(socket.emit).toHaveBeenCalledWith('pingError', {
      success: false,
      error: { message: 'An error occurred', code: 'UNKNOWN_ERROR' },
    });
  });
});

describe('asyncHandler', () => {
  test('passes through socket and args to the wrapped handler', async () => {
    const handler = jest.fn(async (socket, payload) => {
      socket.emit('ack', payload);
    });
    const wrapped = asyncHandler(handler);
    const socket = { emit: jest.fn() };

    await wrapped(socket, { id: 1 });

    expect(handler).toHaveBeenCalledWith(socket, { id: 1 });
    expect(socket.emit).toHaveBeenCalledWith('ack', { id: 1 });
  });

  test('converts a thrown error into a socket error event', async () => {
    const wrapped = asyncHandler(async () => {
      throw new NotFoundError('Conversation');
    });
    const socket = { emit: jest.fn() };

    await wrapped(socket);

    expect(socket.emit).toHaveBeenCalledWith('unknownError', {
      success: false,
      error: { message: 'Conversation not found', code: 'NOT_FOUND' },
    });
  });
});
