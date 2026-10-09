/**
 * The instruction the user pastes into ChatGPT together with the photo of the roster.
 * It makes ChatGPT answer in exactly the format `parseWorkPlanText` reads.
 */
export const CHATGPT_INSTRUCTION = `Analysiere diesen fotografierten Arbeitsplan.

Erstelle eine vollständige Liste aller Kalendertage des betreffenden Monats für die angegebene Person.

Format:

Person: ...
Monat: ...

TT.MM.JJJJ | HH:MM-HH:MM | Arbeit
TT.MM.JJJJ | HH:MM-HH:MM | Nachtdienst
TT.MM.JJJJ | Frei
TT.MM.JJJJ | Urlaub
TT.MM.JJJJ | Krankenstand
TT.MM.JJJJ | Unklar

Erfinde keine Daten.
Lies die Legende des Plans.
Verwechsle keine Mitarbeiter.
Überprüfe jeden Kalendertag.
Wenn etwas unleserlich ist, schreibe Unklar.

Gib ausschließlich die strukturierte Liste aus.`;

export const TEXT_IMPORT_EXAMPLE = `Person: Heidi
Monat: Oktober 2026

01.10.2026 | 06:00-12:00 | Arbeit
02.10.2026 | Frei
03.10.2026 | 06:00-12:00 | Arbeit
04.10.2026 | Urlaub
05.10.2026 | 07:00-14:00 | Arbeit`;
