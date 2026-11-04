# Verifikation — 2026-11-04

## Erfolgreich

- TypeScript-Typprüfung und ESLint.
- 52 Node-Tests: signierter isolierter OIDC-Anbieter, zwei getrennte Relying Parties, PKCE/State/Nonce/JWKS/Claims/Userinfo, frischer auth_time und Sperre unfreigegebener Reauth, Sessionrotation/CSRF/Logout/Replay, begrenzte Request-Bodies, Mapping-/HF-Guards.
- Offizieller Neon-SDK-Proxy: eingeschränkte Endpunkte/Felder, Origin/CSRF, signierte Query unverändert, Tokenfilter, exakte Redirects und atomare Rate-Limits. Ed25519-Signatur zusätzlich geprüft. Ablaufbereinigung auf 500 Datensätze pro Tabelle begrenzt.
- Lokale Identity-Oberfläche im Browser: Formularwechsel, E-Mail-/OTP-Felder und mobile 390-Pixel-Ansicht ohne horizontalen Überlauf geprüft; keine echte Anmeldung ausgeführt.
- Migration und atomare Session-/Transaktionsoperationen auf echter SQLite-In-Memory-Datenbank (D1-kompatibles SQL), keine produktive DB-Verbindung für Tests.
- HTTP-/SEO-/Security-Header-Prüfungen gegen den tatsächlich gebauten Worker, beide Indexierungsmodi.
- Produktions-Build und Import-/ESM-Artefaktprüfung.
- Gesamte npm-Abhängigkeitsprüfung: keine bekannten Schwachstellen nach gezieltem minimatch-Override; keine Ausnahmen oder force-Downgrades.
- Browser-QA über echte Browseroberfläche: helle/dunkle Ansicht, persistierende Themenwahl, Interessenfilter (Kreativ -> genau Slop Urself, Alle -> vier Karten), Music-Detail und Konto-Navigation. Mobil 390/320 Pixel, kein horizontaler Dokumentüberlauf. Desktop-Layout visuell geprüft. Keine Fehler/Warnungen in der Browserkonsole.
- Bestehende öffentliche Projekt-Homepages: jeweils HTTP 200. Keine pauschalen Weiterleitungen und keine Änderungen an Bestands-Repositories.

## Bewusste Grenzen

Die 52 Tests belegen den Auth-Client und dessen Sicherheitsverträge mit einem lokalen Testanbieter. Sie belegen **keinen** produktiven Neon-Cross-App-Login oder bereits migrierte Konten. SQLite-Tests ersetzen keine produktive Cloudflare-D1-Bindung. Keine vollständige Screenreader-/WCAG-Zertifizierung, kein externer Penetrationstest und kein Nachweis einer Google-Indexierung.

Noch offen: echter IT-Pilot, Login-/Consent-/Recovery-/Verifikationsabläufe, produktive Rollen/RLS in Kombination mit Mapping, globaler IdP-Logout, reale HF-Authentifizierung/Generierungsfreigaben, verifizierter Backup/Restore ; öffentliche SEO-Abnahme für die Landingpage bestanden. Exakte Ursache der Reauth-Sperre: `IDENTITY-PILOT.md`.

## Produktive Cloudflare-Abnahme

GitHub-Actions-Lauf 41741651197 erfolgreich, Source 4719746, Cloudflare-Version ffe180c9-a53c-4764-a2a1-053bd0f07817. Das produktive Smoke-Skript hat alle zehn genannten Routen plus 404/gesperrtes SSO geprüft. HTTP 308 zur gewünschten HTTPS-Adresse, HTTPS 200, Zertifikat gültig. Live-Desktopansicht ohne Browserfehler; Belegbild im übergeordneten outputs-Verzeichnis. Diese Abnahme gilt für die Landingpage und den gesperrten Auth-Zustand, nicht für noch fehlendes produktives Cross-App-SSO.

## Zentraler Live-Pilot

Actions 41802848674 / Source fdbe0a5 / Cloudflare-Version 8601e0db-653e-413b-8a27-2fdd639ab9d2 erfolgreich. Cookie-Signaturschlüssel direkt in Cloudflare initialisiert, Hub-D1 gebunden, zentrale Loginseite 200 mit CSRF-Cookie und private Header. Echter Neon-Sitzungsabruf anonym 200 mit null/null; fehlender CSRF bei sign-out 403. Discovery bestätigt exakten Issuer, S256 und EdDSA. Normaler Browser-Authorize-Aufruf erreicht die signierte und allowlistgeprüfte Hub-Loginseite. Öffentlicher Token-Client akzeptiert, nicht ausgestellter Code korrekt mit invalid_grant abgewiesen. Nutzer bestätigt Registrierung/E-Mail-Verifikation mit Erfolgsmeldung. Vollständiger Hub-Code-/Token-/Consent-/Sessionablauf und zweiter echter App-Client noch offen.

## Browser-Regression beim Loginstart

Native POST-Formulare unter Referrer-Policy no-referrer senden laut MDN Origin:null; strenge Origin-Prüfung lehnt diese ab. Für die Konto-Einstiegsseiten gilt deshalb same-origin (weiterhin kein Cross-Origin-Referrer); Reset-/Identity-/Callbackseiten bleiben no-referrer. Loginstart erfolgt zusätzlich per gleichursprünglichem JSON-POST und normaler Top-Level-Navigation zum unveränderten OIDC-Ziel. Keine Aufweichung der Origin-/CSRF-Prüfung. Quelle: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy , gelesen 2026-11-04. Regression: JSON-Start, browsergebundener Cookie, Code-/PKCE-Abschluss und Header-Trennung geprüft.

## Erfolgreicher echter Hub-OIDC-Abschluss

Safari wurde nach persönlicher Freigabe des Nutzers auf `/konto` mit „Hallo, Manuel.“ und gültiger eigener Hub-Sitzung beobachtet. Damit sind der echte Code-/PKCE-/Token-/EdDSA-/Userinfo-/Sessionablauf und die bestätigte E-Mail im Hub belegt. Das ist noch keine Cross-App-Abnahme der vier Welten. Der zuvor manuelle Weiter-Schritt wird automatisch fortgesetzt; die überarbeitete kompakte Oberfläche ist lokal bei Desktop und 390 Pixeln einschließlich Formularwechsel ohne horizontalen Überlauf geprüft.

## Lokaler atomarer Postgres-Mapping-Store

Echtes Postgres/WASM über PGlite 0.5.15 ausschließlich im Speicher für Tests. Parametrisierter Store prüft Owner-Constraints und Audit-Rollback in einer atomaren Anweisung. Zielgerichtete Tests bestanden einschließlich nicht existierendem Legacy-Konto und unveränderten historischen IDs/Rollen; reale Neon-Multi-Connection-/RLS-Abnahme bleibt offen. Kein bestehendes App-Schema verändert.
