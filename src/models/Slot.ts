import { DataTypes, Model } from 'sequelize';
import sequelize from '../lib/db';

class Slot extends Model {
  public id!: number;
  public event_id!: number;
  public start_time!: Date;
  public end_time!: Date;
  public capacity!: number;
}

Slot.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
  },
  {
    sequelize,
    tableName: 'slots',
    timestamps: false,
  }
);

export default Slot;
