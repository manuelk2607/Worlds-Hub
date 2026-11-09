# Begrenzte native Abmeldeprüfung – durchgeführt

Ziel ist ausschließlich `snowy-frost-91455200` / `br-jolly-leaf-ba8vt1pe`
(`qa-account-lifecycle-20261107`) und dessen tatsächlicher QA-Aussteller
`https://ep-little-recipe-baraxhx4.neonauth.c-8.eu-central-1.aws.neon.tech/worlds_identity/auth`.
Keine Einstellung des zentralen SSO-Zweigs oder eines produktiven Projekts ändern.

Der normale synthetische Nutzer erhielt bei `/oauth2/create-client` bereits 401.
Die native OpenAPI führt Rückkanal-/Logout-Metadaten auf; die dokumentierte
Verwaltungs-API bietet dafür keine entsprechenden Felder. Die reine Existenz
von Discovery-/OpenAPI-Feldern beweist weder Nutzbarkeit noch Zustellung.

Ausdrücklich freigegebener Prüfablauf:

1. Genau ein neues synthetisches Konto im QA-Zweig anlegen; Passwort zufällig
   und ausschließlich im Arbeitsspeicher. Keine Nachricht an ein echtes Postfach.
2. Genau diesem Konto vorübergehend Anbieterrolle `admin` geben. Diese Rolle
   könnte alle Konten im QA-Zweig verwalten; keine produktive Rolle wird geändert.
3. Native Registrierung genau eines neuen öffentlichen Testclients versuchen:
   feste QA-Rücksprungadresse, PKCE, kein übersprungenes Consent, keine erweiterten
   Ressourcen oder Scopes. Nur Speicherung/Rücklesen der Logout-Metadaten prüfen.
   Kein neuer Tunnel und keine Zustellung von Tokens an externe Empfänger.
4. Nur den gegebenenfalls neu erzeugten Testclient wieder entfernen. Bereits
   vorhandene Clients nicht ändern oder löschen. Sitzungen des synthetischen
   Kontos abmelden und seine Rolle in einem garantierten Cleanup wieder auf
   `user` setzen; Zustand anschließend separat read-only bestätigen.
5. Nur Statuscodes und akzeptierte Feldnamen berichten. Keine Passwörter,
   Cookies, Tokens oder persönlichen Kontodaten ausgeben/speichern. Vor realer
   Rückkanalzustellung Empfänger und Tokenumfang gesondert konkretisieren.

Diese begrenzte Prüfung kann eine unterstützte Anbieterfunktion bestätigen
oder eine konkrete Grenze nachweisen. Sie allein aktiviert keine globale
Abmeldung und ersetzt keine produktive Abnahme.

## Tatsächliches Ergebnis

Die persönliche Freigabe für genau diese QA-Prüfung liegt vor. Ein neues
synthetisches Konto wurde angelegt, über die offizielle Verwaltung vorübergehend
auf `admin` gesetzt und frisch nativ angemeldet. Der erneute native
Sitzungsabruf bestätigte dieselbe ID und tatsächlich `role=admin`.

Der einmalige Aufruf von `/oauth2/create-client` mit öffentlichem Client,
PKCE-/Code-Konfiguration, festen QA-Zielen und den drei Logout-Metadatenfeldern
lieferte dennoch **HTTP 401 ohne JSON-Felder**. Es wurde kein Testclient angelegt;
Speicherung und Rücklesen der Logout-Metadaten konnten daher nicht geprüft
werden. Weder Clientregistrierung allgemein freigeschaltet noch bestehende
Clients, Origins, Ressourcen oder Auth-Konfigurationen geändert. Dieses Ergebnis
belegt die konkrete Ablehnung dieses nativen Wegs, keine allgemeine Aussage über
jede mögliche Anbieterintegration.

Die Rolle wurde garantiert über die offizielle Verwaltung auf `user`
zurückgesetzt und separat gelesen. Die Abmeldung beendete die frisch angelegte
Sitzung; eine zusätzliche Registrierungssitzung blieb zunächst bestehen.
Zwei ausschließlich auf dieses synthetische Konto beschränkte Versuche des
nativen Sitzungswiderrufs wurden ebenfalls mit 401 abgewiesen. Keine SQL-
Manipulation an nativen Sessions, keine ausgegebenen Zugangsdaten und kein
Tokenversand an einen fremden Empfänger. Nach gesonderter ausdrücklicher
Nutzerfreigabe wurde ausschließlich dieses neu angelegte QA-Konto über
`delete_auth_user` entfernt. Die getrennte read-only Nachkontrolle bestätigt
**0 Konto- und 0 Sitzungszeilen** für seine exakte ID.

Keine produktiven Daten oder persönlichen Konten betroffen. Für die geforderte
globale Abmeldung fehlt weiterhin eine offiziell nutzbare und real geprüfte
Client-/Logout-Anbindung. Keine manuell erzeugten Logout-Tokens oder direkte
Änderung interner Provider-Tabellen als Ersatz verwenden. Die spätere, gesondert
freigegebene Admin-API-Prüfung hat inzwischen einen unterstützten nativen
Sitzungswiderruf und administrative Kontolöschung bestätigt; siehe
`NATIVE-ADMIN-QA.md`. Das ersetzt die noch offene Projekt-BFF-Anbindung nicht.

## Echte Projektanmeldung ohne `sid` am 09.11.2026

Der reguläre Slop-Pilot-Link führte mit der vorhandenen zentralen Sitzung ohne
erneute Passwort-, Code- oder Consent-Eingabe zu `/auth/worlds`. Die Seite
zeigte das bereits verknüpfte Profil Manuel. Der tatsächliche OIDC-Callback
erzeugte im isolierten Slop-Zweig eine neue Projekt-BFF-Sitzung. Read-only
wurden nur gehashte Subject-/Sitzungs-IDs sowie das Vorhandensein der Claims
abgeglichen; keine Zugriffstokens, Cookie-Werte oder Passwörter gelesen.

Der BFF-Datensatz enthält `authenticatedAt`, aber weder `payload.sid` noch
eine `sid`-Spalte mit Wert. Die zentrale Sitzung kann daher bei diesem realen
Anmeldevorgang nicht anhand einer mitgelieferten `sid` zugeordnet werden.
Der pseudonymisierte Subject-Abgleich bestätigte denselben zentralen Nutzer.
Dieser Befund beweist weder allgemeine Anbieter-Unterstützung noch deren
generelle Abwesenheit. Ein angebliches `sid`-Mapping ist kein geeigneter Ersatz
für den noch zu implementierenden tatsächlichen BFF-Widerruf. Keine neue
Freigabe, Kontoverknüpfung, HF-Aktion oder Produktionsänderung durchgeführt.
