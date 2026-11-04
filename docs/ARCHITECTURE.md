# Architekturentscheidung und Sicherheitsgrenzen

Stand: 2026-11-04. Entscheidung für die nächste Integrationsphase, kein bereits aktiver IdP.

## Bestand — read-only verifiziert

| Projekt | Repository / geprüfter Commit | Identität / Daten |
|---|---|---|
| Sprachwelten | manuelk2607/Sprachwelten · 933c841 | Next.js/Cloudflare; `@neondatabase/auth/next`; eigenes Neon-Projekt `calm-tooth-60944868`, Branch `br-delicate-field-b96d9qc4`; Managed Better Auth. Beiträge, Audio, Notebooks, Adminrechte an bestehenden IDs. |
| IT-Worlds | manuelk2607/IT-Worlds · 64f71e5 | Astro/Worker, Neon Auth Proxy; eigenes Neon-Projekt `lingering-morning-59761503`, Branch `br-long-violet-ba34agj1`; Progress-UUID referenziert `neon_auth.user`, RLS nutzt `app.user_id`. |
| Slop Urself | manuelk2607/Slop_Urself · 97c07c8 | Worker/Durable Objects und Node-Server, eigenes Neon-Projekt `autumn-leaf-19858358`; kein Neon Auth. `user_profiles`, Passwortschutz soweit vorhanden, signierte Sessions mit `authVersion`. HF-Verbindung an historische Account-ID gebunden. |
| Music-Worlds | Produktive workers.dev-Adresse bestätigt; zugängliches Repository aktuell leer | Frühe Version direkt verlinkt; Auth-Quelltextprüfung noch ausstehend. |

Sprachwelten und IT-Worlds: OAuth Provider laut Neon-API deaktiviert. Slop Urself: Auth-Integration nicht vorhanden (404). Alle drei öffentlichen Homepages antworteten 200. Bestehende Systeme wurden nicht verändert, keine Userdaten ausgelesen. Adventskalender wird nicht eingebunden.

## Gewählte Richtung

Dedizierte zentrale **Neon Managed Better Auth**-Pilotinstanz (bereits separat angelegt, Details in `IDENTITY-PILOT.md`) mit OAuth-Provider/OIDC; ein eigener registrierter Client pro Anwendung einschließlich Hub. Nicht die beiden vorhandenen produktiven Auth-Instanzen ohne Pilot umkonfigurieren. Zentral gespeichert werden nur Identität und Auth-Konfiguration. Vier Projektdatenbanken bleiben getrennt.

Begründung: vorhandene Neon-Infrastruktur, verwalteter Betrieb und dokumentierter OAuth-Provider. Ein auf dem neuesten Stand geprüftes Plugin ist erforderlich: ältere Skill-Unterlagen bezeichnen es noch als nicht verfügbar. Die live gelesene Neon-API zeigt den Konfigurationsendpunkt bereits, deaktiviert. Der Hersteller beschreibt eigene Login-/Consent-Seiten als zusätzlich zu implementierende Voraussetzung. Es handelt sich NICHT um eine fertige Hosted-Login-URL.

Quelle: https://neon.com/blog/managed-better-auth-oauth-provider-mcp (2026-11-02). Vor Provisionierung aktuellen Tarif und Limits kontrollieren. Keine kostenpflichtigen Dienste oder zusätzlichen abrechenbaren Kapazitäten wurden beauftragt. Die Wahl ist wegen der dokumentierten Reauth-Schleife (`prompt=login`/`max_age=0`) vor Produktionsfreigabe anhand des echten Piloten zu bestätigen; ein anderer standardkonformer OIDC-Provider kann ohne Änderung am Projektdatenmodell verwendet werden.

## Request-Ablauf

1. Browser sendet Login-POST an die aktuelle Anwendung. Origin und Fetch Metadata werden geprüft.
2. App erstellt kryptografisch zufällige State-, Nonce-, PKCE- und Browser-Bindungswerte. Nur ein Hash des Browser-Bindungswerts ist der Datenbankschlüssel. Transaktion läuft nach 10 Minuten ab.
3. Top-Level-Redirect zum **einen** IdP. Dessen eigene Sitzung ermöglicht Login ohne erneutes Passwort beim nächsten App-Besuch.
4. App-Callback mit exakter registrierter HTTPS-URL; atomarer Verbrauch der Transaktion. Code wird ausschließlich serverseitig mit PKCE eingelöst.
5. `oauth4webapi` prüft Issuer, Audience, azp, Nonce und Ablauf; JWS-Signatur wird zusätzlich explizit gegen JWKS geprüft. Fehlende Profilclaims werden über Userinfo mit identischem `sub` ergänzt; nicht bestätigte E-Mail-Adressen werden abgelehnt.
6. App erstellt frische opaque Session, widerruft eine alte Session und speichert nur den Cookie-Hash als Schlüssel. Cookie: `__Host-worlds-session`, Secure, HttpOnly, Path=/, SameSite=Lax, kein Domain-Attribut. Maximal 30 Minuten, zusätzlich durch ID-Token-Ablauf begrenzt.
7. `(issuer, sub)` wird in der aktuellen Anwendung auf deren historische lokale Benutzer-ID abgebildet. Ohne Mapping kein Zugriff auf bestehende private Daten. Eigene Rollen-/Objekt-/Adminprüfungen bleiben zwingend.

Kein Session-Token im Querystring, Local Storage oder Cross-App-POST. Lediglich die standardmäßigen kurzlebigen OAuth-Codes/State erscheinen am Callback; Referrer-Policy=no-referrer und no-store gelten dort. Zugriffstokens/Refresh-Tokens/ID-Tokens werden nach der Validierung verworfen, nicht an den Browser ausgegeben und nicht persistent gespeichert. Es gibt keine Refresh-Token-Rotation, weil kein Refresh-Token gehalten wird. Nach Ablauf wird erneut über den IdP angemeldet; dessen aktive Sitzung vermeidet normalerweise eine neue Passworteingabe.

SSO ersetzt KEINE Autorisierung: kein globales Admin-Flag, keine Interpretation von Hub-Claims als projektweite Rollen, kein Lesen fremder Fortschritte.

## Domains

Eine eigene Domain ist für OIDC-Redirect-SSO **nicht zwingend**. Bestehende `workers.dev`-Origins werden einzeln und exakt als Callback-/Logout-/Login-Origins registriert. Wildcards und frei wählbare Redirects sind verboten. Kein Vertrauen auf gemeinsame Parent-Domain-Cookies, Third-Party-Cookies oder unsichtbare iframe-Logins. Die Host-only-Cookies der App funktionieren auch bei getrennten Hosts.

Optional später: `hub.<domain>`, `login.<domain>`, `music.<domain>`, `sprachen.<domain>`, `it.<domain>`, `slop.<domain>`. Das vereinfacht Namen und Betriebszuständigkeit, rechtfertigt aber kein geteilt lesbares Sessioncookie. DNS-/Domainzugang und exakt registrierte Clients bleiben erforderlich. Noch keine Domain angenommen, keine bestehenden URLs umgeleitet.

Cloudflare-Routing: https://developers.cloudflare.com/workers/configuration/routing/workers-dev/

## Logout — tatsächlicher Umfang

- Implementiert: POST + Session-CSRF + Origin; sofortige serverseitige Hub-Session-Löschung, Cookie entfernen, informative Abmeldeseite.
- Implementiert: signierter OIDC-Backchannel-Logout mit Issuer-/Audience-/Algorithmus-/iat-/jti-/Event-Prüfung, Nonce-Ablehnung und Replay-Schutz. Widerruf wird nach Issuer, Subject und optional sid begrenzt.
- Noch NICHT integriert: Provider-Logout, dessen session-spezifisches Verhalten und Zustellung an alle App-Clients. Der aktuelle Hub-Logout beendet nicht automatisch die zentrale IdP- oder andere App-Sitzungen. Die Oberfläche sagt das ausdrücklich.
- Vor einem Versprechen „überall abmelden“ muss der reale Provider RP-Initiated-/Backchannel-Logout unterstützen, jeder App-Client registriert sein und Zustellfehler/Browser-Abbruch getestet werden. Ansonsten App-Sitzungen explizit separat beenden und kurze Ablaufzeiten beibehalten. Kein unsichtbares iframe-Logout als Sicherheitsgarantie.

## Kontoverknüpfung und HF

`packages/auth/linking.ts` definiert den wiederverwendbaren Vertrag; produktive Store-/Reauth-Adapter fehlen noch. Eine zentrale und eine lokale, jeweils höchstens fünf Minuten alte serverseitige Reauthentifizierung sind erforderlich. Proof ist kurzlebig, zufällig, an eine validierte Session gebunden und genau einmal atomar zu verbrauchen. Unique Constraints verhindern Übernahme und mehrfaches Mapping. E-Mail-Adressen sind kein Eingabefeld der Verknüpfungsfunktion.

Slop-Profile ohne Passwort liefern durch bloße Namenseingabe KEINEN ausreichenden Eigentumsnachweis. Solche Profile brauchen eine bestehende gültige Eigentümersitzung plus zusätzlich belastbaren Nachweis (z.B. passende bereits verknüpfte HF-Identität) oder einen geprüften manuellen Wiederherstellungsweg. Im Zweifel keine Verknüpfung.

HF-Tokens bleiben ausschließlich in Slops bestehender HF-Verwaltung, unter derselben historischen Account-ID. Persönliche HF-Identität, Ablauf, Kontingente, gepinnte Jobs, Moderation und Freigaben werden weiterhin dort geprüft. Der neue Guard ist nur eine zusätzliche Vorbedingung, kein Ersatz der bestehenden `requirePlayerHf`-/Quota-/Jobprüfungen.

## Restliche Produktionsanforderungen

- Die zentrale Instanz ist angelegt, aber deren OAuth-Provider bleibt deaktiviert; Login-/Consent-/Verifizierungs-/Recovery-/Kontoverwaltungs-UI ist mit offiziellem SDK vorbereitet und lokal geprüft; echte E-Mail-Zustellung und OAuth-Fortsetzung noch testen.
- Pro App eigene Session-Datenbank/-Secrets; `AUTH_DB` produktiv binden, Schema anwenden, regelmäßige Ablaufbereinigung und Rate Limits konfigurieren.
- TLS, exakte Origins, gesperrte Dynamic Client Registration, minimale Scopes, festgelegter Signaturalgorithmus und vertrauenswürdiger Issuer.
- Reale Wiederherstellung/Backups, Geheimnisrotation, Audit-Aufbewahrung, Überwachung, Schlüsselwechsel und IdP-Ausfall testen.
- Datenauskunft/Löschung und Kontakt-/Datenschutzangaben vervollständigen; kein Kontolöschen ohne projektübergreifenden Datenplan.

Aktuelle vollständige Provider-Dokumentation: https://neon.com/docs/auth/guides/plugins/oauth-provider . Userinfo, `client_secret_basic` und optionales `resource` sind im Client berücksichtigt. Erzwungene Reauthentifizierung bleibt standardmäßig gesperrt; nur nach erfolgreichem echtem Anbieternachweis darf `OIDC_REAUTH_ENABLED=true` gesetzt werden. Der allgemeine Code und die Tests validieren dann den signierten `auth_time`-Claim. Die Pilotinstanz enthält noch keine OAuth-Clients oder Benutzer.
