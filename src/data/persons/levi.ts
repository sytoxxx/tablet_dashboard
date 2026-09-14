import type { PersonDay } from "@/lib/types";

export const leviDay: PersonDay = {
  id: "levi",
  kind: "school",
  displayName: "Levi",
  shortName: "Levi",
  hint: "Schule & Bus",
  greeting: "Guten Morgen, Levi",
  accent: "#2F6F6A",
  timetable: [
    { time: "08:15", subject: "Mathematik", room: "B204" },
    { time: "09:05", subject: "Englisch", room: "A112" },
    { time: "10:10", subject: "Informatik", room: "C301" },
    { time: "11:00", subject: "Sport", room: "Halle" },
  ],
  workShift: null,
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
};
