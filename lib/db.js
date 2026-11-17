// Storage for users, orders and bookings.
// - DATABASE_URL set (e.g. a free Neon/Supabase PostgreSQL): uses PostgreSQL through the `pg` package.
// - Otherwise: SQLite file data/app.db through Node's built-in node:sqlite (local development).
//   On Render's free plan the disk is wiped on every deploy, so production needs DATABASE_URL.
// All SQL is written with `?` placeholders; they are rewritten to $1, $2… for PostgreSQL.
const path = require("path");
const fs = require("fs");

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    pass_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    note TEXT,
    payment TEXT,
    items TEXT NOT NULL,
    total INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL,
    updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    target TEXT,
    target_name TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    date TEXT,
    people INTEGER,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL,
    updated_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id)`,
  `CREATE INDEX IF NOT EXISTS bookings_user ON bookings(user_id)`,
];

async function open(storeDir) {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = require("pg");
    // Hosted Postgres (Neon, Supabase): keep full certificate verification. sslmode=require already
    // means verify-full in pg 8; spell it out so pg does not warn about the upcoming change.
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    const pool = new Pool({
      connectionString: local ? url : url.replace(/sslmode=(prefer|require|verify-ca)/, "sslmode=verify-full"),
      max: 5,
    });
    const toPg = (sql) => { let i = 0; return sql.replace(/\?/g, () => "$" + ++i); };
    const db = {
      kind: "postgres",
      persistent: true,
      all: async (sql, p = []) => (await pool.query(toPg(sql), p)).rows,
      get: async (sql, p = []) => (await pool.query(toPg(sql), p)).rows[0],
      run: async (sql, p = []) => { const r = await pool.query(toPg(sql), p); return { changes: r.rowCount }; },
    };
    for (const s of SCHEMA) await pool.query(s);
    return db;
  }

  const { DatabaseSync } = require("node:sqlite");
  fs.mkdirSync(storeDir, { recursive: true });
  const sqlite = new DatabaseSync(path.join(storeDir, "app.db"));
  sqlite.exec("PRAGMA journal_mode = WAL");
  for (const s of SCHEMA) sqlite.exec(s);
  return {
    kind: "sqlite",
    persistent: !process.env.RENDER, // Render's free disk is wiped on deploy
    all: async (sql, p = []) => sqlite.prepare(sql).all(...p),
    get: async (sql, p = []) => sqlite.prepare(sql).get(...p),
    run: async (sql, p = []) => { const r = sqlite.prepare(sql).run(...p); return { changes: Number(r.changes) }; },
  };
}

module.exports = { open };
