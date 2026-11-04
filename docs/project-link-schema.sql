-- REVIEW TEMPLATE ONLY. Not executed. Add to EACH project's own migration system
-- after verified backup/restore and rollback rehearsal on an isolated target.
-- local_user_id must reference that project's actual immutable account key.
CREATE TABLE worlds_identity_links (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  local_user_id TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (issuer,subject),
  UNIQUE (local_user_id)
);
CREATE TABLE worlds_link_proofs (
  proof_hash TEXT PRIMARY KEY,
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  local_user_id TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX worlds_link_proofs_expiry ON worlds_link_proofs(expires_at);
CREATE TABLE worlds_link_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  local_user_id TEXT NOT NULL,
  event TEXT NOT NULL CHECK(event IN ('linked','unlinked')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Confirmation transaction: SELECT proof FOR UPDATE, check bound session and expiry,
-- INSERT mapping (never UPDATE/UPSERT existing), DELETE proof, INSERT audit, COMMIT.
-- Any uniqueness conflict must rollback the entire transaction.
-- Unlink requires fresh dual proof and an alternate usable sign-in method.
