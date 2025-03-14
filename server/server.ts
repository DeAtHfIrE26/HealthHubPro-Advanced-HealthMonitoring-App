// Server entry point
import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import path from 'path';
import dotenv from 'dotenv';
import { registerRoutes } from './routes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Configure middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure session
app.use(session({
  secret: process.env.JWT_SECRET || 'health-hub-pro-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' } // Set to true in production with HTTPS
}));

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// Start server
async function startServer() {
  try {
    // Register API routes
    const server = await registerRoutes(app);
    
    // Start the server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
      console.log(`Client available at http://localhost:${PORT}`);
      console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle all other requests by serving the client HTML file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start the server
startServer();
