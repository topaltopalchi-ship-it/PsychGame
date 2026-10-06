CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  player_code TEXT NOT NULL,
  received_at TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  report_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_received_at ON sessions(received_at);
