# Worlds Hub

Eigenständiger Einstieg für Music-Worlds, Sprachwelten, IT-Worlds und Slop Urself.
Adventskalender wird nicht integriert.

**Stand:** Landingpage produktiv auf Cloudflare, zentrale Neon-Identität als isolierter Live-Pilot, Auth-/Session-Bibliothek und Sicherheitstests.
**Kein produktives Cross-App-SSO:** Separate Neon-Auth-Pilotinstanz mit verpflichtender OTP-E-Mail-Verifikation, fünf getrennten PKCE-Clients und eigener Hub-D1 eingerichtet. Nutzer bestätigt erfolgreiche E-Mail-Verifikation. Hub als erste Relying Party aktiviert; echte Cross-App-Abnahme und Bestandsintegration noch offen.
Bestehende Auth-Systeme wurden ausschließlich gelesen; keine Benutzer-/Passwortmigration.

## Lokal

Node >=22.22, empfohlen Node 26. `npm ci`, `npm run check`, `npm run dev`.
Vorschau: http://127.0.0.1:4173. `npm test` baut zuerst das tatsächliche Worker-Artefakt.
Kein Frontend-Framework, keine externen Fonts, Bilder, Analyse- oder Werbeskripte.
Worker und Browserlogik sind TypeScript; esbuild bündelt alle Assets in einen ESM-Worker.

## Struktur

- `src/`: HTML vom Server, zugängliche Navigation, Themenwechsel und Interessenfilter.
- `packages/auth/`: OIDC Code/PKCE, serverseitige Sessions, CSRF, Logout und Linking-Vertrag.
- `migrations/0001_auth.sql`: ausschließlich neue Hub-D1-Sessiontabellen.
- `tests/`: signierter Test-OIDC-Anbieter, zwei isolierte RPs, echtes SQLite und HTTP-/SEO-Tests.
- `docs/ARCHITECTURE.md`: Entscheidung, Grenzen, Bedrohungen, Domain- und Logout-Verhalten.
- `docs/INTEGRATION.md`: konkrete Änderungen pro Repository, Pilot und Rollback.
- `docs/OPERATIONS.md`: Konfiguration, Bereitstellung, Aktivierungs- und SEO-Prüfung.
- `PROGRESS.md`: verifizierter Fortschritt, offene Aufgaben und nächste Schritte.

## Produktion und Veröffentlichung

Produktiv: https://worlds-hub.maki26.workers.dev/ . Cloudflare-Konfiguration und vollständiger Ablauf in `docs/CLOUDFLARE.md`; laufende Kosten/Free-Limits in `docs/COSTS.md`.
GitHub: https://github.com/manuelk2607/Worlds-Hub. `npm run deploy:check` prüft das Worker-Paket, `npm run smoke` das echte Deployment.

## Private Zusatzvorschau

Sites-ID steht in `.openai/hosting.json`. Das Build-Artefakt ist `dist/server/index.js`.
Separate Cloudflare-Worker-Konfiguration liegt in `wrangler.jsonc`. Deren Origin vor eigener
Bereitstellung anpassen; keine Secrets einchecken. Die drei Bestandsanwendungen behalten ihre
Repositories, Deployments, Datenbanken, URLs, Canonicals und Search-Console-Properties.

Ohne explizite Konfiguration bleiben Auth und Indexierung gesperrt. Die produktive Cloudflare-Konfiguration aktiviert den Hub-Pilot und öffentliche Landingpages; erzwungene Reauth bleibt aus. Eine Vorschau ist ausdrücklich keine
fertige SSO-Einführung. Es gibt keinen Fake-Login und keine simulierten persönlichen Fortschritte.
