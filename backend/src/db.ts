import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'northstar'}`,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS holdings (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      ticker VARCHAR(32) NOT NULL,
      asset_class VARCHAR(64) NOT NULL,
      quantity NUMERIC(15, 4) NOT NULL,
      price NUMERIC(15, 4) NOT NULL,
      UNIQUE(tenant_id, date, ticker)
    );
  `);

  const tenantCheck = await query('SELECT COUNT(*) FROM tenants');
  if (Number.parseInt(tenantCheck.rows[0].count, 10) === 0) {
    await query(`
      INSERT INTO tenants (id, name) VALUES
      (1, 'Alpha Capital'),
      (2, 'Beacon Advisors')
      ON CONFLICT DO NOTHING;
    `);
    await query(`SELECT setval('tenants_id_seq', (SELECT MAX(id) FROM tenants));`);

    const hash = bcrypt.hashSync('Password123!', 10);
    await query(`
      INSERT INTO users (email, password_hash, tenant_id) VALUES
      ('tenant_a@example.com', $1, 1),
      ('tenant_b@example.com', $1, 2)
      ON CONFLICT (email) DO NOTHING;
    `, [hash]);
  }
}

