# Begrenzte native Abmeldeprüfung (noch nicht freigegeben)

Ziel ist ausschließlich `snowy-frost-91455200` / `br-jolly-leaf-ba8vt1pe`
(`qa-account-lifecycle-20261107`) und dessen tatsächlicher QA-Aussteller
`https://ep-little-recipe-baraxhx4.neonauth.c-8.eu-central-1.aws.neon.tech/worlds_identity/auth`.
Keine Einstellung des zentralen SSO-Zweigs oder eines produktiven Projekts ändern.

Der normale synthetische Nutzer erhielt bei `/oauth2/create-client` bereits 401.
Die native OpenAPI führt Rückkanal-/Logout-Metadaten auf; die dokumentierte
Verwaltungs-API bietet dafür keine entsprechenden Felder. Die reine Existenz
von Discovery-/OpenAPI-Feldern beweist weder Nutzbarkeit noch Zustellung.

Nach ausdrücklicher Freigabe:

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
