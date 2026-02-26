import { DataTypes, Model } from 'sequelize';
import sequelize from '../lib/db';

class Booking extends Model {
  public id!: number;
  public user_id!: number;
  public slot_id!: number;
  public spots!: number;
  public status!: 'booked' | 'cancelled' | 'waitlist';
  public cancelled_at?: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Booking.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    slot_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    spots: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['booked', 'cancelled', 'waitlist']],
      },
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'bookings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Booking;
