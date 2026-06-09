# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.0] - 2025-06-09

### Added
- `flightradar-card-compact`: new standalone card type — always renders the compact
  layout, no config toggle needed, appears separately in the HA card picker
- HA grid layout support via `getGridOptions()`: default `columns: 6, rows: 1`,
  minimum `columns: 6, rows: 1` — card size is controlled directly in the
  dashboard Layout tab (Sections layout required)
- Progressive airport display via CSS container queries:
  - > 560 px — IATA code + country flag + airline badge (full)
  - 420–560 px — IATA code + country flag
  - < 420 px — country flag only
- Compact card empty/error state is a single inline line, keeping the card
  at `rows: 1` height even when no flights are present

### Changed
- Compact view extracted from `flightradar-card` into its own card type
  `flightradar-card-compact` — use that type instead of `compact: true`
- Compact card flight row: single line per flight —
  icon + flight number + origin IATA/flag → destination IATA/flag + airline badge
- Airport labels in compact card: IATA code + flag only — no city names,
  no aircraft registration
- Compact card header padding tightened for a better fit at `rows: 1`

### Removed
- `compact` config option removed from `flightradar-card`
  (use `flightradar-card-compact` instead)
- `compact` editor key removed from all four translation files (DE, EN, FR, IT)

---

## [0.1.0] - 2025-06-01

### Added
- Full card view with departure/arrival times, altitude and ground speed
- Compact list view for showing many flights in minimal space
- Home airport awareness — icon changes based on flight direction
  (`airplane-takeoff`, `airplane-landing`, `airplane`)
- Visual card editor via `ha-form` (entity picker, toggles, action editor)
- `tap_action` support: `navigate`, `more-info`, `url`, `call-service`
- i18n system with lazy-loaded translation files
- Bundled translations: German 🇩🇪, English 🇬🇧, French 🇫🇷, Italian 🇮🇹
- HA theme-aware styling (light + dark mode via CSS variables)
- Robust `compact` boolean parsing (handles `true`/`"true"`)
