import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './User';
import { ChallengeParticipant } from './ChallengeParticipant';

@Table({
  tableName: 'challenges',
  timestamps: true
})
export class Challenge extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description!: string;

  @Column({
    type: DataType.ENUM('steps', 'calories', 'activeMinutes', 'workouts', 'custom'),
    allowNull: false
  })
  type!: string;

  @Column({
    type: DataType.FLOAT,
    allowNull: false
  })
  target!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  startDate!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  endDate!: Date;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  createdBy!: number;

  // Relationships
  @BelongsTo(() => User, 'createdBy')
  creator!: User;

  @HasMany(() => ChallengeParticipant)
  participants!: ChallengeParticipant[];
} 