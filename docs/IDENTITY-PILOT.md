# Bereitgestellte zentrale Pilot-Instanz

Kostenloser Neon-Organisationstarif wurde am 2026-11-04 verifiziert (`plan: free`). Kein Upgrade, keine kostenpflichtigen Dienste. Neue getrennte Instanz; bestehende Produktionsprojekte wurden nicht verändert.

- Organisation: `org-calm-leaf-65751272` (Nebenprojekte)
- Projekt: `snowy-frost-91455200` (Worlds Hub Identity)
- Branch: `br-lingering-bread-bayuzs7v` (`sso-pilot`)
- Datenbank: `worlds_identity`
- Neon Auth: Managed Better Auth aktiviert
- Auth-URL: `https://ep-bold-boat-batl101c.neonauth.c-8.eu-central-1.aws.neon.tech/worlds_identity/auth`
- JWKS: dieselbe Auth-URL plus `/.well-known/jwks.json`
- OAuth-Provider: nach ausdrücklicher Pilotfreigabe aktiviert; fünf getrennte öffentliche Clients mit Consent registriert (identity-clients.json). Ein verifiziertes zentrales Pilotkonto; Hub-RP-Code-/Consent-/Sessionablauf real in Safari erfolgreich. Noch keine bestehenden Welt-Konten verknüpft.
- Hub-Relying-Party und zentrale Oberfläche im Pilot aktiv; die vier Welten sind noch nicht umgestellt. Keine DB-Zugangsdaten oder Auth-Secrets in Git

Der erste Erstellungsversuch mit explizitem Suspend-Intervall wurde vom Free-Tarif abgelehnt (HTTP 412); Abfrage bestätigte, dass dabei kein Projekt entstanden war. Anschließend wurde genau eine Instanz mit den erlaubten Standardeinstellungen und 0.25 CU angelegt. Keine Bestandsinstanz wurde umkonfiguriert.

## Konkreter Produktionsblocker

Die aktuelle Herstellerdokumentation nennt ausdrücklich eine Schleife für `prompt=login` bzw. `max_age=0` beim Fortsetzen des OAuth-Flows. Damit ist die geplante zentrale frische OIDC-Reauthentifizierung für sichere Kontoverknüpfung noch nicht produktionsreif belegt. Ohne belastbaren Nachweis darf kein Legacy-Konto verknüpft werden.

Eigene Login- und Consent-Seiten sind zwingend, es gibt keine standardmäßige Hosted-Login-Seite. Diese einschließlich Registrierung/OTP/Recovery/Kontoverwaltung sind inzwischen mit @neon/auth/server 0.8.2 implementiert und lokal geprüft. Deren Session-Fortsetzung und das Verhalten ohne Drittanbieter-Cookies müssen im echten Pilot geprüft werden. SMTP/Verifikation/Recovery und globaler Logout sind noch offen.

Der Hub-Client unterstützt bereits den dokumentierten Userinfo-Abruf: Neon-ID-Tokens enthalten kein E-Mail-/Namensprofil. Userinfo muss exakt denselben `sub` wie das signaturgeprüfte ID-Token haben und `email_verified=true` liefern. `resource` wird bei Konfiguration an beide OAuth-Anfragen angefügt; vertrauliche Clients verwenden standardmäßig `client_secret_basic`.

Quelle, vollständig am 2026-11-04 gelesen:
https://neon.com/docs/auth/guides/plugins/oauth-provider

Der aktuelle Upstream-Provider 1.7.12 enthält eine Behandlung frischer Sessions sowie signierten auth_time. Das beweist nicht die Version oder das Verhalten der Managed-Instanz. Deshalb wird die dokumentierte Einschränkung im realen Pilot überprüft; es wird kein definitiver Anbieterfehler behauptet.

Nächster Schritt: das in PILOT-ACTIVATION.md konkretisierte, vom Nutzer am 2026-11-04 freigegebene isolierte Setup ausführen und den echten Ablauf prüfen. Bis dahin kein produktiver Cutover, keine Legacy-Migration. Falls das Limit bestehen bleibt, vor Bindung realer Nutzer einen anderen voll geeigneten OIDC-Provider auswählen; keine kostenpflichtige Alternative stillschweigend aktivieren.

## Ausgeführtes Setup

Am 2026-11-04 nach expliziter Freigabe: OTP-Verifikation verpflichtend, Versand bei Registrierung/Anmeldung aktiviert, automatische Anmeldung nach Verifikation aus. Zentrale Hub-Origin registriert; OAuth-Login-/Consent-URLs und fünf Ressourcen/Clients eingerichtet. Neue kostenlose EU-D1 mit vier Tabellen und Ablauf-Indizes angelegt; keine Bestandsdaten migriert. Cookie-Signaturschlüssel direkt in Cloudflare gespeichert; Live-Pilot mit D1 erfolgreich deployt. Eigene Hub-Sitzung nach persönlicher OAuth-Freigabe real bestätigt.
