# Worlds Hub — Fortschritt

Stand: 2026-11-12 (Europe/Stockholm)

Das aktualisierte Ziel priorisiert die zentrale Kontoverwaltung und die
sichere Migration vor dem Wechsel zur ausschließlichen Worlds-Anmeldung.
Offen sind insbesondere Kontolöschung und Datenschutzfunktionen am
zentralen Konto, zentrale Nachweise über den Migrationsstand und die reale
Abnahme eines vollständigen Konto- und Logout-Ablaufs in einem Pilotprojekt.
Die getrennten Projektzuordnungen sind weiterhin nötig, um bestehende
lokale IDs und Berechtigungen beim Übergang zu erhalten.

## Hub-Schema veröffentlicht und geprüft

Worlds Hub `29f3caa` läuft als Worker-Version
`ddde7014-06bd-4ba7-ab4b-632218f4011b`. GitHub **43132137632** bestand
einschließlich Live-Prüfung für Anmeldung, DE/EN, SEO und Schutz privater Seiten.
Nach ausdrücklicher Freigabe wurden die Migrationen 0005/0006 über die
D1-Konsole auf `worlds-hub-auth` angewendet. Vorher wurde ein
Cloudflare-Time-Travel-Wiederherstellungspunkt erfasst. Die Schemaabfrage
bestätigte zwei Tabellen, drei Indizes und den Trigger. Beide neuen Tabellen
waren leer. Der Hub-Live-Test bestand danach erneut. Die öffentliche
Abmelderoute ist bis zur gemeinsamen Abnahme deaktiviert (HTTP 404).

Sprachwelten `a6978c2` läuft im Test als Worker-Version
`b5d5df5b-8b10-4885-9453-8745907781c6`. Integration und Veröffentlichung
**43131710625** bestätigten die präzise Widerrufssekunde gegen die befristete
Neon-Datenbank. Die vollständige CI **43131645816** bestand.
Der frühere Test gegen den öffentlichen Worker bestätigte den signierten
Versand aus dem lokal ausgeführten Hub mit simuliertem Anmeldedienst und
den Verlust des Zugriffs auf private Vokabelhefte.
Beim Wiederanlauf am 12.11. lieferte Neon HTTP 402. Das QA-Projekt
`polished-wind-59150518` hatte 14.616 der erlaubten 14.400 monatlichen
Aktivsekunden verbraucht. Dadurch antwortete die öffentliche Testanmeldung
mit HTTP 503. Die gemeinsame Browserabnahme steht aus.

## Projektübergreifende Zustellung vorbereitet

Das Auth-Paket 0.1.5 signiert und prüft Sitzungswiderrufe mit getrenntem
Hub-Schlüssel, genauer Empfängeradresse und festem Identitätsaussteller.
Ein Postgres-Empfänger bestätigt erst nach Commit. Die Datenbank bewahrt
spätere Anmeldungen und verhindert, dass ein verspäteter Callback eine
widerrufene Sitzung wiederherstellt. Der Hub speichert die Zustellung
atomar mit dem lokalen Widerruf und wiederholt sie bei Ausfällen mit
dem ursprünglichen Zeitpunkt. Sprachwelten prüft den Widerruf auch
für bisherige Übergangssitzungen. Lokal bestanden 79 Hub-Tests und
228 Sprachwelten-Tests, Typprüfung, Lint und Build. Hub-CI **43127213320**
bestätigte `b8ac298`. Sprachwelten-Integration **43127214009** bestätigte
`178e1ee` mit Migration 030 und einem signierten Testereignis gegen
echtes QA-Postgres. Alte Sitzungen beider Geräte endeten im Projekt,
Anbieterdatensätze und spätere Anmeldung wurden geprüft.

Die übrigen drei Empfänger sind auf ihren SSO-Branches vorbereitet.
Music-Worlds widerruft verknüpfte Gast-Tokens und zentrale Sitzungen.
GitHub **43129764079** für `366f65b` bestand 87 Prüfungen gegen getrenntes
QA-Postgres. IT-Worlds prüft bisherige Native-Sitzungen beim Zugriff auf
Projektfunktionen anhand ihres ursprünglichen Erstellungszeitpunkts.
Die eingeschränkte Datenbankrolle kann die Kontentabelle des Anbieters
weiterhin nicht lesen. Chromium DE (320 px) und WebKit EN (1280 px) zeigen
nach einem signierten Widerruf im simulierten Kontenablauf den Worlds-
Anmeldelink. Der Grenzfall einer Native-Sitzung aus derselben Sekunde ist
in `7111029` abgedeckt. GitHub **43130443435** bestand alle sieben Jobs.
Slop Urself sperrt beide bisherigen Zugangsnachweise
des verknüpften Profils und erhält dessen eigenständige HF-Verbindung.
GitHub **43129737924** für `ce0d313` bestand mit PostgreSQL 17, Chromium
und WebKit. Lokale Tests, Typprüfung und Builds der drei Empfänger sind
bestanden.

Nächster Schritt ist die gemeinsame Abnahme mit einem erreichbaren
isolierten Empfänger. Dafür erhält der Hub einen privaten Schlüssel als
Secret und adressiert zunächst nur den ausgewählten Testclient. Für einen
Rollback nach Aktivierung muss die Rückfallversion den bereits gespeicherten
Widerruf weiterhin beachten.

## Worlds Hub: Abmeldung auf allen Geräten

Ein normaler Nutzer konnte über die offizielle eigene Neon-Auth-Abmeldung
beide Sitzungen seines Testkontos beenden. Die Sitzung des Kontrollkontos
blieb während der Prüfung gültig. Danach bestätigte der lesende Abgleich
null aktive Testsitzungen. Verwendet wurde nur der bereits befristete
Sprachwelten-QA-Zweig `br-twilight-river-ba9t32rl`.

Der Hub prüft die zentrale Sitzung ungecacht und sendet keine frei
wählbare Konto-ID an den Anbieter. Migration 0005 sperrt verspätete
Hub-Callbacks, deren Anmeldezeit vor der Abmeldung liegt, und der
Widerruf löscht die bisherigen Hub-Sitzungen desselben Kontos atomar.
Die Oberfläche unterscheidet bestätigte und teilweise Abmeldungen.

76 Tests, Typprüfung, Lint, Build, Audit und die lokale Wrangler-Migration
bestanden. GitHub **43122373505** bestätigte den Build und die Tests für
`848ee3e`. Chromium DE und WebKit EN bestanden die Abbruch- und
Bestätigungsprüfung bei 320 px mit synthetischer Anbieterantwort. Die neue
Aktion bleibt bis zur gehosteten Abnahme deaktiviert.

## Sprachwelten: öffentliche Testadresse vorbereitet

Sprachwelten `92f3a0e` paketiert einen eigenen Worker mit Testbindungen,
Indexierungsschutz und Sperre bei ungültiger Konfiguration. Build, lokale
Workerprüfung und der Paketprüfschritt in GitHub **43119641505** bestanden.
`0a5fca4` ergänzt den ausdrücklich manuell gestarteten Release mit einer
auf 24 Stunden begrenzten Datenbank aus dem getrennten QA-Projekt. Die
vollständige CI **43120379271** für diesen Commit ist bestanden.

Der zentrale PKCE-Client „Sprachwelten Test“ verlangt Einwilligung und
erlaubt genau den Callback des neuen Testworkers. Die geprüfte Hub-
Konfiguration `cf5566c` ist als Worker-Version
`3811df2a-9e47-43a9-8eaa-ae923c1e5b0e` live. GitHub **43120400722**
bestand mit 74 Tests, Build, Audit und Live-Prüfung. Eine echte anonyme
Anfrage an den zentralen Anbieter erreichte die Hub-Loginseite mit
dem neuen Client und der exakten Rücksprungadresse.

Die Sprachwelten-Testadresse ist per GitHub **43123199731** veröffentlicht.
Nach dem ausdrücklich genehmigten Anheben der QA-Aktivzeitgrenze auf vier
Stunden ist die getrennte Datenbank wieder erreichbar. Cloudflare hat den
Worker bei geschlossener Testadresse von `e5ab43fa` auf `f9aa6fbb` und
zurück geschaltet. Die Live-Prüfung nach der Wiederherstellung bestand.
Die persönliche Einwilligung lief ab, bevor der Rückweg geprüft werden
konnte. Produktive Kontoübernahmen stehen aus.

## Sprachwelten: bisherige Sitzungen nach der Verknüpfung begrenzen

Code `c5dc2d4` auf `feature/worlds-hub-sso` hält alle bei der ersten
Verknüpfung aktiven Geräte mit ursprünglicher Ablaufzeit fest. Der Server prüft
die bisherige Sitzung ungecacht beim Anbieter und lässt nach der Zuordnung
nur die erfassten Sitzungen bis zu ihrer Frist zu. Neue lokale Anmeldungen
und erst nach der Bestandsaufnahme angelegte lokale Konten erhalten keinen
Projektzugriff. Der Anmeldeweg zur einmaligen Übernahme prüft auch das
Zielkonto und beendet eine bei Ablehnung frisch ausgestellte Sitzung.

Das Trennen der Zuordnung entfernt die Übergangssitzungen. Ein verifizierter
zentraler Widerruf beendet auch den bisherigen Anmeldezugriff und erhält die
Projektzuordnung. Abgelaufene Nachweise werden in begrenzten Stapeln bereinigt.
Die bestehende Kontoverwaltung führt zum Hub. Schema 029 und der
Migrationsrunner verarbeiten die Änderungen transaktional.

Lokal bestanden 227 Tests, Typprüfung, Lint, Übersetzungen, Audit, Build und
36 Browserfälle. Isolierte Integration **43116714438** bestand mit echtem
Anmeldedienst, zwei bisherigen Geräten, späterem blockiertem Login,
Sitzungsbereinigung, fester Ablaufzeit, historischer Konto-ID und echtem HTTP.
Die vollständige CI **43116706384** bestand für denselben Commit mit 227
Unit-Tests, 154 bisherigen und 36 Worlds-Browserfällen sowie Typen, Lint,
Übersetzungen, Audit und Build. Der produktive Abgleich vom 12.11.2026
ergab drei Konten mit lokalen Zugangsdaten und keine Google-Zuordnung.
Google ist als Anbieter eingerichtet und gehört zum Ablauf für den
Registrierungsstichtag. Nächster Schritt ist die isolierte öffentliche
Sprachwelten-Testadresse für den echten OIDC-Rückweg und die Deployment-Rücknahme.

## Sprachwelten: einmaliger Nachweis bei abgelaufener Bestandsanmeldung

Code `9b54f19` ergänzt im isolierten Testmodus die private Kontoübernahme mit
dem vorhandenen Auth-Dialog/SDK. Regulärer Login bleibt der Worlds-Link; eine
aktive alte Sitzung kann weiterhin ohne neue Passworteingabe übernommen werden.
Bei abgelaufener Sitzung können Nutzer ihr bisheriges Konto ausdrücklich
bestätigen oder dessen Passwort wiederherstellen. Keine neue Registrierung,
kein Namens-/E-Mail-Merge, keine Zuordnung allein durch Öffnen des Dialogs.
Die vorhandene Bestätigung prüft anschließend beide Identitäten erneut.
Auch alte Adminsitzungen bekommen den Weg zur geforderten frischen Bestätigung.

`3f5a40d` erhält DE/EN bereits in der ersten HTML-Antwort und im Seitentitel.
Sprachwechsel bewahrt Eingaben und übersetzt sichtbare Meldungen; mobile
44-px-Sprachziele, noindex und bestehende Gestaltung. Reset-Tokens werden aus
der Adresse entfernt und nicht für eine Anmeldeweiterleitung gespeichert.
Lokal: 217 Tests, Typen, Lint, DE/EN-Abdeckung, vollständiger Audit, Build und
36 Worlds-Browserfälle bestanden; die betroffenen SSR-/Resetfälle zusätzlich
gezielt in Chromium/WebKit bei 320/1280 px geprüft und visuell gesichtet.

Echte isolierte QA **42683460761** für `9b54f19` erfolgreich: Berechtigung zum
Übernehmen vor/nach der Zuordnung, offizielle native Eigentumsprüfung,
historische IDs und Heft-/Beitragseigentum, keine Rollenvergabe und beide
lokalen Abmeldungen. Zentrale Projektsitzung dort weiterhin synthetisch.
Vollständige CI **42684100840** für `3f5a40d` erfolgreich: 217 Tests, Typen,
Lint, Übersetzungen, Audit, Build sowie 154 bisherige + 36 Worlds-Browserfälle.
Auch die ursprüngliche Übernahme-CI **42683427322** bestand vollständig.
Der geprüfte Übergangsschutz und die noch offene zentrale Browserabnahme
stehen im Abschnitt oben.

## Native Verwaltungs-API: reale Abmeldung und Löschung bestätigt

Die zusätzlich ausdrücklich freigegebene Prüfung in `br-jolly-leaf-ba8vt1pe`
mit drei neuen synthetischen Konten ist erfolgreich. Das offizielle SDK konnte
über einen frisch bestätigten QA-Administrator genau zwei Sitzungen seines
Zielkontos lesen und beenden sowie das neu angemeldete Zielkonto entfernen:
`admin.listUserSessions`, `admin.revokeUserSessions`, `admin.removeUser` jeweils
200. Zielcookies ungültig, Kontrollkonto unverändert aktiv. Kandidatenrolle
zurück auf `user`, alle eigenen Sitzungen beendet, genau die drei neuen Konten
entfernt. Nachkontrolle: 0 Konten/0 Sitzungen für diese IDs; ursprüngliche 13
QA-Konten, Rollen, Zeilenfingerabdrücke und Sitzungszahlen exakt unverändert.
Keine E-Mails, Produktionsänderung oder persistente Verwaltungszugangsdaten.

Das Harness ist hart auf den QA-Aussteller und seine drei eigenen IDs begrenzt;
74 lokale Tests, Typen, Lint, Build und Artefaktprüfung bestanden. Details:
`docs/NATIVE-ADMIN-QA.md`. Der frühere 401 bei OAuth-Clientregistrierung war
keine allgemeine Ablehnung dieser anderen Verwaltungswege. Noch offen sind der
sichere anwendungseigene Self-Service-Gateway, ein separat freizugebender
Runtime-Zugang und die tatsächliche Invalidierung aller Projekt-BFF-Sitzungen.
Es wurde kein Verwaltungszugang für Produktion eingerichtet.

Code `20ea245` ist gepusht. GitHub Actions `42658302512` bestand für genau
diesen Commit: 74 Tests, Typen, Lint, Build, Artefaktprüfung und Produktions-
Dependency-Audit. Dieser Test-/Dokumentationsstand erfordert kein Deployment.

Eine neue reale Slop-Pilot-Anmeldung am 09.11. lief im Browser vom Link
„Mit Worlds anmelden“ direkt zum bereits verknüpften Profil Manuel, ohne neue
Passwort-, Code- oder Consent-Eingabe. Die gespeicherte, validierte OIDC-Sitzung
enthält `authenticatedAt`, aber kein `sid`. Eine read-only Nachkontrolle beider
Zweige bestätigte denselben pseudonymisierten Nutzer; es wurden keine Tokens
oder Cookies ausgelesen. Das ist ein konkreter Befund dieses Anmeldevorgangs,
keine allgemeine Behauptung über sämtliche Anbieterantworten. Native Sitzung
und Projekt-BFF können deshalb nicht über eine vermeintlich vorhandene `sid`
verbunden werden. Kein Slop-Produktionskonto und keine HF-Anbindung geändert.

Weiter offen: sicheren eigenen Kontoverwaltungsweg und verlässlichen Widerruf
der Projekt-BFFs vorbereiten; die native Admin-Funktion allein genügt nicht.
Der zusätzliche Sprachwelten-Übernahmedialog ist oben dokumentiert; der
reguläre Login bleibt der Worlds-Link.

## Sprachwelten: bestätigte Kontoübernahme und lokaler Logout

Code `38afa15` auf `feature/worlds-hub-sso` ergänzt den geschützten HTTP-Ablauf
zum Übernehmen eines bereits angemeldeten verwalteten Kontos. Beide Sitzungen
werden bei Vorbereiten und Bestätigen geprüft; im Browser stehen nur CSRF und
ein einmaliger Proof. Zuordnungen/Audit entstehen atomar, historische IDs,
Beiträge und Lernstände bleiben erhalten. Eine passende vorhandene Verbindung
kann direkt fortgesetzt werden. Fehlende verschachtelte Framework-Routen sind
ergänzt und über den laufenden Webserver geprüft.

Die Kontodokumente verwenden zentrale DE/EN-Texte, mobilen Sprachschalter,
gespeichertes Design und die bestehende Gestaltung. Namen werden escaped und
nicht übersetzt. Nonce-CSP schützt Skripte/Styles; `strict-origin` erhält die
Formular-Herkunft ohne Weitergabe sensibler Callback-Parameter. Projektlogout
beendet native und Worlds-Anmeldung im Projekt; die unabhängige Hub-Sitzung
bleibt erhalten. Bei Ausfällen wird kein irreführender Erfolg ausgegeben.
Anonyme Aufrufe ohne Anmeldedaten benötigen keinen alten Anbieterabruf.

Lokal bestanden: 215 Unit-Tests, Typen, Lint, Übersetzungsabdeckung, vollständiger
Audit, Build und 24 Chromium-/WebKit-Fälle bei 320/1280 px. DE/EN-Wechsel während
der Bestätigung, Design, Rückkehr, gleiche Daten ohne altes Cookie, beide
lokalen Abmeldungen und tatsächliche Routeranbindung geprüft; Screenshots
kontrolliert. Vollständige CI `42649568470` erfolgreich: 215 Unit-Tests,
Typen, Lint, DE/EN-Abdeckung, vollständiger Audit, Build und 154 bisherige + 24
Worlds-Browserfälle. Getrennte echte QA-Integration `42650094132` ebenfalls
erfolgreich: tatsächliche HTTP-Controller mit offiziellem Native-Eigentümernachweis,
eine parallele Bestätigung, unveränderte native Sitzungsmetadaten, historische
Datenzuordnung und Beenden von Native-Sitzung und lokalem Worlds-BFF.
Vollständiger nativer HTTP-Test bestand. Zentrale Sitzungen im Datenbank-/
Browsermodell sind weiterhin synthetisch. Einmalige frische Bestätigung alter
Adminanmeldungen, Begrenzung nativer Übergangssitzungen auf den ursprünglichen
Ablauf und Stilllegung neuer lokaler Logins bei verknüpften Konten bleiben vor
Produktion offen. Reale zentrale Browserabnahme und globaler Logout fehlen ebenso.

## Kontoanzeige folgt der Serveridentität – Sprachwelten

Code `76b97e8` auf `feature/worlds-hub-sso` korrigiert im isolierten Worlds-Modus
die bisher mögliche Abweichung zwischen Browsercache und tatsächlicher
Serveridentität. Private Ansichten, Profilname, Kontolink und Abmeldeauswahl
folgen derselben Auswahl wie die Autorisierung. Gültige bisherige Sitzungen
behalten Vorrang; ein veralteter nativer SDK-Cache verdeckt keine Worlds-
Zuordnung und hält nach bestätigtem Ablauf keine privaten Ansichten offen.
Der Status enthält ausschließlich lokale ID, Namen, Herkunft und gegebenenfalls
den eigenen CSRF-Wert. Keine nativen Rollen, E-Mails oder Sitzungstokens.

Lokal bestanden 206 Unit-Tests, Typprüfung, Lint, DE/EN-Abdeckung, Offline-Build
und 16 Chromium-/WebKit-Browserfälle bei 320/1280 px. Die getrennte echte
QA-Integration `42606461691` bestand Migrationen, PostgreSQL-/Autorisierungs-
prüfungen und den vollständigen nativen HTTP-Test gegen Managed Auth.
Vollständige GitHub-CI `42606394576` ebenfalls erfolgreich: 206 Unit-Tests,
Typen, Lint, Übersetzungsabdeckung, vollständiger Dependency-Audit, Build und
154 bisherige + 16 Worlds-Browserfälle.
Keine produktiven Konten, Konfigurationen oder Migrationen geändert.
Eigentumsnachweise vorhandener Konten, echte zentrale SSO-Abnahme und globaler
Logout bleiben offen. Der neuere Stand zum lokalen Logout beider Anmeldearten
steht im vorstehenden HTTP-Übernahme-Checkpoint.

## Eigentumsnachweis aus bestehenden verwalteten Sitzungen

Das gemeinsame Auth-Paket 0.1.4 ergänzt einen Übernahmevertrag für normale,
bereits angemeldete Managed-Auth-Konten. Die vorhandene Sitzung darf älter sein;
ihr ursprüngliches Datum wird erhalten und nicht zu einer frischen Anmeldung
umgedeutet. Vorbereiten und Bestätigen benötigen jeweils einen aktuellen
offiziellen serverseitigen Sitzungsabruf. Der zentrale signierte Anmeldezeitpunkt
muss frisch sein; lokale Verwaltungsrechte verlangen zusätzlich eine frische
Quellanmeldung oder einen getrennten geprüften Eigentumsnachweis.

Der einmalige Proof bindet beide Aussteller, Konten und Sitzungen sowie den
lokalen Privilegzustand. Wechsel, Ablauf oder Widerruf vor Bestätigung verhindern
die Übernahme. Fristen werden nicht durch spätere Sitzungsverlängerung erweitert.
Keine Übernahme allein durch Namen/E-Mails und keine Eignung für Slop-Sitzungen,
die nur durch öffentliche Namenseingabe entstanden sind. Bestehende atomare
Zuordnungs-/Audit-/Konfliktregeln sowie die bisherigen Nachweisarten bleiben
erhalten. Zwischen Anwendungen werden keine Provider-Cookies, Tokens oder
Sitzungszeilen kopiert.

Lokal bestanden **71 Tests**, Typprüfung, Lint, Build und Artefaktprüfung.
Die neuen Tests prüfen alte gültige Sitzungen, beide Sitzungsbindungen,
Quellprüfung, Privilegien, Fristen und atomaren parallelen Proof-Verbrauch
mit echtem PostgreSQL in PGlite. Vollständige GitHub-Prüfung `42637470398` für
Code `27f1cd6` erfolgreich, ohne Deployment. Tag `auth-v0.1.4` zeigt auf den
geprüften eigenständigen Paket-Commit
`2343fdaf8892fb028495064d0377f5533d67272c`; Paketname, Exporte und Quellinhalt
gegen die geprüfte Unterstruktur verglichen.

Sprachwelten-Code `946abb4` bindet diese Revision im Testzweig ein und prüft den
bisherigen Eigentümer mit dem offiziellen SDK direkt beim konfigurierten
Managed-Auth-Dienst. Browsercache, fremde Cookies, Provider-Rollen und vom
Browser gewählte Identitäten werden nicht als Eigentumsnachweis verwendet.
210 lokale Tests, Typen, Lint, DE/EN-Abdeckung und Build bestanden.
Echte getrennte QA-Integration `42640109664` erfolgreich: bestehende Sitzung
des neu angelegten synthetischen Kontos vor beiden Schritten validiert,
parallele Bestätigung erzeugte eine Zuordnung und ein Audit. Native Sitzungs-ID,
Erstellungs- und Ablaufzeiten sowie historische UUID und Heft-/Beitragseigentum
blieben erhalten; keine zusätzliche Anmeldung. Auch vollständiger nativer
HTTP-Test bestanden. Zentraler Nachweis noch synthetisch; der reale
Alters-/Erneuerungsfall einer bereits länger bestehenden Anbietersitzung bleibt
zu prüfen. Vollständige CI `42640042187` ebenfalls erfolgreich: 210 Unit-Tests,
Typen, Lint, DE/EN-Abdeckung, vollständiger Audit, Build und 154 bisherige + 16
Worlds-Browserfälle. Der neuere HTTP-Übernahme-Checkpoint steht oben; die echte
zentrale Browserabnahme und produktive Projektübernahme bleiben offen.

## Zentrale Kontoverwaltung – Nachprüfung am 08.11.

Die native QA-API bestätigt die maximale Passwortlänge von 128 Zeichen.
Der Hub verwendet dieselbe Grenze für Formulare und Serverprüfung. Neue
Passwörter benötigen zwölf Zeichen; bereits bestehende kürzere Passwörter
werden beim Login unverändert weitergereicht. Zu lange Passwörter werden
ohne Provideraufruf abgewiesen. DE/EN-Fehlertexte und Validierung bleiben
lokalisiert. 65 Tests, Typprüfung, Lint, Build und Artefaktprüfung bestanden.
Chromium und WebKit bestätigten bei 320 px die Grenzen, einen vorhandenen
Acht-Zeichen-Login und übersetzte Formular-/Providerfehler mit Testantworten.
Commit `504ec19` ist veröffentlicht. Die Live-Prüfung bestätigt 400 mit
Fehlercode für die lokalisierte Meldung bei überlangen Eingaben für Login, Registrierung,
Reset und Passwortwechsel. Dabei wurde kein Konto angelegt oder geändert.
Vollständiger CI-/Deploy-/Live-Smoke-Lauf `42467739726` erfolgreich.

Nach ausdrücklicher Nutzerfreigabe bestand die echte native Recovery-Abnahme
im isolierten QA-Zweig: signierter zugestellter Nachweis, exaktes Rücksprungziel,
einmaliger Reset, gleiche Identität, altes Passwort ungültig, zwei bisherige
Sitzungen widerrufen und zweites Konto unbeeinträchtigt. Der erste strenge
Empfänger prüfte eine vom geklonten Anbieter geerbte Kontextkennung; die
Abnahme bindet den QA-Zweig stattdessen an die signierte native Reset-URL
und die exakt neu erzeugte Testidentität. Keine Links oder Passwörter protokolliert.
QA-Zustellung vollständig wiederhergestellt, Testempfänger und Tunnel beendet.
Alle ursprünglichen Einstellungen des zentralen Piloten sind unverändert.
Reine SQL-Zählung bestätigt acht Recovery-Fixtures ohne aktive Sitzungen
ausschließlich im QA-Zweig; zentraler Pilot weiter ein Konto und null Fixtures.
Die vollständige Browser-/BFF-Recovery-Abnahme bestand anschließend in Chromium
(DE) und WebKit (EN), jeweils bei 320 px: echtes Hub-Formular, signierte QA-
Zustellung, nativer Link mit Rücksprung, Reset über den unveränderten Hub-Build,
Sprachwechsel ohne Verlust der Passworteingabe, lokalisierte Erfolgsmeldung,
Widerruf beider alten Sitzungen, unverändertes zweites Konto und Replay-Abweisung.
Der Hub lief für diese Prüfung lokal unter einer Browser-Testumleitung; der
QA-Anbieter war echt. Die Umleitung reicht WebKits eigene Browser-Cookies mit,
die erst nach dem Interception-Schritt an Netzwerkanfragen angefügt werden.
Eine zusätzliche echte Live-Netzwerkprüfung mit einer nicht vorhandenen
synthetischen Adresse bestand das englische WebKit-Formular samt Cookie/CSRF.
Keine weiteren Konten angelegt. Zustellung erneut vollständig wiederhergestellt,
beide Konfigurationen mit dem Ausgangsstand identisch; Empfänger und Tunnel beendet.
Nach abgeschlossener QA-Rückstellung wurde die geprüfte Einzeloption
`revoke_sessions_on_password_reset=true` gezielt im zentralen SSO-Piloten
aktiviert. Der erneute Konfigurationsvergleich bestätigt ausschließlich diese
Änderung: OTP-/Verifikationspflicht, Origins, Mailzustellung und alle weiteren
Einstellungen sind identisch. Dadurch beendet ein künftiger Reset die nativen
Anbietersitzungen des betroffenen Kontos. Es wurde kein persönlicher Reset
ausgelöst. Projektübergreifender Widerruf bleibt separat offen.
Konkrete Anbietergrenzen und Abnahmen stehen in `docs/IDENTITY-LIFECYCLE.md`.

## Neue Abnahmen: Sprachwelten und native Logout-Grenze

Sprachwelten `13fb704` erhält die historische lokale UUID jetzt in der gesamten
Anwendung: Beiträge, Vorschläge, Admin-Gates, Spielnamen, Audio und
Übersetzungsvorschläge. Rollen bleiben in der lokalen Tabelle. Aktive bisherige
Sitzungen behalten Vorrang; abgelaufene Cookies verdecken keine gültige Worlds-
Zuordnung. Allgemeine Profileinstellungen führen DE/EN zum Hub, Projektlogout
nutzt CSRF. Bestätigter Ablauf räumt private Ansichten; vorübergehende
Providerfehler erhalten den sichtbaren Zustand.

Vollständige GitHub-CI `42519675450` erfolgreich: 200 Unit-Tests, Typen, Lint,
Übersetzungsabdeckung, vollständiger Audit, Build und 154 bisherige + 8 neue
Chromium-/WebKit-Browserfälle. Separate echte QA-Integration `42519682396`
bestanden: Route-/PostgreSQL-Prüfung mit derselben historischen UUID,
Beitragserstellung/-lesen/-bearbeiten/-entfernen, Heftzuordnung, fehlende
Adminrechte und Widerruf ohne Gast-Fallback. Zusätzlich vollständiger
`npm run test:integration` gegen laufenden Loopback-Server und Managed Auth.
Die Worlds-Sitzung der Datenbankprüfung ist synthetisch; kein produktiver
OIDC-/Migrationsnachweis. Sprachwelten-Produktion unverändert.

Die inzwischen ausdrücklich freigegebene begrenzte native Logout-Prüfung wurde
im festen QA-Zweig durchgeführt. Trotz frisch bestätigter Anbieterrolle `admin`
lieferte `/oauth2/create-client` 401 ohne JSON-Felder. Kein Client wurde angelegt;
Logout-Metadaten sind daher weiterhin nicht als nutzbar nachgewiesen. Rolle
zurück auf `user`, frische Sitzung beendet. Eine verbleibende Registrierungssitzung
wurde erkannt; nach gesonderter Freigabe wurde ausschließlich das neue synthetische
Konto über die offizielle Verwaltung gelöscht. Nachkontrolle: 0 Konto- und
0 Sitzungszeilen für diese ID. Keine internen Session-Tabellen verändert und
keine Produktions-/Origin-/Clientkonfiguration geändert. Details und Grenzen:
`docs/NATIVE-LOGOUT-QA.md`. Ein unterstützter, real geprüfter Weg zum globalen
Logout bleibt offen; keine eigene Tokenabkürzung einführen.

## Rücknahme im Slop-Testworker: echte Versions- und Dateinachweise

Die offizielle Versionsmetadaten-Bindung ist ausschließlich im Testworker
aktiv. Eingesendete Header können die ausgegebene Laufzeit-ID nicht setzen;
WebSocket-Antworten und Produktion bleiben erhalten. Der zusätzliche Ablauf
bindet den geprüften Commit und die vollständige SHA-256-Dateiliste an beide
Versionen. Kandidaten werden zuerst ohne normalen Verkehr geprüft, anschließend
kurz aktiviert und wieder zurückgestellt. Der alte Vergleich mit einem
Anbieter-Manifesthash bleibt unverändert streng.

Code `2c96971` bestand vollständige CI `42590222784`: 176 Unit-Tests ohne Skips,
beide Typprüfungen, Werkzeugtypen, PostgreSQL 17 und vollständige Chromium- und
WebKit-Spiel-/Auth-Integration. Veröffentlichung `42591477378` erfolgreich.
Aktive Ausgangsversion: `8a83dc9c-c0aa-4511-80e9-b115ae555e35`.

Im externen Lauf `42591696625` bestanden tatsächlich alle 15 Dateien beider
per Laufzeit-ID belegter Versionen bei 0 Prozent Kandidatenverkehr. Danach
wurden Kandidat und Ausgangsversion gewechselt, aber die sofortige Kontrolle
brach ab. Der Workflow ist daher nicht vollständig erfolgreich. Die unabhängige
lesende Diagnose `42592201712` bestätigt die Deploymentfolge: Kandidat
`93829760-9493-4bfb-9c7b-60fa952ba609` bei 0 Prozent, dann 100 Prozent,
anschließend Ausgangsversion wieder 100 Prozent. Live: Ausgangsversion korrekt,
noindex/no-store und erreichbar. Alle sechs QA-Quelltabellen sind nach Anzahl
und Prüfsumme identisch. Produktionskonten/-daten unverändert.

Die begrenzte Bestätigungswartezeit und sichere Diagnose sind jetzt vollständig
extern abgenommen. Code `6bf3740`, vollständige CI **42592633591** erfolgreich:
**178/178 Unit-Tests ohne Skips**, Anwendungs-/Werkzeugtypen, PostgreSQL 17 und
vollständige Chromium-/WebKit-Integration. Veröffentlichung **42593695422**
erfolgreich. Der abschließende Rücknahmelauf **42593917604** bestand vollständig:
15 Dateien beider Versionen bei null Prozent Kandidatenverkehr geprüft,
Kandidat `5f7c87d4-585a-4319-b892-e768815c24e1` bei 100 Prozent und danach
Ausgangsversion `fc844a11-1d66-40d6-b7e1-99b6981922f9` wiederhergestellt.
Beide Zustände per Management-API, Laufzeit-ID und privatem Smoke geprüft.
Die sechs Quelltabellen sind anschließend erneut nach Zahl und Prüfsumme
unverändert. Live liefert wieder die Ausgangsversion mit noindex/no-store.

Damit ist die kontrollierte Deployment-Rücknahme nachgewiesen. Dieser einzelne
Blocker ist erledigt; globale Abmeldung, Kontolöschung, weitere Eigentumsnachweise,
neue Projektprofile aus zentraler Identität und Produktionsmigration bleiben
offen. Keine Produktionsdaten oder persönlichen HF-Verbindungen geändert.

## Sprachwelten: zentrale Neuanmeldung ohne zweites Auth-Konto

Neuer Prüfcommit `3c1da8b` ergänzt Migration 028 mit anwendungseigenen
Datenprofilen. Bestehende native UUIDs, Rollen, Beitragszuordnungen und bereits
vorhandene Verknüpfungen bleiben unverändert. Neue zentral angemeldete Nutzer
benötigen keine zweite Registrierung, keinen lokalen Namen und kein lokales
Passwort. Profilname aus der validierten zentralen Sitzung; keine Zuordnung
nach Namens-/E-Mail-Gleichheit und keine Kopie nativer Auth-Zeilen.

Profil, Zuordnung und Audit entstehen atomar. Gleichzeitige Wiederholungen
hinterlassen ein Profil und einen Audit-Eintrag; Auditfehler rollen alles zurück.
Sperren und entfernte native Quellen bleiben gesperrt. Aktive bisherige
Sitzungen verhindern versehentliche Neuanlagen. POST/CSRF, Origin, Formulargröße,
Methode und enge Rücksprungliste werden serverseitig geprüft. Lokale Rollen
bleiben unverändert; neue Profile erhalten keine Administratorrechte. Die
Administration erkennt zentrale Profile ohne lokale Kopie ihrer E-Mail.

206 lokale Tests, Typen, Lint, DE/EN-Abdeckung, Audit und Build bestanden.
Die acht bestehenden Worlds-Browserfälle und vier neue Einstiegsfälle bestanden;
letztere jeweils DE/EN, Chromium/WebKit, 320/1280 px, tatsächliche Modell-/
Formularlogik in PGlite und echte HTTP-303-Rückkehr. Synthetische Sitzungen,
kein realer neuer OIDC-Nachweis. Neues natives Auth-Konto: null.
Vollständige CI **42600250409** und separate echte QA-Integration **42600259412**
für **3c1da8b** sind erfolgreich: 206 Unit-Tests, 154 bisherige + 12 Worlds-
Browserfälle, Migration 028, tatsächlicher gleichzeitiger Profilstart,
unveränderte native Metadaten, Administration, eigene Beiträge und Widerruf.
Auch das vollständige laufende native HTTP-System ist geprüft. Tests verwendeten
synthetische zentrale BFF-Sitzungen; neuer realer OIDC-Nachweis bleibt offen.
Produktionsschema und produktive Konten unverändert. Vor
Veröffentlichung bleiben tatsächliche SSO-/Migrationsabnahme und Gestaltung
der Kontozwischenseite offen; Datenprofile dürfen bei Rücknahmen nicht
entfernt oder auf den alten nativen Fremdschlüssel zurückgezwungen werden.

## Aktuelle Vorgaben – zentrale Anmeldung und bestehende Sitzungen

Der Nutzer hat ausdrücklich bestätigt: In allen vier Anwendungen führt die
Anmeldung nur noch zum Worlds Hub; zusätzliche lokale Passwörter sind kein
Bestandteil des Zielablaufs. Bestehende Konten und gültige Sitzungen sollen
möglichst ohne erneute Eingaben übernommen werden. Keine bloße Umbenennung
lokaler Formulare und keine automatische Kontenzusammenführung anhand von Namen.

Slop-Profil `Manuel` wurde nach Benennung durch den Projektbetreiber read-only
im isolierten QA-Ziel gefunden: ohne Passwort. Die aktive Slop-Worlds-Identität
wurde beim zentralen Aussteller mit bestätigter E-Mail gegengeprüft. Exakte IDs
bleiben im Prozessspeicher. Die geprüfte QA-Zuordnung ist inzwischen angewendet
(siehe Abnahme unten); die Produktion ist unverändert.
HF-Zugangsdaten liegen in einem separaten verschlüsselten Vault, nicht in der
geklonten Profil-Datenbank; sie werden nicht exportiert oder kopiert.

Implementierung und geprüfte Testbereitstellung: gezielt betreibergeprüfte, einmalige
Migrationsfreigaben für passwortlose Profile; atomare Zuordnung samt Audit und
Aktivierung vorhandener zentraler Sitzungen. Neue Username-Logins nach Migration
werden abgewiesen. Vor der Migration ausgestellte gültige lokale Sitzungen
behalten ihr ursprüngliches Ablaufdatum; Refresh verlängert sie nicht.
PGlite bestätigt Übernahme, Daten-/ID-Erhalt, aktive Sitzung, Ablauf, geänderte
Quelle, Replay, Admin-Ausschluss und Rücknahme. Slop-Build mit Typprüfungen und
162 Tests bestanden. Reale PostgreSQL-Vorschau für das exakt geprüfte Profil
bestand: einmalige Zuordnung und vollständiger Rollback, alle sechs
Quelltabellen nach Zahl und Prüfsumme identisch. Slop `7ec02df` bestand die vollständige CI `42495932891` in Chromium/WebKit
mit PostgreSQL 17 einschließlich zweier konkurrierender Betreiberübernahmen.
Deploy `42496881577` erfolgreich. Die additive Freigabetabelle wurde nur im
wiederhergestellten QA-Ziel eingerichtet; alle 13 Profile sind unverändert.
Danach wurde die vorab geprüfte Freigabe für `Manuel` einmalig angewendet.
Alle sechs Quelltabellen stimmen vor/nach dem Commit nach Zahl und Prüfsumme
überein. Der echte Browser bestätigt: direkter Link, automatische zentrale
Wiederanmeldung ohne neue Eingabe, „Spielprofil verknüpft“, danach das bestehende
Spielprofil `Manuel` im Spiel. Kein lokales Passwort und kein neues Profil
angelegt. Dies ist eine QA-Verknüpfung, keine produktive Migration.

Der Shared-Client ergänzt den direkten Linkstart über `/auth/start`; Hub
66 Tests, Typprüfung, Lint, Build und Artefaktprüfung bestanden. Die Anmeldelink-Integration
in die anderen drei Welt-Projekte ist inzwischen geprüft; weitere Autorisierungs-
und Kontenübernahme-Arbeiten bleiben offen. Paket
`auth-v0.1.3` ist als eigenständiger Subtree-Commit
`b0e6eac7bc6fdd46317dc933a83936c16ecde816` geprüft und veröffentlicht.
`auth-v0.1.2` verweist versehentlich auf die Hub-Wurzel und wird von keinem
Projekt als Paketquelle verwendet. Die 0.1.3-Veröffentlichung verwendet wieder
den vorhandenen Subtree-Split mit geprüftem Paketinhalt.
Die ältere Slop-Ansicht `b2e1551` wurde durch die erfolgreich geprüfte und
veröffentlichte Übernahmeversion `7ec02df` ersetzt (Deploy `42496881577`).

Die zentralen Anmeldelinks sind jetzt in Sprachwelten `9d46f15`, IT-Worlds
`321fe36` (Anwendungsstand `e0202c5`) und Music-Worlds `01e95bd` implementiert und gepusht. 197/128/23 Tests
bestanden (IT zusätzlich 10 umgebungsbedingte Skips), Typen und Builds erfolgreich;
Sprachwelten zusätzlich Lint/Übersetzungsabdeckung/Audit. Chromium/WebKit
bestätigen DE/EN, 320/1280 px, direkte Links und den bisherigen Modus bei
deaktivierten Flags; IT zusätzlich Theme/Mobilmenü/beide 404. Native Provider-/
Produktionsübernahme ist damit nicht behauptet. Die Freigabeschalter bleiben aus.
GitHub-Prüfungen vollständig erfolgreich: Sprachwelten `42514779942`, separate
isolierte Datenbank-/Managed-Auth-Integration `42514846060`; Music `42514848840`
inklusive bestehender isolierter Datenbankprüfung; IT `42515340829`. Der erste
IT-Lauf erkannte den fehlenden Eintrag der neuen dynamischen Route im statischen
Linkprüfer. Ausschließlich `/auth/start` ergänzt; 40.228 interne Links und
SEO-Prüfung bestanden, erneute vollständige CI erfolgreich.

Read-only Produktionsinventar: 2 Music-, 3 Sprachwelten-, 2 IT- und 13 Slop-
Profile/Konten, darunter neun Slop-Profile ohne Passwort. Vollständige Snapshot-
Zahlen, Quellziele und Grenzen stehen in `docs/MIGRATION-INVENTORY.md`. Keine
produktiven Zuordnungen wurden geschrieben. Echte lokale Slop-Abmeldung und
automatische Wiederanmeldung ohne Eingabe mit Rückkehr zu Manuel sind zusätzlich
im Browser bestätigt. Dies ist kein globaler Logout.

Slop `35d26ad` formuliert Sitzungsablauf in DE/EN zentral statt nach einem
lokalen Benutzernamen zu fragen; Kontolink mit Tastaturfokus. Build, 162 Tests,
Chromium/WebKit einschließlich simuliertem Refreshablauf und vollständige CI
`42515091102` bestanden; Pilot-Deploy `42515687781` erfolgreich. Reine Diagnose
der modernen Versionsmetadaten ergänzt in `fc4fc60`; neun gezielte Prüfer-Tests
und separate Typprüfung bestanden. Sie gibt nur Feldnamen aus und verändert
keine Version. Die vollständige CI `42515706390` für `fc4fc60` ist ebenfalls
in Chromium und WebKit erfolgreich (163 Unit-Tests plus PostgreSQL-/Browserabläufe).
Inspektion `42515850838` erfolgreich: Auch die neuere API liefert
nur Asset-Konfiguration, keinen Manifesthash. Aktive Version nach Deploy ist
`514bc3d9-e302-49f8-a6e0-b229152d6dc8`, Deployment
`dfd89eff-6a83-4441-9ed7-4240bcad0db9`. Private Live-Smokes bestanden. Nach
dem tatsächlichen Browser-Reload bleibt Manuel angemeldet. Tatsächliche
Rücknahmen bleiben an vollständige CI gebunden und sind noch nicht ausgeführt.

Für die native globale Abmeldeprüfung liegt ein konkret begrenzter Plan in
`docs/NATIVE-LOGOUT-QA.md` vor. Vorübergehende Administratorrechte ausschließlich
für ein synthetisches QA-Konto sind beim Nutzer angefragt, noch nicht erteilt;
keine entsprechende Rollen-/Clientänderung ausgeführt.

Nächster Schritt: Deployment-Rücknahme mit expliziter Versionskennung und
Prüfung tatsächlich ausgelieferter Assets vorbereiten (Cloudflare unterstützt
eine Kandidatenversion mit 0 Prozent Verkehr und gezielten Versions-Overrides;
deren Anwendung muss anhand einer echten Versionsantwort bestätigt werden).
Die native QA-Prüfung erst nach der angefragten Rollenfreigabe ausführen.
Sprachwelten benötigt vor Aktivierung außerdem die zentrale ID-Auflösung für
Beiträge/Administration; der aktuelle Adapter deckt den Lernbereich ab. Weitere
echte Provider-/Migrationsabläufe abschließen; produktiven Cutover erst nach ihrem jeweiligen Migrations-,
Rollen-, Daten- und Rücknahmenachweis durchführen. Für Managed Auth ist weiterhin kein allgemein unterstützter
Import beliebiger Fremd-Sitzungen oder Passwort-Hashes nachgewiesen; alte
Stack-Auth-Anleitungen sind keine Belege für die eingesetzte Better-Auth-Instanz.

## Kontrollierte Deployment-Rücknahme – laufend

Slop `a4a3f7a` ergänzt einen festen Pilot-Versionsprüfer und einen manuellen
Workflow für die kontrollierte Rücknahme mit anschließender Wiederherstellung.
Acht neue Regressionstests bestehen: identische Ressourcen, sichere
Fehlerbehandlung, Wiederherstellung, unklare Schreibantwort und konkurrierende
Deployments. Kein `force`, keine produktiven Worker oder Datenbankänderungen.
Build mit beiden Typprüfungen und alle 156 Unit-Tests bestanden; der neue
Prüfer wurde zusätzlich separat typgeprüft. Die vollständige CI
`42489252839` bestand Chromium, WebKit und PostgreSQL. Die lesende
Erster Prüflauf `42489823444` scheiterte ohne Schreibaufruf; der robots-Inhalt
wird danach korrekt einmal gelesen. CI `42489938907` bestand beide Browser und
PostgreSQL. Lesende Abnahme `42490657075` für Slop `6ff0153` erfolgreich:
aktive Version `82cd43c1-82d0-4515-a83a-bb99f3acee90`, Deployment
`7d6c3681-d2ae-42c1-b6fd-2bf908af741e`. Für ASSETS fehlen Inhaltskennungen;
Name und Typ allein erlauben keine sichere Gleichheitsannahme. Die tatsächliche Versionsübung bleibt
bis zum Nachweis kompatibler Assets und Bindungen ausdrücklich offen.

## Aktueller Meilenstein – isolierter Slop-Pilot

Die persönliche Cloudflare-Anmeldung und die gesonderte Tokenfreigabe sind
erledigt. Der Token `slop-worlds-pilot deploy` hat ausschließlich Workers
Scripts Write, endet am 08.12.2026 und liegt nur in der GitHub-Umgebung
`worlds-pilot` von Slop Urself. Die Umgebung erlaubt ausschließlich
`feature/worlds-hub-sso`. Datenbankverbindung und neuer Cookie-Schlüssel
sind dort ebenfalls als Secrets abgelegt. Der Hub-Token wird nicht verwendet.

Slop-Sicherung `br-empty-mouse-b1uodoxw` bei LSN `0/3A99470` und
Wiederherstellung `br-sparkling-firefly-b1pssf1o` sind geprüft. Alle sechs
Bestandstabellen stimmen nach Zahl und Prüfsumme mit der Quelle überein.
Die 13 Profile blieben auch nach Schemaeinrichtung und zurückgerolltem
Verknüpfungs-/Widerrufstest erhalten. Keine produktiven Konten migriert.

Der öffentliche Pilot-Client ist beim bestehenden zentralen Anbieter mit
genau einem Callback und einer Ressource registriert. Der Hub ergänzt
dieselbe Konfiguration für `slopurself-worlds-pilot.maki26.workers.dev`.
Die HF-Pflichtinformation bleibt auch für diesen Client sichtbar.
64 Hub-Tests, Typprüfung, Lint, Build und Artefaktprüfung bestanden.

Slop-Commit `290f36a` konfiguriert ausschließlich den wiederhergestellten
Host und simulierte Videos. Die vollständige CI `42464544452` bestand
Chromium, WebKit und PostgreSQL. Deploy `42465065850` legte den Worker und
seine Secrets an. Der sofortige Smoke traf noch die Verteilung der Secrets
und erhielt 503; nachfolgend antwortete die Seite korrekt mit 200.
`5a1b945` ergänzt dafür eine begrenzte Warteprüfung.

Der echte native Formularstart offenbarte `Origin: null` durch die bisherige
`no-referrer`-Policy. Slop `ae37253` verwendet auf der Pilot-Kontoseite
`same-origin`; die strenge Origin-Prüfung bleibt erhalten. Ein neuer
Browser-Regressionstest reproduzierte den Fehler und besteht nach der
Korrektur in Chromium und WebKit bei 320 px. 149 Tests und Build bestanden.
CI `42465438360` bestand für den endgültigen Commit beide Browser samt
neuem Formular-Regressionstest und die PostgreSQL-/HF-/Logout-Integrationen.
Deploy `42465941358` ist erfolgreich. Der Live-Smoke bestätigt Root 200,
private Header, gesperrte Sitemap, anonyme API 401, strikten Origin-Schutz,
exakten Pilot-Client, PKCE, `max_age=300` und englische Hub-Anmeldung
einschließlich HF-Hinweis. Der echte native Browserweg führt jetzt ebenfalls
bis zum zentralen Formular für Slop Urself Pilot.
Der Nutzer hat Anmeldung und Freigabe inzwischen abgeschlossen. Der echte
Callback kehrte nach `/auth/worlds` zurück; die QA-Datenbank bestätigt eine
aktive Worlds-Sitzung beim zentralen Aussteller, null Profilzuordnungen und
weiterhin 13 Spielprofile. Der Nutzer meldete die rohe HTML-Kontoseite.
Slop `3399961` / `b2e1551` lädt die vorhandene Gestaltung, trennt Login- und
Verknüpfungsstatus und zeigt Voraussetzungen statt eines nicht nutzbaren
Passwortformulars. DE/EN-Kataloge, Sprachschalter ohne Formularverlust und
verständliche Kennzeichnung als getrennte Testversion sind ergänzt.
Build, beide Typprüfungen und 159 Unit-Tests bestanden; Chromium und WebKit
lokal bei 320 px und Desktop erfolgreich. CI `42491050349` läuft vor dem
Deployment. Der lokale Eigentumsnachweis ist weiterhin offen; kein Bestandskonto
wurde verknüpft.

Zusätzlich real geprüft: Aus dem anfangs abgemeldeten Hub führte die normale
Anmeldeschaltfläche mit der aktiven zentralen Sitzung automatisch zu
„Hallo, Manuel.“. Keine erneute Passwort-/Codeeingabe oder neue Freigabe war
nötig. Damit ist SSO für Hub und Slop-Testclient im Browser nachgewiesen;
alle vier produktiven Anwendungen und projektübergreifender Logout bleiben offen.
Migrationsnachweise bleiben bis zur separaten Pilotaktivierung deaktiviert.

Die visuelle Abnahme fand abgeschnittene Schrittbeschriftungen und doppelte
Innenabstände an den Welt-Labels. Die Stilregeln beschränken sich jetzt auf
die Zahlenkreise beziehungsweise die äußeren Labels und formatieren nicht
mehr die eingebetteten Übersetzungsspannen. 64 Tests, Typprüfung, Lint,
Build und Artefaktprüfung bestanden. Chromium und WebKit bestätigten DE/EN
bei 320 px und Desktop mit lesbaren Schritten, korrekten Labelabständen
und ohne horizontalen Überlauf. Die aktive Sprache wurde mitgeprüft.
Die Gestaltung ist seit `0183b63` veröffentlicht; der Live-Smoke ist erfolgreich.

## Ziel und Grenzen
Eigenständiger Hub mit vier direkten Projektlinks und schrittweisem echtem OIDC-SSO. Anwendungen, Repositories, Datenbanken und Berechtigungen bleiben getrennt. Adventskalender ist vollständig ausgeschlossen. Keine E-Mail-basierte Kontozusammenführung, keine Passwortübernahme; Slops persönliche HF-Anbindung, Kontingente, Jobs und Moderation bleiben verpflichtend und unverändert.

## Produktion, Repository und Kosten
- Produktiv unter https://worlds-hub.maki26.workers.dev/. Das Repository https://github.com/manuelk2607/Worlds-Hub ist am 05.11.2026 öffentlich lesbar. Die öffentliche Lesbarkeit wurde ohne Anmeldedaten geprüft.
- Worker worlds-hub, Konto ec3c070d8e4f88d2fc533d7d797f2daa, Namespace maki26.workers.dev. Private alte Sites-Vorschau bleibt Zusatzvorschau.
- Aktueller geprüfter Deploy: Commit `504ec19`, Cloudflare-Version `f6fee3b1-d52c-490d-86cb-55116d314cc2`. 65 Tests, Typprüfung, Lint, Build, Audit und zweisprachiger Live-Smoke bestanden. [GitHub Actions](https://github.com/manuelk2607/Worlds-Hub/actions/runs/42467739726)
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
- Neon bestätigt die Schleife bei `prompt=login` und `max_age=0`. Der separate reale QA-Zweig hat inzwischen `max_age=300` mit signiertem `auth_time` bestätigt. Für einen älteren Login wurde mit einem kürzeren positiven Zeitfenster die erneute Anmeldung bis zum verifizierten Token geprüft. Der Shared-Client verwendet dafür 300 Sekunden. Die Freigabe für reale Projektverknüpfungen wartet auf den vollständigen Browserpilot.
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
Kontolöschung, produktive Migrationsnachweise und projektübergreifender
Sitzungswiderruf bleiben offen.

## Migrationsnachweise im isolierten Pilot

Der Hub prüft kurzlebige, mit dem fest hinterlegten Projektschlüssel signierte
Nachweise. Er speichert den letzten bestätigten Stand pro Projekt und
zentraler Identität. Wiederholungen sind idempotent. Verspätete Meldungen
können einen neueren Widerruf nicht überschreiben. Eine andere lokale
Referenz erfordert eine manuelle Konfliktprüfung. Kontoseite und Export
zeigen ausschließlich die Zustände der angemeldeten Identität.

Slop verwendet das vorhandene transaktionale Audit als Versandwarteschlange.
Eine Rücknahme protokolliert den Widerruf und entfernt die betroffenen
Worlds-Sitzungen in derselben Transaktion. Bis zu zehn Nachweise werden pro
stündlichem Lauf gesendet. Temporäre Fehler bleiben zur Wiederholung offen,
Zuordnungskonflikte werden zur Prüfung markiert.

63 Hub-Tests sowie 149 Slop-Tests, Typprüfungen und Builds bestanden.
Der lokale Test vom 07.11.2026 verband die echte Slop-Verknüpfungsroute
in PostgreSQL 17 mit dem Hub in workerd und einer lokalen D1.
Geprüft wurden parallele Verknüpfung, verlorene Empfangsbestätigung,
erneute Zustellung, private Hub-Anzeige, Rücknahme, Sitzungswiderruf
und der Erhalt derselben lokalen Profil-ID. Die Authentifizierung
verwendete Testkonten. Die bestehenden Node-/Socket.IO-/HF- und
workerd-Integrationen bestanden ebenfalls.

Das Paket ist standardmäßig deaktiviert. Die additive D1-Migration 0004,
Projektschlüssel und das separate Pilotziel sind vor der Aktivierung
einzurichten. Slop sperrt die produktive Hub-Origin für seine
Pilotnachweise. Am 07.11.2026 ist die Cloudflare-CLI weiterhin abgemeldet.
Der reale zentrale Eigentumsnachweis und die produktive Migration bleiben
offen. Vertrag und Einrichtung stehen in `docs/MIGRATION-RECEIPTS.md`
und im Slop-Dokument `docs/WORLDS-PILOT.md`.

## Reale Prüfung des zentralen Anmeldenachweises am 07.11.2026

Der neue Neon-QA-Zweig `br-jolly-leaf-ba8vt1pe` im bestehenden Free-Projekt
Worlds Hub Identity enthält einen eigenen öffentlichen QA-Client. Zwei neue
synthetische Konten wurden ausschließlich in diesem Zweig erstellt. Nur dort
wurden der E-Mail-Versand und die Verifikationspflicht für die API-Prüfung
abgeschaltet. Die zentrale Pilotkonfiguration behält ihre Verifikationspflicht.
Der Zweig übernimmt die vom Free-Konto vorgegebenen Compute-Einstellungen.

Der echte Anbieter bestätigte PKCE, Consent, Codeaustausch und die
Ed25519-Signatur einschließlich Aussteller, Client, Nonce und frischem
`auth_time` für `max_age=300`. Ein zweiter Durchlauf mit `max_age=10`
und gealterter Sitzung verlangte erneut die Zugangsdaten und lieferte
anschließend den erwarteten frischen Nachweis.

Der gemeinsame Client fordert nun einen maximal fünf Minuten alten Login.
Die Hub-Identitätsseite zeigt bei älteren oder ungültigen Zeitstempeln das
Anmeldeformular. Aktuelle Sitzungen werden automatisch fortgesetzt.
Chromium und WebKit bestätigten beide Fälle, DE/EN, Formularzustand und
den unveränderten signierten Query bei 320 px. Die Browserantworten waren
synthetisch. Der echte Anbieter wurde separat über seine nativen APIs geprüft.

Der native `delete-user`-Endpunkt lieferte mit beiden angemeldeten QA-Konten
HTTP 404. Eine funktionierende Selbstlöschung ist damit weiterhin offen.
Im QA-Zweig ist `revoke_sessions_on_password_reset=true` gesetzt.
Die ursprüngliche zentrale Pilotkonfiguration hatte dafür noch `false`;
nach bestandener QA-Abnahme wurde ausschließlich diese Option auf `true` gesetzt.
Echter Reset und Widerruf sind inzwischen im QA-Zweig einschließlich Browser/BFF
geprüft (Abnahme oben). Die Sicherheitsoption ist im zentralen Pilot übernommen;
projektübergreifender Widerruf ist dadurch noch nicht nachgewiesen.
Der QA-Zweig und die Testkonten bleiben für diese Folgeprüfung erhalten.
Die erneute Prüfung der ursprünglichen Pilotkonfiguration erfolgt vor ihrer
nächsten Änderung. [Anbietergrenzen](https://neon.com/docs/auth/guides/plugins/oauth-provider)

Ergänzende echte QA-Prüfung am 08.11.: Ein weiteres neues synthetisches
Konto bestätigte den nativen Passwortwechsel. Falsches aktuelles Passwort
wird abgewiesen; der erfolgreiche Wechsel erhält dieselbe Identität,
widerruft die zweite Sitzung und lässt nur das neue Passwort zu.
Anschließend wurden alle Sitzungen dieses Testkontos über den nativen
Anbieter-Endpunkt widerrufen und ohne Cookie-Cache als ungültig geprüft.
Keine persönlichen Zugangsdaten oder bestehenden Konten wurden geändert.
Die separate E-Mail-Recovery-Abnahme wurde anschließend wie oben dokumentiert
im isolierten QA-Zweig abgeschlossen.

`auth-v0.1.1` ist unter der Paketrevision
`386bd19de441b8ecf9453ba5d592a3b5b40843dc` veröffentlicht.
Alle vier Featurebranches übernehmen diesen OIDC-Client. IT `3032865`
bestand 127 Tests bei zehn umgebungsbedingten Auslassungen, Typprüfung
und den Build mit 534 Seiten. Music `42e192a` bestand 22 Tests,
Typprüfung, Lint und Worker-Trockenlauf. Slop `56ff0dd` bestand
149 Tests, Build und die workerd-HF-/Logout-Prüfung.
Sprachwelten `7325f44` bestand 195 Tests, Typprüfung, Lint,
Übersetzungsabdeckung, Build und vollständigen Dependency-Audit.
Die Featurebranches sind gepusht. Ihre vollständige reale
Projektabnahme und Aktivierung stehen aus.

Nächster Schritt ist der separate Slop-Worker mit isolierter Datenbank,
exaktem Pilot-Client und vollständigem Browserdurchlauf einschließlich
Migration und Rücknahme. Für dessen Deployment ist eine gesonderte
Cloudflare-Freigabe angefragt. Die vorhandene Deploymentfreigabe und
der gespeicherte Token gelten ausschließlich für den Hub.

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
