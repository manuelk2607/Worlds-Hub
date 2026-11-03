# Betrieb, Freischaltung und SEO

## Aktuelle Vorschau

Sites-ID: `appgprj_6aea673346808191acd302d1a40c3c60`.
Bestätigte Origin: `https://worlds-hub-maki.divinelynx3.chatgpt.site`. Private Erstveröffentlichung durch native Erfolgsmeldung bestätigt; öffentliche Landingpage-Freigabe durch automatische Prüfung blockiert, bis die ausdrückliche Nutzerbestätigung für diese Site vorliegt.
Sites erstellt neue Projekte zunächst privat. Der öffentliche Zugang bleibt bis zur ausdrücklich bestätigten Freigabe dieser Site gesperrt. Die Hosting-Zugangskontrolle ist **kein Worlds-SSO**.

`npm run check`: TypeScript, ESLint, signierte OIDC-/Linking-/SQLite-/Worker-/SEO-Tests, Build und ESM-Artefaktprüfung.
`npm audit` für alle Abhängigkeiten. `minimatch` ist zur Schließung GHSA-g3hv-75wg-m249 gezielt auf >=11.0.1 überschrieben; Lint und Build wurden damit geprüft.

## Umgebungsvariablen

| Variable | Bedeutung |
|---|---|
| SITE_ORIGIN | Vertrauenswürdige kanonische HTTPS-Origin ohne abschließenden Slash. Kein Request-/Forwarded-Host als Quelle. |
| AUTH_ENABLED | Nur `true` aktiviert eine vollständig konfigurierte Anbindung; sonst 503 bei Auth-Routen. |
| OIDC_REAUTH_ENABLED | Standard false. Nie für den Neon-Pilot aktivieren, solange die dokumentierte Reauth-Schleife nicht sicher behoben und getestet ist. |
| OIDC_RESOURCE | Optionaler beim Provider registrierter API-Identifier; wird beim Authorize- und Tokenrequest mitgesendet. |
| OIDC_TOKEN_AUTH_METHOD | Default `client_secret_basic`; `client_secret_post` nur bei entsprechend registriertem Client. |
| OIDC_ISSUER | Exakter zentraler Discovery-Issuer, einschließlich etwaiger Pfade. Keine Testbranch-Issuer in Produktion. |
| OIDC_CLIENT_ID | Eigener Hub-Client; keine gemeinsam verwendete App-Client-ID. |
| OIDC_CLIENT_SECRET | Optionaler vertraulicher Client-Secret; ausschließlich Runtime-Secret. Public PKCE-Clients können ohne Secret arbeiten. |
| OIDC_ID_TOKEN_ALG | Exakter geprüfter asymmetrischer Algorithmus (`RS256`, `ES256`, `EdDSA`); niemals HS256. |
| OIDC_ACCOUNT_URL | Optionaler bestätigter HTTPS-Link zur fertigen IdP-Kontoverwaltung. |
| AUTH_DB | Separate Cloudflare-D1-Bindung für Hub-Transaktionen/Sessions/Replays, kein URL-String. |
| PUBLIC_INDEXING | `true` erst bei öffentlichem, geprüftem Hosting. Standard bleibt noindex + robots Disallow + leere Sitemap. |
| GOOGLE_SITE_VERIFICATION | Optionaler öffentlicher Search-Console-Verifizierungswert. |

Runtime-Secrets nicht in Git, Build-Logs, `hosting.json` oder Client-JavaScript speichern. Statische Quellen enthalten keine Zugangsdaten. Bei Änderung der kanonischen Origin mit derselben `SITE_ORIGIN` beim Build arbeiten (CSP-Hash der strukturierten Daten) und Runtime konfigurieren.

## Produktionsaktivierung — konkrete Reihenfolge

1. Kostenloser Tarif ist bestätigt und die dedizierte Pilotinstanz ist bereitgestellt (siehe `IDENTITY-PILOT.md`). Reauth-Einschränkung klären, ohne Produktionsinstanzen zu ersetzen. Keine kostenpflichtige Erweiterung ohne Freigabe. Eigene vertrauenswürdige Login-/Consent-/Registrierungs-/Verifizierungs-/Passwortreset-/Kontoverwaltungsseiten mit offiziellem Neon-SDK implementieren; erlaubte Origins minimal registrieren. Produktive E-Mail-Zustellung und Recovery wirklich testen.
2. OAuth-Provider aktivieren: OIDC Discovery, JWKS, S256, Code Flow, genau benötigte Scopes; keine unkontrollierte dynamische Clientregistrierung. Zentraler Login muss eine echte IdP-Session herstellen und zum ursprünglichen Authorization Request zurückkehren.
3. Hub und isolierten IT-Pilot als getrennte Clients registrieren. Hub-Redirect exakt `https://worlds-hub-maki.divinelynx3.chatgpt.site/auth/callback`. Pilot erhält seine eigene HTTPS-Adresse. Optionaler Backchannel `/auth/backchannel-logout`. Logout-Fähigkeiten real prüfen, keine provider-eigenen Endpunkte raten.
4. Pro App dedizierte Session-D1 anlegen, Schema `migrations/0001_auth.sql` nur dort anwenden und Cron-Cleanup für abgelaufene Transaktionen/Sessions/Replays konfigurieren. Sites benötigt dafür eine bestätigte D1-Bindung in `.openai/hosting.json`; aktuell ist keine gebunden. Eine separate Cloudflare-Veröffentlichung benötigt Zugang zum richtigen Konto; CLI-Token fehlte in dieser Sitzung.
5. Auth-Routen per Cloudflare-Rate-Limit/WAF und Limits des IdP schützen. Request-Body-Limits sind im Code, ersetzen aber keine Verkehrs-/Login-Limits. Verfügbarkeit/Fehlerraten überwachen; keine Tokens, Codes, Cookies, Passwörter oder personenbezogenen Login-Bodies protokollieren.
6. Hub zuerst in einer isolierten Umgebung aktivieren. Registrierung, E-Mail-Verifikation, Recovery, Kontoverwaltung, ID-Key-Rotation und Provider-Ausfall prüfen. Echte Cross-App-Anmeldung mit einem Testkonto in mindestens zwei Browsern prüfen; Third-Party-Cookies deaktivieren. Lokale Mock-Tests sind dafür kein Ersatz.
7. IT-Pilot wie `INTEGRATION.md` umsetzen. Erfolgreiche Backup-/Restore- und Rollbackprobe nachweisen; erst danach Produktions-Clients/Flags schrittweise hinzufügen. Sprachwelten/Slop folgen separat. Music erst bei vorhandenem Projekt.

## Sicherheitsabnahme

Aktuelle Tests prüfen State, Nonce, S256, Code-Einmaligkeit, JWS-Signatur, Issuer/Audience/Ablauf, verifizierte E-Mail, Sessionrotation, Ablauf, doppelte Cookies, Origin/CSRF, Backchannel-Signatur/Replays, Single-Use-Linking, Zuordnungskonflikte, historische IDs, fremde Issuer und HF-Guard.

Nicht geprüft: echter zentraler Provider, SMTP/E-Mail-Roundtrip, produktive D1-Bindung, tatsächliche lokale Reauth-Adapter, Projektrollen in produktiven Umgebungen, globale Abmeldung, echte HF-Generierung und Datenbank-Restore. Diese Punkte sind Freigabekriterien, keine behaupteten Erfolge.

## SEO und Search Console

Der Worker erzeugt serverseitige Projektbeschreibungen, individuelle Titel und Descriptions, absolute Canonicals, OG-Metadaten und WebSite-Strukturdaten. Öffentlicher Modus listet nur `/` und die vier `/welten/*`-Seiten. Private Konto-, Auth-, API-, Logout- und Fehlerseiten erhalten noindex/no-store; Robots-Regeln sind zusätzliche Crawlerhinweise, kein Zugriffsschutz.

1. Öffentlichen Hosting-Zugang bewusst konfigurieren; Canonical-Origin bestätigen. Die Datenschutzhinweise beschreiben das technische Verhalten. Solange privat, `PUBLIC_INDEXING=false` belassen.
2. Bei öffentlicher Freigabe `PUBLIC_INDEXING=true` setzen und deployen; in echten HTTP-Antworten Status, Titel, Canonical, robots.txt, sitemap.xml und private Noindex-/Cache-Header prüfen.
3. Für die neue Sites-/workers.dev-URL eine URL-Präfix-Property in Google Search Console anlegen. Bei eigener DNS-kontrollierter Domain alternativ Domain-Property mit DNS-TXT-Verifikation. Verifizierungswert in Runtime setzen; keine erfundenen Tokens.
4. Sitemap `https://<bestätigte-origin>/sitemap.xml` einreichen, öffentliche URLs inspizieren. Keine Aufnahme in den Index garantieren.
5. Bestehende Properties/Verifizierungstags/Sitemaps/Canonicals der drei Projekte behalten. Erst nach deren Pilotabnahme einen normalen Hub-Link in die vorhandene Navigation aufnehmen.
6. Bei späteren Domainwechseln altes->neues vollständiges URL-Mapping erstellen, pro tatsächlicher URL 301/308 einsetzen und Canonical/Sitemap/interne Links aktualisieren. Der Hub führt keine pauschalen Projektumleitungen aus.

## Deployment und Quellcode

Sites-Workflow commit/pusht geprüfte Quellen und packt den Worker. Anschließend native Save/Deploy-Operation verwenden und nur bei `succeeded` Erfolg berichten. Neue GitHub-Repository-Kopie bleibt privat, solange keine öffentliche Quellcodefreigabe verlangt wurde. Keine Secrets oder Bestands-Repositories in das neue Repository kopieren.
