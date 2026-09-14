import type { AppData, CoffeeDrink, PersonProfile } from "@/lib/types";
import { DEFAULT_REGION, KAPFENBERG_WEATHER_LOCATION } from "@/lib/data/defaults";

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
    start: "06:00",
    end: "14:00",
    location: "Bruck an der Mur",
    notes: "Übergabe nicht vergessen.",
    bringItems: ["Dienstausweis", "Brotzeit", "Bequeme Schuhe"],
  };
  const late = {
    label: "Spätschicht Pflege",
    start: "13:30",
    end: "21:30",
    location: "Bruck an der Mur",
    notes: "Parkplatz nutzen.",
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
    // Start/Ziel-Haltestellen bewusst ohne echte Stop-IDs — nur im Admin setzen.
    busStop: {
      name: "Start (Kapfenberg — im Admin setzen)",
      provider: "local",
      departures: [
        // TESTDATEN Region Kapfenberg/Bruck — keine Live-Abfahrten
        { id: "lb1", line: "1", destination: "Kapfenberg Europaplatz [TEST]", time: "07:12" },
        { id: "lb2", line: "1", destination: "Kapfenberg Europaplatz [TEST]", time: "07:42" },
        { id: "lb3", line: "1", destination: "Kapfenberg Europaplatz [TEST]", time: "08:12" },
        { id: "lb4", line: "2", destination: "Schirmitzbühel Ort [TEST]", time: "12:05" },
        { id: "lb5", line: "1", destination: "Kapfenberg Europaplatz [TEST]", time: "15:40" },
        { id: "lb6", line: "1", destination: "Kapfenberg Europaplatz [TEST]", time: "16:10" },
      ],
    },
    tasks: [
      { id: "l1", label: "Hausaufgaben Informatik", done: false, important: true },
      { id: "l2", label: "Sportzeug waschen", done: true, important: false },
      { id: "l3", label: "Buskarte checken", done: false, important: true },
    ],
    defaultBringItems: ["Wasserflasche"],
    weather: {
      summary: "Leicht bewölkt",
      temperatureC: 14,
      clothingTip: "🧥 Jacke empfohlen",
    },
    personalSettings: { preferredCoffee: "espresso", notes: "Schultasche am Abend packen." },
    displayPrefs: { showBus: true, showWeather: true, showCalendar: true, showTasks: true },
    transitPrefs: {
      leadTimeMinutes: 25,
      preferredModes: ["bus"],
      destinationStop: { name: "Ziel (im Admin setzen)" },
      destinationHint: "Europaplatz",
    },
    weatherLocation: { ...KAPFENBERG_WEATHER_LOCATION },
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
      name: "Start (Kapfenberg — im Admin setzen)",
      provider: "local",
      departures: [
        // TESTDATEN Richtung Bruck/Mur — keine Live-Abfahrten
        { id: "bb1", line: "1", destination: "Bruck/Mur Bahnhof [TEST]", time: "05:12" },
        { id: "bb2", line: "1", destination: "Bruck/Mur Bahnhof [TEST]", time: "05:32" },
        { id: "bb3", line: "1", destination: "Bruck/Mur Bahnhof [TEST]", time: "05:52" },
        { id: "bb4", line: "1", destination: "Koloman-Wallisch-Platz [TEST]", time: "14:45" },
        { id: "bb5", line: "1", destination: "Bruck/Mur Bahnhof [TEST]", time: "15:15" },
        { id: "bb6", line: "2", destination: "Kapfenberg Europaplatz [TEST]", time: "18:30" },
      ],
    },
    tasks: [
      { id: "b1", label: "Dienstplan bestätigen", done: false, important: true },
      { id: "b2", label: "Einkaufsliste ergänzen", done: true, important: false },
    ],
    defaultBringItems: [],
    weather: {
      summary: "Kühl und klar",
      temperatureC: 9,
      clothingTip: "🧥 Jacke empfohlen",
    },
    personalSettings: { preferredCoffee: "cappuccino", notes: "Schlüsselbund mit Chip." },
    displayPrefs: { showBus: true, showWeather: true, showCalendar: true, showTasks: true },
    transitPrefs: {
      leadTimeMinutes: 30,
      desiredArrivalHHmm: "06:00",
      preferredModes: ["bus"],
      destinationStop: { name: "Ziel Bruck/Mur (im Admin setzen)" },
      destinationHint: "Bruck",
    },
    weatherLocation: { ...KAPFENBERG_WEATHER_LOCATION },
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
    busStop: {
      name: "Start (im Admin setzen)",
      provider: "local",
      departures: [
        // TESTDATEN Orientierung Apfelmoar — keine Live-Abfahrten
        { id: "hb1", line: "2", destination: "Apfelmoar Einkaufszentrum [TEST]", time: "09:10" },
        { id: "hb2", line: "2", destination: "Apfelmoar Einkaufszentrum [TEST]", time: "10:10" },
        { id: "hb3", line: "2", destination: "Apfelmoar Einkaufszentrum [TEST]", time: "11:10" },
        { id: "hb4", line: "1", destination: "Kapfenberg Europaplatz [TEST]", time: "14:20" },
      ],
    },
    tasks: [
      { id: "h1", label: "Blumen gießen", done: false, important: true },
      { id: "h2", label: "Rezept für Abendessen", done: false, important: false },
    ],
    defaultBringItems: ["Schlüssel", "Telefon"],
    weather: {
      summary: "Sonnig",
      temperatureC: 17,
      clothingTip: "👕 Leichte Kleidung",
    },
    personalSettings: { preferredCoffee: "latte", notes: "Ruhiger Vormittag bevorzugen." },
    displayPrefs: { showBus: true, showWeather: true, showCalendar: true, showTasks: true },
    transitPrefs: {
      leadTimeMinutes: 30,
      preferredModes: ["bus"],
      destinationStop: { name: "Ziel Apfelmoar (im Admin setzen)" },
      destinationHint: "Apfelmoar",
    },
    weatherLocation: { ...KAPFENBERG_WEATHER_LOCATION },
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
  version: 3,
  persons: seedPersons,
  coffeeDrinks: seedCoffeeDrinks,
  region: { ...DEFAULT_REGION },
};
