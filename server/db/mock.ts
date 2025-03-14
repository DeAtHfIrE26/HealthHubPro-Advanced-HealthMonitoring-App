import { EventEmitter } from 'events';
import crypto from 'crypto';

// Mock database using in-memory storage
class MockDatabase {
  private data: Record<string, any[]> = {
    users: [],
    goals: [],
    activityStats: [],
    workouts: [],
    workoutSessions: [],
    challenges: [],
    challengeParticipants: [],
    recommendations: []
  };

  private idCounters: Record<string, number> = {
    users: 0,
    goals: 0,
    activityStats: 0,
    workouts: 0,
    workoutSessions: 0,
    challenges: 0,
    challengeParticipants: 0,
    recommendations: 0
  };

  private eventEmitter = new EventEmitter();

  constructor() {
    // Initialize with some sample data
    this.initSampleData();
  }

  private initSampleData() {
    // Sample users
    const users = [
      {
        username: 'johndoe',
        password: crypto.createHash('sha256').update('password123').digest('hex'),
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        height: 180,
        weight: 75,
        gender: 'male',
        dateOfBirth: new Date('1990-01-15'),
        fitnessLevel: 'intermediate',
        role: 'user'
      },
      {
        username: 'janedoe',
        password: crypto.createHash('sha256').update('password123').digest('hex'),
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        height: 165,
        weight: 60,
        gender: 'female',
        dateOfBirth: new Date('1992-05-20'),
        fitnessLevel: 'beginner',
        role: 'user'
      }
    ];

    users.forEach(user => this.create('users', user));

    // Sample workouts
    const workouts = [
      {
        name: 'Morning Cardio',
        type: 'cardio',
        description: 'A light cardio workout to start your day',
        difficulty: 'beginner',
        duration: 30,
        caloriesBurn: 200,
        exercises: JSON.stringify([
          { name: 'Jumping Jacks', duration: 5, sets: 3 },
          { name: 'High Knees', duration: 5, sets: 3 },
          { name: 'Burpees', duration: 5, sets: 2 }
        ])
      },
      {
        name: 'Full Body Strength',
        type: 'strength',
        description: 'A comprehensive strength workout targeting all major muscle groups',
        difficulty: 'intermediate',
        duration: 45,
        caloriesBurn: 350,
        exercises: JSON.stringify([
          { name: 'Push-ups', reps: 15, sets: 3 },
          { name: 'Squats', reps: 20, sets: 3 },
          { name: 'Lunges', reps: 12, sets: 3, perSide: true },
          { name: 'Plank', duration: 60, sets: 3 }
        ])
      },
      {
        name: 'Yoga Flow',
        type: 'flexibility',
        description: 'A relaxing yoga session to improve flexibility and reduce stress',
        difficulty: 'beginner',
        duration: 40,
        caloriesBurn: 150,
        exercises: JSON.stringify([
          { name: 'Sun Salutation', duration: 10, sets: 1 },
          { name: 'Warrior Poses', duration: 10, sets: 1 },
          { name: 'Balance Poses', duration: 10, sets: 1 },
          { name: 'Relaxation', duration: 10, sets: 1 }
        ])
      }
    ];

    workouts.forEach(workout => this.create('workouts', workout));

    // Sample goals for each user
    const goalTypes = [
      { type: 'steps', target: 10000, period: 'daily', description: 'Walk 10,000 steps every day' },
      { type: 'calories', target: 500, period: 'daily', description: 'Burn 500 calories through exercise' },
      { type: 'active_minutes', target: 30, period: 'daily', description: 'Get 30 minutes of active exercise' },
      { type: 'water', target: 8, period: 'daily', description: 'Drink 8 glasses of water' }
    ];

    users.forEach(user => {
      goalTypes.forEach(goal => {
        this.create('goals', {
          userId: user.id,
          ...goal,
          current: Math.floor(goal.target * 0.6) // 60% progress
        });
      });
    });

    // Sample challenges
    const challenges = [
      {
        name: '10K Steps Challenge',
        description: 'Walk 10,000 steps every day for a week',
        type: 'steps',
        target: 70000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: 1
      },
      {
        name: 'Workout Streak',
        description: 'Complete a workout every day for 5 days',
        type: 'workout_count',
        target: 5,
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdBy: 1
      }
    ];

    challenges.forEach(challenge => this.create('challenges', challenge));

    // Sample challenge participants
    users.forEach(user => {
      challenges.forEach(challenge => {
        this.create('challengeParticipants', {
          userId: user.id,
          challengeId: challenge.id,
          currentProgress: Math.floor(Math.random() * 50),
          joinDate: new Date()
        });
      });
    });

    // Sample activity stats for the past week
    users.forEach(user => {
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        this.create('activityStats', {
          userId: user.id,
          date,
          steps: Math.floor(Math.random() * 5000) + 5000,
          calories: Math.floor(Math.random() * 300) + 200,
          activeMinutes: Math.floor(Math.random() * 30) + 15,
          sleep: Math.floor(Math.random() * 3) + 6,
          water: Math.floor(Math.random() * 4) + 4
        });
      }
    });

    // Sample workout sessions
    users.forEach(user => {
      workouts.forEach(workout => {
        const startTime = new Date();
        startTime.setHours(startTime.getHours() - Math.floor(Math.random() * 48));
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + workout.duration);
        
        this.create('workoutSessions', {
          userId: user.id,
          workoutId: workout.id,
          startTime,
          endTime,
          elapsedTime: workout.duration * 60,
          caloriesBurned: workout.caloriesBurn,
          heartRate: Math.floor(Math.random() * 40) + 120,
          completed: true
        });
      });
    });

    // Sample recommendations
    const recommendationTypes = ['workout', 'nutrition', 'sleep'];
    const recommendationContents = [
      'Based on your activity level, try incorporating more strength training into your routine.',
      'Consider adding more protein to your diet to support muscle recovery.',
      'Your sleep patterns suggest you might benefit from going to bed 30 minutes earlier.'
    ];

    users.forEach(user => {
      for (let i = 0; i < 3; i++) {
        this.create('recommendations', {
          userId: user.id,
          type: recommendationTypes[i],
          content: recommendationContents[i],
          createdAt: new Date(),
          feedback: null
        });
      }
    });
  }

  // CRUD operations
  private create(table: string, data: any) {
    const id = ++this.idCounters[table];
    const item = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
    this.data[table].push(item);
    this.eventEmitter.emit(`${table}:create`, item);
    return { ...item };
  }

  private findAll(table: string, where: any = {}) {
    return this.data[table]
      .filter(item => this.matchesWhere(item, where))
      .map(item => ({ ...item }));
  }

  private findOne(table: string, where: any = {}) {
    const item = this.data[table].find(item => this.matchesWhere(item, where));
    return item ? { ...item } : null;
  }

  private findById(table: string, id: number) {
    return this.findOne(table, { id });
  }

  private update(table: string, id: number, data: any) {
    const index = this.data[table].findIndex(item => item.id === id);
    if (index === -1) return null;

    const updatedItem = {
      ...this.data[table][index],
      ...data,
      updatedAt: new Date()
    };

    this.data[table][index] = updatedItem;
    this.eventEmitter.emit(`${table}:update`, updatedItem);
    return { ...updatedItem };
  }

  private delete(table: string, id: number) {
    const index = this.data[table].findIndex(item => item.id === id);
    if (index === -1) return false;

    const deletedItem = this.data[table][index];
    this.data[table].splice(index, 1);
    this.eventEmitter.emit(`${table}:delete`, deletedItem);
    return true;
  }

  private matchesWhere(item: any, where: any): boolean {
    for (const key in where) {
      if (typeof where[key] === 'object' && where[key] !== null) {
        // Handle special operators like $gt, $lt, etc.
        if (!this.matchesOperators(item[key], where[key])) {
          return false;
        }
      } else if (item[key] !== where[key]) {
        return false;
      }
    }
    return true;
  }

  private matchesOperators(value: any, operators: any): boolean {
    for (const op in operators) {
      switch (op) {
        case '$gt':
          if (!(value > operators[op])) return false;
          break;
        case '$gte':
          if (!(value >= operators[op])) return false;
          break;
        case '$lt':
          if (!(value < operators[op])) return false;
          break;
        case '$lte':
          if (!(value <= operators[op])) return false;
          break;
        case '$ne':
          if (value === operators[op]) return false;
          break;
        case '$in':
          if (!operators[op].includes(value)) return false;
          break;
        case '$between':
          if (!(value >= operators[op][0] && value <= operators[op][1])) return false;
          break;
      }
    }
    return true;
  }

  // Public API
  public getUser = async (id: number) => {
    return this.findById('users', id);
  };

  public getUserByUsername = async (username: string) => {
    return this.findOne('users', { username });
  };

  public getUserByEmail = async (email: string) => {
    return this.findOne('users', { email });
  };

  public createUser = async (userData: any) => {
    return this.create('users', userData);
  };

  public updateUser = async (id: number, userData: any) => {
    return this.update('users', id, userData);
  };

  public getActivityStats = async (userId: number, date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return this.findOne('activityStats', item => {
      const itemDate = new Date(item.date).toISOString().split('T')[0];
      return item.userId === userId && itemDate === dateString;
    });
  };

  public createActivityStats = async (statsData: any) => {
    return this.create('activityStats', statsData);
  };

  public updateActivityStats = async (id: number, statsData: any) => {
    return this.update('activityStats', id, statsData);
  };

  public getActivityStatsHistory = async (userId: number, days: number) => {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    
    return this.findAll('activityStats', item => 
      item.userId === userId && new Date(item.date) >= startDate
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  public getGoals = async (userId: number) => {
    return this.findAll('goals', { userId });
  };

  public createGoal = async (goalData: any) => {
    return this.create('goals', goalData);
  };

  public updateGoal = async (id: number, goalData: any) => {
    return this.update('goals', id, goalData);
  };

  public getWorkouts = async (type?: string, level?: string) => {
    let where: any = {};
    if (type) where.type = type;
    if (level) where.difficulty = level;
    return this.findAll('workouts', where);
  };

  public getWorkout = async (id: number) => {
    return this.findById('workouts', id);
  };

  public createWorkout = async (workoutData: any) => {
    return this.create('workouts', workoutData);
  };

  public getWorkoutSessions = async (userId: number) => {
    const sessions = this.findAll('workoutSessions', { userId });
    
    // Add workout details to each session
    return Promise.all(sessions.map(async session => {
      const workout = await this.getWorkout(session.workoutId);
      return { ...session, workout };
    }));
  };

  public createWorkoutSession = async (sessionData: any) => {
    return this.create('workoutSessions', sessionData);
  };

  public updateWorkoutSession = async (id: number, sessionData: any) => {
    return this.update('workoutSessions', id, sessionData);
  };

  public getChallenges = async () => {
    const challenges = this.findAll('challenges');
    
    // Add creator details to each challenge
    return Promise.all(challenges.map(async challenge => {
      const creator = await this.getUser(challenge.createdBy);
      return { 
        ...challenge, 
        creator: creator ? {
          id: creator.id,
          username: creator.username,
          firstName: creator.firstName,
          lastName: creator.lastName,
          profileImage: creator.profileImage
        } : null
      };
    }));
  };

  public getChallenge = async (id: number) => {
    const challenge = this.findById('challenges', id);
    if (!challenge) return null;
    
    const creator = await this.getUser(challenge.createdBy);
    return { 
      ...challenge, 
      creator: creator ? {
        id: creator.id,
        username: creator.username,
        firstName: creator.firstName,
        lastName: creator.lastName,
        profileImage: creator.profileImage
      } : null
    };
  };

  public createChallenge = async (challengeData: any) => {
    return this.create('challenges', challengeData);
  };

  public getChallengeParticipants = async (challengeId: number) => {
    const participants = this.findAll('challengeParticipants', { challengeId });
    
    // Add user details to each participant
    return Promise.all(participants.map(async participant => {
      const user = await this.getUser(participant.userId);
      return { 
        ...participant, 
        user: user ? {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImage: user.profileImage,
          location: user.location
        } : null
      };
    }));
  };

  public joinChallenge = async (participantData: any) => {
    return this.create('challengeParticipants', participantData);
  };

  public updateChallengeProgress = async (userId: number, challengeId: number, progress: number) => {
    const participant = this.findOne('challengeParticipants', { userId, challengeId });
    if (!participant) return null;
    
    return this.update('challengeParticipants', participant.id, { currentProgress: progress });
  };

  public getUserChallenges = async (userId: number) => {
    const participations = this.findAll('challengeParticipants', { userId });
    const challengeIds = participations.map(p => p.challengeId);
    
    const challenges = this.findAll('challenges', item => challengeIds.includes(item.id));
    
    // Add creator details to each challenge
    return Promise.all(challenges.map(async challenge => {
      const creator = await this.getUser(challenge.createdBy);
      return { 
        ...challenge, 
        creator: creator ? {
          id: creator.id,
          username: creator.username,
          firstName: creator.firstName,
          lastName: creator.lastName,
          profileImage: creator.profileImage
        } : null
      };
    }));
  };

  public getRecommendations = async (userId: number, type?: string) => {
    let where: any = { userId };
    if (type) where.type = type;
    
    return this.findAll('recommendations', where)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  public createRecommendation = async (recommendationData: any) => {
    return this.create('recommendations', recommendationData);
  };

  public updateRecommendationFeedback = async (id: number, feedback: string) => {
    return this.update('recommendations', id, { feedback });
  };
}

// Create and export the mock database instance
const mockDb = new MockDatabase();

export const storage = {
  getUser: mockDb.getUser,
  getUserByUsername: mockDb.getUserByUsername,
  getUserByEmail: mockDb.getUserByEmail,
  createUser: mockDb.createUser,
  updateUser: mockDb.updateUser,
  getActivityStats: mockDb.getActivityStats,
  createActivityStats: mockDb.createActivityStats,
  updateActivityStats: mockDb.updateActivityStats,
  getActivityStatsHistory: mockDb.getActivityStatsHistory,
  getGoals: mockDb.getGoals,
  createGoal: mockDb.createGoal,
  updateGoal: mockDb.updateGoal,
  getWorkouts: mockDb.getWorkouts,
  getWorkout: mockDb.getWorkout,
  createWorkout: mockDb.createWorkout,
  getWorkoutSessions: mockDb.getWorkoutSessions,
  createWorkoutSession: mockDb.createWorkoutSession,
  updateWorkoutSession: mockDb.updateWorkoutSession,
  getChallenges: mockDb.getChallenges,
  getChallenge: mockDb.getChallenge,
  createChallenge: mockDb.createChallenge,
  getChallengeParticipants: mockDb.getChallengeParticipants,
  joinChallenge: mockDb.joinChallenge,
  updateChallengeProgress: mockDb.updateChallengeProgress,
  getUserChallenges: mockDb.getUserChallenges,
  getRecommendations: mockDb.getRecommendations,
  createRecommendation: mockDb.createRecommendation,
  updateRecommendationFeedback: mockDb.updateRecommendationFeedback
}; 