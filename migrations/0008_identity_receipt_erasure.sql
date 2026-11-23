-- Keep the receipt rejection marker after the deletion job's subject is purged.
CREATE TABLE IF NOT EXISTS erased_identity_receipts (
  subject_digest TEXT PRIMARY KEY CHECK(length(subject_digest) = 64)
) WITHOUT ROWID;
