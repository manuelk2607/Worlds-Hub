# Verifikation — 2026-11-04

## Erfolgreich

- TypeScript-Typprüfung und ESLint.
- 35 Node-Tests: signierter isolierter OIDC-Anbieter, zwei getrennte Relying Parties, PKCE/State/Nonce/JWKS/Claims/Userinfo, frischer auth_time und Sperre unfreigegebener Reauth, Sessionrotation/CSRF/Logout/Replay, begrenzte Request-Bodies, Mapping-/HF-Guards.
- Migration und atomare Session-/Transaktionsoperationen auf echter SQLite-In-Memory-Datenbank (D1-kompatibles SQL), keine produktive DB-Verbindung für Tests.
- HTTP-/SEO-/Security-Header-Prüfungen gegen den tatsächlich gebauten Worker, beide Indexierungsmodi.
- Produktions-Build und Import-/ESM-Artefaktprüfung.
- Gesamte npm-Abhängigkeitsprüfung: keine bekannten Schwachstellen nach gezieltem minimatch-Override; keine Ausnahmen oder force-Downgrades.
- Browser-QA über echte Browseroberfläche: helle/dunkle Ansicht, persistierende Themenwahl, Interessenfilter (Kreativ -> genau Slop Urself, Alle -> vier Karten), Music-Detail und Konto-Navigation. Mobil 390/320 Pixel, kein horizontaler Dokumentüberlauf. Desktop-Layout visuell geprüft. Keine Fehler/Warnungen in der Browserkonsole.
- Bestehende öffentliche Projekt-Homepages: jeweils HTTP 200. Keine pauschalen Weiterleitungen und keine Änderungen an Bestands-Repositories.

## Bewusste Grenzen

Die 35 Tests belegen den Auth-Client und dessen Sicherheitsverträge mit einem lokalen Testanbieter. Sie belegen **keinen** produktiven Neon-Cross-App-Login oder bereits migrierte Konten. SQLite-Tests ersetzen keine produktive Cloudflare-D1-Bindung. Keine vollständige Screenreader-/WCAG-Zertifizierung, kein externer Penetrationstest und kein Nachweis einer Google-Indexierung.

Noch offen: echter IT-Pilot, Login-/Consent-/Recovery-/Verifikationsabläufe, produktive Rollen/RLS in Kombination mit Mapping, globaler IdP-Logout, reale HF-Authentifizierung/Generierungsfreigaben, verifizierter Backup/Restore und öffentliche SEO-Abnahme. Exakte Ursache der Reauth-Sperre: `IDENTITY-PILOT.md`.

## Produktive Cloudflare-Abnahme

GitHub-Actions-Lauf 41741651197 erfolgreich, Source 4719746, Cloudflare-Version ffe180c9-a53c-4764-a2a1-053bd0f07817. Das produktive Smoke-Skript hat alle zehn genannten Routen plus 404/gesperrtes SSO geprüft. HTTP 308 zur gewünschten HTTPS-Adresse, HTTPS 200, Zertifikat gültig. Live-Desktopansicht ohne Browserfehler; Belegbild im übergeordneten outputs-Verzeichnis. Diese Abnahme gilt für die Landingpage und den gesperrten Auth-Zustand, nicht für noch fehlendes produktives Cross-App-SSO.
