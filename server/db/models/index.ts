import { User } from './User';
import { Goal } from './Goal';
import { ActivityStat } from './ActivityStat';
import { Workout } from './Workout';
import { WorkoutSession } from './WorkoutSession';
import { Challenge } from './Challenge';
import { ChallengeParticipant } from './ChallengeParticipant';
import { Recommendation } from './Recommendation';
import sequelize from '../index';

// Register models with Sequelize
sequelize.addModels([
  User,
  Goal,
  ActivityStat,
  Workout,
  WorkoutSession,
  Challenge,
  ChallengeParticipant,
  Recommendation
]);

export {
  User,
  Goal,
  ActivityStat,
  Workout,
  WorkoutSession,
  Challenge,
  ChallengeParticipant,
  Recommendation
}; 