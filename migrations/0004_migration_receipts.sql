CREATE TABLE IF NOT EXISTS migration_receipts (
  project TEXT NOT NULL CHECK (project IN ('music-worlds','sprachwelten','it-worlds','slop-urself')),
  identity_issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  account_ref TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  state TEXT NOT NULL CHECK (state IN ('confirmed','revoked')),
  recorded_at INTEGER NOT NULL,
  PRIMARY KEY (project, identity_issuer, subject),
  UNIQUE (project, account_ref)
);
CREATE INDEX IF NOT EXISTS migration_receipts_identity ON migration_receipts(identity_issuer, subject);
