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
      { id: "lw1", time: "08:15", subject: "Werkstättenunterricht", room: "WS1", bringItems: ["Schutzbrille"] },
      { id: "lw2", time: "09:05", subject: "Werkstatt Praxis", room: "WS1" },
      { id: "lw3", time: "10:10", subject: "Werkstatt Praxis", room: "WS2" },
      { id: "lw4", time: "11:55", subject: "Fertigungstechnik", room: "WS2" },
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
  const office = {
    label: "Büro / Termine",
    start: "09:00",
    end: "17:00",
    location: "Apfelmoar",
    notes: "Ruhiger Start.",
    bringItems: ["Schlüssel", "Telefon"],
  };
  const early = {
    label: "Früher Termin",
    start: "08:30",
    end: "16:30",
    location: "Apfelmoar",
    notes: "Etwas früher starten.",
    bringItems: ["Schlüssel", "Telefon"],
  };
  return {
    mon: office,
    tue: early,
    wed: office,
    thu: office,
    fri: office,
  };
}

export const seedPersons: PersonProfile[] = [
  {
    id: "levi",
    name: "Levi",
    avatar: "L",
    hint: "Schule",
    greeting: "Guten Morgen, Levi",
    accent: "#2F6F6A",
    schedule: { type: "school", week: { ...leviWeek() } },
    appointments: [
      { id: "la1", title: "Nachhilfe Mathe", time: "15:30", weekday: "mon" },
      { id: "la2", title: "Abendessen zu Hause", time: "18:00" },
      { id: "la3", title: "Bandprobe", time: "16:00", weekday: "thu" },
      { id: "la4", title: "Referat Elektrotechnik", time: "10:10", weekday: "tue" },
    ],
    // School commute is walking — no bus stop required for morning leave-time.
    busStop: null,
    tasks: [
      { id: "l1", label: "Hausaufgaben Informatik", done: false, important: true },
      { id: "l2", label: "Sportzeug waschen", done: true, important: false },
      { id: "l3", label: "Schultasche checken", done: false, important: true },
    ],
    defaultBringItems: ["Wasserflasche"],
    weather: {
      summary: "Leicht bewölkt",
      temperatureC: 14,
      clothingTip: "Eine dünne Jacke reicht.",
      afternoonTempC: 18,
      afternoonLabel: "14:00",
    },
    personalSettings: { preferredCoffee: "espresso", notes: "Schultasche am Abend packen." },
    // No bus on the school commute — leave-time comes from walking travel plan.
    displayPrefs: { showBus: false, showWeather: true, showCalendar: true, showTasks: true },
    transitPrefs: {
      enabled: false,
      travelMode: "walking",
      leadTimeMinutes: 10,
      desiredArrivalHHmm: "07:45",
      desiredArrivalEndHHmm: "07:50",
      destinationLabel: "HTL Kapfenberg",
      destinationStop: { name: "HTL Kapfenberg" },
      walkToStopMinutes: 10,
      stopToWorkMinutes: 0,
      preparationMinutes: 5,
      safetyBufferMinutes: 0,
      preferredModes: [],
    },
    weatherLocation: { ...KAPFENBERG_WEATHER_LOCATION },
  },
  {
    id: "birgit",
    name: "Birgit",
    avatar: "B",
    hint: "Arbeit",
    greeting: "Guten Morgen, Birgit",
    accent: "#4A5D73",
    schedule: { type: "work", week: birgitWeek() },
    appointments: [
      { id: "ba1", title: "Arzttermin (Privat)", time: "16:00", weekday: "mon" },
      { id: "ba2", title: "Anruf Familie", time: "19:00" },
    ],
    busStop: {
      name: "Kapfenberg Europaplatz",
      provider: "auto",
      externalId: "at:46:6005",
      departures: [
        // Offline-Fallback — Live kommt über TRIAS TripRequest
        { id: "bb1", line: "1", destination: "Bruck/Mur Koloman-Wallisch-Platz [TEST]", time: "05:12" },
        { id: "bb2", line: "1", destination: "Bruck/Mur Koloman-Wallisch-Platz [TEST]", time: "05:32" },
        { id: "bb3", line: "1", destination: "Bruck/Mur Koloman-Wallisch-Platz [TEST]", time: "05:52" },
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
      clothingTip: "Jacke empfehlenswert.",
      afternoonTempC: 14,
      afternoonLabel: "14:00",
    },
    personalSettings: { preferredCoffee: "cappuccino", notes: "Schlüsselbund mit Chip." },
    displayPrefs: { showBus: true, showWeather: true, showCalendar: true, showTasks: true },
    transitPrefs: {
      enabled: true,
      travelMode: "bus",
      leadTimeMinutes: 30,
      preferredModes: ["bus"],
      preferredLines: ["1", "12", "180", "810"],
      destinationLabel: "Pflegeverband Bruck/Mur",
      // TRIAS transit stop — not the end destination label above
      destinationStop: {
        name: "Altersheimgasse",
        externalId: "at:46:6056",
      },
      destinationHint: "Bruck",
      walkToStopMinutes: 12,
      stopToWorkMinutes: 8,
      preparationMinutes: 15,
      safetyBufferMinutes: 5,
    },
    weatherLocation: { ...KAPFENBERG_WEATHER_LOCATION },
  },
  {
    id: "heidi",
    name: "Heidi",
    avatar: "H",
    hint: "Arbeit",
    greeting: "Hallo Heidi",
    accent: "#6B5B4F",
    schedule: { type: "work", week: heidiWeek() },
    appointments: [
      { id: "ha1", title: "Garten gießen", time: "16:30" },
      { id: "ha2", title: "Serie schauen", time: "20:00", weekday: "fri" },
    ],
    busStop: {
      name: "Kapfenberg Europaplatz",
      provider: "auto",
      externalId: "at:46:6005",
      departures: [
        // Offline-Fallback — Live kommt über TRIAS TripRequest
        { id: "hb1", line: "1", destination: "Apfelmoar Einkaufszentrum [TEST]", time: "08:10" },
        { id: "hb2", line: "1", destination: "Apfelmoar Einkaufszentrum [TEST]", time: "08:25" },
        { id: "hb3", line: "1", destination: "Apfelmoar Einkaufszentrum [TEST]", time: "08:40" },
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
      clothingTip: "Eine dünne Jacke reicht.",
      afternoonTempC: 22,
      afternoonLabel: "14:00",
    },
    personalSettings: { preferredCoffee: "latte", notes: "Ruhiger Vormittag bevorzugen." },
    displayPrefs: { showBus: true, showWeather: true, showCalendar: true, showTasks: true },
    transitPrefs: {
      enabled: true,
      travelMode: "bus",
      leadTimeMinutes: 25,
      preferredModes: ["bus"],
      preferredLines: ["1"],
      destinationLabel: "Apfelmoar Einkaufszentrum",
      destinationStop: {
        name: "Apfelmoar Einkaufszentrum",
        externalId: "at:46:30537",
      },
      destinationHint: "Apfelmoar",
      walkToStopMinutes: 8,
      stopToWorkMinutes: 5,
      preparationMinutes: 20,
      safetyBufferMinutes: 5,
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
