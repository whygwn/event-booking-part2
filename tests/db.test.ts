import { Client } from 'pg';

describe('Database Connection', () => {
    let client: Client;

    beforeAll(async () => {
        const config: any = {
            user: process.env.PGUSER || 'whygwn',
            database: process.env.PGDATABASE || 'whygwn_db',
        };
        if (process.env.PGHOST) {
            config.host = process.env.PGHOST;
        } else {
            config.host = '/var/run/postgresql';
        }
        if (process.env.PGPORT) config.port = parseInt(process.env.PGPORT, 10);
        if (process.env.PGPASSWORD) config.password = process.env.PGPASSWORD;

        client = new Client(config);
        await client.connect();
    });

    afterAll(async () => {
        await client.end();
    });

    test('should connect and query the database', async () => {
        const res = await client.query('SELECT NOW()');
        expect(res.rows.length).toBe(1);
    });

    test('should have the users table created', async () => {
        const res = await client.query("SELECT * FROM information_schema.tables WHERE table_name = 'users'");
        expect(res.rows.length).toBe(1);
    });
});
