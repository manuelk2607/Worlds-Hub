# Bereitgestellte zentrale Pilot-Instanz

Kostenloser Neon-Organisationstarif wurde am 2026-11-04 verifiziert (`plan: free`). Kein Upgrade, keine kostenpflichtigen Dienste. Neue getrennte Instanz; bestehende Produktionsprojekte wurden nicht verändert.

- Organisation: `org-calm-leaf-65751272` (Nebenprojekte)
- Projekt: `snowy-frost-91455200` (Worlds Hub Identity)
- Branch: `br-lingering-bread-bayuzs7v` (`sso-pilot`)
- Datenbank: `worlds_identity`
- Neon Auth: Managed Better Auth aktiviert
- Auth-URL: `https://ep-bold-boat-batl101c.neonauth.c-8.eu-central-1.aws.neon.tech/worlds_identity/auth`
- JWKS: dieselbe Auth-URL plus `/.well-known/jwks.json`
- OAuth-Provider: nach ausdrücklicher Pilotfreigabe aktiviert; fünf getrennte öffentliche Clients mit Consent registriert. Am 08.11. kam der eigene Slop-Pilot-Client mit exakt einer separaten Callback-Origin und Ressource hinzu (identity-clients.json). Ein verifiziertes zentrales Pilotkonto; Hub-RP-Code-/Consent-/Sessionablauf real in Safari erfolgreich. Noch keine bestehenden Welt-Konten produktiv verknüpft.
- Hub-Relying-Party und zentrale Oberfläche im Pilot aktiv; die vier Welten sind noch nicht umgestellt. Keine DB-Zugangsdaten oder Auth-Secrets in Git

Der erste Erstellungsversuch mit explizitem Suspend-Intervall wurde vom Free-Tarif abgelehnt (HTTP 412); Abfrage bestätigte, dass dabei kein Projekt entstanden war. Anschließend wurde genau eine Instanz mit den erlaubten Standardeinstellungen und 0.25 CU angelegt. Keine Bestandsinstanz wurde umkonfiguriert.

## Abnahmegrenzen und Reauth-Nachweis

Die Herstellerdokumentation nennt eine Schleife für `prompt=login` bzw. `max_age=0` beim Fortsetzen des OAuth-Flows. Der gemeinsame Client vermeidet beide Parameter. Am 07.11. bestätigte der echte Anbieter im isolierten QA-Zweig `max_age=300` samt signiertem frischem `auth_time`. Eine gealterte Sitzung mit kürzerem positivem Zeitfenster verlangte erneut die Zugangsdaten und lieferte danach ein geprüftes ID-Token. Die Hub-Oberfläche zeigt bei gealterter Sitzung das Formular, bevor sie den signierten OAuth-Query fortsetzt. Der vollständige projektbezogene Browserpilot mit dualem Eigentumsnachweis bleibt vor produktiver Verknüpfung erforderlich.

Eigene Login- und Consent-Seiten sind zwingend. Diese einschließlich Registrierung/OTP/Recovery/Kontoverwaltung sind mit @neon/auth/server 0.8.2 implementiert. Registrierung, OTP und Hub-Callback sind real bestätigt. Recovery, vollständiger projektübergreifender Logout und die Selbstlöschung bleiben offen; der native `delete-user`-Endpunkt lieferte für zwei synthetische QA-Konten HTTP 404. Eigener Produktions-SMTP wurde nicht eingerichtet.

Der Hub-Client unterstützt bereits den dokumentierten Userinfo-Abruf: Neon-ID-Tokens enthalten kein E-Mail-/Namensprofil. Userinfo muss exakt denselben `sub` wie das signaturgeprüfte ID-Token haben und `email_verified=true` liefern. `resource` wird bei Konfiguration an beide OAuth-Anfragen angefügt; vertrauliche Clients verwenden standardmäßig `client_secret_basic`.

Quelle, vollständig am 2026-11-04 gelesen:
https://neon.com/docs/auth/guides/plugins/oauth-provider

Der aktuelle Upstream-Provider 1.7.12 enthält eine Behandlung frischer Sessions sowie signierten auth_time. Das beweist nicht die Version oder das Verhalten der Managed-Instanz. Deshalb wird die dokumentierte Einschränkung im realen Pilot überprüft; es wird kein definitiver Anbieterfehler behauptet.

Die Discovery-Antwort der eingerichteten Instanz vom 05.11.2026 meldet S256,
RP-initiierten Logout und Backchannel-Logout mit Sitzungs-ID. `auth_time`
steht nicht in den angekündigten Claims. Für die Freigabe der Verknüpfung
ist der tatsächlich signierte Claim im Browser-Pilot maßgeblich.

Nächster Schritt ist der vollständig getrennte Slop-Worker mit wiederhergestellter Testdatenbank und eigenem registrierten Pilot-Client. Token, Ziel und Ablauf sind ausdrücklich freigegeben. Reale Verknüpfung, vorhandene Daten, Spielsitzung und Rücknahme werden dort vor jedem produktiven Cutover geprüft. Weitere Details stehen im aktuellen `PROGRESS.md` und in Slops `docs/WORLDS-PILOT.md`.

## Ausgeführtes Setup

Am 2026-11-04 nach expliziter Freigabe: OTP-Verifikation verpflichtend, Versand bei Registrierung/Anmeldung aktiviert, automatische Anmeldung nach Verifikation aus. Zentrale Hub-Origin registriert; OAuth-Login-/Consent-URLs und fünf Ressourcen/Clients eingerichtet. Neue kostenlose EU-D1 mit vier Tabellen und Ablauf-Indizes angelegt; keine Bestandsdaten migriert. Cookie-Signaturschlüssel direkt in Cloudflare gespeichert; Live-Pilot mit D1 erfolgreich deployt. Eigene Hub-Sitzung nach persönlicher OAuth-Freigabe real bestätigt.
