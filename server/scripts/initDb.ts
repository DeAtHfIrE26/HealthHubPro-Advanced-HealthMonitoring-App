import dotenv from 'dotenv';
import { testConnection, initializeDatabase } from '../db/index';
import '../db/models';
import {
  User,
  Goal,
  Workout,
  Challenge,
  ChallengeParticipant
} from '../db/models';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Sample data
const sampleUsers = [
  {
    username: 'johndoe',
    password: 'password',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    height: 180,
    weight: 75,
    age: 30,
    gender: 'male',
    location: 'New York',
    role: 'user',
    activityLevel: 6,
    fitnessGoal: 'weight loss and muscle gain'
  },
  {
    username: 'janedoe',
    password: 'password',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    height: 165,
    weight: 60,
    age: 28,
    gender: 'female',
    location: 'Los Angeles',
    role: 'user',
    activityLevel: 7,
    fitnessGoal: 'endurance and flexibility'
  }
];

const sampleWorkouts = [
  {
    name: 'Morning Cardio',
    type: 'cardio',
    description: 'A quick morning cardio routine to get your heart pumping',
    difficulty: 'beginner',
    duration: 30,
    caloriesBurn: 250,
    exercises: [
      { name: 'Jumping Jacks', sets: 3, reps: 20 },
      { name: 'High Knees', sets: 3, reps: 20 },
      { name: 'Mountain Climbers', sets: 3, reps: 15 }
    ]
  },
  {
    name: 'Full Body Strength',
    type: 'strength',
    description: 'A comprehensive strength workout targeting all major muscle groups',
    difficulty: 'intermediate',
    duration: 45,
    caloriesBurn: 350,
    exercises: [
      { name: 'Push-ups', sets: 3, reps: 12 },
      { name: 'Squats', sets: 3, reps: 15 },
      { name: 'Lunges', sets: 3, reps: 10 },
      { name: 'Plank', sets: 3, reps: 1, duration: 60 }
    ]
  },
  {
    name: 'Yoga Flow',
    type: 'flexibility',
    description: 'A relaxing yoga flow to improve flexibility and reduce stress',
    difficulty: 'beginner',
    duration: 40,
    caloriesBurn: 150,
    exercises: [
      { name: 'Sun Salutation', sets: 3, reps: 1 },
      { name: 'Warrior Pose', sets: 2, reps: 1 },
      { name: 'Downward Dog', sets: 2, reps: 1 },
      { name: 'Child\'s Pose', sets: 1, reps: 1 }
    ]
  }
];

const sampleGoals = [
  {
    type: 'steps',
    target: 10000,
    period: 'daily',
    description: 'Walk 10,000 steps every day'
  },
  {
    type: 'calories',
    target: 500,
    period: 'daily',
    description: 'Burn 500 calories through exercise'
  },
  {
    type: 'active_minutes',
    target: 30,
    period: 'daily',
    description: 'Get 30 minutes of active exercise'
  },
  {
    type: 'water',
    target: 8,
    period: 'daily',
    description: 'Drink 8 glasses of water'
  }
];

const sampleChallenges = [
  {
    name: '10K Steps Challenge',
    description: 'Walk 10,000 steps every day for a week',
    type: 'steps',
    target: 70000,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  {
    name: 'Workout Streak',
    description: 'Complete a workout every day for 5 days',
    type: 'workout_count',
    target: 5,
    startDate: new Date(),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
  }
];

// Initialize database with sample data
async function initDb() {
  try {
    // Test database connection
    await testConnection();
    console.log('Database connection successful');
    
    // Initialize database (sync models)
    await initializeDatabase();
    console.log('Database initialized');
    
    // Check if we already have data
    const userCount = await User.count();
    
    if (userCount > 0) {
      console.log('Database already has data, skipping initialization');
      return;
    }
    
    // Create users
    const users = await Promise.all(
      sampleUsers.map(async (userData) => {
        // Hash password
        const hashedPassword = crypto.createHash('sha256').update(userData.password).digest('hex');
        
        return await User.create({
          ...userData,
          password: hashedPassword
        });
      })
    );
    
    console.log(`Created ${users.length} users`);
    
    // Create workouts
    const workouts = await Promise.all(
      sampleWorkouts.map(async (workoutData) => {
        return await Workout.create(workoutData);
      })
    );
    
    console.log(`Created ${workouts.length} workouts`);
    
    // Create goals for each user
    const goals = [];
    for (const user of users) {
      for (const goal of sampleGoals) {
        goals.push(await Goal.create({
          ...goal,
          userId: user.id
        }));
      }
    }
    console.log(`Created ${goals.length} goals`);
    
    // Create challenges
    const challenges = await Promise.all(
      sampleChallenges.map(async (challengeData) => {
        return await Challenge.create({
          ...challengeData,
          createdBy: users[0].id
        });
      })
    );
    
    console.log(`Created ${challenges.length} challenges`);
    
    // Add users to challenges
    const participants = [];
    for (const user of users) {
      for (const challenge of challenges) {
        participants.push(await ChallengeParticipant.create({
          userId: user.id,
          challengeId: challenge.id,
          currentProgress: Math.floor(Math.random() * 50)
        }));
      }
    }
    console.log(`Added ${participants.length} participants to challenges`);
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
initDb(); 