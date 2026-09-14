import type { PersonDay } from "@/lib/types";

export const birgitDay: PersonDay = {
  id: "birgit",
  kind: "work",
  displayName: "Birgit",
  shortName: "Birgit",
  hint: "Frühschicht",
  greeting: "Guten Morgen, Birgit",
  accent: "#4A5D73",
  timetable: [],
  workShift: {
    label: "Frühschicht Pflege",
    start: "06:30",
    end: "14:30",
    location: "Station 3",
    notes: "Übergabe um 14:15 nicht vergessen.",
  },
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
  tasks: [],
};
