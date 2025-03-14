// Mock implementation for Redis cache
// In a production environment, you would use an actual Redis client

import express from 'express';

// Simple in-memory cache
const memoryCache: Record<string, { value: any; expiry: number | null }> = {};

// Set cache value with optional expiry (in seconds)
export const cacheSet = async <T>(key: string, value: T, expiry?: number): Promise<void> => {
  try {
    console.log(`[MOCK] Setting cache for key: ${key}`);
    memoryCache[key] = {
      value,
      expiry: expiry ? Date.now() + expiry * 1000 : null
    };
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

// Get cache value
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    console.log(`[MOCK] Getting cache for key: ${key}`);
    const cached = memoryCache[key];
    
    if (!cached) {
      return null;
    }
    
    // Check if expired
    if (cached.expiry && cached.expiry < Date.now()) {
      delete memoryCache[key];
      return null;
    }
    
    return cached.value as T;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

// Delete cache value
export const cacheDelete = async (key: string): Promise<void> => {
  try {
    console.log(`[MOCK] Deleting cache for key: ${key}`);
    delete memoryCache[key];
  } catch (error) {
    console.error('Error deleting cache:', error);
  }
};

// Clear all cache
export const cacheClear = async (): Promise<void> => {
  try {
    console.log('[MOCK] Clearing all cache');
    Object.keys(memoryCache).forEach(key => {
      delete memoryCache[key];
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

// Express middleware for caching responses
export const cacheMiddleware = (duration: number = 60) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = `cache:${req.originalUrl || req.url}`;
    
    try {
      // Try to get from cache
      const cachedResponse = await cacheGet<{ body: any; headers: Record<string, string> }>(key);
      
      if (cachedResponse) {
        console.log(`[MOCK] Cache hit for: ${key}`);
        
        // Set headers from cached response
        Object.entries(cachedResponse.headers).forEach(([header, value]) => {
          res.setHeader(header, value);
        });
        
        // Send cached response
        return res.send(cachedResponse.body);
      }
      
      // Store original send method
      const originalSend = res.send;
      
      // Override send method to cache response
      res.send = function(body: any): express.Response {
        // Cache the response
        const headers: Record<string, string> = {};
        
        // Get response headers
        const headerNames = res.getHeaderNames();
        for (const header of headerNames) {
          const value = res.getHeader(header);
          if (typeof value === 'string') {
            headers[header] = value;
          }
        }
        
        // Store in cache
        cacheSet(key, { body, headers }, duration);
        
        // Call original send method
        return originalSend.call(this, body);
      };
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};
