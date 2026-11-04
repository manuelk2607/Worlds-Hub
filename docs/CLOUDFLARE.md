# Produktives Cloudflare-Deployment

- URL: https://worlds-hub.maki26.workers.dev/
- Repository: https://github.com/manuelk2607/Worlds-Hub (privat)
- Worker: `worlds-hub`; Konto `ec3c070d8e4f88d2fc533d7d797f2daa`, bestehender Namespace `maki26.workers.dev`.
- Konfiguration: `wrangler.jsonc`; ausschließlich neue freigegebene Hub-D1, keine KI- oder kostenpflichtigen Servicebindungen. `AUTH_ENABLED=true` ausschließlich für Hub-RP, zentrale Identität als Pilot, `PUBLIC_INDEXING=true`.
- Erster erfolgreicher Lauf: https://github.com/manuelk2607/Worlds-Hub/actions/runs/41741651197
- Source: `47197466126bcd6ac03dc74ca5d9fd771940d32d`
- Cloudflare-Version: `ffe180c9-a53c-4764-a2a1-053bd0f07817`

## Nachvollziehbarer Ablauf

`.github/workflows/cloudflare.yml` läuft ausschließlich über `workflow_dispatch`. Gepinnte Actions-Commits, `contents: read`, maximal 10 Minuten, keine Artefakt-Uploads. Standard `deploy=false` führt Prüfungen aus. Ein produktiver Lauf prüft und deployt denselben Checkout und führt anschließend `npm run smoke` aus.

```sh
gh workflow run cloudflare.yml --repo manuelk2607/Worlds-Hub --ref main -f deploy=true
```

Vor jedem weiteren Lauf das vorhandene freie Actions-Kontingent beachten. Beim ersten Lauf: GitHub Free, 0.01 USD von 12.00 USD verwendet, 0 GB von 0.5 GB Storage. Keine zusätzlichen Kosten oder Upgrades veranlasst. Aktuelle Grenzen in `COSTS.md`.

## Credential und Freigaben

Der Nutzer hat Cloudflare-Zugriff nur zusätzlich auf `manuelk2607/Worlds-Hub` bestätigt. Bestehende GitHub-App-Zuordnungen anderer Projekte wurden nicht verändert. Ein wiederverwendeter `it-worlds`-Build-Token und der breite automatische Cloudflare-Token wurden verworfen; die automatische Prüfung hatte Cross-Projekt-Reuse abgelehnt.

Nach separater ausdrücklicher Genehmigung wurde ein eigener Token `worlds-hub deploy` mit ausschließlich `Workers Scripts: Edit` für das bestehende Konto angelegt, Ablauf **2027-02-02**. Dieses Cloudflare-Recht ist kontoweit und kann technisch auch andere Worker-Scripts bearbeiten; diese Restreichweite wurde vor Freigabe ausdrücklich genannt. Der Workflow nutzt ihn nur für `worlds-hub`.

Der Token liegt ausschließlich verschlüsselt unter `CLOUDFLARE_API_TOKEN` in den Repository-Secrets. Kein Klartext in Dateien/Git/Logs und keine Übernahme in persönliche CLI-Konfiguration. Rechtzeitig vor Ablauf einen gleich begrenzten Token genehmigt rotieren und das Secret aktualisieren; nie stattdessen einen persönlichen Global API Key einsetzen.

Die bestehende lokale Wrangler-Anmeldung ist abgelaufen. Das hat keinen Einfluss auf die erfolgreiche Actions-Bereitstellung. `npm run deploy:check` funktioniert ohne produktiven Zugang.

## Verifikation

44 Tests, Typprüfung, ESLint, Build, Dependency-Audit, Worker-Upload und produktive Smoke-Tests erfolgreich. Alle fünf öffentlichen Seiten, Konto, Styles/Script, robots.txt, Sitemap, Canonicals, OG, 404 und die deaktivierten SSO-Routen wurden real abgerufen. HTTP liefert 308 zur gewünschten HTTPS-Adresse; HTTPS liefert 200 mit gültiger Zertifikatsprüfung. Live-Browseransicht funktioniert ohne Konsolenfehler.

Die ursprüngliche Sites-Veröffentlichung bleibt private Zusatzvorschau. Cloudflare Workers Builds wurde nicht mit einem breiten automatisch erzeugten Token aktiviert; die Produktion verwendet den geprüften GitHub-Actions-Weg.

Aktualisierte Landingpage/Music-Verknüpfung und deaktivierte Identity-Komponenten: Actions 41802178235, Source ea28a97, erfolgreich einschließlich 44 Tests und Live-Smoke.

## Isolierter Identity-Pilot

Neue D1 worlds-hub-auth, UUID e9da655e-ef44-457b-8b85-d1d6268456e4, EU-Jurisdiktion; Schema ausschließlich dort über die Dashboard-Konsole angewandt und Tabellen/Indizes verifiziert. Der begrenzte Deploy-Token erhält keine zusätzlichen D1-Verwaltungsrechte. Binding nutzt die bekannte UUID. Cookie-Signatur wird ausschließlich auf ausdrücklichen Workflow-Aufruf initialisiert; bestehende Schlüssel bleiben erhalten.

Hub-Pilot Source 266f937, Actions 41804879438, Version 4b6de522-078c-4f9d-a8e4-22de0c575f82: 45 Tests und Produktions-Smoke erfolgreich. Echte Safari-Abnahme: verifiziertes zentrales Konto, persönliche OAuth-Freigabe, signaturgeprüfter Code-/Token-/Userinfo-Ablauf, `/konto` zeigt eigene aktive Hub-Sitzung. Welten noch nicht produktiv umgestellt.
