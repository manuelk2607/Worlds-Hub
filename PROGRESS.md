# Worlds Hub — Fortschritt

Stand: 2026-11-04 (Europe/Stockholm)

## Ziel
Eigenständiger Hub mit vier Projektlinks und schrittweisem sicherem OIDC-SSO. Anwendungen, Datenbanken und Berechtigungen bleiben getrennt. Adventskalender bleibt vollständig unabhängig.

## Abgeschlossene Pakete
- P0: Drei Bestands-Repositories und ihre produktiven Neon-Auth-/Benutzer-/HF-Strukturen read-only geprüft; deren Homepages liefern 200. Neues eigenständiges Projekt mit Sites-ID `appgprj_6aea673346808191acd302d1a40c3c60` angelegt.
- P0: Responsive Landingpage, eigene SVG-Illustrationen, vier Detailseiten, funktionierende Bestandslinks, direkter Link zur bestätigten frühen Music-Version, Dark Mode, Interessenfilter, FAQ, Kontostatus und zugängliche Navigation implementiert.
- P1-Vorarbeit: Wiederverwendbarer OIDC-Code/PKCE-Client mit expliziter JWS-/Issuer-/Audience-/Nonce-/Userinfo-Prüfung, serverseitigem einmaligem State, widerrufbaren App-Sessions, CSRF-/Sessionfixation-/Replay-Schutz, lokalem und Backchannel-Logout.
- P1-Infrastruktur: Kostenlosen Neon-Tarif geprüft und separate zentrale Managed-Better-Auth-Pilotinstanz angelegt (`snowy-frost-91455200`, Branch `br-lingering-bread-bayuzs7v`). Keine Produktionsinstanz verändert. OAuth-Provider inzwischen für die freigegebene Pilotinstanz aktiviert; fünf getrennte öffentliche PKCE-Clients mit Consent und exakten Redirects registriert.
- P2-Vorarbeit: Dual-Proof-Linking-Vertrag, frischer zentraler Reauth-Proof, historische ID-Mappings und additive Schema-Vorlage. Keine E-Mail-Zusammenführung; Slops persönliche HF-Gates ausdrücklich erhalten.
- P3-Vorarbeit: Individuelle Titel/Descriptions/Canonicals/OG-Daten/Strukturdaten, robots.txt, XML-Sitemap und optionale Search-Console-Verifizierung. Private Vorschau standardmäßig noindex.
- Pro Repository konkrete Integrations-, Test- und Rollback-Anleitung in docs/INTEGRATION.md dokumentiert.

## Verifikation
44 Tests erfolgreich; TypeScript, ESLint, Produktions-Build und ESM-Artefaktprüfung erfolgreich. npm audit: 0 bekannte Schwachstellen. Browser-QA für Desktop/Mobil, Theme/Filter/Navigation erfolgreich. Details und Grenzen: docs/VERIFICATION.md.

## Repository, produktives Deployment und Kosten
- Repository: https://github.com/manuelk2607/Worlds-Hub (privat; kein Duplikat).
- **Produktiv:** https://worlds-hub.maki26.workers.dev/ . Worker `worlds-hub` im bestehenden Konto `ec3c070d8e4f88d2fc533d7d797f2daa`; Namespace zuvor im Dashboard geprüft, kein Namenskonflikt.
- Erfolgreicher GitHub-Actions-Lauf: https://github.com/manuelk2607/Worlds-Hub/actions/runs/41741651197 . Deployed Source: `47197466126bcd6ac03dc74ca5d9fd771940d32d`, Cloudflare-Version `ffe180c9-a53c-4764-a2a1-053bd0f07817`.
- CI: 35 Tests, TypeScript, Lint, Build, Audit, Deployment und alle produktiven Smoke-Checks erfolgreich. Zusätzlich HTTP->HTTPS 308, HTTPS 200 mit gültiger TLS-Prüfung und echte Live-Browseransicht ohne Konsolenfehler geprüft. Öffentliche Titel/Canonicals/OG/Sitemap/Robots korrekt; private Konto-/Auth-Seiten noindex/no-store, SSO bleibt gesperrt.
- Eigener Token `worlds-hub deploy`: Nutzer hat 90 Tage und ausschließlich Account `Workers Scripts: Edit` ausdrücklich bestätigt. Ablauf 2027-02-02. Nur als GitHub-Repository-Secret `CLOUDFLARE_API_TOKEN` gespeichert, weder in Dateien noch Git/Logs. Kein Token eines anderen Projekts wiederverwendet; kein automatischer breit berechtigter Cloudflare-Token erstellt.
- Workflow bleibt manuell (`workflow_dispatch`), `deploy=false` ist Standard. Account-Billing im Browser vor Start verifiziert: GitHub Free, 0.01 USD / 12.00 USD enthaltenes Compute verwendet, 0 GB / 0.5 GB Actions-Storage. Der kurze Lauf liegt im vorhandenen Kontingent. Keine bezahlten Ressourcen oder Domain bestellt; Neon-Organisation ebenfalls Free.
- Frühere private Sites-Veröffentlichung bleibt nur Zusatzvorschau; Produktion verwendet die ausdrücklich gewünschte Cloudflare-Adresse. Die damalige Freigabefrage ist durch Nutzerpräzisierung erledigt.

## Offene Anforderungen und konkrete Blocker
- Kein produktiv angebundenes Projekt; bisher null Benutzer migriert/verknüpft. Bestehende Konten bleiben unverändert nutzbar.
- Neon dokumentiert eine OAuth-Schleife mit prompt=login/max_age=0. Die für Linking benötigte zentrale frische Reauth ist damit noch nicht produktiv belegt. Im Code bleibt dieser Modus gesperrt. Details: docs/IDENTITY-PILOT.md.
- IdP-Login-/Consent-Seiten, Verifikation/Recovery/Kontoverwaltung sind mit offiziellem Neon-SDK implementiert und lokal geprüft; App-Clients registriert, echte Provider-Abnahme fehlt. Globale IdP-Abmeldung ist nicht freigegeben; Hub-Logout beendet nur die lokale Session.
- Isolierte kostenlose D1 `worlds-hub-auth` (EU, `e9da655e-ef44-457b-8b85-d1d6268456e4`) erstellt; vier Tabellen und fünf Indizes im Dashboard verifiziert. Binding, stündlicher begrenzter Cleanup und zentrale Oberfläche für nächsten geprüften Deploy konfiguriert. Lokaler Wrangler-Login ist abgelaufen; das produktive Repository-Deployment funktioniert über den genehmigten eigenen Actions-Token.
- Music-Worlds ist unter https://music-worlds.maki26.workers.dev/ erreichbar (200). Zugängliches Repository manuelk2607/Music-Worlds noch leer, deshalb Auth-/Quelltextintegration offen.
- Search-Console-Token/Property fehlen; Verifizierung ist technisch vorbereitet. Die produktiven SEO-Smoke-Tests sind bestanden. Keine Google-Indexierung garantiert.

## Nächster konkreter Schritt
Nutzer hat das konkrete isolierte Setup in docs/PILOT-ACTIVATION.md am 2026-11-04 freigegeben: OTP-Pflicht, getrennte PKCE-Clients, zentrale Origin, kostenlose Hub-D1 und Cookie-Signaturschlüssel. Deaktivierte Oberfläche erfolgreich mit Source `ea28a97` deployt (Actions 41802178235, 44 Tests und Produktions-Smoke erfolgreich). OTP-/Origin-/Client-Setup und D1-Schema eingerichtet. Als Nächstes Cookie-Signatur per CI initialisieren, zentrale Oberfläche mit D1 deployen und reale Login-/Consent-/Reauth-Flows testen. Erst nach bestandenem echten IT-Worlds-Pilot und Backup-/Rollbackprobe produktive Clients schrittweise aktivieren. Keine riskante Migration vorziehen.
