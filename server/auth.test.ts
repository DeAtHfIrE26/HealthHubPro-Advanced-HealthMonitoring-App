/// <reference types="jest" />

import { Request, Response, NextFunction } from 'express';
import { Session, SessionData } from 'express-session';
import { authenticate, authorize, PermissionLevel } from './auth';
import { storage } from './storage';

// Mock the storage module
jest.mock('./storage', () => ({
  storage: {
    getUser: jest.fn(),
  },
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      session: {} as Session & Partial<SessionData>,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    
    // Mock the getUser function to return a test user
    (storage.getUser as jest.Mock).mockResolvedValue({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should set default user ID when no authorization header is present', async () => {
    await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.session).toHaveProperty('userId', 1);
    expect(storage.getUser).toHaveBeenCalledWith(1);
  });

  test('should set user ID when Bearer token is provided', async () => {
    mockRequest.headers = {
      authorization: 'Bearer test-token',
    };

    await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.session).toHaveProperty('userId', 1);
    expect(storage.getUser).toHaveBeenCalledWith(1);
  });

  test('should handle errors and return 401 status', async () => {
    (storage.getUser as jest.Mock).mockRejectedValue(new Error('Database error'));

    await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Authentication failed' });
  });
});

describe('Authorization Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      session: {
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
        },
      } as Session & Partial<SessionData>,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  test('should call next() when user is authenticated and authorized', async () => {
    const authMiddleware = authorize('workout', PermissionLevel.READ);
    
    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
  });

  test('should return 401 when user is not authenticated', async () => {
    mockRequest.session = {} as Session & Partial<SessionData>;
    
    const authMiddleware = authorize('workout', PermissionLevel.READ);
    
    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Authentication required' });
  });

  test('should handle errors and return 403 status', async () => {
    const authMiddleware = authorize('workout', PermissionLevel.ADMIN);
    
    // Force an error by making the session throw when accessed
    Object.defineProperty(mockRequest, 'session', {
      get: () => {
        throw new Error('Session error');
      },
    });
    
    await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Access denied' });
  });
}); 