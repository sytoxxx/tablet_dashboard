import type { PersonDay } from "@/lib/types";

export const heidiDay: PersonDay = {
  id: "heidi",
  kind: "personal",
  displayName: "Heidi",
  shortName: "Heidi",
  hint: "Dein Tag",
  greeting: "Hallo Heidi",
  accent: "#6B5B4F",
  timetable: [
    { time: "09:00", subject: "Freies Arbeiten", room: "Zuhause" },
    { time: "11:30", subject: "Spaziergang", room: "Park" },
    { time: "14:00", subject: "Kaffee mit Nachbarin", room: "Café Süd" },
  ],
  workShift: null,
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
};
