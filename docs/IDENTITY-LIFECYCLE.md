# Central account lifecycle acceptance

Status: 2026-11-08. Keep the working Managed Better Auth identity and existing
project IDs. The items below do not authorize a production cutover.

| Capability | Evidence | Remaining acceptance |
| --- | --- | --- |
| Registration, email verification, Hub login | User-confirmed OTP and real Safari callback | Complete project pilot and second relying party |
| Password change | Native QA API preserves the subject, rejects the old password and revokes a second session | Full personal browser acceptance and project session revocation |
| Password bounds | Native QA rejects 129 characters with `PASSWORD_TOO_LONG`; no account created. Hub rejects oversized credentials before forwarding them; accepts existing eight-character logins unchanged | Verified in deployed `504ec19`; new passwords require 12 characters, maximum 128. Both browsers passed locally with simulated responses; CI and live checks passed |
| Password reset | QA branch has `revoke_sessions_on_password_reset=true`; primary pilot still has `false` | Real delivered reset link, one-use consumption, two old sessions revoked, unrelated account preserved |
| Self-deletion | Authenticated `delete-user` returned 404 for two QA fixtures | Supported deletion route, fresh ownership proof and revocation of all project sessions |
| Cross-project logout | Four adapters verify signed OIDC backchannel tokens and reject replay; local database/runtime integrations pass | Actual provider delivery to registered clients and complete browser acceptance |

## Provider configuration limits

The documented management API exposes user deletion separately from the public
auth API. Its project-scoped key can modify project resources, so a runtime
deletion integration needs its own reviewed credential scope and ownership
checks. No such credential has been created or installed. Existing credentials
are not reused for this purpose.

The currently documented OAuth client management fields do not include
`backchannel_logout_uri` or `post_logout_redirect_uris`. The QA instance's
native OpenAPI schema lists those fields for `/oauth2/create-client`, but a
request from an authenticated synthetic ordinary user returned 401. That probe
created no OAuth client and its session was signed out. This does not prove
that an administrative route or future provider version cannot support it.
Do not claim functioning cross-project logout from discovery metadata alone.

## Controlled recovery test

A temporary receiver was prepared for the existing QA branch
`br-jolly-leaf-ba8vt1pe`. It verifies the native detached EdDSA signature,
timestamp, event ID, exact QA endpoint and synthetic user before retaining a
reset link solely in memory. Unsigned requests were rejected. The intended
test uses two new synthetic accounts and checks native reset, token replay,
both previous sessions and the unrelated account.

Automatic approval review rejected enabling delivery to a public Cloudflare
test tunnel because transmission of sensitive recovery links was not yet
explicitly authorized. The requested configuration was not applied; a
subsequent provider read confirmed webhooks remain disabled. A specific user
approval is pending. The unused receiver and tunnel were stopped; no recovery
accounts or links were created by this prepared test. No parent settings or
personal credentials were changed.

## Sources checked on 2026-11-08

- [Neon user management and password limits](https://neon.com/docs/auth/guides/user-management)
- [Neon management API](https://neon.com/docs/auth/guides/manage-auth-api)
- [Project-scoped key permissions](https://neon.com/docs/manage/api-keys)
- [OAuth client update fields](https://neon.com/docs/reference/api/auth/update-neon-auth-o-auth-client)
- [Signed webhook delivery](https://neon.com/docs/auth/guides/webhooks)
