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

INSERT INTO tenants (id, name) VALUES
(1, 'Alpha Capital'),
(2, 'Beacon Advisors')
ON CONFLICT (id) DO NOTHING;

SELECT setval('tenants_id_seq', (SELECT COALESCE(MAX(id), 1) FROM tenants));

INSERT INTO users (email, password_hash, tenant_id) VALUES
('tenant_a@example.com', '$2a$10$jMKmVkbrccigdsed3hbCw.OdeAthaF8OnrQprrYnhpUPUcd6GdJta', 1),
('tenant_b@example.com', '$2a$10$jMKmVkbrccigdsed3hbCw.OdeAthaF8OnrQprrYnhpUPUcd6GdJta', 2)
ON CONFLICT (email) DO NOTHING;

