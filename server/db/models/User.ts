import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import crypto from 'crypto';
import { Goal } from './Goal';
import { ActivityStat } from './ActivityStat';
import { WorkoutSession } from './WorkoutSession';
import { ChallengeParticipant } from './ChallengeParticipant';
import { Recommendation } from './Recommendation';

@Table({
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: (instance: User) => {
      if (instance.password) {
        instance.password = crypto.createHash('sha256').update(instance.password).digest('hex');
      }
    },
    beforeUpdate: (instance: User) => {
      if (instance.changed('password')) {
        instance.password = crypto.createHash('sha256').update(instance.password).digest('hex');
      }
    }
  }
})
export class User extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  username!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  password!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  firstName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  lastName!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  profileImage!: string | null;

  @Column({
    type: DataType.FLOAT,
    allowNull: true
  })
  height!: number | null;

  @Column({
    type: DataType.FLOAT,
    allowNull: true
  })
  weight!: number | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  age!: number | null;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  gender!: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  location!: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'user'
  })
  role!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 5
  })
  activityLevel!: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: 'general fitness'
  })
  fitnessGoal!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  dateOfBirth!: Date | null;

  // Relationships
  @HasMany(() => Goal)
  goals!: Goal[];

  @HasMany(() => ActivityStat)
  activityStats!: ActivityStat[];

  @HasMany(() => WorkoutSession)
  workoutSessions!: WorkoutSession[];

  @HasMany(() => ChallengeParticipant)
  challengeParticipations!: ChallengeParticipant[];

  @HasMany(() => Recommendation)
  recommendations!: Recommendation[];

  // Instance methods
  toJSON(): object {
    const values = { ...this.get() };
    delete values.password;
    return values;
  }

  validatePassword(password: string): boolean {
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    return this.password === hashedPassword;
  }
} 