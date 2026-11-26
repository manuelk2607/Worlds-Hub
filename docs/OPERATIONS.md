# Betrieb, Freischaltung und SEO

## Aktuelle Produktion

**Produktiv:** https://worlds-hub.maki26.workers.dev/ . Bereitstellung über den manuell gestarteten, geprüften GitHub-Actions-Workflow. Deployment, HTTPS, Navigation, Metadaten und Indexierungsregeln sind produktiv geprüft. Details und Credential-Ablauf: `CLOUDFLARE.md`.

Die frühere Sites-ID `appgprj_6aea673346808191acd302d1a40c3c60` gehört nur zur privaten Zusatzvorschau; dort ist keine öffentliche Freigabe vorgesehen. Die zentrale Anmeldung ist im Hub und in allen vier Welten aktiv. Der aktuelle Stand zu Releases und Abnahme steht in [PROGRESS.md](../PROGRESS.md).

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
| PROJECTS_UNAVAILABLE | Optionale komma-getrennte Liste vorübergehend nicht verfügbarer Welten. Erlaubte IDs sind `music-worlds`, `sprachwelten`, `it-worlds` und `slop-urself`. |
| GOOGLE_SITE_VERIFICATION | Optionaler öffentlicher Search-Console-Verifizierungswert. |

Runtime-Secrets nicht in Git, Build-Logs, `hosting.json` oder Client-JavaScript speichern. Statische Quellen enthalten keine Zugangsdaten. Bei Änderung der kanonischen Origin mit derselben `SITE_ORIGIN` beim Build arbeiten (CSP-Hash der strukturierten Daten) und Runtime konfigurieren.

## Produktionsaktivierung — konkrete Reihenfolge

1. Kostenloser Tarif ist bestätigt und die dedizierte Pilotinstanz ist bereitgestellt (siehe `IDENTITY-PILOT.md`). Reauth-Einschränkung klären, ohne Produktionsinstanzen zu ersetzen. Keine kostenpflichtige Erweiterung ohne Freigabe. Eigene vertrauenswürdige Login-/Consent-/Registrierungs-/Verifizierungs-/Passwortreset-/Kontoverwaltungsseiten mit offiziellem Neon-SDK sind vorbereitet; erlaubte Origins minimal registrieren. Produktive E-Mail-Zustellung und Recovery wirklich testen.
2. OAuth-Provider aktivieren: OIDC Discovery, JWKS, S256, Code Flow, genau benötigte Scopes; keine unkontrollierte dynamische Clientregistrierung. Zentraler Login muss eine echte IdP-Session herstellen und zum ursprünglichen Authorization Request zurückkehren.
3. Hub und isolierten IT-Pilot als getrennte Clients registrieren. Hub-Redirect exakt `https://worlds-hub.maki26.workers.dev/auth/callback`. Pilot erhält seine eigene HTTPS-Adresse. Optionaler Backchannel `/auth/backchannel-logout`. Logout-Fähigkeiten real prüfen, keine provider-eigenen Endpunkte raten.
4. Pro App dedizierte Session-D1 anlegen, Schema `migrations/0001_auth.sql` nur dort anwenden und Cron-Cleanup für abgelaufene Transaktionen/Sessions/Replays konfigurieren. Sites benötigt dafür eine bestätigte D1-Bindung in `.openai/hosting.json`; aktuell ist keine gebunden. Das Cloudflare-Repository-Deployment ist inzwischen eingerichtet; für Auth-D1 fehlen noch gesonderte Provisionierung und Bindung.
5. Auth-Routen per Cloudflare-Rate-Limit/WAF und Limits des IdP schützen. Request-Body-Limits sind im Code, ersetzen aber keine Verkehrs-/Login-Limits. Verfügbarkeit/Fehlerraten überwachen; keine Tokens, Codes, Cookies, Passwörter oder personenbezogenen Login-Bodies protokollieren.
6. Hub zuerst in einer isolierten Umgebung aktivieren. Registrierung, E-Mail-Verifikation, Recovery, Kontoverwaltung, ID-Key-Rotation und Provider-Ausfall prüfen. Echte Cross-App-Anmeldung mit einem Testkonto in mindestens zwei Browsern prüfen; Third-Party-Cookies deaktivieren. Lokale Mock-Tests sind dafür kein Ersatz.
7. IT-Pilot wie `INTEGRATION.md` umsetzen. Erfolgreiche Backup-/Restore- und Rollbackprobe nachweisen; erst danach Produktions-Clients/Flags schrittweise hinzufügen. Sprachwelten/Slop folgen separat. Music nach Vorliegen des bisher leeren Repository-Quelltexts.

## Sicherheitsabnahme

Aktuelle Tests prüfen State, Nonce, S256, Code-Einmaligkeit, JWS-Signatur, Issuer/Audience/Ablauf, verifizierte E-Mail, Sessionrotation, Ablauf, doppelte Cookies, Origin/CSRF, Backchannel-Signatur/Replays, Single-Use-Linking, Zuordnungskonflikte, historische IDs, fremde Issuer und HF-Guard.

Nicht geprüft: echter zentraler Provider, SMTP/E-Mail-Roundtrip, produktive D1-Bindung, tatsächliche lokale Reauth-Adapter, Projektrollen in produktiven Umgebungen, globale Abmeldung, echte HF-Generierung und Datenbank-Restore. Diese Punkte sind Freigabekriterien, keine behaupteten Erfolge.

## Vorübergehende Nichtverfügbarkeit

Bei bestätigtem Ausfall die Projekt-ID in `PROJECTS_UNAVAILABLE` am Hub-Worker
hinterlegen. Die Kachel und Detailseite zeigen den Hinweis in DE/EN.
Alle vier Kacheln, Projekt-Links und Suchmaschinenadressen bleiben nutzbar.
Die Anzeige folgt der Einstellung im Worker. Nach Wiederherstellung die
jeweilige Projekt-ID aus der Liste entfernen.

## SEO und Search Console

Die öffentliche Sitemap enthält die Startseite und vier Projektseiten in
DE und EN mit wechselseitigen `hreflang`-Verweisen und Canonicals. Konto-,
Anmelde-, Registrierungs-, Abmelde- und Datenschutzseiten liefern
`noindex` und `no-store`. Die Crawler dürfen diese HTML-Antworten abrufen,
damit sie `noindex` sehen. `robots.txt` sperrt die Protokoll- und API-Pfade
`/auth/` und `/api/`. Die Zugriffskontrolle erfolgt serverseitig.
Private Vorschauen bleiben mit einer leeren Sitemap und `Disallow: /` gesperrt.
[Google Search Central zu noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

1. In der [Google Search Console](https://search.google.com/search-console)
   die URL-Präfix-Property `https://worlds-hub.maki26.workers.dev/` auswählen
   oder anlegen. Die HTML-Tag-Methode deckt beide Sprachversionen ab.
2. Den `content`-Wert aus dem von Google erzeugten Tag als
   `GOOGLE_SITE_VERIFICATION` im Cloudflare-Worker `worlds-hub` hinterlegen.
   Beide Startseiten geben ihn im serverseitigen HTML-Head aus. Die
   Worker-Konfiguration erhält die Variable bei Routine-Deployments.
3. Den Tag im anonym abrufbaren HTML prüfen und in Search Console auf
   **Bestätigen** klicken. Nach Bestätigung den Wert gesetzt lassen und
   [sitemap.xml](https://worlds-hub.maki26.workers.dev/sitemap.xml) einreichen.
   Ergebnisse zur Indexierung sind erst mit Zugriff auf die Property belegbar.
   [Google-Anleitung zur HTML-Verifizierung](https://support.google.com/webmasters/answer/9008080)
4. Die separaten Search-Console-Properties, Verifizierungstags, Sitemaps
   und Canonicals der vier Welten erhalten. Bei einem tatsächlichen
   Domainwechsel pro betroffener URL die passende 301- oder 308-Weiterleitung
   einrichten und Canonical, Sitemap und interne Links gemeinsam aktualisieren.

## Deployment und Quellcode

Sites-Workflow commit/pusht geprüfte Quellen und packt den Worker. Anschließend native Save/Deploy-Operation verwenden und nur bei `succeeded` Erfolg berichten. Neue GitHub-Repository-Kopie bleibt privat, solange keine öffentliche Quellcodefreigabe verlangt wurde. Keine Secrets oder Bestands-Repositories in das neue Repository kopieren.
