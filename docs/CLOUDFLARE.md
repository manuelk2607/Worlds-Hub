# Deployment nach worlds-hub.maki26.workers.dev

Repository: https://github.com/manuelk2607/Worlds-Hub (privat)

Worker-Konfiguration: `wrangler.jsonc`, Name `worlds-hub`, Konto `ec3c070d8e4f88d2fc533d7d797f2daa`, `workers_dev=true`. Origin, Canonicals, Sitemap und strukturierte Daten verwenden die gewünschte Adresse. Kein Domainkauf, keine Änderung an bestehenden Workern.

## Geprüfter Zustand

- Vorhandenes Cloudflare-Dashboard ist angemeldet; Account und Subdomain stimmen überein. Vollständige Worker-Liste zeigt die bestehenden drei Workers und eine Pages-Anwendung; `worlds-hub` ist noch nicht angelegt. Öffentliche URL antwortete 404.
- CLI-Credential unter der bestehenden Wrangler-Konfiguration ist abgelaufen und konnte nicht erneuert werden. Keine Tokens aus Logs oder verschlüsselten Dateien extrahiert.
- Wrangler 4.157.0 ist als gelockte Entwicklungsabhängigkeit installiert. `npm run deploy:check` bündelt erfolgreich; keine kostenpflichtigen Bindings werden angelegt.
- Der nächste Dashboard-Schritt „Continue with GitHub“ wurde durch automatische Freigabeprüfung abgelehnt. Grund: eine mögliche neue GitHub-Zugriffsberechtigung für Cloudflare verlangt ausdrückliche Bestätigung des konkreten Repository-Zugriffs. Kein Umgehungsversuch, keine zusätzliche App-Berechtigung erteilt.

## Bevorzugter Weg: Cloudflare Workers Builds

Nach ausdrücklicher Freigabe bestehende GitHub-Integration nur für `manuelk2607/Worlds-Hub` verwenden. Keine Berechtigung für weitere Repositories hinzufügen. Konto, freien Build-Tarif und Quoten im Dashboard bestätigen.

- Repository: `manuelk2607/Worlds-Hub`
- Produktionsbranch: `main`
- Worker-/Projektname: `worlds-hub`
- Root-Verzeichnis: `/`
- Node-Version: 26 (Buildvariable `NODE_VERSION=26`)
- Build: `npm run check`
- Deploy: `npx wrangler deploy`
- Keine zusätzlichen Datenbank-, KI- oder kostenpflichtigen Servicebindungen

Cloudflare verwaltet seine Build-Deployment-Credentials; kein Token ins Repository kopieren. Das Dashboard liefert Build-Logs, commit-genaue Deployments und Rollback-Revisionen. Falls die GitHub-App den Zugriff auf alle Repositories ausweiten möchte, vor dieser zusätzlichen Freigabe stoppen.

## Optional: GitHub Actions

`.github/workflows/cloudflare.yml` ist ausschließlich manuell startbar (`workflow_dispatch`), benötigt maximal 10 Minuten und verwendet gepinnte Actions-Commits. Standard `deploy=false` führt nur Prüfungen aus. Keine automatischen Runnerkosten auf jeden Push.

Für Deployment erst freies Actions-Kontingent bestätigen und einen minimal berechtigten Cloudflare-Token als Repository-Secret `CLOUDFLARE_API_TOKEN` hinterlegen. Token nur für dieses Cloudflare-Konto/benötigte Worker-Script-Rechte ausstellen. Token-Erstellung bzw. neue Zugriffsberechtigung explizit freigeben lassen. Nicht den breiten persönlichen OAuth-Token kopieren. Der Account-Identifier ist öffentlich konfigurierte Routinginformation, kein Geheimnis.

Nach Einrichtung:

```sh
gh workflow run cloudflare.yml --repo manuelk2607/Worlds-Hub -f deploy=true
```

CLI-Direktdeployment nach bestätigter Wiederanmeldung: `npm run check`, `npm run deploy:cloudflare`, `npm run smoke`. Das Smoke-Skript prüft tatsächliches HTTPS, Status, Canonicals, Metadaten, fünf Sitemap-URLs, private noindex/no-store-Header, Projektlinks, 404 und deaktivierte SSO-Routen.

## Private Sites-Vorschau

Die bereits bestätigte private Vorschau unter `https://worlds-hub-maki.divinelynx3.chatgpt.site` ist kein Ersatz für die gewünschte Cloudflare-Adresse. Sie bleibt privat; die öffentliche Freigabefrage für diese andere Adresse ist durch die Nutzerpräzisierung gegenstandslos. Diese Publikation wird für die Produktion nicht weiterverwendet.
