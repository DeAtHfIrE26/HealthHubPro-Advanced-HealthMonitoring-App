# Architecture Overview

## 1. Overview

FitAI is an AI-powered health and fitness tracking application that provides personalized insights and recommendations to help users achieve their fitness goals. The application is built using a modern full-stack architecture that combines a React frontend with an Express.js backend, utilizing PostgreSQL (via Neon's serverless Postgres) for data storage.

The application follows a client-server architecture where:
- Frontend is built with React, leveraging the Shadcn UI component library
- Backend is powered by Express.js, providing RESTful API endpoints
- Data is stored in a PostgreSQL database, accessed via Drizzle ORM
- AI recommendations are generated through a simulated service (with hooks for OpenAI integration)

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│  React Frontend │ ◄─────► │  Express Server │ ◄─────► │  PostgreSQL DB  │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                     ▲
                                     │
                                     ▼
                            ┌─────────────────┐
                            │                 │
                            │   AI Service    │
                            │                 │
                            └─────────────────┘
```

### 2.2 Technology Stack

- **Frontend**:
  - React with TypeScript
  - TanStack React Query for data fetching and state management
  - Shadcn UI components (based on Radix UI primitives)
  - Tailwind CSS for styling
  - Recharts for data visualization

- **Backend**:
  - Express.js with TypeScript
  - Drizzle ORM for database operations
  - WebSocket support for real-time updates

- **Database**:
  - PostgreSQL via Neon Serverless
  - Database schema managed through Drizzle ORM

- **AI Integration**:
  - Prepared hooks for OpenAI integration (simulated currently)

- **Development Tooling**:
  - Vite for frontend build and development
  - esbuild for backend bundling
  - TypeScript for type safety

## 3. Key Components

### 3.1 Frontend Architecture

The frontend is organized using a feature-based structure:

```
client/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── ui/         # Shadcn UI components
│   │   ├── dashboard/  # Dashboard-specific components
│   │   ├── workouts/   # Workout-specific components
│   │   └── ...
│   ├── context/        # React context providers
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility functions and configurations
│   ├── pages/          # Top-level page components
│   └── types/          # TypeScript type definitions
```

The frontend uses several key patterns:
- **Component composition** with Shadcn UI/Radix UI
- **React Query** for data fetching, caching, and synchronization
- **React Context** for global state management (e.g., AuthContext)
- **Custom hooks** for reusable logic (useAuth, useStats, useWorkout, etc.)

### 3.2 Backend Architecture

The backend follows a modular architecture with separation of concerns:

```
server/
├── db.ts           # Database connection and configuration
├── index.ts        # Express server setup and initialization
├── openai.ts       # AI service integration
├── routes.ts       # API route definitions
├── storage.ts      # Data access layer
└── vite.ts         # Development server configuration
```

The backend implements:
- **RESTful API endpoints** for client-server communication
- **WebSocket support** for real-time updates
- **Database abstraction** using Drizzle ORM
- **Authentication middleware** for secure access
- **Error handling middleware** for robust error responses

### 3.3 Database Schema

The database schema is defined using Drizzle ORM in `shared/schema.ts` and includes the following key entities:

- **Users**: User accounts and profiles
- **ActivityStats**: Daily user activity statistics (steps, calories, sleep, etc.)
- **Workouts**: Predefined and AI-generated workout plans
- **WorkoutSessions**: User workout tracking
- **Challenges**: Fitness challenges for community engagement
- **AIRecommendations**: Personalized AI-generated recommendations

### 3.4 Authentication & Authorization

The application implements a session-based authentication system:
- User credentials are stored securely with password hashing (bcrypt)
- Login creates a server-side session with client-side cookies
- Protected routes check authentication status before providing data
- Client-side auth state is managed through AuthContext

## 4. Data Flow

### 4.1 Client-Server Communication

1. **REST API**: The primary method of communication between client and server
   - Client makes HTTP requests to server endpoints
   - Server processes requests and returns JSON responses
   - React Query manages caching and synchronization of server state

2. **WebSocket Communication**: For real-time updates
   - Server pushes updates to clients (e.g., challenge updates, recommendations)
   - Client handles incoming messages through the WebSocket connection

### 4.2 Data Access Patterns

1. **Frontend Data Access**:
   - Custom hooks abstract data fetching logic (useStats, useWorkout, etc.)
   - React Query provides caching, refetching, and synchronization
   - Optimistic updates for responsive UI

2. **Backend Data Access**:
   - Storage interface defines data access methods
   - Drizzle ORM provides type-safe database operations
   - Schema validation with Zod ensures data integrity

## 5. External Dependencies

### 5.1 Key Frontend Dependencies

- **@tanstack/react-query**: Data fetching and state management
- **Radix UI components**: Accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Charting library for data visualization

### 5.2 Key Backend Dependencies

- **Express.js**: Web server framework
- **@neondatabase/serverless**: Serverless PostgreSQL client
- **Drizzle ORM**: Type-safe database toolkit
- **bcryptjs**: Password hashing
- **ws**: WebSocket implementation

### 5.3 Development Dependencies

- **Vite**: Frontend build tool
- **TypeScript**: Static typing
- **ESBuild**: JavaScript bundler

## 6. Deployment Strategy

The application is configured for deployment on Replit:

- **Build Process**:
  - Frontend: Vite builds static assets
  - Backend: esbuild bundles server code
  - Combined into single deployable package

- **Runtime Environment**:
  - Node.js server serves both API and static assets
  - Environment variables for configuration (DATABASE_URL)

- **Database**:
  - Neon Serverless PostgreSQL
  - Connection via DATABASE_URL environment variable

- **Scaling Considerations**:
  - Serverless database for automatic scaling
  - Stateless server design for horizontal scaling potential

## 7. Future Considerations

### 7.1 AI Integration Enhancement

The current implementation includes placeholders for AI recommendations. Future improvements could include:
- Full OpenAI API integration for true AI-powered insights
- More sophisticated recommendation algorithms based on user history
- Expanded AI-generated workout and nutrition plans

### 7.2 Performance Optimization

As the application grows, consider:
- Implementing server-side rendering for improved initial load times
- Adding Redis caching for frequently accessed data
- Optimizing database queries and indexing

### 7.3 Feature Expansion

Potential feature expansions include:
- Social features for connecting with friends
- Integration with wearable devices for automated tracking
- More sophisticated analytics and trend analysis