import { Sequelize } from 'sequelize';
import * as pg from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const shouldUseSsl =
  process.env.PGSSLMODE === 'require' ||
  Boolean(connectionString && connectionString.includes('sslmode=require'));

const baseConfig = {
  dialect: 'postgres' as const,
  dialectModule: pg,
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
  },
  ...(shouldUseSsl ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } } : {}),
};

const sequelize = connectionString
  ? new Sequelize(connectionString, baseConfig)
  : new Sequelize({
      ...baseConfig,
      host: process.env.PGHOST || '/var/run/postgresql',
      port: parseInt(process.env.PGPORT || '5432', 10),
      username: process.env.PGUSER || 'whygwn',
      password: process.env.PGPASSWORD || undefined,
      database: process.env.PGDATABASE || 'whygwn_db',
    });

export default sequelize;
