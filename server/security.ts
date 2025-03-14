// Mock implementation for security middleware
// In a production environment, you would use actual security libraries

import express from 'express';

// CORS middleware
export const corsMiddleware = () => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  };
};

// Security headers middleware
export const securityHeaders = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Set security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'");
  
  next();
};

// Rate limiting middleware
export const rateLimit = (maxRequests: number, windowMs: number) => {
  // Simple in-memory store for rate limiting
  const ipRequests: Record<string, { count: number; resetTime: number }> = {};
  
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    
    // Initialize or reset if window has passed
    if (!ipRequests[ip] || ipRequests[ip].resetTime < now) {
      ipRequests[ip] = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    // Increment request count
    ipRequests[ip].count++;
    
    // Check if over limit
    if (ipRequests[ip].count > maxRequests) {
      return res.status(429).json({
        message: 'Too many requests, please try again later.'
      });
    }
    
    next();
  };
};

// CSRF protection middleware
export const csrfProtection = () => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Skip CSRF check for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Get CSRF token from request header
    const csrfToken = req.headers['x-csrf-token'] as string;
    
    // Get stored token from session
    const storedToken = (req.session as any)?.csrfToken;
    
    // Validate token
    if (!csrfToken || !storedToken || csrfToken !== storedToken) {
      console.log('[MOCK] CSRF validation would normally happen here');
      // In a mock implementation, we'll just log and continue
      // In production, you would return a 403 error
      // return res.status(403).json({ message: 'Invalid CSRF token' });
    }
    
    next();
  };
};
