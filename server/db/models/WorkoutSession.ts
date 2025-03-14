import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';
import { Workout } from './Workout';

@Table({
  tableName: 'workout_sessions',
  timestamps: true
})
export class WorkoutSession extends Model {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  userId!: number;

  @ForeignKey(() => Workout)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  workoutId!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  startTime!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  endTime!: Date | null;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0
  })
  elapsedTime!: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 0
  })
  caloriesBurned!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  heartRate!: number | null;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    defaultValue: false
  })
  completed!: boolean;

  // Relationships
  @BelongsTo(() => User)
  user!: User;

  @BelongsTo(() => Workout)
  workout!: Workout;
} 