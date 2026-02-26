import sequelize from './db';

let schemaReadyPromise: Promise<void> | null = null;

export function ensureSchemaUpgrades(): Promise<void> {
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = (async () => {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS recurrence_series (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        location VARCHAR(200),
        category VARCHAR(50),
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
        interval_count INTEGER NOT NULL DEFAULT 1 CHECK (interval_count > 0),
        weekdays INTEGER[] NULL,
        start_date DATE NOT NULL,
        until_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        capacity INTEGER NOT NULL CHECK (capacity > 0),
        timezone VARCHAR(80) NOT NULL DEFAULT 'UTC',
        series_version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS recurrence_series_id INTEGER NULL REFERENCES recurrence_series(id) ON DELETE SET NULL;
    `);
    await sequelize.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS occurrence_date DATE NULL;
    `);
    await sequelize.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS occurrence_status VARCHAR(20) NOT NULL DEFAULT 'active'
      CHECK (occurrence_status IN ('active', 'cancelled'));
    `);
    await sequelize.query(`
      UPDATE events SET occurrence_status = 'active' WHERE occurrence_status IS NULL;
    `);
    await sequelize.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS modified_from_series BOOLEAN NOT NULL DEFAULT false;
    `);

    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);`
    );
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_events_occurrence_status ON events(occurrence_status);`
    );
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_events_recurrence_series ON events(recurrence_series_id);`
    );
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_slots_event_id_start_time ON slots(event_id, start_time);`
    );
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_slots_time_range ON slots(start_time, end_time);`
    );
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_bookings_slot_status ON bookings(slot_id, status);`
    );
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON bookings(user_id, status);`
    );
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);`
    );
  })();

  return schemaReadyPromise;
}
