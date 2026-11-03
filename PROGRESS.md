# Worlds Hub — Fortschritt

Stand: 2026-11-04 (Europe/Stockholm)

## Ziel
Eigenständiger Hub mit vier Projektlinks und schrittweisem sicherem OIDC-SSO. Anwendungen, Datenbanken und Berechtigungen bleiben getrennt. Adventskalender bleibt vollständig unabhängig.

## Abgeschlossene Pakete
- P0: Drei Bestands-Repositories und ihre produktiven Neon-Auth-/Benutzer-/HF-Strukturen read-only geprüft; deren Homepages liefern 200. Neues eigenständiges Projekt mit Sites-ID `appgprj_6aea673346808191acd302d1a40c3c60` angelegt.
- P0: Responsive Landingpage, eigene SVG-Illustrationen, vier Detailseiten, funktionierende Bestandslinks, Music-Coming-soon, Dark Mode, Interessenfilter, FAQ, Kontostatus und zugängliche Navigation implementiert.
- P1-Vorarbeit: Wiederverwendbarer OIDC-Code/PKCE-Client mit expliziter JWS-/Issuer-/Audience-/Nonce-/Userinfo-Prüfung, serverseitigem einmaligem State, widerrufbaren App-Sessions, CSRF-/Sessionfixation-/Replay-Schutz, lokalem und Backchannel-Logout.
- P1-Infrastruktur: Kostenlosen Neon-Tarif geprüft und separate zentrale Managed-Better-Auth-Pilotinstanz angelegt (`snowy-frost-91455200`, Branch `br-lingering-bread-bayuzs7v`). Keine Produktionsinstanz verändert. OAuth-Provider bleibt aus.
- P2-Vorarbeit: Dual-Proof-Linking-Vertrag, frischer zentraler Reauth-Proof, historische ID-Mappings und additive Schema-Vorlage. Keine E-Mail-Zusammenführung; Slops persönliche HF-Gates ausdrücklich erhalten.
- P3-Vorarbeit: Individuelle Titel/Descriptions/Canonicals/OG-Daten/Strukturdaten, robots.txt, XML-Sitemap und optionale Search-Console-Verifizierung. Private Vorschau standardmäßig noindex.
- Pro Repository konkrete Integrations-, Test- und Rollback-Anleitung in docs/INTEGRATION.md dokumentiert.

## Verifikation
35 Tests erfolgreich; TypeScript, ESLint, Produktions-Build und ESM-Artefaktprüfung erfolgreich. npm audit: 0 bekannte Schwachstellen. Browser-QA für Desktop/Mobil, Theme/Filter/Navigation erfolgreich. Details und Grenzen: docs/VERIFICATION.md.

## Veröffentlichung / aktuell
Quellen und Dokumentation fertig zur Commit-/Push-/Deployment-Phase. Die neue Sites-Veröffentlichung bleibt zunächst privat; AUTH_ENABLED und PUBLIC_INDEXING bleiben false. Deployment-Ergebnis wird nach der nativen Veröffentlichung separat protokolliert.

## Offene Anforderungen und konkrete Blocker
- Kein produktiv angebundenes Projekt; bisher null Benutzer migriert/verknüpft. Bestehende Konten bleiben unverändert nutzbar.
- Neon dokumentiert eine OAuth-Schleife mit prompt=login/max_age=0. Die für Linking benötigte zentrale frische Reauth ist damit noch nicht produktiv belegt. Im Code bleibt dieser Modus gesperrt. Details: docs/IDENTITY-PILOT.md.
- Eigene IdP-Login-/Consent-Seiten, Verifikation/Recovery/Kontoverwaltung, registrierte App-Clients und echte Cross-App-Abnahme fehlen. Globale IdP-Abmeldung ist nicht freigegeben; Hub-Logout beendet nur die lokale Session.
- Produktive Session-D1, Cleanup und Traffic-Limits noch nicht konfiguriert. Direkter Cloudflare-CLI-Zugang fehlt; Sites-Deployment ist verfügbar.
- Music-Worlds ohne zugängliches Repo oder bestätigte Produktiv-URL.
- Öffentliche Freigabe, vollständige Verantwortlichen-/Datenschutzangaben, Search-Console-Token/Property und produktiver SEO-Smoke-Test stehen aus.

## Nächster konkreter Schritt nach Veröffentlichung
Auf der neuen, getrennten Pilotinstanz den dokumentierten Neon-Reauth-Blocker klären und die IdP-Login-/Consent-Oberfläche isoliert testen. Erst nach bestandenem echten IT-Worlds-Pilot und Backup-/Rollbackprobe produktive Clients schrittweise aktivieren. Keine riskante Migration vorziehen.
