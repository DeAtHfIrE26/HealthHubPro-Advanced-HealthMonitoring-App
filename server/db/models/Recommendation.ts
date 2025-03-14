import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';

@Table({
  tableName: 'recommendations',
  timestamps: true
})
export class Recommendation extends Model {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  userId!: number;

  @Column({
    type: DataType.ENUM('workout', 'nutrition', 'sleep'),
    allowNull: false
  })
  type!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  content!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW
  })
  createdAt!: Date;

  @Column({
    type: DataType.ENUM('positive', 'negative'),
    allowNull: true
  })
  feedback!: string | null;

  // Relationships
  @BelongsTo(() => User)
  user!: User;
} 