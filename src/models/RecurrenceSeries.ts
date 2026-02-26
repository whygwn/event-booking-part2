import { DataTypes, Model } from 'sequelize';
import sequelize from '../lib/db';

class RecurrenceSeries extends Model {
  public id!: number;
  public title!: string;
  public description?: string;
  public location?: string;
  public category?: string;
  public created_by!: number;
  public frequency!: 'daily' | 'weekly' | 'monthly';
  public interval_count!: number;
  public weekdays?: number[];
  public start_date!: string;
  public until_date!: string;
  public start_time!: string;
  public end_time!: string;
  public capacity!: number;
  public timezone!: string;
  public series_version!: number;
}

RecurrenceSeries.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    frequency: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [['daily', 'weekly', 'monthly']] },
    },
    interval_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    weekdays: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    until_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    timezone: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: 'UTC',
    },
    series_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'recurrence_series',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default RecurrenceSeries;
