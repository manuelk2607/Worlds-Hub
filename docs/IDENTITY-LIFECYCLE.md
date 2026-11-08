# Central account lifecycle acceptance

Status: 2026-11-08. Keep the working Managed Better Auth identity and existing
project IDs. The items below do not authorize a production cutover.

| Capability | Evidence | Remaining acceptance |
| --- | --- | --- |
| Registration, email verification, Hub login | User-confirmed OTP and real Safari callback | Complete project pilot and second relying party |
| Password change | Native QA API preserves the subject, rejects the old password and revokes a second session | Full personal browser acceptance and project session revocation |
| Password bounds | Native QA rejects 129 characters with `PASSWORD_TOO_LONG`; no account created. Hub rejects oversized credentials before forwarding them; accepts existing eight-character logins unchanged | Verified in deployed `504ec19`; new passwords require 12 characters, maximum 128. Both browsers passed locally with simulated responses; CI and live checks passed |
| Password reset | Actual signed QA delivery and native reset passed: one-use token, stable subject, old password denied, both old sessions revoked, unrelated account preserved | Browser/BFF acceptance passed locally against the real QA provider (Chromium DE, WebKit EN, 320 px). Project session revocation and production configuration remain open. QA has `revoke_sessions_on_password_reset=true`; primary pilot still has `false` and remains unchanged |
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

After the user's explicit approval, a temporary receiver accepted signed
recovery deliveries for the existing QA branch `br-jolly-leaf-ba8vt1pe`.
It verified the detached EdDSA signature, timestamp, event ID, exact synthetic
user and the QA issuer in the signed native reset URL. Unsigned requests were
rejected. Reset links and passwords stayed in process memory and were not logged.

The cloned provider reports the original parent endpoint in
`context.endpoint_id`, even though the signed reset URL and account belong
to QA. That diagnostic context is not a reliable branch discriminator. All
branches share signing keys, so signature verification alone is also
insufficient. Pin the actual issuer in the signed native URL and the unique
fixture identity before using a reset token.

Native acceptance passed: invalid token denied, configured return URL retained,
valid token consumed once, stable subject, old password rejected, two previous
sessions revoked, and the unrelated account still active. Fixture sessions were
then revoked. Both branches' original settings were compared after restoration;
webhooks are disabled and the parent configuration is unchanged. Receiver and
tunnel were stopped. Aggregate-only SQL confirmed eight recovery fixtures and
zero active recovery sessions in QA, with zero such fixtures in the parent
(one account). No personal account or project mapping was changed. Initial
diagnostic attempts account for the additional inactive QA fixtures.

## Browser recovery acceptance

The existing two synthetic fixtures were reused; no additional accounts were
created. Chromium (DE) and WebKit (EN), both at 320 px, passed the actual forgot
form, signed delivery, navigation through the native QA link, the provider's
redirect back to the reset form, and the reset POST through the unmodified Hub
BFF. Changing DE/EN retained the entered password. After success the token was
removed from the address, the localized confirmation was visible, both previous
sessions were invalid, the old password was rejected, the new login retained the
subject, the unrelated account remained active, and token replay was denied.

This used the local production build under the configured Hub test origin via
Playwright routing and the real QA provider. WebKit's intercepted request metadata
omits cookies added later by its network layer; the in-process adapter therefore
forwards cookies from that isolated browser context's own cookie jar. A separate
unintercepted live WebKit EN check used a nonexistent synthetic address and passed
the actual deployed form, secure cookie and CSRF checks without changing an account.
No production identity issuer was replaced or relaxed.

Afterward, original configuration fields were identical for QA and the primary
pilot, delivery was disabled, and the receiver and tunnel were closed. All fixture
sessions were revoked. Production reset revocation remains disabled; cross-project
session revocation is a separate unresolved acceptance item.

## Sources checked on 2026-11-08

- [Neon user management and password limits](https://neon.com/docs/auth/guides/user-management)
- [Neon management API](https://neon.com/docs/auth/guides/manage-auth-api)
- [Project-scoped key permissions](https://neon.com/docs/manage/api-keys)
- [OAuth client update fields](https://neon.com/docs/reference/api/auth/update-neon-auth-o-auth-client)
- [Signed webhook delivery](https://neon.com/docs/auth/guides/webhooks)
