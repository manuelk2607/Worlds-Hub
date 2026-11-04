-- Central UI preference only. Project data and authorization remain separate.
CREATE TABLE IF NOT EXISTS user_preferences (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('de','en')),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (issuer, subject)
);
