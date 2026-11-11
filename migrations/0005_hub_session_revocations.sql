CREATE TABLE IF NOT EXISTS hub_session_revocations (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  revoked_at INTEGER NOT NULL,
  PRIMARY KEY (issuer, subject)
);
CREATE INDEX IF NOT EXISTS hub_session_revocations_expiry ON hub_session_revocations(revoked_at);

-- A callback can be in flight while a user signs out. A verified auth_time
-- must postdate the sign-out while the revocation marker is retained.
CREATE TRIGGER IF NOT EXISTS auth_sessions_reject_revoked_insert
BEFORE INSERT ON auth_sessions
WHEN EXISTS (
  SELECT 1 FROM hub_session_revocations
  WHERE issuer = NEW.issuer AND subject = NEW.subject
    AND COALESCE(json_extract(NEW.payload, '$.authenticatedAt'), 0) <= revoked_at
)
BEGIN
  SELECT RAISE(ABORT, 'Worlds session predates sign-out');
END;
