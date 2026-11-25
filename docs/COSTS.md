# Kostenloser Betrieb und Grenzen

Stand 25.11.2026. Die veröffentlichten Kontingente und der unten aufgeführte
Neon-Verbrauch sind aktuell geprüft. Für Cloudflare und GitHub liegen hier
die historischen Ablesungen aus der Einrichtung vor.

## Aktueller Betrieb

- Die Neon-API meldet für die Organisation `Nebenprojekte` weiterhin
  `plan: free`. Worlds Hub verwendet Neon Auth und den gemeinsamen
  Maildienst sowie Cloudflare D1 für Sitzungen, Sprachpräferenzen,
  Verknüpfungsnachweise und Abmeldeaufträge.
- Die Cloudflare-Aufnahme vom 08.11. zeigte 309 von 100.000 Tagesanfragen
  und 0,00 USD abrechenbare Nutzung. Der Kontingentdeckel von fünf
  Cron-Triggern ist belegt. Der Hub stößt den IT-Worlds-Nachweisversand
  deshalb über seinen vorhandenen Zeitplan an.
- Das GitHub-Dashboard zeigte am 04.11. 0,01 von 12,00 USD inkludiertem
  Compute und 0 von 0,50 GB Artefaktspeicher. GitHub verrechnet private
  Läufe mit dem Kontingent des Kontoinhabers. Standardrunner für
  öffentliche Repositories sind kostenlos.

## Neon-Verbrauch vom 1. bis zum 25. November

Projektwerte aus der Neon-API für die laufende Periode bis 01.12.2026 UTC.
Die Zeilen erfassen den gemeldeten Verbrauch auf Projektebene.

| Projekt | Rechenverbrauch | Datentransfer |
|---|---:|---:|
| Worlds Hub | 2,75 CU-Stunden | 21,4 MiB |
| Music-Worlds | 2,73 CU-Stunden | 34,6 MiB |
| Sprachwelten | 2,90 CU-Stunden | 11,2 MiB |
| IT-Worlds | 1,59 CU-Stunden | 2,2 MiB |
| Slop Urself | 12,39 CU-Stunden | 8,9 MiB |

Music-Worlds hat den bestätigten projektinternen Deckel von 100 CU-Stunden,
1 GiB Transfer und 512 MiB logischer Daten. Die früheren 2 CU-Stunden
hatten die Datenbank angehalten. Alle fünf Compute-Werte liegen im
Neon-Free-Kontingent. Die aktuellen Cloudflare- und GitHub-Rechnungswerte
wurden hier nicht erhoben.

## Aktuell dokumentierte Freikontingente

| Dienst | Relevante Grenzen | Konsequenz |
|---|---|---|
| Cloudflare Workers Free | 100.000 Requests/Tag, 10 ms CPU pro HTTP-Aufruf, fünf Cron-Trigger pro Konto | Die Limits gelten für die bestehenden Worker gemeinsam. |
| Cloudflare D1 Free | 5 Mio. gelesene / 100.000 geschriebene Zeilen täglich, 5 GB gesamt, 10 Datenbanken | Eine Hub-D1 ist angelegt. Indizierte Sessionabfragen und begrenzte Cleanup-Batches erhalten. |
| SQLite Durable Objects Free | 100.000 Requests und 13.000 GB-s täglich; 5 Mio. gelesene / 100.000 geschriebene Zeilen täglich, 5 GB | Der Slop-Pilot verwendet ausschließlich den im Free-Plan unterstützten SQLite-Typ. Laufende Spielräume und WebSocket-Nachrichten verbrauchen Kontingent. |
| Neon Free | 100 Projekte, je 100 CU-Stunden/Monat, 1 GB DB und 5 GB Datentransfer; Auth bis 60.000 MAU pro Projekt | Häufiges Session-Polling verbraucht Compute/Transfer; Quoten und Suspend-Verhalten beobachten. Kein Upgrade aktivieren. |
| GitHub Actions privat | Free: 12 USD enthaltenes Compute/Monat, 500 MB Artefakte, 10 GB Cache je Repository | Slop hat automatische CI und einen separaten manuellen Deploy mit 10-Minuten-Limit. Private Läufe teilen das Kontingent. Der Hub-Workflow bleibt manuell. |

Cloudflare Workers Builds enthält 3.000 Build-Minuten monatlich im
Free-Plan. Worlds Hub prüft und veröffentlicht über manuell gestartete
GitHub Actions mit dem dafür eingerichteten Token.

## E-Mail, Authentifizierung und Wachstum

Neons gemeinsamer SMTP ist für Entwicklung/Tests; verlässlicher produktiver Versand und Bestätigungslinks benötigen nach Herstellerangaben einen eigenen Mailanbieter. Bestätigungscodes funktionieren auch mit gemeinsamem SMTP, dessen Limits/Deliverability aber keine Produktionsgarantie sind. Ein eigener Sender kann Domain-/DNS-Verifikation und nach Freikontingenten Gebühren erfordern. Keine Mailanbieter oder Domains bestellt.

OIDC-SSO funktioniert grundsätzlich zwischen getrennten `workers.dev`-Hosts über normale Top-Level-Redirects. Jede App hat ihren registrierten Client, exakten Callback und eigene Host-only-Session. Keine gemeinsame kostenpflichtige Domain erforderlich. Eine eigene Domain vereinfacht Markenname und Sender-DNS, ersetzt aber keine App-Session-/Berechtigungsprüfung und verursacht Registrierungs-/Verlängerungskosten. Drittanbieter-Cookies und geteilte Parent-Domain-Cookies sind kein Bestandteil der Architektur.

Der produktive Anmeldeablauf und die gemeinsame Abmeldung sind für alle
vier Projekte bestätigt. Die projektübergreifende Abmeldung nutzt den
bestehenden Hub-Worker. Der Passwort-Reset nutzt den vorhandenen
Anmeldedienst und dessen E-Mail-Zustellung.

Bei Wachstum keine unbemerkten Upgrades: vor Änderung von Auth-MAU-, Compute-, Mail-, Build- oder Storage-Limits die tatsächlichen Tarife und Nutzerfreigabe prüfen. Tagesquoten sind Verfügbarkeitsgrenzen; günstiger Betrieb ist kein Grund, Sicherheitsprüfungen auszulassen. Bestehende HF-Nutzerkontingente bleiben vollständig in Slop Urself und werden nicht über den Hub abgerechnet.

## Primärquellen

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/
- https://neon.com/pricing
- https://neon.com/docs/auth/production-checklist
- https://neon.com/docs/auth/guides/plugins/oauth-provider
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://auth0.com/pricing
