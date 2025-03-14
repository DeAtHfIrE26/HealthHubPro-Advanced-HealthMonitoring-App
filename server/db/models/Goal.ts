import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';

@Table({
  tableName: 'goals',
  timestamps: true
})
export class Goal extends Model {
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  userId!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  type!: string;

  @Column({
    type: DataType.FLOAT,
    allowNull: false
  })
  target!: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0
  })
  current!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'daily'
  })
  period!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  description!: string | null;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  deadline!: Date | null;

  // Relationships
  @BelongsTo(() => User)
  user!: User;
} 