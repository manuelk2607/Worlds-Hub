# Worlds Hub — Fortschritt

Stand: 2026-11-05 (Europe/Stockholm)

Das aktualisierte Ziel priorisiert die zentrale Kontoverwaltung und die
sichere Migration vor dem Wechsel zur ausschließlichen Worlds-Anmeldung.
Offen sind insbesondere Kontolöschung und Datenschutzfunktionen am
zentralen Konto, zentrale Nachweise über den Migrationsstand und die reale
Abnahme eines vollständigen Konto- und Logout-Ablaufs in einem Pilotprojekt.
Die getrennten Projektzuordnungen sind weiterhin nötig, um bestehende
lokale IDs und Berechtigungen beim Übergang zu erhalten.

## Ziel und Grenzen
Eigenständiger Hub mit vier direkten Projektlinks und schrittweisem echtem OIDC-SSO. Anwendungen, Repositories, Datenbanken und Berechtigungen bleiben getrennt. Adventskalender ist vollständig ausgeschlossen. Keine E-Mail-basierte Kontozusammenführung, keine Passwortübernahme; Slops persönliche HF-Anbindung, Kontingente, Jobs und Moderation bleiben verpflichtend und unverändert.

## Produktion, Repository und Kosten
- Produktiv unter https://worlds-hub.maki26.workers.dev/. Das Repository https://github.com/manuelk2607/Worlds-Hub ist am 05.11.2026 öffentlich lesbar. Die öffentliche Lesbarkeit wurde ohne Anmeldedaten geprüft.
- Worker worlds-hub, Konto ec3c070d8e4f88d2fc533d7d797f2daa, Namespace maki26.workers.dev. Private alte Sites-Vorschau bleibt Zusatzvorschau.
- Aktueller geprüfter Deploy: Commit `41400d8`, Cloudflare-Version `4d820ea9-4bbb-4678-bfec-c99e427ae747`. 62 Tests, Typprüfung, Lint, Build, Audit und zweisprachiger Live-Smoke bestanden. [GitHub Actions](https://github.com/manuelk2607/Worlds-Hub/actions/runs/42050386345)
- GitHub Actions ausschließlich manuell, gepinnte Actions, contents:read, 10-Minuten-Limit; Deploy standardmäßig aus. Vor erstem Lauf GitHub Free mit 0.01 USD / 12.00 USD inkludiertem Compute und 0 / 0.5 GB Storage geprüft. Kurze Läufe innerhalb vorhandener kostenloser Kontingente; keine bezahlten Pläne, Domains oder Services aktiviert. Neon-Organisation Free. Limits/Kostenfallen: docs/COSTS.md.
- Eigener, ausdrücklich genehmigter Token worlds-hub deploy: ausschließlich Account Workers Scripts:Edit, Ablauf 2027-02-02; kontoweite Restreichweite vor Freigabe erklärt. Nur verschlüsseltes Repository-Secret CLOUDFLARE_API_TOKEN. Kein Token eines anderen Projekts, keine Secrets in Git/Dateien/Logs. Lokaler Wrangler-Login abgelaufen, Actions-Deployment funktioniert.

## Erreichte Meilensteine
- P0: Bestands-Repositories Sprachwelten, IT-Worlds und Slop read-only einschließlich Auth/Neon/IDs/Rollen/HF geprüft. Kein produktives Auth-System verändert.
- P0/P3: Responsive Landingpage, SVG-Illustrationen, Dark Mode, Filter, FAQ, vier öffentliche Detailseiten und direkte Projektlinks. Music-Worlds ist inzwischen als frühe Version unter https://music-worlds.maki26.workers.dev/ bestätigt (200); zugängliches Repository beim letzten Checkout noch leer.
- P1: Wiederverwendbarer Code/PKCE-Client: State/Nonce/Browserbindung, Signatur/Issuer/Audience/EdDSA/Userinfo/Verifikation, einmalige Transaktionen, widerrufbare opaque Host-only-App-Sessions, CSRF/Rotation/Replay, lokaler und signierter Backchannel-Logout.
- P1: Neue zentrale Managed-Better-Auth-Pilotinstanz Worlds Hub Identity: Projekt snowy-frost-91455200, Branch br-lingering-bread-bayuzs7v, Datenbank worlds_identity. Exakte Auth-URL in docs/IDENTITY-PILOT.md. Nach gesonderter ausdrücklicher Nutzerfreigabe OTP-E-Mail-Pflicht, Versand bei Registrierung/Anmeldung, Hub-Origin sowie OAuth-Provider und fünf getrennte öffentliche PKCE-Clients mit Consent/exakten Redirects eingerichtet. Registry: docs/identity-clients.json.
- P1: Offizieller @neon/auth/server 0.8.2 BFF mit Login/Signup/OTP/Recovery/Namensverwaltung/Consent. Endpunkt-/Feld-/Redirect-Allowlist, 12-KiB-Bodylimit, Origin und browsergebundener CSRF, Tokenfilter, atomare IP-gehashte Rate-Buckets. OAuth-Fortsetzung 60/10min je IP, Passwortanmeldung 12/10min, weitere Limits im Code.
- P1: Neue kostenlose EU-D1 worlds-hub-auth (e9da655e-ef44-457b-8b85-d1d6268456e4), nur am Hub. Fünf Tabellen einschließlich der additiven, nach `(issuer, subject)` isolierten `user_preferences` und fünf Indizes angelegt/verifiziert; keine Projektinhalte/Passwörter/HF-Tokens. Stundenweiser Cleanup auf 500 Zeilen pro Auth-Tabelle begrenzt. Cookie-Signaturschlüssel ausschließlich per freigegebenem CI-Schritt direkt in Cloudflare initialisiert, Wert nie ausgegeben oder lokal gespeichert.
- **Echter Hub-Pilot bestanden:** Nutzer bestätigt Registrierung und E-Mail-Code. Aggregierte Neon-Abfrage: ein verifiziertes Konto. Safari-Abnahme: vorhandene zentrale Sitzung -> persönliche OAuth-Freigabe -> echter Code-/Token-/Signatur-/Userinfo-Ablauf -> /konto mit „Hallo, Manuel.“ und eigener gültiger Hub-Sitzung. Keine Benutzer-/Tokenwerte für die Datenbankprüfung abgerufen.
- P2-Vorarbeit: Dual-Proof-Linking-Vertrag, frischer signierter auth_time, historische ID-Mappings und additive Schema-Vorlage. Konkrete Integrations-/Test-/Rollbackanleitungen je Repository in docs/INTEGRATION.md. Noch keine Bestandskonten migriert oder verknüpft.
- P3: Titel, Descriptions, Canonicals, OG/JSON-LD, robots.txt und Sitemap produktiv geprüft. Zehn öffentliche DE/EN-Seiten mit gegenseitigen `hreflang`-Verweisen und `x-default` indexierbar; Konto/Auth/Identity/API noindex/no-store. HTTPS 200, HTTP->HTTPS 308, keine pauschalen Alt-URL-Redirects. Search-Console-HTML-Verifizierung vorbereitet.

## Vorheriges Arbeitspaket — SSO und Kontogestaltung
Der Nutzer-Screenshot zeigte die aktive zentrale Sitzung vor dem bislang manuellen Weiter-Schritt. Der echte Callback wurde anschließend mit persönlicher Freigabe erfolgreich nachgewiesen. Automatische Fortsetzung bestätigter Sitzungen und kompaktere Konto-/Consent-Oberfläche umgesetzt: zweispaltige Desktopansicht, mobile Karte, eindeutige Hauptaktion, keine Login-/Registrierungsbuttons bei aktiver Sitzung. Lokal Desktop/Mobil 390px, Theme und Formularwechsel ohne horizontalen Überlauf geprüft. UI erfolgreich deployt und live mit sichtbaren Formularen sowie fehlerfreier Browserkonsole geprüft; neue Vorschau outputs/worlds-hub-identity-refined.jpg. Automatische Wiederanmeldung mit bestehender Sitzung noch real zu prüfen; Safari wird aktuell für andere Aufgaben genutzt.

## Offen / Abnahmegrenzen
- Kein bestehendes Welt-Projekt produktiv per SSO angebunden. IT-Worlds-Datenwiederherstellung und additive Mapping-/RLS-Transaktionsprüfung im isolierten Development-Zweig bestanden; echter OIDC-Browserpilot, parallele Bestätigung und vollständiger Deployment-Rollback bleiben erforderlich.
- Reauth prompt=login/max_age=0 laut Neon-Dokumentation problematisch; aktueller Upstream enthält frische Sessionbehandlung, Managed-Verhalten noch nicht geprüft. Erzwungene Reauth bleibt aus. Kein unsicherer Ersatz durch E-Mail oder ID-Token-iat.
- Recovery, Projekt-übergreifender Logout, zweite echte Relying Party, Rollen/Mapping und HF-Gates in integrierten Apps noch produktiv zu prüfen. Hub-Logout und zentrale SDK-Abmeldung sind getrennt und werden so erklärt.
- Eigene produktionsgeeignete SMTP-Konfiguration nicht vorhanden. Pilot nutzt den kostenlosen Neon-Maildienst; OTP real bestätigt. Keine bezahlte SMTP-/Domainbestellung.
- Search-Console-Property/Token fehlt; keine Google-Indexierung garantiert. Bestehende Properties/Canonicals unangetastet.

## Nächster konkreter Schritt
Die zentrale Kontoseite bietet Passwortwechsel und einen Export der eigenen
Identitätsdaten auf Deutsch und Englisch. Beide Aktionen prüfen die bestätigte
Provider-Sitzung ohne Sitzungscache. Der Passwortwechsel reicht nur aktuelles
und neues Passwort an Neon Auth weiter und erzwingt den Widerruf anderer
zentraler Sitzungen. Nach Erfolg widerruft der Hub seine Sitzungen derselben
Identität. Der Export enthält das zentrale Profil und die gespeicherte
Hub-Sprache. Fremde Profile, Sitzungstokens und Projektdaten sind ausgeschlossen.
61 Tests und Browserprüfung in Chromium und WebKit bei 320 px bestanden.
Die Browserprüfung verwendete synthetische Provider-Antworten.
Produktiv bestätigt sind die zweisprachige Kontoseite, private Antworten und
die Abweisung anonymer Anfragen mit und ohne gültigen CSRF-Nachweis.
Kontolöschung, zentrale Migrationsnachweise und projektübergreifender
Sitzungswiderruf bleiben offen.

Slop Urself `6a1ebc3` auf `feature/worlds-hub-sso` enthält private, standardmäßig
deaktivierte OIDC-Pilotrouten für Cloudflare und Node sowie die transaktionale
Verknüpfung geschützter Profile. Der lokale Passwortnachweis ist an die aktive
UUID und Passwortversion gebunden. Die Datenbank prüft beim Schreiben nochmals
die zentrale Sitzung und das frische signierte `auth_time`. Profile ohne
Passwort und das Admin-Konto bleiben für die Pilotverknüpfung gesperrt. Der
signierte PKCE-Testanbieter, parallele Bestätigung, Revocation, Replay, lokaler
Node-Start, Cloudflare-Trockenlauf und workerd-HF-Test bestanden. 147 Tests
grün. Der bestehende Audit hat dieselben sechs Befunde wie die Basis.
Die produktive Origin und ihr Datenbankendpunkt sind im Pilot gesperrt.
Slop `838d2d4` bindet die bestätigte lokale ID an HTTP und WebSocket. Die
Spielersitzung verfällt bei Logout oder Änderung der lokalen Passwortversion.
Der workerd-Test öffnet mit Worlds einen echten lokalen WebSocket, verlangt
für die Raumerstellung die persönliche HF-Verbindung und sperrt die bereits
offene Verbindung nach Logout auch nach einem versuchten Wechsel zu einem
Legacy-Spieltoken. PostgreSQL-Tests bestätigen getrennte HF-Anbindung,
Fremdkontoschutz, gezielten signierten Backchannel-Logout und den verweigerten
HF-Codeaustausch nach Sitzungswiderruf. 147 Unit-Tests, Build,
HF-/Worlds-Laufzeittests und Worker-Trockenlauf bestanden. Der zugehörige
Slop-CI-Lauf `42043378970` ist für Chromium und WebKit grün.

Slop `f7bad9d` bereitet den separaten Worker `slopurself-worlds-pilot` vor.
Er akzeptiert nur das explizit konfigurierte isolierte Datenbankziel und
simulierte Videos. Pilotseiten und Assets tragen noindex. Die stündliche
Bereinigung entfernt bis zu 250 abgelaufene Zeilen je Anmeldetabelle.
Der echte lokale PostgreSQL-17-Test prüfte Cleanup, Node-Login über
Proxy-Header, den HF-Zugangsschutz in Socket.IO und den Widerruf nach
Logout. 148 Unit-Tests, Build, beide workerd-Integrationen und Trockenlauf
der Pilotkonfiguration bestanden. Nächster Schritt ist das separate
Testziel mit exaktem Pilot-Client und die Browserabnahme am echten Anbieter.
Die erneute Wrangler-Prüfung meldet weiterhin abgelaufenen lokalen Login.

Sprachwelten `9fa19b6` ergänzt Mapping, Proofs, Audit und private OIDC-Sitzungen
auf `feature/worlds-hub-sso`. Migration 027 lief im kurzlebigen, separaten Neon-QA-Zweig.
Ein echtes synthetisches Managed-Auth-Konto behielt UUID und privates Testheft.
Die gemeinsamen Postgres-Adapter bestanden konkurrierenden Proof-/State-Verbrauch,
Replay-Schutz, Ausstellertrennung und atomisches Audit. Das Prüfszenario verwendete
synthetische OIDC-Nachweise. Lern-/Heft-/Spiel-/Redaktions-/Managed-Auth-Integration
und 193 Unit-Tests bestanden. `a5294a4` behebt den beim Branch-CI entdeckten
`minimatch`-Auditbefund. Die erneute CI ist grün, inklusive 154 Browserfällen
auf Desktop und Mobil (Lauf `42007280919`).

Sprachwelten `2ef8b15` lädt das gemeinsame Auth-Modul über das separat
versionierte Paket `auth-v0.1.0`. Die Quellrevision ist
`5274e2524883fd215f248643c41b9f1c18058871`, mit Integritätsprüfung in der
Lockdatei. OIDC-Routen und Lernzugriff sind als Pilot implementiert.
Gültige Zuordnungen verwenden die lokale UUID für private Vokabelhefte und
Lernfortschritt. Eine vorhandene Managed-Anmeldung hat Vorrang.
Profilverwaltung, eigene Beiträge, KI und Administration erfordern im
Pilot weiterhin die Managed-Anmeldung. 195 Tests, sauberer npm-Install,
Typprüfung, Lint, Übersetzungsabdeckung, Build und Audit bestanden.
Die lokale Laufzeit lieferte 404/noindex/no-store für deaktivierte
Auth-Routen und 200 für die englische Lernseite. Lokale Tests prüften die
bestehende Heft-ID, fremden Aussteller, Sperre und Logout. Die aktive
Verknüpfung mit realen Nutzerkonten wartet auf den nachgewiesenen
Eigentumsnachweis beider Konten und die echte Pilotabnahme.
Die CI des Featurebranches ist erfolgreich. [GitHub Actions](https://github.com/manuelk2607/Sprachwelten/actions/runs/42046491620)

QA-Zugriff: Eine CLI-Auswertung gab das vom leeren QA-Template geerbte Passwort
des Testbranches aus. Das Testbranch-Passwort ist rotiert. Die Rotation am
QA-Template steht bis zur Nutzerfreigabe aus. Das QA-Projekt ist separat von
Sprachwelten-Produktion, IT-Worlds und Worlds Hub.

Music-Worlds `3904619` übernimmt bestehende Gastprofile nach Vorschau und ausdrücklicher Bestätigung. Der einmalige Nachweis bindet die aktive Gastsitzung an eine frische zentrale Anmeldung. Die Zuordnung erhält die bestehende UUID samt Punkten und Sprache. Migration 006 lief ausschließlich auf `qa-initial`. Isolierte Neon-Abnahme mit signiertem OIDC-Fixture prüfte CSRF, Ablauf, Gastwechsel, parallele Bestätigung, Rückfall bei deaktiviertem SSO und lokalen Logout. 22 Tests, Typprüfung, Lint, Build und DE/EN-Browserdialog mit Testantworten bestanden. Die Freigabe setzt den echten Managed-Reauth-Test voraus. Die Cloudflare-CLI meldet weiter eine abgelaufene Anmeldung.

Music-Worlds `00018df` auf `feature/worlds-hub-sso` integriert das gemeinsame OIDC-Paket, eigene widerrufbare Postgres-Sitzungen und explizite Erstellung eines Musikprofils mit lokaler UUID. Issuer und Subject bilden die Zuordnung. Bestehende Gastprofile behalten ihre IDs. Migration 005 nur auf `qa-initial`. Signierter Testanbieter mit echtem Postgres bestätigt PKCE, CSRF, einmalige parallele Profilerstellung, getrennte Gastidentität und Logout. 73 bestehende Integrationsprüfungen, 22 Tests, Typprüfung, Lint, Build und DE/EN-Browseransicht mit Testzustand bestanden. Gastprofilübernahme und reale Providerabnahme bleiben offen. Flag standardmäßig aus. Cloudflare-Anmeldung für die IT-Pilotbereitstellung weiterhin abgelaufen.

IT `74ef8a1` enthält die geschützte zweistufige Verknüpfungsroute und die DE/EN-Kontokarte. Beide Sitzungen werden bei Prüfung und Bestätigung gelesen. Die Route ist an Origin, CSRF und das vorgemerkte Kontopaar gebunden und verlangt zwei Freigabeschalter nach realer Managed-Reauth-Abnahme. Der Callback-Pilot hält sie geschlossen. Migration 006 nur isoliert angewendet. Neon-Integration mit simulierten Providerantworten, Kontoaustausch, CSRF, einmaliger Bestätigung, Rate-Limit und Proof-Cleanup erfolgreich. 127 IT-Tests bestanden, 10 übersprungen. Typprüfung und Build erfolgreich. Deutscher Browserdurchlauf mit Testkonten erfolgreich, Englisch im Build geprüft. Mobilprüfung wegen Browserwerkzeug-Timeout offen. Cloudflare-CLI meldet weiterhin abgelaufene Anmeldung.

Kontoverknüpfung `049279b` / IT `582e14e`: Proof-Frist endet fünf Minuten nach dem älteren der beiden Nachweise. IT-Adapter setzt den RLS-Kontext bei jeder Operation anhand aktiver passender zentraler Sitzung, übereinstimmendem `auth_time` und verfügbarem lokalem Konto. Isolierter Neon-Test bestätigt Ablauf, Fremdsitzung, Widerruf, Sperre, einmalige parallele Bestätigung und Konflikt-Rollback. Nach dem Test null synthetische Links, Proofs, Audits und Sitzungen. Hub 59 Tests sowie Typprüfung/Lint/Build bestanden. IT 127 Tests bestanden, 10 übersprungen, Typprüfung und Build erfolgreich. Die Verknüpfungsroute benötigt den noch offenen echten Reauth-Nachweis beider Konten.

IT-Pilot-Routentest `653c114` bestätigt OIDC mit signiertem Testanbieter und echtem isoliertem Neon: S256, exakter Client/Resource/Callback, einmaliger Code-Tausch bei zwei parallelen Callbacks, hostgebundene Sitzung, gesperrter Fortschrittszugriff ohne Zuordnung und CSRF-geschützter Logout mit serverseitigem Widerruf. Testdaten anschließend vollständig entfernt. 127 Tests bestanden, 10 umgebungsbedingt übersprungen, 290 Dateien typgeprüft und 534 Seiten gebaut. Die erneute Prüfung der Cloudflare-CLI meldet weiterhin eine abgelaufene Anmeldung. Der echte Managed-Neon-Browserablauf setzt die Pilotbereitstellung voraus.

IT-Worlds-Adapter als `2532090` im Pilotbranch gepusht: OIDC-Routen, eigener Postgres-Sessionstore aus gemeinsamer Quelle `80db3d7`, gemeinsame Identitätsauflösung für Fortschritt/Schreibtrainer und DE/EN-Kontokarte. Featureflag standardmäßig aus. Migration 004 ausschließlich im isolierten Ziel angewendet (SHA-256 `4691075d8f6aee0e8ec9188f640d9966628b7a9ea748c388095695e52fce77d9`). Reale isolierte Sessionprüfung einschließlich parallelem einmaligem Transaktions-/Replay-Verbrauch, Mapping, lokaler Sperre, Sperrablauf und issuergebundenem Widerruf bestanden. IT: 135 Tests, 125 bestanden/10 umgebungsbedingt übersprungen; Typprüfung 285 Dateien ohne Fehler/Warnungen und Build 534 Seiten erfolgreich. Hub-Check mit 58 Tests erfolgreich. Visuelle lokale DE/EN-/390px-/Theme-/Navigations-/404-Abnahme mit simulierten Zuständen bestanden; Screenshot `outputs/it-worlds-sso-mobile.png`. Dies ist kein echter Provider-/Browser-SSO-Nachweis. Nicht produktiv aktiviert.

IT-Pilot-Härtung als `74cdd24` gepusht: Migration 005 nur im isolierten Neon-Zweig angewendet und als eingeschränkte Rolle real geprüft (parallele atomare IP-/Gesamtbudgets, 429/Retry-After, kein Roh-IP-Speicher, höchstens 2.000 abgelaufene Zeilen pro Tabelle, gültige Daten erhalten). SHA-256 `b31b2f2332531788389528e0fbd04ae3fe109d6f4dd746e185ef3fc58a363686`; Auth-/Rate-Fixtures entfernt; Produktion ohne Rate-Tabelle und mit 14 Fortschrittszeilen. Separater, standardmäßig deaktivierter Worker `it-worlds-sso-pilot` mit DB-/Origin-Sperre, deaktiviertem Legacy-Proxy, noindex und stündlichem Cleanup vorbereitet. IT: 137 Tests (127 bestanden, 10 umgebungsbedingt übersprungen), Typprüfung 289 Dateien, 534 Seiten gebaut, Worker-Trockenlauf mit 1.263 Assets erfolgreich. Kein Deploy und keine produktive Konfigurationsänderung.

Als Nächstes Cloudflare-Anmeldung erneuern: lokal auch beim erneuten Check abgelaufen, im IT-Repository kein Deployment-Secret, Worlds-Hub-Token ausschließlich für Hub. Dann isoliertes Neon-Ziel mit Ablauf prüfen, Pilot-Worker konfigurieren, exakten IT-Pilot-Callback beim IdP und in der Hub-Consent-Registry erlauben und echten OIDC-Callback im Browser abnehmen. Frische Reauth, dualen Eigentumsnachweis, zwei Konten und Rollback vor produktiver Aktivierung nachweisen; bestehender Better-Auth-Auditbefund und Safari-Wiederanmeldung weiter offen.

Mapping-Store: Proof-Verbrauch, eindeutiges historisches Mapping und Audit in einer Postgres-Anweisung; Konflikte überschreiben nichts, Audit-/FK-Fehler rollen alles zurück. Tests behalten IDs/Rollen und prüfen Parameterisierung. PGlite ist ausschließlich Dev-Abhängigkeit; echte Neon-Parallelität und RLS bleiben Pilotpflicht. Music-Worlds hat inzwischen einen Repository-HEAD (52b78fd); aktualisierte Quelltextprüfung läuft.

## IT-Worlds-Pilot: Wiederherstellung und Mapping geprüft (04.11.2026)
- IT-Worlds-Commit `d36f49b` auf `feature/worlds-hub-sso-pilot` gepusht. Neue Migration `003_worlds_identity_links.sql` und echte Neon-Prüfung `tests/live-sso-schema.ts`; ausführlicher Nachweis im IT-Repository unter `docs/WORLDS-SSO-PILOT.md`.
- Sicherung `br-calm-hill-bagafc1b` bei LSN `0/279A488` als Development-Zweig `br-little-base-baqt6cy6` / `development-worlds-hub-sso-20261104` wiederhergestellt. Endpoint `ep-falling-fog-bad7v2ou`, 0.25 CU, Free-Konto erneut bestätigt. Ablauf `2026-11-05T23:00:00Z`, Suspend-Standard erhalten. Keine Zugangsdaten gespeichert/ausgegeben.
- 14 bestehende Fortschritte vorher/nachher mit Produktion identisch (aggregierte Prüfsumme `493a65672dba70fa8a09f4e431604285`); Schreibtrainertabellen leer. Bestehendes ENABLE/FORCE RLS erhalten. Migration nur im isolierten Ziel angewendet, SHA-256 `a99dca606c5b977c81e0ffca822b7897ada0d533f51eea1f21f0065bf7671173`. Produktion weiterhin ohne Mapping-Tabelle.
- Echte eingeschränkte Runtime-Verbindung ohne Superuser/BYPASSRLS: atomare Zuordnung/Audit/Proof-Verbrauch, historische UUID/Rolle, getrennte Aussteller/Konten/Sitzungen, anonymer Zugriff, gesperrtes Überschreiben und Proof-Rollback bei Konflikt bestanden. Mapping-Testtransaktion zurückgerollt; ausschließlich synthetische Testkonten/-fortschritte danach entfernt, bestehende Daten unverändert.
- IT-Prüfung: 123 Tests bestanden, 10 umgebungsbedingt übersprungen, Astro-Check 275 Dateien ohne Fehler/Warnungen, Build 534 Seiten. Keine sichtbare UI geändert. Bestehender Lockfile-Audit: eine kritische und elf niedrige transitive Meldungen. Kritischer Better-Auth-Befund betrifft laut Primärquelle Magic-Link-/Social-OAuth-Konfiguration; IT betreibt einen Managed-Proxy, keinen eigenen Server mit diesen Plugins. Tatsächliche Managed-Konfiguration und kompatibles Update vor Aktivierung prüfen. Noch keine Aussage über erfolgreiche Browser-SSO-/Parallelitäts-/Deployment-Rollbackabnahme.

## Abgeschlossenes Arbeitspaket: vollständiges DE/EN (Nutzerauftrag 04.11.2026)
- Zentrales i18n-System mit getrennten, deckungsgleichen DE-/EN-Katalogen (je 267 Schlüssel). SSR, Browser, Navigation, öffentliche Seiten, Konto, vollständige Identity-/Consent-/Recovery-Oberfläche, Validierung, sichere Provider-Fehler und Statusmeldungen verwenden dieselben Übersetzungsschlüssel.
- Gut erreichbarer DE/EN-Schalter auf Desktop und Mobil. Wechsel erfolgt ohne Neuladen; Filter, Formularmodus und Eingaben bleiben erhalten. `lang`, lokalisierte Titel/Metadaten, Canonicals, OG/JSON-LD, Sitemap und reziproke `hreflang`-Alternativen werden konsistent gesetzt.
- Erste Sprache aus `Accept-Language`, Deutsch als Fallback. Wahl wird lokal und in einem hostgebundenen sicheren Locale-Cookie gespeichert; bei gültiger Hub-Sitzung zusätzlich über `/api/preferences/locale` in D1 nach verifiziertem `(issuer, subject)`. Keine anwendungsübergreifenden Cookies oder unsichere Identitätsübernahme.
- Datums-/Zeit-/Zahlenformatierung basiert auf `Intl` (`de-DE`/`en-GB`). Benutzername, E-Mail und sonstige nutzergenerierte Inhalte werden nur sicher eingesetzt und nie automatisch übersetzt.
- Gemeinsamer Weitergabevertrag für Music-Worlds und weitere Anwendungen in `docs/I18N.md`: Sprachcodes `de`/`en`, lokaler Schlüssel `worlds.locale`, OIDC `ui_locales` und serverseitige Profilpräferenz; Sprache bleibt von Berechtigungen und Inhaltssprache getrennt.
- Verifikation: 58 Tests, Typprüfung, Lint, Build, Artefaktprüfung, Produktions-Audit (0 Schwachstellen), Deploy-Dry-Run und Live-Smoke für alle zehn öffentlichen DE/EN-Seiten, Konto/Identity/SEO/Assets/404/PKCE/CSRF bestanden. Lokale und produktive Browserabnahme bestätigte zustandserhaltenden Wechsel; 320-px-Mobilansicht ohne horizontalen Überlauf. D1-Migration und Schema produktiv verifiziert. Ein echter angemeldeter Profil-POST wurde aus Datenschutzgründen nicht manuell mit dem persönlichen Safari-Konto ausgelöst; API, Identitätsbindung und D1-Persistenz sind automatisiert geprüft.
- Produktiv seit Commit a641f19, Actions-Lauf 41903562084, Cloudflare-Version 642c875a-6810-4a6f-95fc-414a5b0dafe9.

Nachprüfung am 05.11.2026: Nur der Sprachschalter speichert die manuelle Auswahl. Eine verspätete Profilantwort kann sie nicht überschreiben, und schnelle Wechsel werden in der gewählten Reihenfolge gespeichert. Der Schalter hat größere Touch-Ziele. Bereits angezeigte Formularvalidierung wechselt mit der Sprache. Chromium und WebKit haben bei 320 px Navigation, Filterzustand, verzögerte Profilantwort, Schreibreihenfolge, Formulareingaben, OAuth-Query, Validierung und simulierte Anmeldefehler in DE/EN geprüft. Alle 59 Tests, Typprüfung, Lint, Build und Artefaktprüfung bestanden. Keine offenen Hub-Übersetzungsschlüssel.

Nachprüfung produktiv seit `9c7ae3c`, Actions-Lauf `42006170336`, Cloudflare-Version `7f0d48ed-084f-46bc-8f3e-962eabf5abd6`. Live-Smoke und Produktions-Audit bestanden. Die live ausgelieferten JS- und CSS-Dateien stimmen mit dem lokal geprüften Build überein.

Nachprüfung zum DE/EN-Auftrag am 05.11.2026. Beim Wechsel auf einer geöffneten Projektseite werden jetzt auch Seitentitel, Open-Graph-Titel und Verfügbarkeitszeile aktualisiert. An- und Abmeldung behalten die gewählte Sprache. Das Profil übernimmt die lokal gewählte Sprache bei der ersten Anmeldung und lädt bei späteren Besuchen seine gespeicherte Einstellung. Eine manuelle Wahl während des Ladens hat Vorrang. Fehlercodes für Zugangsdaten, E-Mail-Verifizierung und Sitzungsablauf werden auf bestehende Katalogtexte abgebildet.

62 Tests, Typprüfung, Lint, Build, Artefaktprüfung und Produktions-Audit mit 0 Befunden bestanden. Chromium und WebKit bei 320 px prüften Navigation, alle vier Detailseiten, Metadaten, Formularzustand, Anmeldefehler, Registrierung mit Wechsel zur Code-Eingabe, OAuth-Freigabe, Profilübernahme, Datumsformat und Abmeldung. Die lokale Browserprüfung nutzte ein Testkonto und simulierte Antworten des Identitätsanbieters. Live prüfte WebKit bei 320 px die Browsererkennung, beide Projekttitel und die Formularvalidierung der Identitätsseite. Die ausgelieferten JS- und CSS-Dateien stimmen mit dem lokalen Build überein. Keine offenen Übersetzungsschlüssel im Hub. Der Hub hat keine eigenen Spiel- oder Beitragsoberflächen. Der gemeinsame Sprachvertrag ist in `docs/I18N.md` dokumentiert. Music-Worlds hat live geprüfte deutsche und englische Startseiten. Die automatische Übernahme des zentralen Profils durch Music-Worlds ist vorbereitet.

Danach wird der ursprüngliche SSO-Gesamtauftrag fortgesetzt.

SSO-Checkpoint für spätere Fortsetzung: IT-Worlds-Featurebranch feature/worlds-hub-sso-pilot basiert jetzt auf dem tatsächlichen aktuellen Produktionsbranch codex/cloudstand-lokal (2d6d204), nicht auf veraltetem main. Produktions-Auth anonym 200, private APIs 401; RLS auf learning_progress/typing_profiles/typing_runs aktiv und erzwungen. Datenbank IT-Worlds hat aktuell keine öffentlichen Foreign Keys; Fortschrittstabellen können unverändert bleiben. Frühere, bereits autorisierte Auth-Neuprovisionierung hatte alte IDs verwaist gelassen; diese werden weder neu zugeordnet noch gelöscht. Neue Sicherung br-calm-hill-bagafc1b, worlds-hub-sso-backup-20261104, Parent-LSN 0/279A488, ohne Compute, im bestehenden IT-Projekt über Neon-MCP erstellt; keine Produktionseinstellung geändert. Noch kein Testbranch, keine Migration auf IT, keine Credentials geschrieben. Music-Worlds-Source 52b78fd jetzt zugänglich: eigene Gast-UUIDs, Neon-Projekt green-sound-19865298, reserviertes hub_subject, HUB_AUTH_ENABLED=false; tatsächlicher zentraler Issuer ist der separate Neon-Auth-URL, nicht die Hub-Landingpage-Origin. Gemeinsamer Postgres-Link-Store 5021cb9 gepusht; CI 41847735997 erfolgreich (52 Tests).
