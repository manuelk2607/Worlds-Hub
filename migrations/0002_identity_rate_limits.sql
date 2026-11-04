-- Only in the NEW Hub session database. No existing application database changes.
CREATE TABLE IF NOT EXISTS identity_rate_limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS identity_rate_limits_expiry ON identity_rate_limits(expires);
CREATE INDEX IF NOT EXISTS auth_replays_expiry ON auth_replays(expires);
