# Zukunft: Notiz von unterwegs nach Hause (NICHT implementiert)

Status: **nur Idee/Roadmap.** Nichts davon ist gebaut.

## Wunsch

Levi (oder jemand anderes) schreibt von unterwegs — Handy/Browser, z. B. aus der Schule — eine kurze Nachricht an Coffee Morning. Sie erscheint zuhause auf dem Tablet.

Beispiele:
- „Bin heute erst um 16:30 zuhause."
- „Bitte Milch kaufen."
- „Muss morgen früher los."

## Später möglich

- Empfänger wählen: Birgit / Heidi / alle
- gelesen / ungelesen
- Zeitstempel
- auffälliger Hinweis (Push / Banner auf dem Tablet)
- sicheres Senden von unterwegs

## Harte Randbedingung: Sicherheit

Das darf **nicht** eine öffentliche, ungeschützte URL/API werden — sonst kann jeder fremde Text auf das Familien-Tablet schreiben.

Vor dem Bau klären:
- **Authentifizierung für Absender** (nicht nur der Geräte-Zugangscode des Tablets): eigener Login pro Person oder signierte, widerrufbare Einmal-/Geräte-Tokens.
- **Rate-Limit und Längenbegrenzung**, Text wird nur als reiner Text angezeigt (kein HTML).
- **Speicherort**: der aktuelle Stand speichert Daten nur im Browser (LocalStorage) — für Nachrichten von einem anderen Gerät braucht es ein serverseitiges Postfach (kleine Datenbank/KV) mit Zugriffsschutz.
- **Abruf durch das Tablet**: authentifiziert (bestehende Session), Polling oder Server-Sent Events.
- **Datenschutz**: Nachrichten haben ein Ablaufdatum und lassen sich löschen.

## Nicht jetzt

Keine API-Route, keine UI, keine Datenstruktur anlegen, bis das Sicherheitsmodell entschieden ist.
