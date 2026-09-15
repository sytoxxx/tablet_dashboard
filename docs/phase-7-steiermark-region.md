# Phase 7 — Steiermark-Region (konfigurierbar)

Siehe auch Store-Doku. Kurzfassung fürs Repo:

## Provider (kein Fan-out)

Steiermark TRIAS → VAO → Wiener Linien (optional) → lokal/Mock (Testdaten).

## Admin

`/einstellungen/bus` — Start/Ziel, Ankunft, Vorlauf, Linie, Modi, aktiv.  
Haltestellen-Suche via `/api/bus/stops` wenn TRIAS/VAO konfiguriert, sonst manuell als Test-Konfiguration.

## ENV

```env
BUS_PROVIDER=auto
VERBUND_STEIERMARK_TRIAS_URL=
VERBUND_STEIERMARK_REQUESTOR_REF=
VAO_API_KEY=
VAO_BASE_URL=
```

Antrag TRIAS: ogdtrias@verbundlinie.at · VAO: start@verkehrsauskunft.at

Ohne Zugang: lokale `[TEST]`-Fahrpläne, nie als Live ausgegeben.
