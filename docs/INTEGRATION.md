# Änderungen an den vier unabhängigen Projekten

Keine der folgenden produktiven Änderungen wurde angewendet. Dieser Plan gehört zum neuen Hub-Repository. Kein gemeinsames Datenbank-Monolith, keine Passwortübertragung, keine automatische E-Mail-Zuordnung.

## Pilot: IT-Worlds

Kleinster Umfang: nur persönliche Lernfortschritte; daher zuerst isolierte IT-Worlds-Umgebung, kein produktiver Cutover.

1. Neue Branch im Repository und ausdrücklich isoliertes Neon-/Auth-Testziel vorbereiten. Keine produktiven Login-Variablen ersetzen. Datenbanksicherung und Restore in eine isolierte Datenbank wirklich proben; Ergebnis/Revision notieren. Datenkopien und Aufbewahrung nach bestehender Projektregel behandeln.
2. Eigenen OIDC-Client `it-worlds` beim zentralen IdP registrieren, Redirect `<pilot-origin>/auth/callback`, Backchannel `<pilot-origin>/auth/backchannel-logout`; später Produktions-Origin zusätzlich exakt registrieren. `worlds_identity_links` additiv über die vorhandene `migrations/`-Pipeline anlegen; Typ/FK auf `neon_auth.user.id` UUID anpassen. Vorlage: `project-link-schema.sql`, nicht direkt ausführen.
3. Auth-Paket als kleines versioniertes Modul einbinden, eigene Session-DB anbinden und serverseitige Feature-Flag-Routen unter `/auth/*` ergänzen. Bestehende `/api/auth/*`-Proxy-Routen und `@neondatabase/auth` bleiben für den alten Login und Eigentumsnachweis erhalten.
4. `worker/index.ts:getProgress` erweitert seine Identitätsauflösung um validierte OIDC-Session **und** lokales Mapping. Für gemappte Benutzer `local_user_id` setzen, unveränderte `app.user_id`-RLS-Transaktion weiterverwenden. Zentrale `sub` niemals direkt in `learning_progress.user_id` einsetzen.
5. `src/scripts/account.ts`, `progress-client.ts`, `src/pages/konto.astro`: zusätzliche opt-in Worlds-Anmeldung und explizite Verknüpfungsbestätigung. Fehlendes Mapping führt zum Linking-Dialog, nie zu Zugriff auf alte Lernstände. Alte Anmeldung bleibt verfügbar. Deutsche/englische UI gemeinsam pflegen.
6. Beide Konten frisch nachweisen: zentraler IdP-Reauth mit validiertem auth_time (max_age=0 erst nach Behebung der in IDENTITY-PILOT.md dokumentierten Provider-Schleife) und bisheriges Neon-Reauth mit dem offiziellen SDK. Sessiongebundenen Proof serverseitig speichern, Bestätigung mit Origin+CSRF; Mapping/Audit/Proof-Verbrauch in EINER DB-Transaktion. Das Auth-Paket kann den zentralen Proof nur aus einer validierten Sitzung mit frischem signiertem auth_time ableiten; im Neon-Pilot bleibt diese Funktion mangels Anbieterfreigabe praktisch gesperrt.
7. Tests: Account A/B, gleicher E-Mail-Wert bei unterschiedlichen Konten, anderer Issuer, fehlende/abgelaufene Sitzung, paralleles Linking, Konflikte, alter Login parallel, RLS, Recovery, E-Mail-Verifikation, Browser-Neuladen und Ausfall des IdP. Keine synthetischen Adminrechte vergeben.
8. Bestehende Tests plus `npm run check`, `npm test`, `npm run build`, isolierte `test:accounts` und dokumentierte manuelle Browserabnahme. Nach bestandenem echtem Pilot erst produktive Client-/Origin-Konfiguration ergänzen. Kein DB-Cutover erforderlich.

## Sprachwelten

- `lib/auth/server.ts`, `lib/api.ts`/bestehende Account-/Contributor-Auflösung und alle direkten `getAuth().getSession()`-Verwendungen inventarisieren. Einheitlicher serverseitiger Adapter muss bestehende lokale IDs zurückliefern; direkte Session-Aufrufe dürfen den Adapter nicht umgehen.
- `lib/auth/client.ts`/`provider.tsx`, `components/auth-dialog.tsx`, `app/api/auth/[...path]`: bisherigen Managed-Login erhalten, Worlds optional hinzufügen. Keine ungetestete Änderung des Neon-SDK-Proxys.
- Mapping additiv unter `db/migrations/`, ausschließlich über den vorhandenen Runner und isolierte Integrationsziele. Adminrechte bleiben in `app_admins`; Gäste bleiben `guest:` und werden weder nach Name noch E-Mail beansprucht.
- Beiträge, Moderationsaudit, Revisionen, private Audio-Dateien, Notebooks und richtungsbezogene Fortschritte weiter an historische IDs binden. Tabellen nicht umschreiben.
- Nach Integration: typecheck, lint, Übersetzungsabdeckung, audit, Unit- und isolierte Auth-/Persistence-/Room-/Notebook-Tests nach dortigem `AGENTS.md`. Existierende Datenbank und Worker-Secrets behalten. Deployment nur in den vorhandenen Worker `sprachwelten`, nicht dessen altes Sites-Projekt.

## Slop Urself

- Website-Login in `src/auth/session.ts` um optionalen OIDC-/Mapping-Pfad erweitern. Rückgabevertrag `Account` mit bestehender `id`, `name`, `authVersion` erhalten. `profileAuthConfig`, `accountIsCurrent`, Passwortschutz, Kontosperren und bestehende Adminsitzung bleiben wirksam.
- Die Pfade in `src/server/cloudflare/worker.ts`, `room.ts`, `services.ts` UND `src/server/node.ts` müssen dieselbe Identität serverseitig validieren. WebSocket-/Raum-Authentifizierung und bestehende Session-Widerrufe mitprüfen. Zentralen Browsercookie niemals als Spiel-Bearertoken ausgeben.
- `src/database/schema.ts`/bestehenden Migrationsprozess für lokale Links ergänzen; keine historischen Profile/Spieler/Statistiken/Jobs umschlüsseln. Besonderheit passwortloser Profile siehe Architekturentscheidung: Name allein ist keine Eigentümerschaft.
- `src/auth/huggingface.ts` und `src/server/huggingface.ts` behalten OAuth-/Device-Flow. `hf-connection:*`, `hf-job:*`, Quota-Reservierungen und `accountId` bleiben unangetastet. Keine HF-Credentials an Hub/IdP senden.
- Reale Generation muss bei fehlender/abgelaufener/falscher persönlicher HF-Verbindung scheitern, auch mit gültigem SSO. Weiterhin `requirePlayerHf`, Besitz-/Quota-/Job- und Moderationschecks ausführen. Keine globale HF-Token-Fallback-Freigabe einführen.
- E2E-Pflicht: Login mit/ohne Passwort, Worlds-Mapping, anderes Konto im selben Browser, HF-OAuth und Device Flow, Job-Fortsetzung, Kontingentbelastung, Logout, Socket-Reconnect, Sicherheits-/Moderationsfreigaben. Kein echter kostenpflichtiger Generierungsjob ohne separaten Auftrag.

## Music-Worlds

Noch kein zugängliches Repository oder produktiver Host. Später als eigenes Projekt mit eigener DB anlegen, direkt denselben zentralen IdP als eigenen Client verwenden. Neue lokale Benutzer-ID nach expliziter Registrierung; keine Migration bestehender Music-Daten behaupten. Hub-URL erst bei bestätigter HTTPS-Produktionsadresse austauschen.

## Projektübergreifende Navigation / Fortschritte

Ein normaler Link „Worlds Hub“ pro Projekt genügt zunächst. Optional ein gemeinsamer Projekt-Switcher aus derselben öffentlichen Registry; keine Tokens und keine persönlichen Daten im Link. Fortschritts-Aggregation im Hub bleibt ausgeschaltet, bis jede Anwendung eine dokumentierte, autorisierte, minimale Schnittstelle bereitstellt. Keine Scraping-/Browser-Sessions als Ersatz verwenden.

## Rollback

Feature-Flag abschalten, neue OIDC-Sessions widerrufen, alte Anmeldungen weiter anbieten. Additive Links/Proofs zur Prüfung erhalten; nicht Daten/Accounts zurückmigrieren oder Tabellen ungeprüft löschen. Bei Widerruf einer Verknüpfung alle dazugehörigen App-Sessions und Proofs invalidieren. Rollen, Inhalte, Lernstände und HF-Zuordnungen bleiben auf alten IDs und benötigen keine Rückschreibung.
