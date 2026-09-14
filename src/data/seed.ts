import type { AppData, CoffeeDrink, PersonProfile } from "@/lib/types";

function leviWeek() {
  const mon = {
    lessons: [
      { id: "lm1", time: "08:15", subject: "Mathematik", room: "B204", bringItems: ["Taschenrechner"] },
      { id: "lm2", time: "09:05", subject: "Englisch", room: "A112" },
      { id: "lm3", time: "10:10", subject: "Informatik", room: "C301", bringItems: ["Laptop"] },
      { id: "lm4", time: "11:00", subject: "Sport", room: "Halle", bringItems: ["Sportzeug"] },
    ],
  };
  const tue = {
    lessons: [
      { id: "lt1", time: "08:15", subject: "Deutsch", room: "A101" },
      { id: "lt2", time: "09:05", subject: "Physik", room: "B210", bringItems: ["Formelsammlung"] },
      { id: "lt3", time: "10:10", subject: "Geschichte", room: "A203" },
      { id: "lt4", time: "11:55", subject: "Kunst", room: "Atelier", bringItems: ["Skizzenbuch"] },
    ],
  };
  const wed = {
    lessons: [
      { id: "lw1", time: "08:15", subject: "Mathematik", room: "B204", bringItems: ["Taschenrechner"] },
      { id: "lw2", time: "09:05", subject: "Biologie", room: "C110" },
      { id: "lw3", time: "10:10", subject: "Englisch", room: "A112" },
      { id: "lw4", time: "11:00", subject: "Musik", room: "M1" },
    ],
  };
  const thu = {
    lessons: [
      { id: "lth1", time: "08:15", subject: "Informatik", room: "C301", bringItems: ["Laptop"] },
      { id: "lth2", time: "09:05", subject: "Chemie", room: "C120", bringItems: ["Schutzbrille"] },
      { id: "lth3", time: "10:10", subject: "Sport", room: "Halle", bringItems: ["Sportzeug"] },
      { id: "lth4", time: "11:55", subject: "Religion", room: "A105" },
    ],
  };
  const fri = {
    lessons: [
      { id: "lf1", time: "08:15", subject: "Deutsch", room: "A101" },
      { id: "lf2", time: "09:05", subject: "Mathematik", room: "B204" },
      { id: "lf3", time: "10:10", subject: "Geografie", room: "A220" },
    ],
  };
  return { mon, tue, wed, thu, fri } as const;
}

function birgitWeek() {
  const early = {
    label: "Frühschicht Pflege",
    start: "06:30",
    end: "14:30",
    location: "Station 3",
    notes: "Übergabe um 14:15 nicht vergessen.",
    bringItems: ["Dienstausweis", "Brotzeit", "Bequeme Schuhe"],
  };
  const late = {
    label: "Spätschicht Pflege",
    start: "13:30",
    end: "21:30",
    location: "Station 3",
    notes: "Parkplatz B nutzen.",
    bringItems: ["Dienstausweis", "Abendbrot"],
  };
  return {
    mon: early,
    tue: early,
    wed: late,
    thu: early,
    fri: early,
  };
}

function heidiWeek() {
  const base = {
    blocks: [
      { id: "hb1", time: "09:00", title: "Freies Arbeiten", place: "Zuhause" },
      { id: "hb2", time: "11:30", title: "Spaziergang", place: "Park", bringItems: ["Sonnenbrille"] },
      { id: "hb3", time: "14:00", title: "Kaffee mit Nachbarin", place: "Café Süd" },
    ],
  };
  const weekend = {
    blocks: [
      { id: "hw1", time: "10:00", title: "Markt", place: "Stadtplatz", bringItems: ["Einkaufstasche"] },
      { id: "hw2", time: "15:00", title: "Garten", place: "Zuhause", bringItems: ["Handschuhe"] },
    ],
  };
  return {
    mon: base,
    tue: base,
    wed: base,
    thu: base,
    fri: base,
    sat: weekend,
    sun: weekend,
  };
}

export const seedPersons: PersonProfile[] = [
  {
    id: "levi",
    name: "Levi",
    avatar: "L",
    hint: "Schule & Bus",
    greeting: "Guten Morgen, Levi",
    accent: "#2F6F6A",
    schedule: { type: "school", week: { ...leviWeek() } },
    appointments: [
      { id: "la1", title: "Nachhilfe Mathe", time: "15:30", weekday: "mon" },
      { id: "la2", title: "Abendessen zu Hause", time: "18:00" },
      { id: "la3", title: "Bandprobe", time: "16:00", weekday: "thu" },
    ],
    busStop: {
      name: "Schulstraße",
      departures: [
        { id: "lb1", line: "620", destination: "Bahnhof", time: "07:12" },
        { id: "lb2", line: "620", destination: "Bahnhof", time: "07:42" },
        { id: "lb3", line: "620", destination: "Bahnhof", time: "08:12" },
        { id: "lb4", line: "12", destination: "Stadtmitte", time: "12:05" },
        { id: "lb5", line: "620", destination: "Bahnhof", time: "15:40" },
        { id: "lb6", line: "620", destination: "Bahnhof", time: "16:10" },
      ],
    },
    tasks: [
      { id: "l1", label: "Hausaufgaben Informatik", done: false },
      { id: "l2", label: "Sportzeug waschen", done: true },
      { id: "l3", label: "Buskarte checken", done: false },
    ],
    defaultBringItems: ["Wasserflasche"],
    weather: {
      summary: "Leicht bewölkt",
      temperatureC: 14,
      clothingTip: "Leichte Jacke reicht — kein Regenschirm nötig.",
    },
    personalSettings: { preferredCoffee: "espresso", notes: "Schultasche am Abend packen." },
  },
  {
    id: "birgit",
    name: "Birgit",
    avatar: "B",
    hint: "Frühschicht",
    greeting: "Guten Morgen, Birgit",
    accent: "#4A5D73",
    schedule: { type: "work", week: birgitWeek() },
    appointments: [
      { id: "ba1", title: "Arzttermin (Privat)", time: "16:00", weekday: "mon" },
      { id: "ba2", title: "Anruf Familie", time: "19:00" },
    ],
    busStop: {
      name: "Klinik Nord",
      departures: [
        { id: "bb1", line: "41", destination: "Klinik", time: "05:25" },
        { id: "bb2", line: "41", destination: "Klinik", time: "05:55" },
        { id: "bb3", line: "41", destination: "Klinik", time: "06:25" },
        { id: "bb4", line: "41", destination: "Bahnhof", time: "14:45" },
        { id: "bb5", line: "41", destination: "Bahnhof", time: "15:15" },
        { id: "bb6", line: "7", destination: "Markt", time: "18:30" },
      ],
    },
    tasks: [
      { id: "b1", label: "Dienstplan bestätigen", done: false },
      { id: "b2", label: "Einkaufsliste ergänzen", done: true },
    ],
    defaultBringItems: [],
    weather: {
      summary: "Kühl und klar",
      temperatureC: 9,
      clothingTip: "Warme Jacke und Schal — morgens noch frisch.",
    },
    personalSettings: { preferredCoffee: "cappuccino", notes: "Schlüsselbund mit Chip." },
  },
  {
    id: "heidi",
    name: "Heidi",
    avatar: "H",
    hint: "Dein Tag",
    greeting: "Hallo Heidi",
    accent: "#6B5B4F",
    schedule: { type: "personal", week: heidiWeek() },
    appointments: [
      { id: "ha1", title: "Garten gießen", time: "16:30" },
      { id: "ha2", title: "Serie schauen", time: "20:00", weekday: "fri" },
    ],
    busStop: null,
    tasks: [
      { id: "h1", label: "Blumen gießen", done: false },
      { id: "h2", label: "Rezept für Abendessen", done: false },
    ],
    defaultBringItems: ["Schlüssel", "Telefon"],
    weather: {
      summary: "Sonnig",
      temperatureC: 17,
      clothingTip: "Leichte Kleidung — Sonnencreme nicht vergessen.",
    },
    personalSettings: { preferredCoffee: "latte", notes: "Ruhiger Vormittag bevorzugen." },
  },
];

export const seedCoffeeDrinks: CoffeeDrink[] = [
  {
    id: "espresso",
    name: "Espresso",
    prepNotes: "Doppelter Schuss, cremig extrahieren. Tasse vorwärmen.",
    amounts: "18 g Kaffee · 36 ml · 1 Tasse",
    steps: [
      "Maschine aufheizen, Tasse vorwärmen",
      "18 g mahlen und tampen",
      "Extraktion starten (~28 Sek.)",
      "Sofort servieren",
    ],
    timerSeconds: 28,
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    prepNotes: "Espresso + samtiger Milchschaum, etwa 1:1:1. Nicht zu heiß.",
    amounts: "18 g · 120 ml Milch · große Tasse",
    steps: [
      "Espresso wie gewohnt ziehen",
      "Milch aufschäumen bis samtig",
      "Milch in den Espresso gießen",
      "Schaumkrone formen",
    ],
    timerSeconds: 45,
  },
  {
    id: "latte",
    name: "Latte",
    prepNotes: "Espresso unten, viel Milch, dünne Schaumschicht oben.",
    amounts: "18 g · 200 ml Milch · Tall Glas",
    steps: [
      "Espresso in das Glas",
      "Milch dampfen (viel Volumen)",
      "Milch langsam eingießen",
      "Dünne Schaumschicht oben",
    ],
    timerSeconds: 55,
  },
];

export const seedAppData: AppData = {
  version: 2,
  persons: seedPersons,
  coffeeDrinks: seedCoffeeDrinks,
};
