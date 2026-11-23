# Signed migration receipts

The project database remains authoritative for its local profile ID, ownership
proofs, roles and content. The Hub shows the latest state the project reported
for the signed-in `(identity_issuer, subject)`. A receipt does not establish
identity, grant permissions or replace the project's proof checks.

## Isolated pilot

Apply Hub migration `0004_migration_receipts.sql` to an isolated D1 target.
Set `MIGRATION_RECEIPTS_ENABLED=true` there and configure
`MIGRATION_RECEIPT_KEYS` as a JSON object keyed by project slug. Each value
contains the project's Ed25519 public JWK fields `kid`, `kty`, `crv` and
`x`. Use separate keys per project and test environment. The private key is
stored as a secret in the sending project. The Slop Urself and Sprachwelten
pilot senders reject the production Hub hostname. Both use the sender from
`@worlds-hub/auth` 0.1.6. Sprachwelten marks only verified links to existing
profiles for delivery, including their later revocation. Newly created
profiles are excluded from migration reporting.

The producer sends a short-lived EdDSA JWT to
`POST /api/migrations/receipts/<project>` as `application/jwt`. The protected
type is `worlds-migration-receipt+jwt`. The project URL's origin is `iss`,
the exact receiver URL is `aud`, and the verified Worlds ID is `sub`.
Additional claims carry `identity_issuer`, a stable pseudonymous
`account_ref`, the positive and increasing audit `revision`, and
`state` of `confirmed` or `revoked`. Neither party forwards passwords,
emails, session cookies, OIDC tokens, or any project credentials or content.

A local mapping and its audit entry commit in one transaction. The sender
retries from that audit entry. `stored`, `duplicate` and `stale` acknowledge
delivery. The Hub retains a higher revision and refuses a different local
reference for an existing subject or reuse of a reference by another subject.
A 409 `RECEIPT_CONFLICT` needs operator review and stays visible in the
project's audit table. Reassignments require a separately reviewed
migration. For a key rotation, install the replacement public key on the Hub
and switch the sender to the replacement secret. The audit queue retains
unacknowledged entries during the change.

To reverse a verified pilot link, remove the exact association on the
project side using its documented rollback and confirm that the same
historical profile still owns its data. Deliver the resulting `revoked`
receipt with a higher audit revision. Disabling receipt delivery leaves the
project mapping intact. The Hub account page and identity export expose
only the authenticated user's reported states.

## Sprachwelten production release

1. Verify the Hub D1 Time Travel recovery point and the production schema.
   Apply only the additive migration `0004_migration_receipts.sql` if its
   table and index are absent. Keep the previous Hub Worker version for rollback.
2. Generate a dedicated Ed25519 pair for Sprachwelten and store the private
   JWK only in the existing Sprachwelten Worker secret
   `WORLDS_MIGRATION_RECEIPT_PRIVATE_JWK`. Pin only `kid`, `kty`, `crv`,
   and `x` under `sprachwelten` in the Hub's `MIGRATION_RECEIPT_KEYS`
   variable and set `MIGRATION_RECEIPTS_ENABLED=true`. Publish the Hub with
   `device_sign_out_production=true` to retain the existing four-project
   sign-out, then publish Sprachwelten with its existing production bindings.
3. Verify the enabled route rejects an invalid signature with HTTP 401.
   Check that an actual pending audit record is acknowledged in Sprachwelten
   and present in Hub D1 with the same revision and state. Check that the
   authenticated account page shows the status and an anonymous request
   cannot access it. Inspect counts and states without exporting identifiers.
4. To stop delivery, restore the prior Worker versions. Keep the source
   association and audit intact. Pending source records remain retryable.
