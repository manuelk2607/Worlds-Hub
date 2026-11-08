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

- `feature/worlds-hub-sso` enthält die additive Migration 027. Sie ist im separaten, leeren Neon-QA-Projekt mit einem echten Managed-Auth-Konto und den gemeinsamen Postgres-Adaptern geprüft. Die Fremdschlüssel zeigen auf `neon_auth."user".id`. `app_admins`, Beiträge und Lern-/Heftbesitz verwenden weiter die lokale UUID.
- Einen serverseitigen Resolver für die bestehenden Session-Lesewege in `lib/http.ts`, `lib/contributor.ts`, `lib/player-name.ts`, `app/api/learning/{route.ts,vocabulary/route.ts}` und `app/api/entries/[id]/route.ts` anbinden. Das Ergebnis ist die lokale UUID. Bei gleichzeitig aktiven, verschiedenen Konten ist ein ausdrücklicher Kontowechsel erforderlich. Die bestehenden Admin-Gates in `lib/admin.ts` und `app/api/admin/access/route.ts` bleiben im Pilot an die Managed-Sitzung plus `app_admins` gebunden.
- `lib/auth/client.ts`/`provider.tsx`, `components/auth-dialog.tsx`, `app/api/auth/[...path]`: bisherigen Managed-Login erhalten, Worlds optional hinzufügen. Keine ungetestete Änderung des Neon-SDK-Proxys.
- Sprachwelten verwendet das gemeinsame Auth-Modul als Abhängigkeit mit
  festem Paket-Commit und Prüfsumme. `auth-v0.1.0` ist aus `packages/auth`
  mit `git subtree split --prefix=packages/auth` erzeugt. Die Pilot-Routen
  und der Resolver für Lernaktivität und Vokabelhefte sind im Featurebranch
  integriert. Gäste bleiben `guest:` und werden weder nach Name noch E-Mail
  beansprucht.
- Beiträge, Moderationsaudit, Revisionen, private Audio-Dateien, Notebooks und richtungsbezogene Fortschritte weiter an historische IDs binden. Tabellen nicht umschreiben.
- Nach Integration: typecheck, lint, Übersetzungsabdeckung, audit, Unit- und isolierte Auth-/Persistence-/Room-/Notebook-Tests nach dortigem `AGENTS.md`. Existierende Datenbank und Worker-Secrets behalten. Deployment nur in den vorhandenen Worker `sprachwelten`, nicht dessen altes Sites-Projekt.

## Slop Urself

- `feature/worlds-hub-sso` enthält den deaktivierten Callback- und Linking-Pilot
  für Node und Cloudflare. `docs/WORLDS-PILOT.md` im Projekt dokumentiert
  Schema, isoliertes Ziel, exakte OIDC-Redirects und die lokale Abnahme.
  Die Link-Transaktion behält `user_profiles.id` und prüft Passwortversion,
  zentrale Sitzung, signiertes `auth_time` und Audit gemeinsam.
- Website-Login in `src/auth/session.ts` um optionalen OIDC-/Mapping-Pfad erweitern. Rückgabevertrag `Account` mit bestehender `id`, `name`, `authVersion` erhalten. `profileAuthConfig`, `accountIsCurrent`, Passwortschutz, Kontosperren und bestehende Adminsitzung bleiben wirksam.
- Die Pfade in `src/server/cloudflare/worker.ts`, `room.ts`, `services.ts` UND `src/server/node.ts` müssen dieselbe Identität serverseitig validieren. WebSocket-/Raum-Authentifizierung und bestehende Session-Widerrufe mitprüfen. Zentralen Browsercookie niemals als Spiel-Bearertoken ausgeben.
- `src/database/schema.ts`/bestehenden Migrationsprozess für lokale Links ergänzen; keine historischen Profile/Spieler/Statistiken/Jobs umschlüsseln. Besonderheit passwortloser Profile siehe Architekturentscheidung: Name allein ist keine Eigentümerschaft.
- `src/auth/huggingface.ts` und `src/server/huggingface.ts` behalten OAuth-/Device-Flow. `hf-connection:*`, `hf-job:*`, Quota-Reservierungen und `accountId` bleiben unangetastet. Keine HF-Credentials an Hub/IdP senden.
- Reale Generation muss bei fehlender/abgelaufener/falscher persönlicher HF-Verbindung scheitern, auch mit gültigem SSO. Weiterhin `requirePlayerHf`, Besitz-/Quota-/Job- und Moderationschecks ausführen. Keine globale HF-Token-Fallback-Freigabe einführen.
- E2E-Pflicht: Login mit/ohne Passwort, Worlds-Mapping, anderes Konto im selben Browser, HF-OAuth und Device Flow, Job-Fortsetzung, Kontingentbelastung, Logout, Socket-Reconnect, Sicherheits-/Moderationsfreigaben. Kein echter kostenpflichtiger Generierungsjob ohne separaten Auftrag.

## Music-Worlds

Produktive Adresse am 2026-11-04 bestätigt: https://music-worlds.maki26.workers.dev/ (HTTP 200). Der Hub verlinkt die frühe Version direkt. Repository https://github.com/manuelk2607/Music-Worlds ist zugänglich, aber beim read-only Checkout noch leer. Die ausgelieferte Auth-/Datenarchitektur ist deshalb nicht prüfbar; keine Quelltexte oder Konten verändern. Nach Vorliegen des Codes eigenen OIDC-Client und eigene Session-DB integrieren. Neue lokale Benutzer-ID nur nach expliziter Registrierung; keine Migration bestehender Music-Daten behaupten.

## Projektübergreifende Navigation / Fortschritte

Ein normaler Link „Worlds Hub“ pro Projekt genügt zunächst. Optional ein gemeinsamer Projekt-Switcher aus derselben öffentlichen Registry; keine Tokens und keine persönlichen Daten im Link. Fortschritts-Aggregation im Hub bleibt ausgeschaltet, bis jede Anwendung eine dokumentierte, autorisierte, minimale Schnittstelle bereitstellt. Keine Scraping-/Browser-Sessions als Ersatz verwenden.

## Rollback

Feature-Flag abschalten, neue OIDC-Sessions widerrufen, alte Anmeldungen weiter anbieten. Additive Links/Proofs zur Prüfung erhalten; nicht Daten/Accounts zurückmigrieren oder Tabellen ungeprüft löschen. Bei Widerruf einer Verknüpfung alle dazugehörigen App-Sessions und Proofs invalidieren. Rollen, Inhalte, Lernstände und HF-Zuordnungen bleiben auf alten IDs und benötigen keine Rückschreibung.

## Konkreter Postgres-Mapping-Store

`packages/auth/postgres-links.ts` implementiert den LinkStore-Vertrag mit parametrisierten Abfragen im jeweiligen Projekt-Postgres. Bestätigen ist ein einzelnes datenänderndes CTE: Proof nur mit passender validierter Sitzung und vor Ablauf löschen, Mapping ohne UPSERT einfügen und Audit schreiben. Jede Unique-/FK-/Audit-Verletzung rollt den gesamten Befehl einschließlich Proof-Verbrauch zurück. Ein Konflikt überschreibt niemals einen Eigentümer.

Die Schema-Vorlage bleibt REVIEW ONLY. Vor Aktivierung im jeweiligen Repository dessen tatsächlichen historischen Kontoschlüssel/Fremdschlüssel, Runtime-Rolle, Rechte und Migrationstest ergänzen. Keine zentrale Mapping-Datenbank für alle Apps, kein PUBLIC-Grant und keine Übernahme einer zentralen Rolle. Query-Adapter ausschließlich serverseitig; Identitäten/Proofs niemals aus einem Browser-Body übernehmen.

Lokale PGlite-Tests (Postgres/WASM, nur Dev-Abhängigkeit) führen dieses echte SQL aus: dualer Proof, konkurrierende Bestätigung, Sitzung/Expiry, beide Eigentümer-Constraints, FK, SQL-Parameter und absichtlich scheiterndes Audit mit vollständigem Rollback. Historische IDs und Rollen bleiben gleich. PGlite hat eine einzelne Verbindung; echte parallele Neon-Verbindungen und produktive RLS müssen weiterhin im isolierten App-Pilot geprüft werden. Keine produktive Datenbank für diese Tests verwendet.

## Direkter Anmeldelink

Der gemeinsame Client bietet neben dem bestehenden geschützten POST-Start
`startLoginLink` für einen gewöhnlichen Link auf die eigene `/auth/start`-Route.
Diese GET-Route akzeptiert ausschließlich eine Top-Level-Dokumentnavigation,
prüft die eigene Origin und erstellt dieselbe kurzlebige PKCE-/State-/Nonce-
Transaktion. Der Browser wird direkt zum zentralen Anmeldedienst und anschließend
zur registrierten Anwendung zurückgeführt. Weder Cookie-Freigabe noch ein
zwischen den Anwendungen weitergereichter Sitzungstoken sind erforderlich.
Die POST-Start-, Callback- und Logout-Prüfungen werden dadurch nicht gelockert.
