import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool, query, initDb } from './db.js';

dotenv.config();

const app = express();
app.disable('x-powered-by');
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'northstar-dev-secret-key-123';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

interface AuthUser {
  userId: number;
  email: string;
  tenantId: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

interface CsvRow {
  date: string;
  ticker: string;
  asset_class: string;
  quantity: number;
  price: number;
}

function parseAndValidateCsv(buffer: Buffer): { rows: CsvRow[]; errors: string[] } {
  const text = buffer.toString('utf-8');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const errors: string[] = [];

  if (lines.length < 2) {
    return { rows: [], errors: ['CSV file is empty or missing data rows'] };
  }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const expected = ['date', 'ticker', 'asset_class', 'quantity', 'price'];
  const hasValidHeaders = expected.every((col, idx) => header[idx] === col);

  if (!hasValidHeaders) {
    return {
      rows: [],
      errors: [`Invalid CSV headers. Expected: ${expected.join(',')}. Found: ${header.join(',')}`],
    };
  }

  const rows: CsvRow[] = [];
  const seenKeys = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const lineNum = i + 1;
    const parts = lines[i].split(',').map((p) => p.trim());

    if (parts.length !== 5) {
      errors.push(`Line ${lineNum}: Expected 5 columns, got ${parts.length}`);
      continue;
    }

    const [date, ticker, asset_class, qtyStr, priceStr] = parts;

    if (!date || !ticker || !asset_class || !qtyStr || !priceStr) {
      errors.push(`Line ${lineNum}: Missing required field values`);
      continue;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      errors.push(`Line ${lineNum}: Invalid date '${date}'. Expected YYYY-MM-DD`);
      continue;
    }

    const quantity = Number.parseFloat(qtyStr);
    if (Number.isNaN(quantity) || quantity <= 0) {
      errors.push(`Line ${lineNum}: Quantity must be a positive number, got '${qtyStr}'`);
      continue;
    }

    const price = Number.parseFloat(priceStr);
    if (Number.isNaN(price) || price < 0) {
      errors.push(`Line ${lineNum}: Price must be a non-negative number, got '${priceStr}'`);
      continue;
    }

    const dedupKey = `${date}::${ticker.toUpperCase()}`;
    if (seenKeys.has(dedupKey)) {
      errors.push(`Line ${lineNum}: Duplicate holding entry for ticker '${ticker}' on date '${date}'`);
      continue;
    }
    seenKeys.add(dedupKey);

    rows.push({
      date,
      ticker: ticker.toUpperCase(),
      asset_class,
      quantity,
      price,
    });
  }

  return { rows, errors };
}

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await query(
      `SELECT u.id, u.email, u.password_hash, u.tenant_id, t.name as tenant_name
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, tenantId: user.tenant_id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenant_id,
        tenantName: user.tenant_name,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.tenant_id, t.name as tenant_name
       FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch user: ' + err.message });
  }
});

app.post(
  '/api/portfolio/upload',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { rows, errors } = parseAndValidateCsv(req.file.buffer);

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed. The CSV file contains data quality issues.',
        details: errors,
      });
    }

    const tenantId = req.user!.tenantId;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const row of rows) {
        await client.query(
          `INSERT INTO holdings (tenant_id, date, ticker, asset_class, quantity, price)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (tenant_id, date, ticker)
           DO UPDATE SET asset_class = EXCLUDED.asset_class, quantity = EXCLUDED.quantity, price = EXCLUDED.price`,
          [tenantId, row.date, row.ticker, row.asset_class, row.quantity, row.price]
        );
      }

      await client.query('COMMIT');
      return res.json({ message: 'Holdings uploaded successfully', count: rows.length });
    } catch (err: any) {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Database save failed: ' + err.message });
    } finally {
      client.release();
    }
  }
);

app.get('/api/portfolio/summary', requireAuth, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;

  try {
    const datesRes = await query(
      `SELECT MIN(date)::text as min_date, MAX(date)::text as max_date, COUNT(*)::int as total_rows
       FROM holdings
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const { min_date, max_date, total_rows } = datesRes.rows[0];

    if (!total_rows || total_rows === 0 || !min_date || !max_date) {
      return res.json({
        hasData: false,
        summary: null,
      });
    }

    const startValRes = await query(
      `SELECT COALESCE(SUM(quantity * price), 0)::numeric as start_val
       FROM holdings
       WHERE tenant_id = $1 AND date = $2`,
      [tenantId, min_date]
    );

    const endValRes = await query(
      `SELECT COALESCE(SUM(quantity * price), 0)::numeric as end_val
       FROM holdings
       WHERE tenant_id = $1 AND date = $2`,
      [tenantId, max_date]
    );

    const startValue = Number.parseFloat(startValRes.rows[0].start_val);
    const endValue = Number.parseFloat(endValRes.rows[0].end_val);

    const periodReturn =
      startValue > 0 ? (endValue - startValue) / startValue : 0;

    const breakdownRes = await query(
      `SELECT asset_class, SUM(quantity * price)::numeric as market_value
       FROM holdings
       WHERE tenant_id = $1 AND date = $2
       GROUP BY asset_class
       ORDER BY market_value DESC`,
      [tenantId, max_date]
    );

    const assetClasses = breakdownRes.rows.map((row) => {
      const val = Number.parseFloat(row.market_value);
      return {
        assetClass: row.asset_class,
        marketValue: val,
        percentage: endValue > 0 ? (val / endValue) * 100 : 0,
      };
    });

    const holdingsRes = await query(
      `SELECT date::text, ticker, asset_class, quantity::numeric, price::numeric, (quantity * price)::numeric as market_value
       FROM holdings
       WHERE tenant_id = $1 AND date = $2
       ORDER BY asset_class, ticker`,
      [tenantId, max_date]
    );

    return res.json({
      hasData: true,
      summary: {
        startDate: min_date,
        endDate: max_date,
        startMarketValue: startValue,
        endMarketValue: endValue,
        periodReturn,
        periodReturnPercent: periodReturn * 100,
        assetClasses,
        holdings: holdingsRes.rows.map((r) => ({
          date: r.date,
          ticker: r.ticker,
          assetClass: r.asset_class,
          quantity: Number.parseFloat(r.quantity),
          price: Number.parseFloat(r.price),
          marketValue: Number.parseFloat(r.market_value),
        })),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to compute portfolio summary: ' + err.message });
  }
});

// Explicit tenant check endpoint to demonstrate tenant isolation rejection
app.get('/api/portfolio/tenant/:targetTenantId', requireAuth, async (req: Request, res: Response) => {
  const targetId = Number.parseInt(req.params.targetTenantId, 10);
  if (req.user!.tenantId !== targetId) {
    return res.status(403).json({
      error: 'Access denied: tenant isolation policy enforced. You cannot view another tenant data.',
    });
  }
  return res.json({ message: 'Access granted for own tenant data' });
});

app.listen(port, async () => {
  try {
    await initDb();
    console.log(`Backend listening on port ${port}`);
  } catch (err: any) {
    console.error('Database connection or initialization error:', err.message);
  }
});
