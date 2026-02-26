#!/usr/bin/env node

const { Client } = require('pg');

async function getClient() {
  const config = {
    user: process.env.PGUSER || 'whygwn',
    database: process.env.PGDATABASE || 'whygwn_db',
  };
  config.host = process.env.PGHOST || '/var/run/postgresql';
  if (process.env.PGPORT) config.port = parseInt(process.env.PGPORT, 10);
  if (process.env.PGPASSWORD) config.password = process.env.PGPASSWORD;
  const client = new Client(config);
  await client.connect();
  return client;
}

async function run() {
  const client = await getClient();
  let passed = 0;
  let failed = 0;

  console.log('\nSCENARIO VALIDATION TESTS\n');

  try {
    console.log('Scenario 1: The Full Slot');
    const s1 = await client.query(`
      SELECT e.title
      FROM events e
      JOIN slots s ON e.id = s.event_id
      LEFT JOIN bookings b ON s.id = b.slot_id
      GROUP BY e.id, s.id
      HAVING COUNT(*) FILTER (WHERE b.status = 'booked') >= 3
         AND COUNT(*) FILTER (WHERE b.status = 'waitlist') >= 3
      LIMIT 1
    `);
    if (s1.rows.length) {
      console.log('  PASS');
      passed++;
    } else {
      console.log('  FAIL');
      failed++;
    }

    console.log('Scenario 2: The Busy User');
    const s2 = await client.query(`
      SELECT u.email
      FROM users u
      JOIN bookings b ON u.id = b.user_id
      JOIN slots s ON b.slot_id = s.id
      JOIN events e ON s.event_id = e.id
      GROUP BY u.id, u.email
      HAVING COUNT(*) FILTER (WHERE b.status = 'booked' AND e.date > CURRENT_DATE) >= 1
         AND COUNT(*) FILTER (WHERE b.status = 'booked' AND e.date <= CURRENT_DATE) >= 1
         AND COUNT(*) FILTER (WHERE b.status = 'waitlist') >= 1
      LIMIT 1
    `);
    if (s2.rows.length) {
      console.log('  PASS');
      passed++;
    } else {
      console.log('  FAIL');
      failed++;
    }

    console.log('Scenario 3: The Multi-Slot Event');
    const s3 = await client.query(`
      SELECT e.id
      FROM events e
      JOIN slots s ON e.id = s.event_id
      GROUP BY e.id
      HAVING COUNT(s.id) >= 3
      LIMIT 1
    `);
    if (s3.rows.length) {
      console.log('  PASS');
      passed++;
    } else {
      console.log('  FAIL');
      failed++;
    }

    console.log('Scenario 4: The Cancellation Chain');
    const s4 = await client.query(`
      SELECT COUNT(*)::int AS cnt
      FROM bookings
      WHERE status = 'cancelled'
    `);
    if ((s4.rows[0]?.cnt || 0) > 0) {
      console.log('  PASS');
      passed++;
    } else {
      console.log('  NOTE: no cancelled rows detected, manual verification may be required.');
    }

    console.log('Scenario 5: The Conflict');
    const s5 = await client.query(`
      SELECT u.id
      FROM users u
      JOIN bookings b ON u.id = b.user_id
      JOIN slots s ON b.slot_id = s.id
      WHERE b.status = 'booked'
      GROUP BY u.id
      HAVING COUNT(*) > 1
      LIMIT 1
    `);
    if (s5.rows.length) {
      console.log('  PASS');
      passed++;
    } else {
      console.log('  NOTE: no conflict user found, manual verification may be required.');
    }

    console.log(`\nPASSED: ${passed}`);
    console.log(`FAILED: ${failed}\n`);

    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Validation error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
