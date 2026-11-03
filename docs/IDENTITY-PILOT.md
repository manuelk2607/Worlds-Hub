# Bereitgestellte zentrale Pilot-Instanz

Kostenloser Neon-Organisationstarif wurde am 2026-11-04 verifiziert (`plan: free`). Kein Upgrade, keine kostenpflichtigen Dienste. Neue getrennte Instanz; bestehende Produktionsprojekte wurden nicht verändert.

- Organisation: `org-calm-leaf-65751272` (Nebenprojekte)
- Projekt: `snowy-frost-91455200` (Worlds Hub Identity)
- Branch: `br-lingering-bread-bayuzs7v` (`sso-pilot`)
- Datenbank: `worlds_identity`
- Neon Auth: Managed Better Auth aktiviert
- Auth-URL: `https://ep-bold-boat-batl101c.neonauth.c-8.eu-central-1.aws.neon.tech/worlds_identity/auth`
- JWKS: dieselbe Auth-URL plus `/.well-known/jwks.json`
- OAuth-Provider: nicht aktiviert; keine Clients, keine Benutzer, keine App-Verknüpfungen angelegt
- Hub: Auth bleibt deaktiviert; keine DB-Zugangsdaten oder Auth-Secrets in Git

Der erste Erstellungsversuch mit explizitem Suspend-Intervall wurde vom Free-Tarif abgelehnt (HTTP 412); Abfrage bestätigte, dass dabei kein Projekt entstanden war. Anschließend wurde genau eine Instanz mit den erlaubten Standardeinstellungen und 0.25 CU angelegt. Keine Bestandsinstanz wurde umkonfiguriert.

## Konkreter Produktionsblocker

Die aktuelle Herstellerdokumentation nennt ausdrücklich eine Schleife für `prompt=login` bzw. `max_age=0` beim Fortsetzen des OAuth-Flows. Damit ist die geplante zentrale frische OIDC-Reauthentifizierung für sichere Kontoverknüpfung noch nicht produktionsreif belegt. Ohne belastbaren Nachweis darf kein Legacy-Konto verknüpft werden.

Außerdem sind eigene Login- und Consent-Seiten zwingend, es gibt keine standardmäßige Hosted-Login-Seite. Deren Session-Fortsetzung und das Verhalten ohne Drittanbieter-Cookies müssen im echten Pilot geprüft werden. SMTP/Verifikation/Recovery und globaler Logout sind noch offen.

Der Hub-Client unterstützt bereits den dokumentierten Userinfo-Abruf: Neon-ID-Tokens enthalten kein E-Mail-/Namensprofil. Userinfo muss exakt denselben `sub` wie das signaturgeprüfte ID-Token haben und `email_verified=true` liefern. `resource` wird bei Konfiguration an beide OAuth-Anfragen angefügt; vertrauliche Clients verwenden standardmäßig `client_secret_basic`.

Quelle, vollständig am 2026-11-04 gelesen:
https://neon.com/docs/auth/guides/plugins/oauth-provider

Nächster Schritt: isolierte Login-/Consent-Implementierung auf dieser Pilotinstanz und Klärung des Reauth-Limits beim Anbieter bzw. Nachweis eines dokumentierten sicheren Workflows. Bis dahin kein produktiver Cutover, keine Legacy-Migration. Falls das Limit bestehen bleibt, vor Bindung realer Nutzer einen anderen voll geeigneten OIDC-Provider auswählen; keine kostenpflichtige Alternative stillschweigend aktivieren.
