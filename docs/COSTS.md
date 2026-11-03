# Kostenloser Betrieb und Grenzen

Stand: 2026-11-04. Kein Upgrade, kein kostenpflichtiger Dienst und keine Domain bestellt.

## Aktueller Betrieb

- Neon-Organisation `Nebenprojekte`: API bestätigt `plan: free`; die getrennte Identity-Pilotinstanz liegt darin. Sie enthält noch keine Benutzer oder aktiven OAuth-Clients.
- Cloudflare-Konto im Dashboard geprüft: Account `ec3c070d8e4f88d2fc533d7d797f2daa`, Subdomain `maki26.workers.dev`, 309/100.000 Requests am angezeigten Tag, $0.00 billable usage. Vor Anlage: vier bestehende Anwendungen und kein `worlds-hub`. Danach wurde der gewünschte Worker über Actions erfolgreich bereitgestellt.
- Landingpage benötigt keine Datenbank, kein R2/KV, keine KI und keine Mailzustellung. Worker-Artefakt: ungefähr 143 KiB, gzip 38 KiB. Auth bleibt deaktiviert.
- GitHub-Repository bleibt privat. Das Billing-Dashboard bestätigte vor dem ersten Lauf 0.01 USD / 12.00 USD enthaltenes Compute und 0 GB / 0.5 GB Storage im Free-Plan. Der erste kurze Actions-Lauf ist erfolgreich und liegt im vorhandenen Kontingent. Die alte Billing-API lieferte 404; die UI wurde als aktuelle Quelle genutzt.

## Aktuell dokumentierte Freikontingente

| Dienst | Relevante Grenzen | Konsequenz |
|---|---|---|
| Cloudflare Workers Free | 100.000 Requests/Tag, 10 ms CPU pro Aufruf | Kontoweit mit bestehenden Workern teilen; Limits überwachen. Keine automatische Hochstufung beauftragen. |
| Cloudflare D1 Free, später für Sessions | 5 Mio. gelesene / 100.000 geschriebene Zeilen täglich, 5 GB gesamt, 10 Datenbanken | Indizierte Sessionabfragen, begrenzte Cleanup-Batches; Datenbankslots vor Anlage prüfen. Aktuell keine D1 für Hub angelegt. |
| Neon Free | 100 Projekte, je 100 CU-Stunden/Monat, 1 GB DB und 5 GB Datentransfer; Auth bis 60.000 MAU pro Projekt | Häufiges Session-Polling verbraucht Compute/Transfer; Quoten und Suspend-Verhalten beobachten. Kein Upgrade aktivieren. |
| GitHub Actions privat | Monatlich im jeweiligen Plan enthaltene Compute-Nutzung; Cache/Artefakte separat begrenzt | Nicht blind als unbegrenzt kostenlos behandeln. Workflow ist manuell, maximal 10 Minuten, ohne Artefakt-Uploads. Vor Nutzung Restbudget prüfen. |

Cloudflare Workers Builds enthält 3.000 Build-Minuten monatlich im Free-Plan. Die dortige automatische Token-Erstellung verlangt jedoch viele weitere Berechtigungen. Die produktive Umsetzung verwendet deshalb den vom Nutzer genehmigten minimalen eigenen Token und manuell gestartete GitHub Actions innerhalb des verifizierten Kontingents; keine doppelten Builds bei jedem Push.

## E-Mail, Authentifizierung und Wachstum

Neons gemeinsamer SMTP ist für Entwicklung/Tests; verlässlicher produktiver Versand und Bestätigungslinks benötigen nach Herstellerangaben einen eigenen Mailanbieter. Bestätigungscodes funktionieren auch mit gemeinsamem SMTP, dessen Limits/Deliverability aber keine Produktionsgarantie sind. Ein eigener Sender kann Domain-/DNS-Verifikation und nach Freikontingenten Gebühren erfordern. Keine Mailanbieter oder Domains bestellt.

OIDC-SSO funktioniert grundsätzlich zwischen getrennten `workers.dev`-Hosts über normale Top-Level-Redirects. Jede App hat ihren registrierten Client, exakten Callback und eigene Host-only-Session. Keine gemeinsame kostenpflichtige Domain erforderlich. Eine eigene Domain vereinfacht Markenname und Sender-DNS, ersetzt aber keine App-Session-/Berechtigungsprüfung und verursacht Registrierungs-/Verlängerungskosten. Drittanbieter-Cookies und geteilte Parent-Domain-Cookies sind kein Bestandteil der Architektur.

Kostenlos allein genügt nicht: Der aktuelle Neon-OAuth-Provider hat einen dokumentierten Reauth-Loop. Deshalb wird er vor einem sicheren realen Pilot nicht als fertiges Produktions-SSO verkauft. Auth0s aktuelle Vergleichstabelle führt Cross-App-SSO bzw. Backchannel-Logout nicht im Free-Plan; es wird daher nicht stillschweigend als kostenlose Ersatzlösung eingerichtet. Selbsthosting verursacht zusätzliche Wartung und benötigt ebenfalls einen sicheren Mail-/Recovery-Betrieb.

Bei Wachstum keine unbemerkten Upgrades: vor Änderung von Auth-MAU-, Compute-, Mail-, Build- oder Storage-Limits die tatsächlichen Tarife und Nutzerfreigabe prüfen. Tagesquoten sind Verfügbarkeitsgrenzen; günstiger Betrieb ist kein Grund, Sicherheitsprüfungen auszulassen. Bestehende HF-Nutzerkontingente bleiben vollständig in Slop Urself und werden nicht über den Hub abgerechnet.

## Primärquellen

- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/
- https://neon.com/pricing
- https://neon.com/docs/auth/production-checklist
- https://neon.com/docs/auth/guides/plugins/oauth-provider
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://auth0.com/pricing
