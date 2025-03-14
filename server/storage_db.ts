// Database storage implementation
import {
  User,
  Goal,
  ActivityStat,
  Workout,
  WorkoutSession,
  Challenge,
  ChallengeParticipant,
  Recommendation
} from './db/models';
import { Op } from 'sequelize';

// User operations
export const getUser = async (id: number) => {
  return await User.findByPk(id);
};

export const getUserByUsername = async (username: string) => {
  return await User.findOne({ where: { username } });
};

export const getUserByEmail = async (email: string) => {
  return await User.findOne({ where: { email } });
};

export const createUser = async (userData: any) => {
  return await User.create(userData);
};

export const updateUser = async (id: number, userData: any) => {
  const user = await User.findByPk(id);
  if (!user) return null;
  
  return await user.update(userData);
};

// Activity stats operations
export const getActivityStats = async (userId: number, date: Date) => {
  const dateString = date.toISOString().split('T')[0];
  
  return await ActivityStat.findOne({
    where: {
      userId,
      date: {
        [Op.gte]: new Date(`${dateString}T00:00:00.000Z`),
        [Op.lt]: new Date(`${dateString}T23:59:59.999Z`)
      }
    }
  });
};

export const createActivityStats = async (statsData: any) => {
  return await ActivityStat.create(statsData);
};

export const updateActivityStats = async (id: number, statsData: any) => {
  const stats = await ActivityStat.findByPk(id);
  if (!stats) return null;
  
  return await stats.update(statsData);
};

export const getActivityStatsHistory = async (userId: number, days: number) => {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - days);
  
  return await ActivityStat.findAll({
    where: {
      userId,
      date: {
        [Op.gte]: startDate
      }
    },
    order: [['date', 'DESC']]
  });
};

// Goals operations
export const getGoals = async (userId: number) => {
  return await Goal.findAll({ where: { userId } });
};

export const createGoal = async (goalData: any) => {
  return await Goal.create(goalData);
};

export const updateGoal = async (id: number, goalData: any) => {
  const goal = await Goal.findByPk(id);
  if (!goal) return null;
  
  return await goal.update(goalData);
};

// Workout operations
export const getWorkouts = async (type?: string, level?: string) => {
  const where: any = {};
  
  if (type) {
    where.type = type;
  }
  
  if (level) {
    where.difficulty = level;
  }
  
  return await Workout.findAll({ where });
};

export const getWorkout = async (id: number) => {
  return await Workout.findByPk(id);
};

export const createWorkout = async (workoutData: any) => {
  return await Workout.create(workoutData);
};

// Workout session operations
export const getWorkoutSessions = async (userId: number) => {
  return await WorkoutSession.findAll({
    where: { userId },
    include: [Workout],
    order: [['startTime', 'DESC']]
  });
};

export const createWorkoutSession = async (sessionData: any) => {
  return await WorkoutSession.create(sessionData);
};

export const updateWorkoutSession = async (id: number, sessionData: any) => {
  const session = await WorkoutSession.findByPk(id);
  if (!session) return null;
  
  return await session.update(sessionData);
};

// Challenge operations
export const getChallenges = async () => {
  return await Challenge.findAll({
    include: [{
      model: User,
      as: 'creator',
      attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
    }]
  });
};

export const getChallenge = async (id: number) => {
  return await Challenge.findByPk(id, {
    include: [{
      model: User,
      as: 'creator',
      attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
    }]
  });
};

export const createChallenge = async (challengeData: any) => {
  return await Challenge.create(challengeData);
};

// Challenge participants operations
export const getChallengeParticipants = async (challengeId: number) => {
  return await ChallengeParticipant.findAll({
    where: { challengeId },
    include: [{
      model: User,
      attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage', 'location']
    }],
    order: [['currentProgress', 'DESC']]
  });
};

export const joinChallenge = async (participantData: any) => {
  return await ChallengeParticipant.create(participantData);
};

export const updateChallengeProgress = async (userId: number, challengeId: number, progress: number) => {
  const participant = await ChallengeParticipant.findOne({
    where: { userId, challengeId }
  });
  
  if (!participant) return null;
  
  return await participant.update({ currentProgress: progress });
};

export const getUserChallenges = async (userId: number) => {
  const participations = await ChallengeParticipant.findAll({
    where: { userId },
    attributes: ['challengeId']
  });
  
  const challengeIds = participations.map(p => p.challengeId);
  
  return await Challenge.findAll({
    where: {
      id: {
        [Op.in]: challengeIds
      }
    },
    include: [{
      model: User,
      as: 'creator',
      attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
    }]
  });
};

// Recommendation operations
export const getRecommendations = async (userId: number, type?: string) => {
  const where: any = { userId };
  
  if (type) {
    where.type = type;
  }
  
  return await Recommendation.findAll({
    where,
    order: [['createdAt', 'DESC']]
  });
};

export const createRecommendation = async (recommendationData: any) => {
  return await Recommendation.create(recommendationData);
};

export const updateRecommendationFeedback = async (id: number, feedback: string) => {
  const recommendation = await Recommendation.findByPk(id);
  if (!recommendation) return null;
  
  return await recommendation.update({ feedback });
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
