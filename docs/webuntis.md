# WebUntis (Levi)

## Befund (vor diesem Schritt)
Im Projekt gab es **keinerlei** WebUntis-Code (kein Eingabefeld, keine API-Route, kein Abruf, kein Speicher). Es konnte also nichts „fehlschlagen“ — die Verbindung war nie gebaut. (Vorhanden: „School Jarvis“, ein anderer, eigener Dienst für Lernzusammenfassungen, kein Stundenplan-Import.)

## Gewählte Lösung: privater iCal-Link
- Offiziell unterstützt: WebUntis-Handbuch Kap. 2.4.2 „iCal Kalender Abonnement“ (S. 25–26) und 2.4.3 „ICS Kalender Download“: Der Benutzer veröffentlicht im Profil → Freigaben → „Kalender publizieren“ (bzw. Mein Stundenplan → ⋯ → „iCal-Abo verwalten“) einen **privaten** Link; der Kalender ist „automatisch immer auf dem aktuellen Stand“. Für **Schüler** muss das Modul von der Schule bestellt/freigeschaltet sein (Handbuch: „explizit bestellt werden muss“).
- Nicht gewählt: die inoffizielle JSON-RPC-Schnittstelle (`jsonrpc.do`) — bräuchte Benutzername/Passwort auf unserem Server. Passwörter speichert die App nicht.
- Quelle: <https://www.untis.at/fileadmin/user_upload/WebUntis.pdf> (heruntergeladen und gelesen). Die Hilfeseiten help.untis.at waren für Abrufe gesperrt (403).

## Technik
- `src/lib/untis/ical.ts` — RFC-5545-Leser: Start/Ende (UTC, TZID, schwebend → Wiener Ortszeit), SUMMARY (Fach), LOCATION (Raum), DESCRIPTION (als „info“, uninterpretiert), `STATUS:CANCELLED` (Entfall). Wiederholungsregeln und Ganztagseinträge werden gezählt und als Hinweis ausgegeben, nicht erfunden.
- `src/server/untis/fetch-ical.ts` + `POST /api/untis/timetable` — Abruf **nur serverseitig**: nur https, Host muss `*.webuntis.com` sein (weitere nur über Server-Env `WEBUNTIS_ALLOWED_HOSTS`), keine Zugangsdaten/IP/Ports in der Adresse, Weiterleitungen werden erneut geprüft, 8 s Timeout, 2 MB Limit, Antwort muss mit `BEGIN:VCALENDAR` beginnen. Der Link erscheint nie in Antworten oder Logs. Zugriff nur mit Sitzung (Zugangscode).
- Link-Quelle: Eingabe auf dem Tablet (`/einstellungen/webuntis`, nur nach erfolgreichem Test gespeichert, LocalStorage `coffee-morning-untis-v1`) **oder** Server-Env `WEBUNTIS_ICAL_URL` (dann kein Link im Browser nötig).
- Aktualisierung: alle 15 Min. solange das Dashboard sichtbar ist, plus „Jetzt aktualisieren“. Ein fehlgeschlagener Abruf ersetzt **nie** gute Daten: letzter Erfolg bleibt (auch nach Neuladen), mit „Stand: …“ und Warnhinweis samt Grund; älter als 45 Min. → Hinweis „eventuell veraltet“.
- Anzeige: Levis Dashboard, Block „Schule · WebUntis“ (Heute/Morgen, Beginn, Fach, Raum, „Entfällt“, Info-Text). Nur angezeigt, was der Feed liefert.

## Untersuchung des öffentlichen Stundenplans (HTL Kapfenberg, Stand 09.10.2026)
Geprüft wurde die von dir genannte Adresse und was die WebUntis-Oberfläche der Schule selbst anonym abruft (Netzwerkmitschnitt im Browser + Lesen des öffentlichen Oberflächen-Codes). Nichts wurde umgangen; jede Abfrage entsprach dem, was der Browser ohnehin sendet (`anonymous-school: htl-kapfenberg`).

| Prüfung | Ergebnis |
|---|---|
| `…/WebUntis?school=htl-kapfenberg#/basic/timetablePublic/my-student?date=…&entityId=10161` im Browser ohne Anmeldung | Weiterleitung auf `#/basic/login`. `my-student` ist die **persönliche** Ansicht („Mein Stundenplan“, Schüler 10161) und braucht Anmeldung. Öffentliche Routen heißen laut Oberflächen-Code `timetablePublic/class│student│teacher│room│subject│resource`. |
| `#/basic/timetablePublic` (anonym) | Seite „404 – nicht gefunden“ |
| `GET api/rest/view/v1/app/data` anonym | 200, aber `user: null`, `permissions: []` – der anonyme Besucher hat **keine** Ansichten |
| `GET api/rest/view/v1/timetable/menu` anonym | 404 `NO_TIMETABLES_AVAILABLE_FOR_YOUR_USER` |
| `GET api/rest/view/v1/timetable/entries?…resourceType=STUDENT&resources=10161` anonym | **403 `FORBIDDEN` – „No sufficient rights to access Timetable Data.“** |
| `GET api/rest/view/v1/timetable/filter` anonym | 403 FORBIDDEN |
| `GET api/public/timetable/weekly/pageconfig` anonym | 403 „no right for anonymous user“ |

**Schluss:** Die HTL Kapfenberg gibt **keinen öffentlichen Stundenplan** frei. Ohne Anmeldung sind keine Unterrichtsstunden abrufbar; ein „zweiter Provider für öffentliche Stundenpläne“ hätte bei dieser Schule nichts zu lesen und wurde deshalb nicht gebaut (kein ungetesteter Code). Der Zugriff über die Schnittstelle der angemeldeten Oberfläche oder die JSON-RPC-Schnittstelle bräuchte Levente Zugangsdaten (die Schule nutzt zusätzlich Office-365-Anmeldung) — das ist ausdrücklich ausgeschlossen (keine Passwörter, keine Umgehung).

**Übrig bleibt der private iCal-Link.** Er muss von der Schule für Schüler freigeschaltet sein (WebUntis-Handbuch S. 26: Funktion für Schüler „muss explizit bestellt werden“). Dass bei Levente „iCal-Abo verwalten“ fehlt, passt genau dazu. Nächster Schritt: Schule/WebUntis-Administrator bitten, den iCal-Abruf für Schüler zu aktivieren (Text zum Kopieren auf `/einstellungen/webuntis`).

## Vorrang der WebUntis-Daten (Levi)
Alle Stellen, die Unterricht lesen, gehen über `schoolDayForDate` (`src/lib/school/school-day.ts`): ein echter WebUntis-Tag (`schedule.dated[iso]`) schlägt den manuellen Wochenplan (`schedule.week`). Betrifft: Heute/Morgen, Als Nächstes (Tagesfluss mit echtem Start/Ende), Schulbeginn/-ende, automatische Profilauswahl, Mitnehmen-Liste (Fachregeln auf den echten Fächern), Abendansicht (Start–Ende), Wegplanung/Bus-Zielzeit, Outfit-Signale.
- Entfallene Stunden zählen **nicht** als Schule (kein Schulbeginn, keine Profilwahl, keine Tasche), werden aber durchgestrichen mit „Entfällt“ angezeigt.
- Abgedeckter Zeitraum = das, was der Feed wirklich enthält (höchstens gestern … +14 Tage). Ein Tag ohne Stunden **innerhalb** dieses Zeitraums ist „kein Unterricht“; Tage **außerhalb** fallen auf den manuellen Wochenplan zurück, mit sichtbarem Hinweis „nicht live“.
- Daten älter als 7 Tage werden gar nicht mehr verwendet. Ab 45 Min. ohne erfolgreiches Update und bei jedem fehlgeschlagenen Update steht ein Warnhinweis mit Stand-Zeit.
- Der Overlay ist nur Laufzeit (nie gespeichert); der manuelle Plan bleibt unverändert erhalten.

## Nicht verifiziert (ehrlich)
Es stand **kein echter WebUntis-Link** zur Verfügung. Ungeprüft gegen echte Daten: genaue Felder des echten Feeds (ob Lehrer/Vertretung in SUMMARY/DESCRIPTION stehen, wie „Entfall“ und „Vertretung“ markiert sind), ob die Schule iCal für Schüler freigeschaltet hat. Die Anzeige von Vertretungen hängt davon ab, was der echte Feed enthält.

## Bekannte Grenzen
- Ob Entfall, Vertretung, Raumänderung und Prüfungen im echten Feed als `STATUS:CANCELLED` bzw. in SUMMARY/LOCATION/DESCRIPTION stehen, ist ohne echten Feed ungeprüft. Gezeigt wird nur, was dort steht; „Entfällt“ nur bei `STATUS:CANCELLED`.
- Die Bus-Route (`/api/bus/departures`) rechnet auf dem Server mit dessen Uhr; für Levi (zu Fuß) ohne Folgen.
- Ein Wechsel des Geräts braucht den Link neu (oder `WEBUNTIS_ICAL_URL` auf dem Server).
