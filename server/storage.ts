// Mock implementation for storage
// In a production environment, you would use a real database

// Mock data storage
const mockData = {
  users: [
    {
      id: 1,
      username: "johndoe",
      password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", // "password"
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      profileImage: null,
      height: 180,
      weight: 75,
      age: 30,
      gender: "male",
      location: "New York",
      role: "user",
      activityLevel: 6,
      fitnessGoal: "weight loss and muscle gain"
    }
  ],
  activityStats: [],
  goals: [
    {
      id: 1,
      userId: 1,
      type: "steps",
      target: 10000,
      current: 5000
    },
    {
      id: 2,
      userId: 1,
      type: "calories",
      target: 850,
      current: 400
    },
    {
      id: 3,
      userId: 1,
      type: "activeMinutes",
      target: 60,
      current: 30
    },
    {
      id: 4,
      userId: 1,
      type: "water",
      target: 2.5,
      current: 1.2
    }
  ],
  workouts: [
    {
      id: 1,
      name: "Morning Cardio",
      type: "cardio",
      description: "A quick morning cardio routine to get your heart pumping",
      difficulty: "beginner",
      duration: 30,
      caloriesBurn: 250,
      exercises: [
        { name: "Jumping Jacks", sets: 3, reps: 20 },
        { name: "High Knees", sets: 3, reps: 20 },
        { name: "Mountain Climbers", sets: 3, reps: 15 }
      ]
    },
    {
      id: 2,
      name: "Full Body Strength",
      type: "strength",
      description: "A comprehensive strength workout targeting all major muscle groups",
      difficulty: "intermediate",
      duration: 45,
      caloriesBurn: 350,
      exercises: [
        { name: "Push-ups", sets: 3, reps: 12 },
        { name: "Squats", sets: 3, reps: 15 },
        { name: "Lunges", sets: 3, reps: 10 },
        { name: "Plank", sets: 3, reps: 1, duration: 60 }
      ]
    }
  ],
  workoutSessions: [],
  challenges: [
    {
      id: 1,
      name: "10K Steps Challenge",
      description: "Walk 10,000 steps every day for a week",
      type: "steps",
      target: 70000,
      startDate: new Date("2023-06-01"),
      endDate: new Date("2023-06-07"),
      createdBy: 1
    }
  ],
  challengeParticipants: [
    {
      id: 1,
      challengeId: 1,
      userId: 1,
      joinDate: new Date("2023-06-01"),
      currentProgress: 35000
    }
  ],
  recommendations: [
    {
      id: 1,
      userId: 1,
      type: "workout",
      content: "Based on your activity level, try incorporating more strength training into your routine.",
      createdAt: new Date(),
      feedback: null
    }
  ]
};

// Helper function to generate IDs
const generateId = (collection: any[]): number => {
  return collection.length > 0 ? Math.max(...collection.map(item => item.id)) + 1 : 1;
};

// User operations
export const getUser = async (id: number) => {
  return mockData.users.find(user => user.id === id) || null;
};

export const getUserByUsername = async (username: string) => {
  return mockData.users.find(user => user.username === username) || null;
};

export const getUserByEmail = async (email: string) => {
  return mockData.users.find(user => user.email === email) || null;
};

export const createUser = async (userData: any) => {
  const newUser = {
    id: generateId(mockData.users),
    ...userData,
    activityLevel: 5,
    fitnessGoal: "general fitness"
  };
  mockData.users.push(newUser);
  return newUser;
};

export const updateUser = async (id: number, userData: any) => {
  const userIndex = mockData.users.findIndex(user => user.id === id);
  if (userIndex === -1) return null;
  
  mockData.users[userIndex] = { ...mockData.users[userIndex], ...userData };
  return mockData.users[userIndex];
};

// Activity stats operations
export const getActivityStats = async (userId: number, date: Date) => {
  const dateString = date.toISOString().split('T')[0];
  return mockData.activityStats.find(
    stats => stats.userId === userId && new Date(stats.date).toISOString().split('T')[0] === dateString
  ) || null;
};

export const createActivityStats = async (statsData: any) => {
  const newStats = {
    id: generateId(mockData.activityStats),
    ...statsData,
    date: new Date(statsData.date)
  };
  mockData.activityStats.push(newStats);
  return newStats;
};

export const updateActivityStats = async (id: number, statsData: any) => {
  const statsIndex = mockData.activityStats.findIndex(stats => stats.id === id);
  if (statsIndex === -1) return null;
  
  mockData.activityStats[statsIndex] = { ...mockData.activityStats[statsIndex], ...statsData };
  return mockData.activityStats[statsIndex];
};

export const getActivityStatsHistory = async (userId: number, days: number) => {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - days);
  
  return mockData.activityStats.filter(
    stats => stats.userId === userId && new Date(stats.date) >= startDate
  );
};

// Goals operations
export const getGoals = async (userId: number) => {
  return mockData.goals.filter(goal => goal.userId === userId);
};

export const createGoal = async (goalData: any) => {
  const newGoal = {
    id: generateId(mockData.goals),
    ...goalData
  };
  mockData.goals.push(newGoal);
  return newGoal;
};

export const updateGoal = async (id: number, goalData: any) => {
  const goalIndex = mockData.goals.findIndex(goal => goal.id === id);
  if (goalIndex === -1) return null;
  
  mockData.goals[goalIndex] = { ...mockData.goals[goalIndex], ...goalData };
  return mockData.goals[goalIndex];
};

// Workout operations
export const getWorkouts = async () => {
  return mockData.workouts;
};

export const getWorkout = async (id: number) => {
  return mockData.workouts.find(workout => workout.id === id) || null;
};

export const createWorkout = async (workoutData: any) => {
  const newWorkout = {
    id: generateId(mockData.workouts),
    ...workoutData
  };
  mockData.workouts.push(newWorkout);
  return newWorkout;
};

// Workout session operations
export const getWorkoutSessions = async (userId: number) => {
  return mockData.workoutSessions.filter(session => session.userId === userId);
};

export const createWorkoutSession = async (sessionData: any) => {
  const newSession = {
    id: generateId(mockData.workoutSessions),
    ...sessionData,
    startTime: new Date(sessionData.startTime || new Date()),
    endTime: sessionData.endTime ? new Date(sessionData.endTime) : null
  };
  mockData.workoutSessions.push(newSession);
  return newSession;
};

export const updateWorkoutSession = async (id: number, sessionData: any) => {
  const sessionIndex = mockData.workoutSessions.findIndex(session => session.id === id);
  if (sessionIndex === -1) return null;
  
  mockData.workoutSessions[sessionIndex] = { 
    ...mockData.workoutSessions[sessionIndex], 
    ...sessionData,
    endTime: sessionData.endTime ? new Date(sessionData.endTime) : mockData.workoutSessions[sessionIndex].endTime
  };
  return mockData.workoutSessions[sessionIndex];
};

// Challenge operations
export const getChallenges = async () => {
  return mockData.challenges;
};

export const getChallenge = async (id: number) => {
  return mockData.challenges.find(challenge => challenge.id === id) || null;
};

export const createChallenge = async (challengeData: any) => {
  const newChallenge = {
    id: generateId(mockData.challenges),
    ...challengeData,
    startDate: new Date(challengeData.startDate),
    endDate: new Date(challengeData.endDate)
  };
  mockData.challenges.push(newChallenge);
  return newChallenge;
};

// Challenge participants operations
export const getChallengeParticipants = async (challengeId: number) => {
  return mockData.challengeParticipants.filter(participant => participant.challengeId === challengeId);
};

export const joinChallenge = async (participantData: any) => {
  const newParticipant = {
    id: generateId(mockData.challengeParticipants),
    ...participantData,
    joinDate: new Date(),
    currentProgress: 0
  };
  mockData.challengeParticipants.push(newParticipant);
  return newParticipant;
};

export const updateChallengeProgress = async (id: number, progress: number) => {
  const participantIndex = mockData.challengeParticipants.findIndex(participant => participant.id === id);
  if (participantIndex === -1) return null;
  
  mockData.challengeParticipants[participantIndex].currentProgress = progress;
  return mockData.challengeParticipants[participantIndex];
};

export const getUserChallenges = async (userId: number) => {
  const participantChallenges = mockData.challengeParticipants
    .filter(participant => participant.userId === userId)
    .map(participant => participant.challengeId);
  
  return mockData.challenges.filter(challenge => participantChallenges.includes(challenge.id));
};

// Recommendation operations
export const getRecommendations = async (userId: number, type?: string) => {
  return mockData.recommendations.filter(
    rec => rec.userId === userId && (!type || rec.type === type)
  );
};

export const createRecommendation = async (recommendationData: any) => {
  const newRecommendation = {
    id: generateId(mockData.recommendations),
    ...recommendationData,
    createdAt: new Date(),
    feedback: null
  };
  mockData.recommendations.push(newRecommendation);
  return newRecommendation;
};

export const updateRecommendationFeedback = async (id: number, feedback: string) => {
  const recIndex = mockData.recommendations.findIndex(rec => rec.id === id);
  if (recIndex === -1) return null;
  
  mockData.recommendations[recIndex].feedback = feedback;
  return mockData.recommendations[recIndex];
};

export const storage = {
  getUser,
  getUserByUsername,
  getUserByEmail,
  createUser,
  updateUser,
  getActivityStats,
  createActivityStats,
  updateActivityStats,
  getActivityStatsHistory,
  getGoals,
  createGoal,
  updateGoal,
  getWorkouts,
  getWorkout,
  createWorkout,
  getWorkoutSessions,
  createWorkoutSession,
  updateWorkoutSession,
  getChallenges,
  getChallenge,
  createChallenge,
  getChallengeParticipants,
  joinChallenge,
  updateChallengeProgress,
  getUserChallenges,
  getRecommendations,
  createRecommendation,
  updateRecommendationFeedback
};
