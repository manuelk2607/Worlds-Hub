# Kostenloser Betrieb und Grenzen

Stand: 2026-11-08. Kein Upgrade, kein kostenpflichtiger Dienst und keine Domain bestellt. Preisquellen am 08.11. erneut gelesen; historische Verbrauchswerte sind keine aktuelle Monatsabrechnung.

## Aktueller Betrieb

- Neon-Organisation `Nebenprojekte`: API bestätigt `plan: free`; zentrale Identity und getrennte QA-Zweige liegen darin. Die zentrale Pilotinstanz enthält das bestätigte Testkonto und sechs öffentliche OAuth-Clients einschließlich des separaten Slop-Piloten. Slop verwendet eine geprüfte Wiederherstellung seiner Datenbank; Produktion bleibt getrennt.
- Cloudflare-Konto im Dashboard geprüft: Account `ec3c070d8e4f88d2fc533d7d797f2daa`, Subdomain `maki26.workers.dev`, 309/100.000 Requests am angezeigten Tag, $0.00 billable usage. Vor Anlage: vier bestehende Anwendungen und kein `worlds-hub`. Danach wurde der gewünschte Worker über Actions erfolgreich bereitgestellt.
- Der Hub verwendet inzwischen eine kostenlose D1 für Sessions, Auth-Limits und Sprachpräferenzen sowie Neon Auth und dessen gemeinsamen Test-Maildienst. Es wurden kein R2/KV, keine KI-Abrechnung und kein kostenpflichtiger Maildienst für den Hub eingerichtet. Der Slop-Pilot verwendet SQLite Durable Objects und simulierte Videos.
- Worlds-Hub ist öffentlich, Slop Urself privat. Das Billing-Dashboard bestätigte vor dem ersten Lauf am 04.11. 0.01 USD / 12.00 USD enthaltenes Compute und 0 GB / 0.5 GB Storage im Free-Plan. Ein aktueller Gesamtverbrauch wurde damit nicht nachgewiesen. Standardrunner öffentlicher Repositories sind laut GitHub separat kostenlos; private Browser-CI und Pilotdeployments teilen das monatliche Kontingent.

## Aktuell dokumentierte Freikontingente

| Dienst | Relevante Grenzen | Konsequenz |
|---|---|---|
| Cloudflare Workers Free | 100.000 Requests/Tag, 10 ms CPU pro Aufruf | Kontoweit mit bestehenden Workern teilen; Limits überwachen. Keine automatische Hochstufung beauftragen. |
| Cloudflare D1 Free | 5 Mio. gelesene / 100.000 geschriebene Zeilen täglich, 5 GB gesamt, 10 Datenbanken | Eine Hub-D1 ist angelegt. Indizierte Sessionabfragen und begrenzte Cleanup-Batches erhalten. |
| SQLite Durable Objects Free | 100.000 Requests und 13.000 GB-s täglich; 5 Mio. gelesene / 100.000 geschriebene Zeilen täglich, 5 GB | Der Slop-Pilot verwendet ausschließlich den im Free-Plan unterstützten SQLite-Typ. Laufende Spielräume und WebSocket-Nachrichten verbrauchen Kontingent. |
| Neon Free | 100 Projekte, je 100 CU-Stunden/Monat, 1 GB DB und 5 GB Datentransfer; Auth bis 60.000 MAU pro Projekt | Häufiges Session-Polling verbraucht Compute/Transfer; Quoten und Suspend-Verhalten beobachten. Kein Upgrade aktivieren. |
| GitHub Actions privat | Free: 12 USD enthaltenes Compute/Monat, 500 MB Artefakte, 10 GB Cache je Repository | Slop hat automatische CI und einen separaten manuellen Deploy mit 10-Minuten-Limit. Private Läufe teilen das Kontingent. Der Hub-Workflow bleibt manuell. |

Cloudflare Workers Builds enthält 3.000 Build-Minuten monatlich im Free-Plan. Die dortige automatische Token-Erstellung verlangt jedoch viele weitere Berechtigungen. Die produktive Umsetzung verwendet deshalb den vom Nutzer genehmigten minimalen eigenen Token und manuell gestartete GitHub Actions innerhalb des verifizierten Kontingents; keine doppelten Builds bei jedem Push.

## E-Mail, Authentifizierung und Wachstum

Neons gemeinsamer SMTP ist für Entwicklung/Tests; verlässlicher produktiver Versand und Bestätigungslinks benötigen nach Herstellerangaben einen eigenen Mailanbieter. Bestätigungscodes funktionieren auch mit gemeinsamem SMTP, dessen Limits/Deliverability aber keine Produktionsgarantie sind. Ein eigener Sender kann Domain-/DNS-Verifikation und nach Freikontingenten Gebühren erfordern. Keine Mailanbieter oder Domains bestellt.

OIDC-SSO funktioniert grundsätzlich zwischen getrennten `workers.dev`-Hosts über normale Top-Level-Redirects. Jede App hat ihren registrierten Client, exakten Callback und eigene Host-only-Session. Keine gemeinsame kostenpflichtige Domain erforderlich. Eine eigene Domain vereinfacht Markenname und Sender-DNS, ersetzt aber keine App-Session-/Berechtigungsprüfung und verursacht Registrierungs-/Verlängerungskosten. Drittanbieter-Cookies und geteilte Parent-Domain-Cookies sind kein Bestandteil der Architektur.

Der dokumentierte Neon-Reauth-Loop betrifft `prompt=login` und `max_age=0`. Im isolierten QA-Zweig wurde dagegen positives `max_age` mit erneuter Anmeldung und signiertem `auth_time` real geprüft. Recovery ist inzwischen mit signierter Zustellung, nativer Rückkehr und echtem QA-Anbieter in Chromium DE und WebKit EN geprüft. Die einzelne Reset-Widerrufsoption wurde anschließend im zentralen Piloten aktiviert. Vollständiger Projekt-Browserpilot, Kontolöschung und projektübergreifender Widerruf bleiben vor dem Cutover nachzuweisen. Es wurde kein Ersatzanbieter eingerichtet. Selbsthosting würde zusätzliche Wartung und einen sicheren Mail-/Recovery-Betrieb erfordern.

Bei Wachstum keine unbemerkten Upgrades: vor Änderung von Auth-MAU-, Compute-, Mail-, Build- oder Storage-Limits die tatsächlichen Tarife und Nutzerfreigabe prüfen. Tagesquoten sind Verfügbarkeitsgrenzen; günstiger Betrieb ist kein Grund, Sicherheitsprüfungen auszulassen. Bestehende HF-Nutzerkontingente bleiben vollständig in Slop Urself und werden nicht über den Hub abgerechnet.

## Primärquellen

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/
- https://neon.com/pricing
- https://neon.com/docs/auth/production-checklist
- https://neon.com/docs/auth/guides/plugins/oauth-provider
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://auth0.com/pricing
