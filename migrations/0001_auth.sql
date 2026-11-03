-- New, isolated Hub D1 only. Contains no application progress, passwords or HF tokens.
CREATE TABLE IF NOT EXISTS auth_transactions (id TEXT PRIMARY KEY, payload TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS auth_transactions_expiry ON auth_transactions(expires);
CREATE TABLE IF NOT EXISTS auth_sessions (id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject TEXT NOT NULL, sid TEXT, payload TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS auth_sessions_identity ON auth_sessions(issuer,subject,sid);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires);
CREATE TABLE IF NOT EXISTS auth_replays (id TEXT PRIMARY KEY, expires INTEGER NOT NULL);
