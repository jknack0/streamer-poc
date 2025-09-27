const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DEFAULT_DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(__dirname, '..', 'data', 'polls.sqlite');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const ensureDirectory = (filePath) => {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const listMigrationFiles = () => {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
};

const applyMigrations = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedMigrations = new Set(
    db
      .prepare('SELECT name FROM migrations ORDER BY id')
      .all()
      .map((row) => row.name),
  );

  const files = listMigrationFiles();

  files.forEach((fileName) => {
    if (appliedMigrations.has(fileName)) {
      return;
    }

    const filePath = path.join(MIGRATIONS_DIR, fileName);
    const sql = fs.readFileSync(filePath, 'utf8');

    const transaction = db.transaction((migrationSql) => {
      db.exec(migrationSql);
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(fileName);
    });

    transaction(sql);
    // eslint-disable-next-line no-console
    console.log(`Applied migration: ${fileName}`);
  });
};

const openDatabase = () => {
  ensureDirectory(DEFAULT_DB_PATH);

  const db = new Database(DEFAULT_DB_PATH);
  db.pragma('foreign_keys = ON');
  applyMigrations(db);

  return db;
};

module.exports = {
  openDatabase,
};
