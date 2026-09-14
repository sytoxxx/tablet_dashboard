import type { PersonDay, PersonId } from "@/lib/types";

export const profiles: PersonDay[] = [
  {
    id: "levi",
    displayName: "Levi",
    shortName: "Levi",
    greeting: "Guten Morgen, Levi",
    accent: "#2F6F6A",
    timetable: [
      { time: "08:15", subject: "Mathematik", room: "B204" },
      { time: "09:05", subject: "Englisch", room: "A112" },
      { time: "10:10", subject: "Informatik", room: "C301" },
      { time: "11:00", subject: "Sport", room: "Halle" },
    ],
    mitnehmen: ["Laptop", "Sportzeug", "Wasserflasche"],
    nextBus: {
      line: "620",
      destination: "Bahnhof",
      departure: "07:42",
      minutesUntil: 12,
    },
    weather: {
      summary: "Leicht bewölkt",
      temperatureC: 14,
      clothingTip: "Leichte Jacke reicht — kein Regenschirm nötig.",
    },
    calendar: [
      { time: "15:30", title: "Nachhilfe Mathe" },
      { time: "18:00", title: "Abendessen zu Hause" },
    ],
    tasks: [
      { id: "l1", label: "Hausaufgaben Informatik", done: false },
      { id: "l2", label: "Sportzeug waschen", done: true },
      { id: "l3", label: "Buskarte checken", done: false },
    ],
  },
  {
    id: "schwiegermutter",
    displayName: "Schwiegermutter",
    shortName: "SM",
    greeting: "Guten Morgen",
    accent: "#4A5D73",
    timetable: [
      { time: "06:30", subject: "Frühschicht Start", room: "Station 3" },
      { time: "10:00", subject: "Pause", room: "Personalraum" },
      { time: "14:30", subject: "Schichtende", room: "Station 3" },
    ],
    mitnehmen: ["Dienstausweis", "Brotzeit", "Bequeme Schuhe"],
    nextBus: {
      line: "41",
      destination: "Klinik",
      departure: "05:55",
      minutesUntil: 8,
    },
    weather: {
      summary: "Kühl und klar",
      temperatureC: 9,
      clothingTip: "Warme Jacke und Schal — morgens noch frisch.",
    },
    calendar: [
      { time: "16:00", title: "Arzttermin (Privat)" },
      { time: "19:00", title: "Anruf Familie" },
    ],
    tasks: [
      { id: "s1", label: "Medikamente einpacken", done: false },
      { id: "s2", label: "Dienstplan bestätigen", done: false },
      { id: "s3", label: "Einkaufsliste ergänzen", done: true },
    ],
  },
  {
    id: "heidi",
    displayName: "Heidi",
    shortName: "Heidi",
    greeting: "Hallo Heidi",
    accent: "#6B5B4F",
    timetable: [
      { time: "09:00", subject: "Freies Arbeiten", room: "Zuhause" },
      { time: "11:30", subject: "Spaziergang", room: "Park" },
      { time: "14:00", subject: "Kaffee mit Nachbarin", room: "Café Süd" },
    ],
    mitnehmen: ["Schlüssel", "Telefon", "Sonnenbrille"],
    nextBus: null,
    weather: {
      summary: "Sonnig",
      temperatureC: 17,
      clothingTip: "Leichte Kleidung — Sonnencreme nicht vergessen.",
    },
    calendar: [
      { time: "16:30", title: "Garten gießen" },
      { time: "20:00", title: "Serie schauen" },
    ],
    tasks: [
      { id: "h1", label: "Blumen gießen", done: false },
      { id: "h2", label: "Rezept für Abendessen", done: false },
    ],
  },
];

export function getPerson(id: string): PersonDay | undefined {
  return profiles.find((p) => p.id === id);
}

export function isPersonId(id: string): id is PersonId {
  return profiles.some((p) => p.id === id);
}
