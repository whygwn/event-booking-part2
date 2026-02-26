import { DataTypes, Model } from 'sequelize';
import sequelize from '../lib/db';

class Event extends Model {
  public id!: number;
  public title!: string;
  public description!: string;
  public date!: Date;
  public location!: string;
  public category!: string;
  public created_by!: number;
  public recurrence_series_id?: number;
  public occurrence_date?: string;
  public occurrence_status?: 'active' | 'cancelled';
  public modified_from_series?: boolean;
}

Event.init(
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
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(200),
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
    },
    recurrence_series_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    occurrence_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    occurrence_status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'cancelled']],
      },
    },
    modified_from_series: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'events',
    timestamps: false,
  }
);

export default Event;
