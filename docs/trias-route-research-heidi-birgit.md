# TRIAS-Routenanalyse — Heidi & Birgit

Stand: 2026-09-15 · nur Recherche, **keine** Profil-/Dashboard-Änderungen.

Endpoint: `http://ogdtrias.verbundlinie.at:8183/stv/trias`  
Provider: Verbund Steiermark OGD · `IncludeRealtimeData=true` bei StopEvent  
Wiederholen: `node scripts/probe-trias-routes.mjs`

## Was die App heute kann

| Fähigkeit | Status |
|-----------|--------|
| `LocationInformationRequest` (Haltestellen) | produktiv |
| `StopEventRequest` (Abfahrtstafel) | produktiv |
| `TripRequest` (Tür-zu-Tür / Umstieg / Fußweg) | **nur experimentell bestätigt**, nicht in der App verdrahtet |
| 3 nächste Verbindungen mit Ankunft/Umstieg/Losgehzeit | **fehlt** (braucht TripRequest + UI) |

---

## Heidi — Kapfenberg Europaplatz → Apfelmoar

### Start (echt)

| Feld | Wert |
|------|------|
| Name | Europaplatz |
| Ort | Kapfenberg |
| StopPointRef | `at:46:6005` |

### Apfelmoar-Zielhaltestellen (Kandidaten aus TRIAS)

| Haltestelle | StopPointRef | Von Europaplatz laut TripRequest |
|-------------|--------------|----------------------------------|
| Einkaufszentrum | `at:46:30537` | **Direkt** Linie 1, ~12 Min, 0 Umstieg |
| Viktor-Adler-Straße | `at:46:7893` | **Direkt** Linie 1, ~10 Min, 0 Umstieg |
| Waldbrunnerhof | `at:46:4490` | Bus bis Viktor-Adler-Straße + **~7 Min Fuß** |
| Rainweg | `at:46:4459` | Bus bis Viktor-Adler-Straße + **~10 Min Fuß** |

### Relevante Linie

- **Linie 1**, Richtung **„Apfelmoar Einkaufszentrum“**
- StopEvent am Europaplatz zeigt diese Destination mehrfach; Realtime teilweise vorhanden

### Nächste Verbindungen (Snapshot TripRequest → Einkaufszentrum)

Zeiten wie von TRIAS geliefert (UTC/`Z`). Snapshot vom Analysezeitpunkt:

| # | Abfahrt Europaplatz | Ankunft Einkaufszentrum | Linie | Richtung | Realtime | Verspätung | Ausfall | Umstieg |
|---|---------------------|-------------------------|-------|----------|----------|------------|---------|---------|
| 1 | 11:38Z (planned) | 11:50Z | 1 | Apfelmoar Einkaufszentrum | nein (nur Fahrplan) | — | nein | 0 |
| 2 | 11:53Z | 12:05Z | 1 | Apfelmoar Einkaufszentrum | ja (Est.=Plan) | 0 | nein | 0 |
| 3 | 12:08Z | 12:20Z | 1 | Apfelmoar Einkaufszentrum | ja (Est.=Plan) | 0 | nein | 0 |

Gleicher Takt Richtung Viktor-Adler-Straße (Ankunft ~2,5 Min früher).

### Sinnvollste Apfelmoar-Haltestelle (Datenlage, nicht Profil-Entscheidung)

- **Einkaufszentrum (`at:46:30537`)**: Endhaltestelle der Linie 1, Direktfahrt, kürzeste reine Buszeit ohne zusätzlichen Fußweg laut TripRequest.
- **Viktor-Adler-Straße**: ebenfalls Direktfahrt, etwas früher; sinnvoll wenn das Ziel näher an dieser Straße liegt.
- Rainweg / Waldbrunnerhof: laut TripRequest **nicht** als Einstieg/Ausstieg der Direktfahrt gewählt — TRIAS schlägt Ausstieg Viktor-Adler + Fußweg vor.

### Losgehzeit

- TRIAS liefert bei Stop-Origin **keinen** Fußweg von zu Hause zum Europaplatz.
- Losgehzeit = Abfahrt − `walkToStopMinutes` (Profil) — noch nicht verdrahtet für „3 nächste Verbindungen“.

### Realtime

**Ja**, für einen Teil der Abfahrten (`EstimatedTime` vorhanden; im Snapshot oft = Timetable).

---

## Birgit — Kapfenberg Europaplatz → Pflegeverband Bruck/Mur

### Start

Europaplatz Kapfenberg · `at:46:6005`

### Endziel in TRIAS

**Kein** Treffer für „Pflegeverband Bruck/Mur“ als Stop/POI/Adresse.

Falsch-positive Suche „Pflegeverband“ → u. a. Pflegerbrücke (Grödig) — **nicht** verwenden.

Nächster klarer TRIAS-Stop in der Nähe des genannten Kontexts:

| Name | StopPointRef | Ort | Rolle |
|------|--------------|-----|-------|
| Altersheimgasse | `at:46:6056` | Bruck an der Mur | Bushaltestelle / Zwischenpunkt — **nicht** das Endziel „Pflegeverband“ |

Fußweg Pflegeverband ↔ Altersheimgasse: **nicht** als TRIAS-POI ableitbar (kein Pflegeverband-Punkt).

### Mögliche Zwischenhaltestellen / Umstiege (echte TripRequest → Altersheimgasse)

**Beste gefundene Variante (kürzeste Dauer im Snapshot, 1 Umstieg):**

1. Linie **1** Europaplatz → Koloman-Wallisch-Platz (Nord) Bruck/Mur (`at:46:2063…`)
2. Umstieg → Linie **12** → Altersheimgasse  
   Dauer ~26 Min, Realtime vorhanden

**Alternative A (mehr Bus, 2 Umstiege):**

1. Linie **180** → Mürzbrücke  
2. Linie **810** → Forstschule  
3. Linie **810** → Altersheimgasse  
   Dauer ~29 Min

**Alternative B:**

1. Linie **180** → Mürzbrücke  
2. Linie **810** → Forstschule  
3. **~13 Min Fuß** nach Altersheimgasse

**Alternative C (ohne zweiten Bus):**

1. Linie **1** → Koloman-Wallisch-Platz  
2. **~20 Min Fuß** nach Altersheimgasse

**Direkt zum Koloman-Wallisch-Platz** (ohne Altersheimgasse): Linie 1 oder 180, 0–1 Umstieg — Zwischenziel, nicht Pflegeverband.

### Fußweg zum Pflegeverband

Aus TRIAS **nicht** belegt (kein Zielpunkt). Muss später manuell/geo geklärt werden; bis dahin nur bis Altersheimgasse oder Koloman-Wallisch-Platz modellierbar.

---

## Technisch — Lücken

Direkt verfügbar:

- Haltestellensuche + Abfahrtstafel + (experimentell) TripRequest mit TimedLeg / ContinuousLeg / Interchange

Fehlt in der App:

1. `TripRequest`-Builder + Parser (produktive Module)
2. API für „nächste N Verbindungen“ Start→Ziel
3. Aggregation: Abfahrt, Ankunft, Linie, Richtung, Realtime, Delay, Cancel, Umstieg, Fußwege
4. Losgehzeit (Walk-to-stop)
5. Zielgebiet „Apfelmoar“ vs. konkrete StopPointRef (Policy)
6. Endziel Pflegeverband ohne TRIAS-POI (Adresse/Koordinaten oder manueller Fußweg-Offset)

Skript: `scripts/probe-trias-routes.mjs` (strukturiertes JSON, kein Voll-XML-Log).
