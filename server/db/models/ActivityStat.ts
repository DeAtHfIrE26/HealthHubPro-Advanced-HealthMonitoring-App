import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';

@Table({
  tableName: 'activity_stats',
  timestamps: true
})
export class ActivityStat extends Model {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  userId!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0
  })
  steps!: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 0
  })
  calories!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    defaultValue: 0
  })
  activeMinutes!: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 0
  })
  sleep!: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 0
  })
  water!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  date!: Date;

  // Relationships
  @BelongsTo(() => User)
  user!: User;
} 