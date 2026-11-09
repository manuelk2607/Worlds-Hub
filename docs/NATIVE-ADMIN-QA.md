# Getrennter Admin-API-Nachweis – erfolgreich durchgeführt

Der bisherige Versuch betraf `/oauth2/create-client` und den normalen
Sitzungswiderruf. Er beweist keine Ablehnung der eigenen Admin-API. Das
installierte `@neon/auth` 0.8.2 führt dafür serverseitig diese POST-Methoden:
`admin/list-user-sessions`, `admin/revoke-user-sessions`, `admin/remove-user`.
Die offizielle Neon-Beschreibung nennt den Admin-Namensraum. Die unten
dokumentierte Prüfung bestätigt jetzt auch seine tatsächliche Freigabe im
isolierten Managed-QA-Dienst.

## Exakte Grenze

Nur Projekt `snowy-frost-91455200`, QA-Zweig `br-jolly-leaf-ba8vt1pe` und
`https://ep-little-recipe-baraxhx4.neonauth.c-8.eu-central-1.aws.neon.tech/worlds_identity/auth`.
Keine primäre Instanz und keine Produktionskonten. Keine Änderung an
Anbieteroptionen, Clients, Origins, Ressourcen, E-Mail-Zustellung oder Rollen
bestehender Nutzer. Kein Tunnel, kein Runtime-Administratorkonto, kein Secret.

Vorbereitet sind `scripts/native-admin-qa.ts` und dessen SDK-Harness. Er kann
keinen anderen Aussteller auswählen. Neue Passwörter, Cookies und mögliche
Sitzungstokens bleiben im Arbeitsspeicher; Logs enthalten nur neue Fixture-IDs,
Stufen und Statuscodes. Der Test ist einmalig auf seine eigenen Ziel-IDs begrenzt.

## Ausdrücklich freigegebener Ablauf

1. Vorhandenen QA-Bestand nur lesen. Drei neue synthetische Konten anlegen:
   Administrator-Kandidat, Zielkonto und Kontrollkonto. Keine E-Mail-Zustellung;
   der bestehende QA-Zweig verlangt keine E-Mail-Bestätigung. Die neuen IDs
   getrennt festhalten und gegen den ursprünglichen Bestand prüfen.
2. Nur dem neuen Kandidaten vorübergehend über die offizielle Verwaltung die
   Rolle `admin` geben. Sie könnte sämtliche Konten dieses QA-Zweigs verwalten;
   deshalb ist diese Erweiterung nicht durch die frühere Clientprüfung gedeckt.
3. Frisch mit dem Kandidaten anmelden und die tatsächliche Rolle prüfen. Für
   das neue Zielkonto zwei Sitzungen lesen und über die SDK-Admin-API widerrufen.
   Beide müssen ungültig sein; die Sitzung des Kontrollkontos muss gültig bleiben.
4. Nur das neue Zielkonto erneut anmelden und über `admin.removeUser` entfernen.
   Ungültige Sitzung und fehlendes Konto unabhängig read-only bestätigen.
   Bei verweigertem Admin-Aufruf sofort stoppen; keine alternative Rechtevergabe
   und keine direkten Änderungen an Provider-Tabellen versuchen.
5. Rolle des neuen Kandidaten garantiert auf `user` zurücksetzen. Seine eigenen
   Sitzungen und die übrigen Fixture-Sitzungen abmelden. Genau die drei neu
   angelegten Konten über die offizielle Verwaltung entfernen, soweit noch
   vorhanden. Danach 0 Konten/0 Sitzungen für diese IDs und unveränderten
   ursprünglichen QA-Bestand separat bestätigen.

Ein Erfolg allein aktiviert weder globale Abmeldung noch Kontolöschung in der
Anwendung. Ein späteres Runtime-Verwaltungskonto würde alle zentralen Identitäten
seines Zweigs verwalten können und benötigt einen eigenen geprüften Entwurf und
eine zusätzliche ausdrückliche Freigabe. Projekt-BFF-Sitzungen benötigen außerdem
eine reale, unterstützte Widerrufsanbindung; keine gefälschten OIDC-Logout-Tokens.

## Tatsächliche Prüfung am 09.11.2026

Die zusätzliche Freigabe für genau diesen Ablauf liegt vor. Drei neue
synthetische Konten wurden erzeugt und ihre IDs gegen die 13 vorhandenen
QA-Konten abgeglichen. Nur der Kandidat erhielt über die offizielle Verwaltung
vorübergehend `admin`. Ein neuer Login und ein direkter Sitzungsabruf bestätigten
seine tatsächliche Rolle. Alle Aufrufe verwendeten das installierte SDK und
ausschließlich die eigenen neuen Fixture-IDs:

- `admin.listUserSessions`: **200**, genau die zwei Sitzungen des Zielkontos.
- `admin.revokeUserSessions`: **200**, beide Zielcookies anschließend ungültig.
- Das Kontrollkonto blieb unabhängig angemeldet.
- Das Zielkonto wurde nochmals angemeldet; `admin.removeUser`: **200**.
  Anschließend war seine Sitzung ungültig. Die getrennte SQL-Nachkontrolle
  bestätigte tatsächlich das entfernte Konto.

Die Kandidatenrolle wurde garantiert auf `user` zurückgesetzt und separat
gelesen. Das Harness meldete 0 Fehler bei der Abmeldung seiner eigenen
Sitzungen und wurde beendet. Die beiden noch vorhandenen neuen Konten wurden
über die offizielle Verwaltung gelöscht; das Zielkonto war bereits entfernt.
Abschließend: **0 neue Konten, 0 zugehörige Sitzungen**. Alle ursprünglichen
13 Konten, Rollen, Zeilenfingerabdrücke und Sitzungszahlen stimmen exakt mit
dem vorab aufgenommenen QA-Bestand überein. Keine Produktionsänderung,
E-Mail-Zustellung, persistente Administratoridentität oder Runtime-Zugangsdaten.

Lokal bestanden 74 Tests, Typprüfung, Lint, Build und Artefaktprüfung, darunter
gezielter Widerruf/Entfernung mit gültigem Kontrollkonto, harter Stopp bei 401
und keine Admin-Aktion ohne frisch bestätigte Rolle. Ein späterer sicherer
Self-Service-Gateway und Widerruf von Projekt-BFFs bleiben gesonderte Arbeit.

Quellen: installierte SDK-Dateien `dist/server.js`/`dist/types.d.ts`,
[Neon SDK](https://github.com/neondatabase/neon-js/blob/main/packages/auth/NEXT-JS.md),
[Better Auth Admin-Vertrag](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/admin.mdx).
