# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2025-06-01

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
