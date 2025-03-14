import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';
import { Challenge } from './Challenge';

@Table({
  tableName: 'challenge_participants',
  timestamps: true
})
export class ChallengeParticipant extends Model {
  @ForeignKey(() => Challenge)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  challengeId!: number;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  userId!: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0
  })
  currentProgress!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  joinDate!: Date;

  // Relationships
  @BelongsTo(() => Challenge)
  challenge!: Challenge;

  @BelongsTo(() => User)
  user!: User;
} 