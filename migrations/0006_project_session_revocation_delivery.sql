CREATE TABLE IF NOT EXISTS project_session_revocation_delivery (
  audience TEXT NOT NULL,
  identity_issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  revoked_through INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  next_attempt INTEGER NOT NULL,
  PRIMARY KEY (audience, identity_issuer, subject)
);
CREATE INDEX IF NOT EXISTS project_session_revocation_expiry
  ON project_session_revocation_delivery (expires_at);
CREATE INDEX IF NOT EXISTS project_session_revocation_schedule
  ON project_session_revocation_delivery (identity_issuer, next_attempt);
