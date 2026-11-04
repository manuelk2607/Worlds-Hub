# Konkretes Freigabepaket: isolierter Worlds-Hub-SSO-Pilot

**Vom Nutzer am 2026-11-04 ausdrücklich freigegeben; Ausführung steht noch aus.** Die automatische Freigabeprüfung hat am 2026-11-04 die Änderung der Neon-E-Mail-/Authentifizierungseinstellungen zunächst ohne ausdrückliche Zustimmung abgelehnt; die anschließende konkrete Freigabe liegt nun vor. Die Landingpage läuft unabhängig weiter. Keine Änderungen an produktiven Auth-Instanzen oder alten Benutzerkonten.

## Vorbereitete und geprüfte Komponenten

`@neon/auth/server` 0.8.2 als offizieller BFF-/Cookie-Proxy. Eigene Oberflächen für Anmeldung, Registrierung, Bestätigungscode, Recovery, Namensverwaltung, Logout und OAuth-Consent. Kein Raw-Sessiontoken im JSON/Browser-Storage; Origin + browsergebundener CSRF, erlaubte Endpunktliste, 12-KiB-Bodylimit, feste Callbackziele und DB-basierte Limits vor dem Providerzugriff. Geschlossene Flags bei fehlender Konfiguration. Keine Drittanbieter-Cookies nötig: Die zentrale Login-Oberfläche ist eine normale Top-Level-Seite mit eigenen Host-only-Cookies; die Projekt-Apps behalten getrennte OIDC-Sessions.

Die lokale Browserprüfung wurde ausdrücklich ohne echte Anmeldung durchgeführt. Sie beweist Layout/Formularwechsel und zugängliche Felder, keinen produktiven Neon-Login. Der echte Pilot folgt erst nach Freigabe und Einrichtung.

## 1. Neue Neon-Pilotinstanz absichern

Ausschließlich Projekt `Worlds Hub Identity` (`snowy-frost-91455200`), Branch `sso-pilot` (`br-lingering-bread-bayuzs7v`), Datenbank `worlds_identity`.

- Email/password bleibt eingeschaltet.
- Bestätigungsmethode `otp`.
- `require_email_verification=true`.
- `send_verification_email_on_sign_up=true`.
- `send_verification_email_on_sign_in=true`.
- `auto_sign_in_after_verification=false`.
- Nur neue Registrierungen/Anmeldeversuche auf dieser Instanz können die gewünschten Bestätigungsmails auslösen. Keine vorhandenen Nutzer werden angeschrieben, keine Testmail an fremde Adressen. Der Pilot nutzt den bereits vorhandenen kostenlosen Neon-Maildienst; keine SMTP-/Domainbestellung.
- Erlaubte Login-/Consent-Origin: `https://worlds-hub.maki26.workers.dev`.

## 2. OAuth-Provider und getrennte Clients

Login-Seite `https://worlds-hub.maki26.workers.dev/identity/login`, Consent-Seite `/identity/consent`. Kein MCP, keine Dynamic Client Registration. OpenID Code Flow mit PKCE S256, nur `openid profile email`, keine Refresh-/Offline-Scopes. Jeweils eigener registrierter Client, Consent eingeschaltet, keine Wildcard-Redirects.

| Client | Redirect | Ressourcen-Identifier |
|---|---|---|
| Worlds Hub | https://worlds-hub.maki26.workers.dev/auth/callback | https://worlds-hub.maki26.workers.dev/api |
| Music-Worlds | https://music-worlds.maki26.workers.dev/auth/callback | https://music-worlds.maki26.workers.dev/api |
| Sprachwelten | https://sprachwelten.maki26.workers.dev/auth/callback | https://sprachwelten.maki26.workers.dev/api |
| IT-Worlds | https://it-worlds.maki26.workers.dev/auth/callback | https://it-worlds.maki26.workers.dev/api |
| Slop Urself | https://slopurself.maki26.workers.dev/auth/callback | https://slopurself.maki26.workers.dev/api |

Die Registrierung dieser Clients verändert noch keine alte Anwendung. Deren Routen/Auth-Flags werden erst nach eigenständiger Implementierung und Pilotabnahme ergänzt. Bestehende IDs, Berechtigungen, Fortschritte und HF-Zuordnungen bleiben unberührt.

## 3. Kostenlose Hub-Session-D1

Dashboard bestätigt aktuell **0 von 10 Datenbanken**, keine Reads/Writes und $0.00 billable usage. Eine neue isolierte Datenbank `worlds-hub-auth` im kostenlosen Kontingent anlegen, ausschließlich als `AUTH_DB` an Worker `worlds-hub` binden.

Nur die vier neuen Tabellen aus `migrations/0001_auth.sql` und `0002_identity_rate_limits.sql`: Login-Transaktionen, Hub-Sessions, Logout-Replay-IDs und kurzlebige Rate-Buckets mit gehashten IP-Schlüsseln. Keine Projektinhalte, Passwörter oder HF-Tokens. Stundenweise Ablaufbereinigung mit maximal 500 Löschungen je Tabelle/Aufruf; keine alte Datenbank migrieren.

## 4. Cookie-Signatur und gestufte Aktivierung

Ein neuer zufälliger Cookie-Signaturschlüssel wird per ausdrücklich angefordertem Actions-Schritt direkt in Cloudflare als `IDENTITY_COOKIE_SECRET` erzeugt. Keine Ausgabe, keine Datei, keine Ablage in Git. Existierender Schlüssel wird nicht überschrieben. Der Schritt ist standardmäßig deaktiviert.

Nach Konfiguration zuerst nur die zentrale Pilotoberfläche aktivieren. `AUTH_ENABLED` und erzwungene OIDC-Reauthentifizierung bleiben aus, bis der echte Login/Code-/Userinfo-/Signaturablauf geprüft ist. Anschließend kann zunächst der Hub als Relying Party aktiviert werden. Ein bestehender Dienst wird danach in einer isolierten Umgebung angebunden; produktive alte Auth-Konfigurationen bleiben bis zur Abnahme erhalten.

## Noch real zu beweisen

E-Mail-Zustellung und OTP-Verifikation, passwortloser Wechsel zwischen mindestens zwei echten App-Clients über OIDC, Subject-/Rollenbindung, Kontoverknüpfung, Recovery und Logout. Kein Nutzer- oder Adminzugriff allein durch gleiche E-Mail-Adressen.

Die Neon-Dokumentation nennt einen Reauth-Loop bei `prompt=login`/`max_age=0`. Der aktuelle Upstream-Provider 1.7.12 enthält inzwischen eine Behandlung frischer Sessions und signierten `auth_time`. Das beweist noch nicht die Version/Funktion der Managed-Instanz. Deshalb tatsächlichen Pilot prüfen und frische Eigentumsnachweise bis dahin gesperrt lassen. Ein expliziter zentraler Logout mit neuer normaler Anmeldung ist eine zu prüfende standardmäßige Alternative, kein Anlass, ID-Token-Zeitstempel oder E-Mail-Adressen ungeprüft als Eigentumsnachweis zu verwenden.
