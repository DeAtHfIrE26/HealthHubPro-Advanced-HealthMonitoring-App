import express from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage"; // Use mock storage
import crypto from "crypto";
import { z } from "zod";

// Mock schemas for validation
const insertUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  height: z.number().optional(),
  weight: z.number().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.date().optional(),
  fitnessLevel: z.string().optional()
});

const insertActivityStatsSchema = z.object({
  userId: z.number(),
  date: z.date(),
  steps: z.number().min(0).optional(),
  calories: z.number().min(0).optional(),
  activeMinutes: z.number().min(0).optional(),
  sleep: z.number().min(0).optional(),
  water: z.number().min(0).optional()
});

const insertGoalSchema = z.object({
  userId: z.number(),
  type: z.string(),
  target: z.number().min(0),
  period: z.string().optional(),
  description: z.string().optional()
});

// Simple authentication middleware
const authenticate = (req: any, res: any, next: any) => {
  // For demo purposes, we'll skip actual authentication
  next();
};

// Simple authorization middleware
const authorize = (resource: string, level: string) => {
  return (req: any, res: any, next: any) => {
    // For demo purposes, we'll skip actual authorization
    next();
  };
};

// Mock permission levels
const PermissionLevel = {
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin'
};

// Mock middleware
const rateLimit = (limit: number, windowMs: number) => {
  return (req: any, res: any, next: any) => {
    next();
  };
};

const corsMiddleware = () => {
  return (req: any, res: any, next: any) => {
    next();
  };
};

const csrfProtection = () => {
  return (req: any, res: any, next: any) => {
    next();
  };
};

const securityHeaders = (req: any, res: any, next: any) => {
  next();
};

const cacheMiddleware = (seconds: number) => {
  return (req: any, res: any, next: any) => {
    next();
  };
};

// Mock AI service
const aiService = {
  generateAllRecommendations: async (userId: number) => {
    // Create some sample recommendations
    await storage.createRecommendation({
      userId,
      type: 'workout',
      content: 'Based on your profile, we recommend trying our "Morning Cardio" workout.',
      createdAt: new Date()
    });
    
    await storage.createRecommendation({
      userId,
      type: 'nutrition',
      content: 'Consider increasing your protein intake to support muscle recovery.',
      createdAt: new Date()
    });
    
    await storage.createRecommendation({
      userId,
      type: 'sleep',
      content: 'Try to maintain a consistent sleep schedule for better recovery.',
      createdAt: new Date()
    });
  }
};

// Mock logging functions
const logActivity = async (userId: number, activityType: string, data: any) => {
  console.log(`[ACTIVITY LOG] User ${userId}: ${activityType}`, data);
};

const logWorkoutSession = async (userId: number, sessionId: number, workoutId: number, data: any) => {
  console.log(`[WORKOUT LOG] User ${userId}, Session ${sessionId}, Workout ${workoutId}`, data);
};

// Mock workout plan generator
const generateWorkoutPlan = async (userId: number, preferences: any) => {
  const workouts = await storage.getWorkouts();
  return {
    userId,
    workouts: workouts.slice(0, 3),
    schedule: ['Monday', 'Wednesday', 'Friday'],
    notes: 'This plan is tailored to your fitness level and goals.'
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
  // Apply security middleware
  apiRouter.use(corsMiddleware());
  apiRouter.use(securityHeaders);
  // apiRouter.use(rateLimit(100, 60000)); // Temporarily disable rate limiting for development
  
  // Apply CSRF protection to non-GET routes
  // apiRouter.use(csrfProtection()); // Temporarily disable CSRF for development
  
  // Generate CSRF token
  apiRouter.get("/auth/csrf-token", (req, res) => {
    // Generate a new token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Store the token in the session
    (req.session as any).csrfToken = token;
    
    // Return the token
    res.json({ csrfToken: token });
  });
  
  // Auth routes
  apiRouter.post("/auth/register", async (req, res) => {
    try {
      const parseResult = insertUserSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: parseResult.error.flatten() 
        });
      }
      
      const userData = parseResult.data;
      
      // Check if user already exists
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash the password
      const hashedPassword = crypto.createHash('sha256').update(userData.password).digest('hex');
      
      // Create the user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      // Init default goals for the user
      await storage.createGoal({
        userId: user.id,
        type: "steps",
        target: 10000,
        current: 0,
        period: "daily",
        description: "Walk 10,000 steps every day"
      });
      
      await storage.createGoal({
        userId: user.id,
        type: "calories",
        target: 500,
        current: 0,
        period: "daily",
        description: "Burn 500 calories through exercise"
      });
      
      await storage.createGoal({
        userId: user.id,
        type: "active_minutes",
        target: 30,
        current: 0,
        period: "daily",
        description: "Get 30 minutes of active exercise"
      });
      
      await storage.createGoal({
        userId: user.id,
        type: "water",
        target: 8,
        current: 0,
        period: "daily",
        description: "Drink 8 glasses of water"
      });
      
      // Generate AI recommendations for the user
      await aiService.generateAllRecommendations(user.id);
      
      // Return the user without the password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Server error during registration" });
    }
  });
  
  apiRouter.post("/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Get the user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check password
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      
      if (user.password !== hashedPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Return the user without the password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Server error during login" });
    }
  });
  
  // User routes
  apiRouter.get("/users/:id", authenticate, authorize('users', PermissionLevel.READ), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.patch("/users/:id", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(userId, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Activity stats routes
  apiRouter.get("/activity-stats/:userId", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const dateParam = req.query.date as string || new Date().toISOString().split('T')[0];
      const date = new Date(dateParam);
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      let stats = await storage.getActivityStats(userId, date);
      
      // If no stats exist for the day, create empty stats
      if (!stats) {
        stats = await storage.createActivityStats({
          userId,
          date,
          steps: 0,
          calories: 0,
          activeMinutes: 0,
          sleep: 0,
          water: 0
        });
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error getting activity stats:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/activity-stats", authenticate, async (req, res) => {
    try {
      const parseResult = insertActivityStatsSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid activity stats data", 
          errors: parseResult.error.flatten() 
        });
      }
      
      const statsData = parseResult.data;
      
      // Check if stats already exist for this user and date
      const existingStats = await storage.getActivityStats(statsData.userId, statsData.date);
      
      if (existingStats) {
        // Update existing stats
        const updatedStats = await storage.updateActivityStats(existingStats.id, statsData);
        return res.json(updatedStats);
      }
      
      // Create new stats
      const stats = await storage.createActivityStats(statsData);
      
      // Update goals based on new stats
      const goals = await storage.getGoals(statsData.userId);
      
      for (const goal of goals) {
        let currentProgress = 0;
        
        switch (goal.type) {
          case "steps":
            currentProgress = statsData.steps || 0;
            break;
          case "calories":
            currentProgress = statsData.calories || 0;
            break;
          case "active_minutes":
            currentProgress = statsData.activeMinutes || 0;
            break;
          case "water":
            currentProgress = Math.round((statsData.water || 0) * 10) / 10; // Round to 1 decimal place
            break;
        }
        
        await storage.updateGoal(goal.id, { current: currentProgress });
      }
      
      // Log activity to InfluxDB (mock)
      await logActivity(statsData.userId, 'activity_stats_update', statsData);
      
      res.status(201).json(stats);
    } catch (error) {
      console.error("Error creating activity stats:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/activity-stats/:userId/history", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const days = parseInt(req.query.days as string || "7");
      if (isNaN(days) || days <= 0) {
        return res.status(400).json({ message: "Invalid days parameter" });
      }
      
      const stats = await storage.getActivityStatsHistory(userId, days);
      res.json(stats);
    } catch (error) {
      console.error("Error getting activity stats history:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Goals routes
  apiRouter.get("/goals/:userId", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const goals = await storage.getGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("Error getting goals:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/goals", authenticate, async (req, res) => {
    try {
      const parseResult = insertGoalSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid goal data", 
          errors: parseResult.error.flatten() 
        });
      }
      
      const goalData = parseResult.data;
      
      // Create the goal
      const goal = await storage.createGoal({
        ...goalData,
        current: 0
      });
      
      res.status(201).json(goal);
    } catch (error) {
      console.error("Error creating goal:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.patch("/goals/:id", authenticate, async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      if (isNaN(goalId)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }
      
      const updatedGoal = await storage.updateGoal(goalId, req.body);
      if (!updatedGoal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.json(updatedGoal);
    } catch (error) {
      console.error("Error updating goal:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Workouts routes
  apiRouter.get("/workouts", cacheMiddleware(300), async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const level = req.query.level as string | undefined;
      
      const workouts = await storage.getWorkouts(type, level);
      res.json(workouts);
    } catch (error) {
      console.error("Error getting workouts:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/workouts/:id", async (req, res) => {
    try {
      const workoutId = parseInt(req.params.id);
      if (isNaN(workoutId)) {
        return res.status(400).json({ message: "Invalid workout ID" });
      }
      
      const workout = await storage.getWorkout(workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      res.json(workout);
    } catch (error) {
      console.error("Error getting workout:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Workout sessions routes
  apiRouter.post("/workout-sessions", authenticate, async (req, res) => {
    try {
      const { userId, workoutId, startTime } = req.body;
      
      // Create workout session
      const session = await storage.createWorkoutSession({
        userId,
        workoutId,
        startTime: new Date(startTime),
      });
      
      // Log to InfluxDB (mock)
      await logWorkoutSession(userId, session.id, workoutId, {
        elapsedTime: 0,
        caloriesBurned: 0,
        heartRate: 0,
        completed: false
      });
      
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating workout session:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/workout-sessions/:userId", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const sessions = await storage.getWorkoutSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error getting workout sessions:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.patch("/workout-sessions/:id", authenticate, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      if (isNaN(sessionId)) {
        return res.status(400).json({ message: "Invalid session ID" });
      }
      
      const updatedSession = await storage.updateWorkoutSession(sessionId, req.body);
      if (!updatedSession) {
        return res.status(404).json({ message: "Workout session not found" });
      }
      
      // If session is completed, update activity stats
      if (updatedSession.completed && updatedSession.endTime) {
        const workout = await storage.getWorkout(updatedSession.workoutId);
        if (workout) {
          const today = new Date();
          let stats = await storage.getActivityStats(updatedSession.userId, today);
          
          if (stats) {
            await storage.updateActivityStats(stats.id, {
              calories: (stats.calories || 0) + (updatedSession.caloriesBurned || 0),
              activeMinutes: (stats.activeMinutes || 0) + Math.floor((updatedSession.elapsedTime || 0) / 60)
            });
          } else {
            await storage.createActivityStats({
              userId: updatedSession.userId,
              date: today,
              calories: updatedSession.caloriesBurned || 0,
              activeMinutes: Math.floor((updatedSession.elapsedTime || 0) / 60),
              steps: 0,
              sleep: 0,
              water: 0
            });
          }
          
          // Log to InfluxDB (mock)
          await logWorkoutSession(updatedSession.userId, sessionId, updatedSession.workoutId, {
            elapsedTime: updatedSession.elapsedTime,
            caloriesBurned: updatedSession.caloriesBurned,
            heartRate: updatedSession.heartRate,
            completed: true
          });
        }
      }
      
      res.json(updatedSession);
    } catch (error) {
      console.error("Error updating workout session:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Challenges routes
  apiRouter.get("/challenges", async (req, res) => {
    try {
      const challenges = await storage.getChallenges();
      res.json(challenges);
    } catch (error) {
      console.error("Error getting challenges:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/challenges/:id", async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      res.json(challenge);
    } catch (error) {
      console.error("Error getting challenge:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/challenges", authenticate, async (req, res) => {
    try {
      const { name, description, type, target, startDate, endDate, createdBy } = req.body;
      
      // Create challenge
      const challenge = await storage.createChallenge({
        name,
        description,
        type,
        target,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdBy
      });
      
      res.status(201).json(challenge);
    } catch (error) {
      console.error("Error creating challenge:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/challenges/:id/participants", async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const participants = await storage.getChallengeParticipants(challengeId);
      res.json(participants);
    } catch (error) {
      console.error("Error getting challenge participants:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/challenges/:id/join", authenticate, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.id);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const { userId } = req.body;
      
      // Join challenge
      const participant = await storage.joinChallenge({
        userId,
        challengeId,
        currentProgress: 0,
        joinDate: new Date()
      });
      
      res.status(201).json(participant);
    } catch (error) {
      console.error("Error joining challenge:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.patch("/challenges/:challengeId/progress", authenticate, async (req, res) => {
    try {
      const challengeId = parseInt(req.params.challengeId);
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      const { userId, progress } = req.body;
      
      // Update progress
      const updatedParticipant = await storage.updateChallengeProgress(userId, challengeId, progress);
      if (!updatedParticipant) {
        return res.status(404).json({ message: "Challenge participation not found" });
      }
      
      res.json(updatedParticipant);
    } catch (error) {
      console.error("Error updating challenge progress:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/users/:userId/challenges", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const challenges = await storage.getUserChallenges(userId);
      res.json(challenges);
    } catch (error) {
      console.error("Error getting user challenges:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Recommendations routes
  apiRouter.get("/recommendations/:userId", authenticate, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const type = req.query.type as string | undefined;
      
      const recommendations = await storage.getRecommendations(userId, type);
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/recommendations/:id/feedback", authenticate, async (req, res) => {
    try {
      const recommendationId = parseInt(req.params.id);
      if (isNaN(recommendationId)) {
        return res.status(400).json({ message: "Invalid recommendation ID" });
      }
      
      const { feedback } = req.body;
      
      // Update feedback
      const updatedRecommendation = await storage.updateRecommendationFeedback(recommendationId, feedback);
      if (!updatedRecommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }
      
      res.json(updatedRecommendation);
    } catch (error) {
      console.error("Error updating recommendation feedback:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // AI-generated workout plan
  apiRouter.post("/workout-plans", authenticate, async (req, res) => {
    try {
      const { userId, preferences } = req.body;
      
      // Generate workout plan
      const plan = await generateWorkoutPlan(userId, preferences);
      res.json(plan);
    } catch (error) {
      console.error("Error generating workout plan:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Mount API router
  app.use("/api", apiRouter);
  
  // Create HTTP server
  const server = createServer(app);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to HealthHubPro WebSocket server'
    }));
    
    // Handle messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        
        // Echo back the message for now
        ws.send(JSON.stringify({
          type: 'echo',
          data
        }));
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  return server;
}
