# Worlds Hub — Fortschritt

Stand: 2026-11-04 (Europe/Stockholm)

## Ziel und Grenzen
Eigenständiger Hub mit vier direkten Projektlinks und schrittweisem echtem OIDC-SSO. Anwendungen, Repositories, Datenbanken und Berechtigungen bleiben getrennt. Adventskalender ist vollständig ausgeschlossen. Keine E-Mail-basierte Kontozusammenführung, keine Passwortübernahme; Slops persönliche HF-Anbindung, Kontingente, Jobs und Moderation bleiben verpflichtend und unverändert.

## Produktion, Repository und Kosten
- Produktiv: https://worlds-hub.maki26.workers.dev/ ; privates Repository https://github.com/manuelk2607/Worlds-Hub . Kein Duplikat.
- Worker worlds-hub, Konto ec3c070d8e4f88d2fc533d7d797f2daa, Namespace maki26.workers.dev. Private alte Sites-Vorschau bleibt Zusatzvorschau.
- Aktueller geprüfter Deploy: Source 266f937, Actions https://github.com/manuelk2607/Worlds-Hub/actions/runs/41804879438 , Cloudflare-Version 4b6de522-078c-4f9d-a8e4-22de0c575f82. 45 Tests, Typprüfung, Lint, Build, Audit und Live-Smoke bestanden.
- GitHub Actions ausschließlich manuell, gepinnte Actions, contents:read, 10-Minuten-Limit; Deploy standardmäßig aus. Vor erstem Lauf GitHub Free mit 0.01 USD / 12.00 USD inkludiertem Compute und 0 / 0.5 GB Storage geprüft. Kurze Läufe innerhalb vorhandener kostenloser Kontingente; keine bezahlten Pläne, Domains oder Services aktiviert. Neon-Organisation Free. Limits/Kostenfallen: docs/COSTS.md.
- Eigener, ausdrücklich genehmigter Token worlds-hub deploy: ausschließlich Account Workers Scripts:Edit, Ablauf 2027-02-02; kontoweite Restreichweite vor Freigabe erklärt. Nur verschlüsseltes Repository-Secret CLOUDFLARE_API_TOKEN. Kein Token eines anderen Projekts, keine Secrets in Git/Dateien/Logs. Lokaler Wrangler-Login abgelaufen, Actions-Deployment funktioniert.

## Erreichte Meilensteine
- P0: Bestands-Repositories Sprachwelten, IT-Worlds und Slop read-only einschließlich Auth/Neon/IDs/Rollen/HF geprüft. Kein produktives Auth-System verändert.
- P0/P3: Responsive Landingpage, SVG-Illustrationen, Dark Mode, Filter, FAQ, vier öffentliche Detailseiten und direkte Projektlinks. Music-Worlds ist inzwischen als frühe Version unter https://music-worlds.maki26.workers.dev/ bestätigt (200); zugängliches Repository beim letzten Checkout noch leer.
- P1: Wiederverwendbarer Code/PKCE-Client: State/Nonce/Browserbindung, Signatur/Issuer/Audience/EdDSA/Userinfo/Verifikation, einmalige Transaktionen, widerrufbare opaque Host-only-App-Sessions, CSRF/Rotation/Replay, lokaler und signierter Backchannel-Logout.
- P1: Neue zentrale Managed-Better-Auth-Pilotinstanz Worlds Hub Identity: Projekt snowy-frost-91455200, Branch br-lingering-bread-bayuzs7v, Datenbank worlds_identity. Exakte Auth-URL in docs/IDENTITY-PILOT.md. Nach gesonderter ausdrücklicher Nutzerfreigabe OTP-E-Mail-Pflicht, Versand bei Registrierung/Anmeldung, Hub-Origin sowie OAuth-Provider und fünf getrennte öffentliche PKCE-Clients mit Consent/exakten Redirects eingerichtet. Registry: docs/identity-clients.json.
- P1: Offizieller @neon/auth/server 0.8.2 BFF mit Login/Signup/OTP/Recovery/Namensverwaltung/Consent. Endpunkt-/Feld-/Redirect-Allowlist, 12-KiB-Bodylimit, Origin und browsergebundener CSRF, Tokenfilter, atomare IP-gehashte Rate-Buckets. OAuth-Fortsetzung 60/10min je IP, Passwortanmeldung 12/10min, weitere Limits im Code.
- P1: Neue kostenlose EU-D1 worlds-hub-auth (e9da655e-ef44-457b-8b85-d1d6268456e4), nur am Hub. Vier Tabellen und fünf Indizes in leerer DB angelegt/verifiziert; keine Projektinhalte/Passwörter/HF-Tokens. Stundenweiser Cleanup auf 500 Zeilen pro Tabelle begrenzt. Cookie-Signaturschlüssel ausschließlich per freigegebenem CI-Schritt direkt in Cloudflare initialisiert, Wert nie ausgegeben oder lokal gespeichert.
- **Echter Hub-Pilot bestanden:** Nutzer bestätigt Registrierung und E-Mail-Code. Aggregierte Neon-Abfrage: ein verifiziertes Konto. Safari-Abnahme: vorhandene zentrale Sitzung -> persönliche OAuth-Freigabe -> echter Code-/Token-/Signatur-/Userinfo-Ablauf -> /konto mit „Hallo, Manuel.“ und eigener gültiger Hub-Sitzung. Keine Benutzer-/Tokenwerte für die Datenbankprüfung abgerufen.
- P2-Vorarbeit: Dual-Proof-Linking-Vertrag, frischer signierter auth_time, historische ID-Mappings und additive Schema-Vorlage. Konkrete Integrations-/Test-/Rollbackanleitungen je Repository in docs/INTEGRATION.md. Noch keine Bestandskonten migriert oder verknüpft.
- P3: Titel, Descriptions, Canonicals, OG/JSON-LD, robots.txt und Sitemap produktiv geprüft. Fünf öffentliche Seiten indexierbar; Konto/Auth/Identity/API noindex/no-store. HTTPS 200, HTTP->HTTPS 308, keine pauschalen Alt-URL-Redirects. Search-Console-HTML-Verifizierung vorbereitet.

## Aktuelles Arbeitspaket
Der Nutzer-Screenshot zeigte die aktive zentrale Sitzung vor dem bislang manuellen Weiter-Schritt. Der echte Callback wurde anschließend mit persönlicher Freigabe erfolgreich nachgewiesen. Automatische Fortsetzung bestätigter Sitzungen und kompaktere Konto-/Consent-Oberfläche umgesetzt: zweispaltige Desktopansicht, mobile Karte, eindeutige Hauptaktion, keine Login-/Registrierungsbuttons bei aktiver Sitzung. Lokal Desktop/Mobil 390px, Theme und Formularwechsel ohne horizontalen Überlauf geprüft. Geprüften UI-Stand als Nächstes deployen und automatische Wiederanmeldung in Safari testen.

## Offen / Abnahmegrenzen
- Kein bestehendes Welt-Projekt produktiv per SSO angebunden. P1-Pilot mit IT-Worlds und anschließend P2 noch erforderlich; vor Legacy-Schemaänderungen echte isolierte Backup-/Restore-/Rollbackprobe und Rollen-/RLS-Abnahme.
- Reauth prompt=login/max_age=0 laut Neon-Dokumentation problematisch; aktueller Upstream enthält frische Sessionbehandlung, Managed-Verhalten noch nicht geprüft. Erzwungene Reauth bleibt aus. Kein unsicherer Ersatz durch E-Mail oder ID-Token-iat.
- Recovery, Projekt-übergreifender Logout, zweite echte Relying Party, Rollen/Mapping und HF-Gates in integrierten Apps noch produktiv zu prüfen. Hub-Logout und zentrale SDK-Abmeldung sind getrennt und werden so erklärt.
- Eigene produktionsgeeignete SMTP-Konfiguration nicht vorhanden. Pilot nutzt den kostenlosen Neon-Maildienst; OTP real bestätigt. Keine bezahlte SMTP-/Domainbestellung.
- Search-Console-Property/Token fehlt; keine Google-Indexierung garantiert. Bestehende Properties/Canonicals unangetastet.

## Nächster konkreter Schritt
UI-Deploy + Safari-Wiederanmeldung abschließen. Danach atomaren Postgres-Mapping-Store mit echten lokalen SQL-Tests konkretisieren und IT-Worlds auf einem isolierten Ziel anbinden. Erst nach Pilot und Restore/Rollback produktive Bestands-Clients schrittweise ergänzen. Keine riskante Migration vorziehen.
