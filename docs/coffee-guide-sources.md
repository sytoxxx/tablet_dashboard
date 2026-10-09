# Kaffee-Anleitung (Ninja Luxe Café Premier ES601EU) — Quellen & Recherche

Gerät: **Ninja Luxe Café Premier, Modell ES601EU** (vom Besitzer bestätigt; EU-Ausgabe der Anleitung = „ES600EU Series“).
Code: `src/lib/coffee/guide/` (Daten + Flow), `src/components/coffee/guide/` (UI), Route `/kaffee/machen`.

> **Wichtige Korrektur (früher falsch):** Die erste Fassung des Guides beruhte auf der **US-Anleitung**. Die US-Ausgabe (und die UK-Ausgabe ES601UK) hat **keine** Heißwasser-Taste. Die **EU-Ausgabe (ES601EU) hat sie** und bietet **Americano**. Der Guide folgt jetzt ausschließlich der EU-Anleitung.

## Quellen

| ID im Code | Quelle | Wofür verwendet | Bilder lokal? |
|---|---|---|---|
| `owners-guide-es600eu` | *ES600 Series Bedienungsanleitung / Owner's Guide*, **EU-Ausgabe** (Deckblatt „ninjakitchen.eu · ES600EU Series“, 181 Seiten, 11 Sprachen; englischer Teil = Seiten 34–50, deutscher Teil = Seiten 18–33). Gelesen über den Seiten-Spiegel <https://www.manualpdf.in/ninja/luxe-cafe-premier-es601/manual> (Seiten als Text + Seitenbild; die Ninja-Seiten selbst und manualslib/manuals.plus waren für automatische Abrufe gesperrt) | **Alle Abläufe**: Bedienfeld mit HOT WATER (S. 36), Sieb/Trichter/Mahlhalterung/Getränkewahl (S. 38), Mahlgrad, Tampen, Americano-Mengen (S. 39), Einspannen, Bezug, Heißwasser (S. 40), Aufschäumen (S. 42) | Ja — nur das Bedienfeld (S. 36), siehe „Bilder“ |
| `owners-guide-es600` | *ES600 Series Owner's Guide*, **US-Ausgabe** (`ES601_IB_43_REV_Mv28`, © 2025, 16 Seiten). <https://cdn.bfldr.com/U447IH35/as/4mjc7t7447v3gj6svz5pwxsq/2845969_Owner-s_Guide> | **Nur als Quelle von Zeichnungen**, die in der EU-Ausgabe *identisch* abgebildet sind (Vektorgrafik → scharf). Keine Textaussage stammt mehr allein aus ihr | Ja (Ausschnitte) |
| `product-photo-es601` | Offizielles Produktfoto `ES601BK_01`. <https://assets.sharkninja.com/image/upload/f_auto/q_auto/SharkNinja-NA/ES601BK_01.jpg> | Teile-Fotos: Mahlhalterung, Brühkopf, Dampfstab; Detail „orange Punkt“ | Ja (Ausschnitte) |
| `wdt-photos-flickr` | *Ground Coffee Stirrer Original* — Caspia Jackmanson, CC BY 2.0. <https://www.flickr.com/photos/djackmanson/52558316160/> | WDT-Werkzeug und Anwendung | Ja (Ausschnitte, Namensnennung im Bild) |
| `recipe-cappuccino` | *Vanilla Cappuccino* — Ninja Test Kitchen. <https://www.sharkninja.com/vanilla-cappuccino/REC15818.html> | Cappuccino: double shot, **5 oz** Milch, THICK FROTH, „ca. 1 Minute“, 8-oz-Tasse | Nein |
| `recipe-latte` | *Cinnamon Latte with Honey* — Ninja Test Kitchen. <https://www.sharkninja.com/cinnamon-latte-with-honey/REC15834.html> | Latte: double shot, **8 oz** Milch, THIN FROTH, 12-oz-Tasse | Nein |

Ebenfalls geprüft (nicht als Quelle verwendet): offizielle UK-Anleitung ES600UK/ES601UK (Argos-PDF, 16 Seiten — **kein** Heißwasser, **kein** Americano), deutsche ninjakitchen.de-Produktseite (nennt Americano nur als Espresso-Variante, keine Heißwasser-Aussage), Testberichte (lecker.de, coffeeblog.co.uk: bestätigen Heißwasser und Americano für die EU-Variante, aber nur als Zweitquelle).

### Was an der EU-Anleitung noch fehlt (ehrlich)
- **Das Original-PDF** von Ninja war nicht abrufbar (Support-Seiten verlangen Anmeldung/„authgate“, Mirror-Seiten liefern 403). Gelesen wurden die **Seitentexte** und die **Seitenbilder (Rasterbild, ca. 140 dpi)** des Spiegels. Daraus folgt: Das EU-**Bedienfeld** ist als Rasterbild vergrößert (etwas weicher als die Vektor-Zeichnungen der US-Ausgabe).
- **Americano-Auswahl am Drehrad:** Die Anleitung nennt Americano in der Sieb-Tabelle (Double: Espresso, Americano, Cold-Pressed; Single: Espresso, Americano; Quad/Luxe: Quad, Americano, Cold-Pressed, Kaffeegetränke) und in der Mengentabelle (Double Americano: 216 / 135 / 108 ml je Stärke), **zeigt das Wort „americano“ aber nicht im Bedienfeld-Bild** (dort stehen espresso / quad / cold-pressed). Dass man „am Drehrad AMERICANO wählt“, ist deshalb aus der Tabelle + dem Satz „die Bedienfeld-Optionen leuchten je nach eingesetztem Sieb“ abgeleitet — **bitte am Gerät bestätigen** (Foto des beleuchteten Bedienfelds).
- **Tampen beim Americano:** Die Anleitung sagt „bei allen Espresso-Getränken tampen“. Der Americano nutzt das Doppelsieb, der Guide behandelt ihn deshalb wie Espresso (inkl. Tampen). Ob TAMP am Gerät beim Americano blinkt, ist **nicht ausdrücklich belegt**.
- **Wo das heiße Wasser herauskommt** (eigener Auslauf oder Brühkopf) und ob der Siebträger dabei eingespannt sein muss, steht nicht im Text. Die Anleitung sagt nur: HOT WATER drücken → Temperatur am Drehrad → START BREW (Start/Stopp), 200 ml ohne Stopp, „Tasse mittig auf den Tassenhalter“. Der Guide sagt nichts weiter dazu.
- **Linien am Milchkännchen:** Der Anleitungstext nennt „Max-/Min-Füllstand“, die Zeichnung zeigt die aufgedruckten Linien „latte“ und „cappuccino“. Dass sie genau die Menge markieren, ist nicht ausdrücklich beschrieben (die Mengen 5/8 oz stammen aus den Ninja-Rezepten).

## Bilder

Alle 34 Bilder liegen **lokal** in `public/coffee-guide/` (keine Hotlinks, offline), erzeugt mit `scripts/build-coffee-guide-images.py` (`venv/bin/python scripts/build-coffee-guide-images.py <Arbeitsordner>`; lädt die Quellen herunter, braucht `pymupdf` und `pillow`). Keine KI-Bilder, keine Bilder anderer Modelle, keine Stockfotos. Verändert wurde nur: zugeschnitten, orange Markierungen (Ring/Rahmen/Pfeil mit weißem Rand) eingezeichnet, die gepunkteten Hilfslinien/Nummern des Handbuchs entfernt. In `jug-line-*` sind zusätzlich das gießende Gefäß und der Milchstrahl der Zeichnung entfernt.

**Rechtlicher Hinweis:** SharkNinja erlaubt laut Nutzungsbedingungen keine Weiterverbreitung seiner Texte, Grafiken und Fotos (Download nur für persönlichen Gebrauch). Die App ist ein **privates Familien-Tablet**; `/coffee-guide/*` liegt hinter dem Zugangscode (`src/middleware.ts`). Vor einer öffentlichen Nutzung die Ninja-Bilder entfernen oder bei SharkNinja anfragen.

### Prüfung gegen die EU-Ausgabe, Bild für Bild

„Identisch“ = in der EU-Anleitung (Seite in Klammern) ist dieselbe Zeichnung bzw. dasselbe Bauteil mit derselben Bedienung und Beschriftung abgebildet. Quelle der Datei = US-Vektorzeichnung (`owners-guide-es600`), EU = Seitenbild der EU-Ausgabe (`owners-guide-es600eu`), Foto = `product-photo-es601`.

| Datei | Zeigt | Ergebnis der EU-Prüfung | Quelle der Datei |
|---|---|---|---|
| `basket-double.png` | Doppelsieb in den Siebträger | identisch (S. 38) → behalten | US S. 5 |
| `funnel-on-portafilter.png` | Trichter aufsetzen | identisch (S. 38) → behalten | US S. 5 |
| `portafilter-in-cradle.png` | Siebträger in der Mahlhalterung | identisch (S. 38) → behalten | US S. 5 |
| `select-espresso.png` | Drehrad, ESPRESSO | **abweichend** (EU-Bedienfeld hat HOT WATER-Taste, andere Beschriftung) → **ersetzt** | EU S. 36 |
| `select-americano.png` | Drehrad, AMERICANO | **neu** (Ring auf dem Drehrad; das Wort „americano“ ist im Handbuchbild nicht abgebildet, siehe oben) | EU S. 36 |
| `grind-dial-display.png` | Mahlgradregler + Anzeige | identisch (S. 39): Regler, Anzeige, Beschriftung CURRENT/RECOMMENDED → behalten | US S. 6 |
| `start-grind.png` | START-GRIND-Taste | identisch (S. 36/39): linke Bedienfeldhälfte (Anzeige, TAMP, START GRIND, STRENGTH) unverändert → behalten | US S. 3 |
| `portafilter-with-funnel.png` | Siebträger herausnehmen | identisch (S. 39) → behalten | US S. 5 |
| `wdt-tool.png`, `wdt-stirring.png` | WDT-Werkzeug / Anwendung | kein Ninja-Teil → unverändert | Flickr CC BY 2.0 |
| `tamping.png` | Tamper in den Trichter | identisch (S. 39) → behalten | US S. 6 |
| `funnel-tamper-removed.png` | Fächer für Trichter/Tamper | gleiche Fächer links (S. 39); Zeichnung ist eine Variante derselben Maschine → behalten | US S. 6 |
| `group-head-lock.png` | Einspannen, oranger Punkt | identisch (S. 40); Detail „insert“-Punkt am Brühkopf aus dem Produktfoto | US S. 7 + Foto |
| `cup-under.png` | Tasse unter dem Siebträger | identisch (S. 40) → behalten | US S. 7 |
| `start-brew.png` | Drehrad START BREW | **abweichend** (EU-Bedienfeld) → **ersetzt** | EU S. 36 |
| `hot-water-select.png` | Taste HOT WATER | **neu** (Ring auf der Taste links neben dem Drehrad; Lage nach Bedienfeld S. 36 und Beschriftung „hot water“ über der dritten Taste S. 39) | EU S. 36 |
| `hot-water-start.png` | Drehrad: Temperatur / START BREW | **neu** | EU S. 36 |
| `jug-line-cappuccino.png`, `jug-line-latte.png` | Kännchen mit aufgedruckter Linie | identisch (S. 42) → behalten | US S. 9 |
| `jug-on-platform.png` | Kännchen auf der Plattform | identisch (S. 42) → behalten | US S. 9 |
| `froth-select-thin.png`, `froth-select-thick.png` | Schaum-Symbole + Bedienfeld | Symbole identisch (S. 42, oben); Bedienfeld **abweichend** (5 Symbole, „milk“ statt „dairy“) → Bedienfeldteil **ersetzt** | US S. 9 (Symbole) + EU S. 36 |
| `start-froth.png` | Finger auf START FROTH | identisch (S. 42) → behalten | US S. 9 |
| `pour-milk.png` | Milch in die Tasse gießen | identisch (S. 42) → behalten | US S. 9 |
| `wand-wipe.png` | Dampfstab abwischen | identisch (S. 42) → behalten | US S. 9 |
| `part-funnel.png`, `part-tamper.png`, `part-portafilter.png` | Trichter, Tamper, Siebträger | Zubehör identisch (S. 36, Nr. 7, 8, 4) → behalten | US S. 3 |
| `part-milk-jug.png` | Das Milchkännchen | identisch (S. 42; Zeichnung ohne gießendes Gefäß) → behalten | US S. 9 |
| `part-cradle.png`, `part-group-head.png`, `part-steam-wand.png` | Mahlhalterung, Brühkopf, Dampfstab | Bauteile laut identischer Handbuchzeichnung gleich; das Foto zeigt das US-Modell (ES601BK) — **nicht ausdrücklich für die EU-Variante bestätigt** | Foto |
| `part-froth-dial.png` | START-FROTH-Taste | **abweichend** (EU-Bedienfeld) → **ersetzt** | EU S. 36 |
| `part-hot-water.png` | Taste HOT WATER | **neu** | EU S. 36 |

**Entfernt, weil sie für die ES601EU nicht gebraucht werden:** `basket-luxe`, `select-classic`, `shake-level` (Classic-Kaffee mit Luxe-Sieb und oz-Größen: „Verlängerter“ ist jetzt Americano bzw. Espresso + Heißwasser) und `hot-water-pour` (Wasserkocher-Bild).

## Was die EU-Anleitung sagt (und wie es in die App kam)

| Thema | Angabe der EU-Anleitung (ES600EU) | Seite |
|---|---|---|
| Bedienfeld | Tasten A–L: Power, START GRIND, Fortschrittsbalken, Schaum-Wahlrad/START FROTH, PURGE, CLEAN, MILK TYPE, SIZE, Mittleres Drehrad/START BREW, **HOT WATER**, STRENGTH, DESCALE | 36 |
| Sieb | Double Basket ab Werk eingesetzt; große Lasche auf große Lasche, fest eindrücken. Double: Espresso, Americano, Cold-Pressed | 38 |
| Trichter, Mahlhalterung | Trichter auf den Siebträger (Kerben), einrasten; Siebträger **mit** Trichter einsetzen, loslassen (wiegt/tariert); danach leuchten die wählbaren Getränke; Getränk am Drehrad wählen | 38 |
| Mahlgrad | Barista Assist empfiehlt eine Größe; mit dem seitlichen Regler CURRENT auf RECOMMENDED stellen; 25 = gröbste, 1 = feinste Stufe; START GRIND → Piepton, Ende → Piepton, **TAMP** blinkt | 39 |
| Tampen | Siebträger mit Trichter herausnehmen, auf feste ebene Fläche (Schutz darunter), Tamper in den Trichter bis er den Trichter berührt; danach Tamper und Trichter links ablegen. Tampen bei allen Espresso-Getränken | 39 |
| Americano | Mengen: Single 122 ml, **Double 216 ml** (Stärke 1) / 135 / 108 ml, Quad 414 / 258 / 207 ml | 39 |
| Bezug | gewähltes Getränk bleibt gewählt; Tasse unter den Siebträger; START BREW; Piepton Start/Ende; nicht ohne Abtropfschale | 40 |
| Einspannen | oranger Punkt auf orangen Punkt, drehen bis Punkt am Lock-Pfeil | 40 |
| **Heißes Wasser** | „HOT WATER ON DEMAND“: 1 HOT WATER drücken, 2 Drehrad für die Temperatur (niedrig / mittel = Standard / hoch), 3 START BREW startet, 4 START BREW stoppt; ohne Stopp **200 ml**; Tasse mittig auf den Tassenhalter | 40 |
| Aufschäumen | Kännchen füllen (nicht über Max), Unterseite trocken, auf Plattform; Froth-Dial: Steamed Milk, Thin, Thick, Extra-Thick*, Cold Foam; MILK/PLANT-BASED; START FROTH; nie direkt in den Espresso; Dampfstab abwischen, nach unten drücken (Auto-Purge) | 42 |

## Unterschiede EU gegenüber US (die den Guide betreffen)

1. **HOT WATER-Taste** (nur EU) → Verlängerter „Besser & manueller“ = Espresso, danach **Heißwasser aus der Maschine** (kein Wasserkocher).
2. **Americano** in der Getränkeliste des Doppelsiebs (nur EU) → Verlängerter „Schnell & einfach“ = **Americano** statt Classic-Kaffee mit Luxe-Sieb.
3. **Bedienfeld** hat eine Taste mehr, Größen als S/M/L/XL statt oz, „milk“ statt „dairy“ → alle Bedienfeld-Bilder aus der EU-Ausgabe.
4. **Tampen:** EU nennt zusätzlich „bei allen Espresso-Getränken sowie L+/XL-Kaffee“; Quad: zweimal tampen (nicht im Guide, da Doppelsieb).

## Nicht verifiziert / bewusst offen

- Siehe „Was an der EU-Anleitung noch fehlt“ oben (Americano-Auswahl, Tampen beim Americano, Ausgabe des Heißwassers, Linien am Kännchen, Fotos der EU-Variante).
- **Milchmengen** (Cappuccino ≈ 5 oz / 150 ml, Latte ≈ 8 oz / 240 ml) stammen aus zwei Ninja-Test-Kitchen-Rezepten der Luxe-Café-Reihe (US, oz), nicht aus der Anleitung. Die Tamper-Schritte der Rezepte wurden nicht übernommen (Premier hat einen separaten Tamper).
- **Latte-Schaumdauer** ist nirgends angegeben; nur das Cappuccino-Rezept nennt „etwa 1 Minute“.
- **Drehrichtung** beim Festdrehen des Siebträgers wird nicht genannt → nur die Endposition („Punkt am Lock-Pfeil“).
- Einstellungen wie Brühtemperatur (SIZE 3 s halten), Wasserfilter, Entkalken und die Erstspülung („Water Flush“) sind **nicht** Teil des Guides.

## Milch-Workflow (nur Cappuccino und Latte)

Erscheint ausschließlich bei Cappuccino und Caffè Latte (`ROUTE_STEPS` in `steps.ts`); Espresso und beide Verlängerten (Americano, Espresso + Heißwasser) haben **keinen** Milchschritt (per Test abgesichert).

| Schritt | Cappuccino | Latte |
|---|---|---|
| Tasse | ca. 240 ml (8 oz) | ca. 350 ml (12 oz) |
| Milch | bis zur unteren Linie „cappuccino“ (Rezept: ca. 5 oz ≈ 150 ml kalte Vollmilch) | bis zur oberen Linie „latte“ (Rezept: ca. 8 oz ≈ 240 ml kalte Vollmilch) |
| Kännchen | trockene Unterseite, auf die Plattform, Dampfstab steckt im Kännchen | gleich |
| Einstellung | Froth-Dial **THICK FROTH**, MILK TYPE MILK/PLANT-BASED | Froth-Dial **THIN FROTH**, MILK TYPE MILK/PLANT-BASED |
| Start/Ende | START FROTH; Piepton = Start, zweiter Piepton = fertig; ca. 1 Minute | gleich (Dauer nicht offiziell angegeben) |
| Zusammenführen | Kännchen aufklopfen/schwenken, über den Espresso gießen | gleich |
| Reinigen | Dampfstab abwischen, nach unten drücken (Auto-Purge) | gleich |

Nicht in die App übernommen: manuelles Aufschäumen (Anleitung S. 9) und „Froth Queuing“ — nur Hands-free-Programme.

## Erweiterungspunkt: einfacher Modus (später, z. B. für Birgit)

Nicht gebaut. Vorbereitet ist die Trennung von Inhalt und Darstellung: Jeder Schritt ist reine Daten (`GuideStep`: Bild-Slot, Teile, kurzer Text) in `src/lib/coffee/guide/steps.ts`, die UI (`guide-step-view.tsx`) rendert nur. Ein späterer Modus braucht (1) ein optionales Feld je Schritt mit dem Ein-Satz-Text („Dieses Teil nehmen.“), (2) einen `mode`-Parameter für `buildGuideFlow`, der diesen Text und weniger Pflichtschritte wählt, (3) eine zweite, bildzentrierte Ansicht. Flow-Logik, Persistenz und Verlauf bleiben unverändert.
