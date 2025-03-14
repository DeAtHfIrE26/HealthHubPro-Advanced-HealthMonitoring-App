import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import { storage } from "./storage";
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { z } from 'zod';

// WebSocket message schema
const wsMessageSchema = z.object({
  type: z.enum(['startWorkout', 'updateWorkout', 'endWorkout', 'updateChallenge']),
  payload: z.record(z.any())
});

// WebSocket clients map
const clients = new Map<number, WebSocket>();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
const wss = new WebSocketServer({ server });

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
          // Store client connection with user ID
          if (validatedData.payload.userId) {
            clients.set(validatedData.payload.userId, ws);
            console.log(`User ${validatedData.payload.userId} started workout session`);
          }
          break;
          
        case 'updateWorkout':
          // Process workout update
          console.log(`Workout update: ${JSON.stringify(validatedData.payload)}`);
          
          // Broadcast to trainers if applicable
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
          // Process workout completion
          console.log(`Workout ended: ${JSON.stringify(validatedData.payload)}`);
          
          // Remove client from active connections
          if (validatedData.payload.userId) {
            clients.delete(validatedData.payload.userId);
          }
          break;
          
        case 'updateChallenge':
          // Process challenge update and broadcast to participants
          if (validatedData.payload.challengeId) {
            const participants = await storage.getChallengeParticipants(validatedData.payload.challengeId);
            
            // Broadcast to all participants
            participants.forEach(participant => {
              const participantWs = clients.get(participant.userId);
              if (participantWs && participantWs.readyState === WebSocket.OPEN) {
                participantWs.send(JSON.stringify({
                  type: 'challengeUpdate',
                  payload: validatedData.payload
                }));
              }
            });
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
    // Remove client from the map (find by value)
    Array.from(clients.entries()).forEach(([userId, client]) => {
      if (client === ws) {
        clients.delete(userId);
      }
    });
  });
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`Error: ${message}`, err);

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 3001;
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();

export { server };
