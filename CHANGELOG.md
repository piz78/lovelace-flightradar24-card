# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.7] - 2026-06-10

### Added
- Map card: reset-view control button below the zoom controls — crosshair icon,
  returns the map to the center/zoom configured in the card settings

### Fixed
- Compact card: IATA threshold lowered from 220 px to 160 px — codes now show
  at 6-column mobile width (≈195 px); flags-only only kicks in below 160 px
- HACS / card picker: all three card names updated to "Flightradar Card",
  "Flightradar Card Compact", "Flightradar Card Map"

---

## [0.2.6] - 2026-06-10

### Added
- `flightradar-card` (full detail view) now exposes `getGridOptions()` —
  the Layout tab appears in the card editor so tile size can be adjusted
  without YAML; default `columns: 6, rows: 5`, minimum `columns: 4, rows: 2`

### Changed
- Map card: flight number label is now embedded inside the aircraft icon div
  and absolutely positioned to the LEFT of the badge via
  `right: calc(100% + 5px)` — the icon no longer covers any part of the label
- Map card: the separate second Leaflet marker used solely for labels is removed;
  each aircraft is now a single marker (simpler, fewer DOM nodes)

---

## [0.2.5] - 2026-06-10

### Changed
- Map card: default grid size raised from `rows: 4` to `rows: 6` so the detail
  popup fits without overflowing; can be overridden per card via `grid_options`
- Map card: aircraft icons now rendered as a circular white badge with an
  altitude-colored border — high contrast on any map tile style; icon inside
  the badge is 18 px, badge diameter 30 px
- Map card: flight number labels now display as a white pill (background +
  border-radius + box-shadow) instead of a plain text-shadow, making them
  legible on any background
- Map card: `min-height` of the map wrapper raised to 290 px to match the new
  default row height

---

## [0.2.4] - 2026-06-10

### Fixed
- Map card: Leaflet CSS is now fetched and injected as a `<style>` element
  directly into the shadow root — a `<link>` nested inside a `<div>` in Shadow
  DOM is not reliably applied by browsers, which caused tiles and markers to
  disappear entirely
- Map card: switched CDN from `cdnjs.cloudflare.com` to `cdn.jsdelivr.net` for
  both Leaflet JS and CSS — less likely to be blocked by privacy extensions
- Map card: switched tile layer from CartoDB dark (`basemaps.cartocdn.com`) to
  OpenStreetMap (`tile.openstreetmap.org`) — works without a CDN, never blocked
- Map card: added `invalidateSize()` call via `requestAnimationFrame` after
  Leaflet initialization to fix cases where the container was 0×0 at init time
- Map card: aircraft icon colors updated for contrast on light OSM tiles;
  added white stroke for visibility; icon size increased from 22 px to 26 px
- Map card: map wrapper uses `position: absolute; inset: 0` instead of
  `height: 100%` to fill the container reliably; `min-height: 240px` ensures
  Leaflet always gets real pixel dimensions
- Map card: HUD pill and zoom control colors are now theme-aware (use HA CSS
  variables) instead of hardcoded dark values

---

## [0.2.3] - 2026-06-10

### Fixed
- All four translations (DE, EN, FR, IT) are now bundled inline inside
  `flightradar-card.js` — HACS single-file distribution works correctly without
  requiring a separate `translations/` folder download
- `_loadLang` simplified: bundled languages resolve instantly from the pre-filled
  cache; the fetch path is retained only for additional custom language files

---

## [0.2.2] - 2026-06-10

### Added
- `flightradar-card-map`: new standalone card type — displays nearby flights on an
  interactive Leaflet map with dark CartoDB tile layer
- SVG aircraft icons colored by altitude (ground / low / climb–descent / cruise)
  and rotated by actual heading
- Click a marker to open a detailed popup: flight number, airline, aircraft model,
  optional aircraft photo, origin/destination IATA + city, departure/arrival times
  with delay indicator, altitude (ft + m), ground speed, heading, vertical speed,
  distance from sensor location
- Map card editor fields: entity, title, home airport, center latitude, center
  longitude, zoom level (1–18)
- i18n keys for `lat`, `lon`, `zoom` added to all four translation files (DE, EN, FR, IT)

---

## [0.2.1] - 2025-06-10

### Fixed
- Compact card: container queries now anchor to `:host` with a named container
  (`frc`) instead of `ha-card`, preventing HA's own ancestor containers from
  being used as the measurement reference — IATA codes were incorrectly hidden
  at all card widths on all devices
- Breakpoints adjusted: badge hidden below 500 px, IATA codes hidden below
  220 px (flags only at mobile 6-col ≈ 195 px; codes visible everywhere else)

---

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
