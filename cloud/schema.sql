CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  writer_hash TEXT NOT NULL UNIQUE,
  reader_hash TEXT NOT NULL UNIQUE,
  payload TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);
