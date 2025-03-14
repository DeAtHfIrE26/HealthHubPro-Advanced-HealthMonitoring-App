import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { WorkoutSession } from './WorkoutSession';

@Table({
  tableName: 'workouts',
  timestamps: true
})
export class Workout extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.ENUM('cardio', 'strength', 'flexibility', 'hiit', 'yoga', 'endurance'),
    allowNull: false
  })
  type!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description!: string;

  @Column({
    type: DataType.ENUM('beginner', 'intermediate', 'advanced'),
    allowNull: false
  })
  difficulty!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  duration!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  caloriesBurn!: number;

  @Column({
    type: DataType.JSON,
    allowNull: false
  })
  exercises!: Array<{
    name: string;
    sets: number;
    reps: number;
    duration?: number;
  }>;

  // Relationships
  @HasMany(() => WorkoutSession)
  sessions!: WorkoutSession[];
} 