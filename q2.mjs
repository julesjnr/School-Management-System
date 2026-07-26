import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query(`SELECT id, username, must_change_password, created_at, updated_at FROM users ORDER BY id`);
console.table(r.rows);
const cols = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`);
console.log(cols.rows.map(x=>x.column_name).join(', '));
await c.end();
