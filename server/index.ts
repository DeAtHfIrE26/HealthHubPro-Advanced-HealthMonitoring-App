import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

// WebSocket message schema
const wsMessageSchema = z.object({
  type: z.enum(['startWorkout', 'updateWorkout', 'endWorkout', 'updateChallenge']),
  payload: z.record(z.any())
});

// WebSocket clients map
const clients = new Map<number, WebSocket>();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5000'],
  credentials: true
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'health-hub-pro-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');
  
  // Handle messages from clients
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      const validatedData = wsMessageSchema.parse(data);
      
      // Handle different message types
      switch (validatedData.type) {
        case 'startWorkout':
          if (validatedData.payload.userId) {
            clients.set(validatedData.payload.userId, ws);
            console.log(`User ${validatedData.payload.userId} started workout session`);
          }
          break;
          
        case 'updateWorkout':
          console.log(`Workout update: ${JSON.stringify(validatedData.payload)}`);
          
          if (validatedData.payload.trainerId) {
            const trainerWs = clients.get(validatedData.payload.trainerId);
            if (trainerWs && trainerWs.readyState === WebSocket.OPEN) {
              trainerWs.send(JSON.stringify({
                type: 'clientWorkoutUpdate',
                payload: validatedData.payload
              }));
            }
          }
          break;
          
        case 'endWorkout':
          console.log(`Workout ended: ${JSON.stringify(validatedData.payload)}`);
          
          if (validatedData.payload.userId) {
            clients.delete(validatedData.payload.userId);
          }
          break;
          
        case 'updateChallenge':
          if (validatedData.payload.challengeId) {
            // Broadcast to all participants (mock implementation)
            console.log(`Challenge update: ${JSON.stringify(validatedData.payload)}`);
          }
          break;
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    Array.from(clients.entries()).forEach(([userId, client]) => {
      if (client === ws) {
        clients.delete(userId);
      }
    });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(`Error: ${message}`, err);

  res.status(status).json({ 
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

(async () => {
  try {
    // Register API routes
    await registerRoutes(app);

    // Setup Vite in development or serve static files in production
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const port = process.env.PORT || 5000;
    server.listen(port, () => {
      log(`🚀 Server running on port ${port}`);
      log(`📊 API available at http://localhost:${port}/api`);
      log(`🌐 Client available at http://localhost:${port}`);
      log(`🔌 WebSocket available at ws://localhost:${port}/ws`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

export { server };