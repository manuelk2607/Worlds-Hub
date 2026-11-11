# Central account lifecycle acceptance

Status: 2026-11-09. Keep the working Managed Better Auth identity and existing
project IDs. The items below do not authorize a production cutover.

| Capability | Evidence | Remaining acceptance |
| --- | --- | --- |
| Registration, email verification, Hub login | User-confirmed OTP, real Hub and Slop pilot callbacks; Hub sign-in after Slop returned directly to the greeting without another password, code or consent | Slop QA ownership/link and local logout/automatic SSO return passed for the owner-reviewed existing profile; production accounts and other relying parties remain open |
| Password change | Native QA API preserves the subject, rejects the old password and revokes a second session | Full personal browser acceptance and project session revocation |
| Password bounds | Native QA rejects 129 characters with `PASSWORD_TOO_LONG`; no account created. Hub rejects oversized credentials before forwarding them; accepts existing eight-character logins unchanged | Verified in deployed `504ec19`; new passwords require 12 characters, maximum 128. Both browsers passed locally with simulated responses; CI and live checks passed |
| Password reset | Actual signed QA delivery and native reset passed: one-use token, stable subject, old password denied, both old sessions revoked, unrelated account preserved | Browser/BFF acceptance passed locally against the real QA provider (Chromium DE, WebKit EN, 320 px). Project session revocation remains open. After QA restoration, the same reset-revocation option was enabled in the primary pilot; all other settings are unchanged |
| Self-deletion | Public `delete-user` returned 404; separately approved native SDK `admin.removeUser` returned 200, actually removed its synthetic target and invalidated its session | Safe own-user gateway, fresh ownership proof, separately approved runtime credentials and revocation of all project sessions |
| Cross-project logout | Native SDK `revokeSessions()` revoked both sessions of an ordinary test account while preserving the control. The Hub can revoke its own sessions and fence old callbacks. Four adapters verify signed OIDC backchannel tokens and reject replay | Supported invalidation of every project BFF and complete browser acceptance. Actual backchannel delivery remains open |

## Provider configuration limits

The native `revokeSessions()` method uses the account's existing session.
In the already expiring Sprachwelten QA branch `br-twilight-river-ba9t32rl`,
it returned 200 and revoked both own sessions while a separate account's
session stayed valid. The final aggregate check found two synthetic accounts
with zero active sessions in that branch. No role or provider setting changed.

The Hub implementation uses migration 0005 and
`IDENTITY_DEVICE_SIGN_OUT_ENABLED=true` with matching Hub and managed issuers.
The action verifies the subject without a cache refresh, records a short-lived
Hub revocation marker and atomically removes that subject's Hub sessions
before asking the provider to revoke its native sessions. The database rejects
late callbacks with an older or missing signed authentication time for that
subject. Existing sessions for other accounts remain valid. Provider failure
returns partial completion and preserves the browser's native session for a
retry. The feature flag and migration are pending hosted QA.

The native SDK Admin namespace supports targeted session revocation and user
removal in the actual isolated QA branch; see `NATIVE-ADMIN-QA.md`. Its temporary
administrator could manage all identities in that branch, so a runtime gateway
needs separately reviewed credentials and strict ownership checks. All three
new fixtures and their sessions were removed; the original 13 QA accounts and
sessions are unchanged. No runtime administrator or credential has been created
or installed. Existing personal credentials are not reused for this purpose.

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
sessions were revoked. These unchanged-setting statements describe cleanup of the
authorized QA test; the subsequent controlled policy rollout is recorded below.

## Central pilot policy rollout

After QA recovery passed and its temporary delivery was restored, the single
setting `revoke_sessions_on_password_reset` was changed from `false` to `true`
on the central `sso-pilot` branch. A fresh management read and complete settings
comparison confirmed exactly that one change. Email verification, OTP delivery,
trusted origins, plugins, OAuth providers and the disabled webhook are unchanged.
This affects future resets; no personal password was reset as part of rollout.
The deployed Hub smoke checks passed afterward. Actual account-reset behaviour
was verified in QA, not by resetting the personal central account.

This native setting does not establish revocation of Hub or project sessions.
Cross-project session revocation remains a separate unresolved acceptance item.

## Sources checked on 2026-11-08

- [Neon user management and password limits](https://neon.com/docs/auth/guides/user-management)
- [Neon management API](https://neon.com/docs/auth/guides/manage-auth-api)
- [Project-scoped key permissions](https://neon.com/docs/manage/api-keys)
- [OAuth client update fields](https://neon.com/docs/reference/api/auth/update-neon-auth-o-auth-client)
- [Signed webhook delivery](https://neon.com/docs/auth/guides/webhooks)

## Native Logout-Metadaten: begrenzte QA-Abnahme

Nach ausdrücklicher Freigabe wurde genau ein neues synthetisches QA-Konto
vorübergehend auf `admin` gesetzt. Frische Anmeldung und Sitzungsabruf bestätigten
die Rolle; native Clientregistrierung antwortete weiterhin mit 401 ohne
JSON-Felder. Kein Client angelegt, keine Rückkanalzustellung versucht und keine
bestehende Konfiguration geändert. Rolle zurückgenommen, danach ausdrücklich
freigegebene Entfernung ausschließlich dieses neuen Testkontos über die native
Verwaltung. Nachkontrolle: null Konto-/Sitzungszeilen für die exakte Fixture-ID.
Dies beweist die konkrete native Ablehnung, nicht die Abwesenheit jedes denkbaren
Anbieterwegs. Globale Projektabmeldung bleibt unbewiesen. Vollständiges Protokoll
und Cleanup: `NATIVE-LOGOUT-QA.md`.
