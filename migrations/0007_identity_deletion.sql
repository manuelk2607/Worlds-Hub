CREATE TABLE IF NOT EXISTS identity_deletion_jobs (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  requested_at INTEGER NOT NULL,
  next_attempt INTEGER NOT NULL,
  removed_at INTEGER,
  PRIMARY KEY (issuer, subject)
);
CREATE INDEX IF NOT EXISTS identity_deletion_due
  ON identity_deletion_jobs (issuer, removed_at, next_attempt);

-- A callback or preference write may already be in flight at deletion time.
CREATE TRIGGER IF NOT EXISTS deleted_identity_session
BEFORE INSERT ON auth_sessions
WHEN EXISTS (
  SELECT 1 FROM identity_deletion_jobs
  WHERE issuer=NEW.issuer AND subject=NEW.subject AND removed_at IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'Worlds identity removed');
END;

CREATE TRIGGER IF NOT EXISTS deleted_identity_preference
BEFORE INSERT ON user_preferences
WHEN EXISTS (
  SELECT 1 FROM identity_deletion_jobs
  WHERE issuer=NEW.issuer AND subject=NEW.subject AND removed_at IS NOT NULL
)
BEGIN
  SELECT RAISE(ABORT, 'Worlds identity removed');
END;

CREATE TRIGGER IF NOT EXISTS deleted_identity_receipt
BEFORE INSERT ON migration_receipts
WHEN EXISTS (
  SELECT 1 FROM identity_deletion_jobs
  WHERE issuer=NEW.identity_issuer AND subject=NEW.subject AND removed_at IS NOT NULL
)
BEGIN
  SELECT RAISE(IGNORE);
END;
