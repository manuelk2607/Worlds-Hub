# Kontenübernahme: tatsächlicher Bestand und Freigabegrenzen

Stand: 08.11.2026, Europe/Stockholm. Read-only SQL gegen die expliziten
Produktionszweige, keine Schreibzugriffe und keine exportierten Zugangsdaten.
Diese Zahlen beschreiben lokale Konten/Profile, nicht verschiedene Personen.
Gleiche Namen oder E-Mails werden nicht als Zuordnung verwendet.

| Projekt | Lokale Konten/Profile | E-Mail-Verifikation | Bestehende Sitzungen | Inhaltsbeziehungen | Produktive Worlds-Zuordnungen |
| --- | ---: | --- | --- | --- | ---: |
| Music-Worlds | 2 | Gastprofile ohne E-Mail-Identität | Ein Profil mit aktiver serverseitiger Sitzung | 16 Beiträge, 0 Ergebnisse | 0; Mapping-Tabelle fehlt, reserviertes hub_subject überall leer |
| Sprachwelten | 3 | 1 bestätigt; 3 Passwortkonten | Ein Konto mit aktiver nativer Sitzung | 515 Beiträge, 1 Admin-Grant, 0 Lernfortschritte, 0 Hefte | 0; produktiver Cutover nicht aktiviert |
| IT-Worlds | 2 | 0 bestätigt | Ein Konto mit aktiver nativer Sitzung | 17 Fortschrittszeilen | 0; Mapping-Tabelle fehlt |
| Slop Urself | 13 | Keine E-Mail-Identität; 9 ohne Passwort | Signierte Browser-Tokens sind nicht zentral auflistbar; keine Nullbehauptung | 15 Spieler, 4 Runden, 2 Stimmen, 4 Videos | 0; Mapping-Tabelle fehlt |

## Explizite Quellziele

- Music: green-sound-19865298 / br-proud-recipe-b9c8f33h / neondb.
- Sprachwelten: calm-tooth-60944868 / br-delicate-field-b96d9qc4 / sprachspiel.
- IT: lingering-morning-59761503 / br-long-violet-ba34agj1 / IT-Worlds.
- Slop: autumn-leaf-19858358 / br-soft-math-b1efy5s0 / Slop_Urself.

Die Sitzungsauswertung zählt unterschiedliche IDs mit expires_at/expiresAt > now(),
keine Tokens. Verifikation wird als Aggregat aus neon_auth.user gelesen. Slop
zählt ausschließlich NULL/nicht-NULL des Passwortfeldes, ohne Hashwerte zu lesen.
Zeitpunktbezogene Zahlen können sich durch reguläre Nutzung später ändern.

## Tatsächlich migriert und im Browser geprüft

Nur der wiederhergestellte Slop-QA-Zweig br-sparkling-firefly-b1pssf1o enthält
bisher eine angewendete, betreibergeprüfte Zuordnung: das ausdrücklich vom
Eigentümer benannte passwortlose Profil Manuel. Die Zielidentität wurde beim
zentralen Aussteller auf bestätigte E-Mail geprüft. Die einmalige Freigabe
bindet exakte Quell-ID, Quellversion und zentralen Aussteller/Subject.
Kein Namens-Automerge und keine allgemeine öffentliche Namensübernahme.

Die Vorschau wurde in echtem PostgreSQL zurückgerollt, anschließend dieselbe
geprüfte Migration dauerhaft nur in QA angewendet. Sechs Quelltabellen sind
vor/nach Anwendung nach Zeilenzahl und Prüfsumme identisch. Zwei konkurrierende
Verbindungen können eine Freigabe nur einmal verbrauchen. Es wird kein Profil
und kein Slop-Passwort neu angelegt. HF-Vault und Generierungsfreigaben bleiben
separat und unverändert. Build 7ec02df und Deploy 42496881577 waren erfolgreich.

Echter Browser: direkter zentraler Anmeldelink, automatische Rückkehr ohne
Passwort/Code/Freigabe, verknüpftes Profil Manuel, Spiel-Lobby. Danach lokale
Abmeldung mit sichtbarem ausgeloggtem Zustand und erneute automatische zentrale
Anmeldung ohne Eingabe; Rückkehr zum gleichen Spielprofil. Dies beweist lokalen
Logout und SSO-Wiederkehr, nicht globale Abmeldung oder produktive Migration.

## Übergang ohne Datenverlust

Die Zuordnung erhält lokale IDs und damit Rollen, Beiträge, Punkte und Lernstände.
Gültige vorhandene lokale Sitzungen bleiben im Übergang nach ihren bestehenden
Regeln verwendbar. Slop akzeptiert nach Zuordnung nur vor der Migration erteilte
signierte Sitzungen bis zum ursprünglichen Ablauf; Refresh verlängert sie nicht.
Neue lokale Username-Logins für zugeordnete Profile werden abgewiesen.

Zentrale Auth-Geheimnisse/Sitzungen müssen in der offiziell unterstützten
Anbieterdatenhaltung bleiben. Die aktuelle Managed-Auth-Verwaltung bietet im
geprüften Vertrag keinen nachgewiesenen allgemeinen Import fremder Sessions
oder Passwort-Hashes. Anleitungen zur früheren Stack-Auth-Instanz belegen das
für Managed Better Auth nicht. Cookies werden weder an andere Hosts kopiert
noch mit einer gemeinsamen workers.dev-Domain geteilt.

Deshalb ist eine vollständige lautlose Übernahme aller bisherigen Anmeldungen
noch nicht nachgewiesen. Vor allem Gast-/Username-Profile ohne verifizierte
Kontaktidentität benötigen eine belastbare Zuordnung zum zentralen Eigentümer.
Eine vorhandene Sitzung kann Eigentumsnachweis sein, ersetzt aber keine
unterstützte zentrale Sitzungsausstellung. Unbestätigte E-Mail-Zustände werden
nicht künstlich auf bestätigt gesetzt. Konten bleiben getrennt, bis der jeweilige
Eigentumsnachweis vorliegt; niemand erhält dadurch fremde Inhalte oder Rechte.

## Nächste Freigabekriterien

1. **Erledigt: kontrollierte Pilot-Deployment-Rücknahme.** Code 6bf3740,
   vollständige CI 42592633591, Veröffentlichung 42593695422 und abschließender
   externer Ablauf 42593917604 erfolgreich. 15 Dateien beider tatsächlicher
   Laufzeitversionen bei 0 Prozent geprüft, Kandidat bei 100 Prozent und
   Ausgangsversion wiederhergestellt; sechs Quelltabellen identisch. Aktive
   Ausgangsversion fc844a11-1d66-40d6-b7e1-99b6981922f9. Der frühere Abbruch der
   sofortigen Nachkontrolle ist durch begrenzte Zustandsbestätigung behoben.
   Der alte Anbieter-Manifestvergleich bleibt streng; die zusätzliche Prüfung
   verlangt exakten Commit, vollständige Dateiprüfsummen und Laufzeitnachweis.
2. Je Projekt aktuellen Backup-/Restore-/Mapping-/Rollen-/Datennachweis prüfen.
3. Echte zentrale Providerabläufe der weiteren Anwendungen und unterstützte
   Übernahme bestehender Identitäten/Sitzungen klären; keine Hash-/Cookiekopie.
4. Zentrale Kontolöschung und Widerruf aller Projektsitzungen nachweisen.
5. Erst dann produktive Zuordnungen und zentrale Anmelde-Flags aktivieren.


## Rücknahmequellen geprüft am 08.11.2026

- [Cloudflare: Versions-Overrides, 0-Prozent-Kandidat und notwendiger Versionsnachweis](https://developers.cloudflare.com/workers/versions-and-deployments/version-overrides/)
- [Cloudflare: Rücknahmen verändern keine gebundenen Datenressourcen](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
