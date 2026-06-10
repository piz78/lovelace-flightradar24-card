// ── i18n ─────────────────────────────────────────────────────────────────────
//
// Translations are loaded from /local/translations/flightradar-card.{lang}.json
// and cached at module level. English is bundled inline as fallback so the card
// always works — even without a network round-trip.

const _FALLBACK = {
  editor: {
    entity:       'Entity',
    title:        'Card title',
    home_airport: 'Home airport',
    tap_action:   'Tap action',
    lat:          'Map center latitude',
    lon:          'Map center longitude',
    zoom:         'Map zoom level',
  },
  editor_helper: {
    entity:       'FlightRadar24 sensor entity',
    home_airport: 'IATA code or city name (e.g. ZRH or Zurich)',
    lat:          'Latitude of the map center (e.g. 47.463)',
    lon:          'Longitude of the map center (e.g. 8.778)',
    zoom:         'Zoom level 1–18 (default 11)',
  },
  card: {
    title_default:    'Flights nearby',
    no_flights:       'No flights in the area',
    entity_not_found: 'Entity not found',
    departure:        'Departure',
    arrival:          'Arrival',
    altitude:         'Altitude',
    speed:            'Speed',
  },
};

// All supported languages are bundled inline so HACS single-file distribution
// works without downloading the translations/ folder separately.
const _CACHE = {
  en: _FALLBACK,
  de: {
    editor: {
      entity:       'Entity',
      title:        'Kartentitel',
      home_airport: 'Heimflughafen',
      tap_action:   'Tippen-Aktion',
      lat:          'Karte Mittelpunkt Breitengrad',
      lon:          'Karte Mittelpunkt Längengrad',
      zoom:         'Kartenausschnitt',
    },
    editor_helper: {
      entity:       'FlightRadar24 Sensor-Entity',
      home_airport: 'IATA-Code oder Stadtname (z. B. ZRH oder Zürich)',
      lat:          'Breitengrad des Kartenzentrums (z. B. 47.463)',
      lon:          'Längengrad des Kartenzentrums (z. B. 8.778)',
      zoom:         'Zoomstufe 1–18 (Standard 11)',
    },
    card: {
      title_default:    'Flüge im Bereich',
      no_flights:       'Keine Flüge im Bereich',
      entity_not_found: 'Entity nicht gefunden',
      departure:        'Abflug',
      arrival:          'Ankunft',
      altitude:         'Flughöhe',
      speed:            'Geschw.',
    },
  },
  fr: {
    editor: {
      entity:       'Entité',
      title:        'Titre de la carte',
      home_airport: 'Aéroport local',
      tap_action:   'Action au toucher',
      lat:          'Latitude du centre de la carte',
      lon:          'Longitude du centre de la carte',
      zoom:         'Niveau de zoom',
    },
    editor_helper: {
      entity:       'Entité du capteur FlightRadar24',
      home_airport: 'Code IATA ou nom de ville (ex. GVA ou Genève)',
      lat:          'Latitude du centre de la carte (ex. 47.463)',
      lon:          'Longitude du centre de la carte (ex. 8.778)',
      zoom:         'Niveau de zoom 1–18 (défaut 11)',
    },
    card: {
      title_default:    'Vols à proximité',
      no_flights:       'Aucun vol dans la zone',
      entity_not_found: 'Entité introuvable',
      departure:        'Départ',
      arrival:          'Arrivée',
      altitude:         'Altitude',
      speed:            'Vitesse',
    },
  },
  it: {
    editor: {
      entity:       'Entità',
      title:        'Titolo della scheda',
      home_airport: 'Aeroporto di casa',
      tap_action:   'Azione al tocco',
      lat:          'Latitudine del centro della mappa',
      lon:          'Longitudine del centro della mappa',
      zoom:         'Livello di zoom',
    },
    editor_helper: {
      entity:       'Entità del sensore FlightRadar24',
      home_airport: 'Codice IATA o nome della città (es. ZRH o Zurigo)',
      lat:          'Latitudine del centro della mappa (es. 47.463)',
      lon:          'Longitudine del centro della mappa (es. 8.778)',
      zoom:         'Livello di zoom 1–18 (predefinito 11)',
    },
    card: {
      title_default:    'Voli nelle vicinanze',
      no_flights:       "Nessun volo nell'area",
      entity_not_found: 'Entità non trovata',
      departure:        'Partenza',
      arrival:          'Arrivo',
      altitude:         'Quota',
      speed:            'Velocità',
    },
  },
};

// Resolve the folder containing flightradar-card.js so translations can be
// placed right next to it regardless of where the file is served from.
const _BASE = (() => {
  for (const s of document.querySelectorAll('script[src]')) {
    if (s.src.includes('flightradar-card')) {
      return s.src.replace(/\/[^/?#]+\.js[^/]*$/, '');
    }
  }
  return '/local';
})();

async function _loadLang(lang) {
  if (_CACHE[lang]) return _CACHE[lang];
  // DE/EN/FR/IT are pre-bundled above; this path handles custom languages only.
  try {
    const r = await fetch(`${_BASE}/translations/flightradar-card.${lang}.json`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    _CACHE[lang] = await r.json();
  } catch {
    _CACHE[lang] = _FALLBACK;
  }
  return _CACHE[lang];
}


// ── Visual Editor ─────────────────────────────────────────────────────────────
//
// Uses HA's built-in <ha-form> component so the editor automatically renders
// the correct input type per field (entity-picker, toggle, text, action-editor).
// Labels and helper texts come from the translation files via computeLabel /
// computeHelper callbacks.

class FlightRadarCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._i18n = _FALLBACK;
  }

  setConfig(config) {
    this._config = config;
    this._sync();
  }

  set hass(hass) {
    this._hass = hass;
    _loadLang(hass.language || 'en').then(t => { this._i18n = t; this._sync(); });
  }

  _schema() {
    return [
      { name: 'entity',       required: true, selector: { entity: { domain: 'sensor' } } },
      { name: 'title',                        selector: { text: {} } },
      { name: 'home_airport',                 selector: { text: {} } },
      { name: 'tap_action',                   selector: { 'ui-action': {} } },
    ];
  }

  _sync() {
    if (!this._hass || !this._config) return;

    // Create <ha-form> once; update its properties on subsequent calls.
    if (!this.shadowRoot.querySelector('ha-form')) {
      const form = document.createElement('ha-form');
      form.addEventListener('value-changed', ev => {
        ev.stopPropagation();
        this.dispatchEvent(new CustomEvent('config-changed', {
          detail: { config: ev.detail.value },
          bubbles: true,
          composed: true,
        }));
      });
      this.shadowRoot.appendChild(form);
    }

    const form         = this.shadowRoot.querySelector('ha-form');
    form.hass          = this._hass;
    form.data          = this._config;
    form.schema        = this._schema();
    form.computeLabel  = s => this._i18n?.editor?.[s.name]        ?? s.name;
    form.computeHelper = s => this._i18n?.editor_helper?.[s.name] ?? '';
  }
}

// Compact card editor — same fields as the normal card plus tap_action.
class FlightRadarCardCompactEditor extends FlightRadarCardEditor {
  _schema() {
    return [
      { name: 'entity',       required: true, selector: { entity: { domain: 'sensor' } } },
      { name: 'title',                        selector: { text: {} } },
      { name: 'home_airport',                 selector: { text: {} } },
      { name: 'tap_action',                   selector: { 'ui-action': {} } },
    ];
  }
}

customElements.define('flightradar-card-editor', FlightRadarCardEditor);
customElements.define('flightradar-card-compact-editor', FlightRadarCardCompactEditor);


// ── Card ──────────────────────────────────────────────────────────────────────

class FlightRadarCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._tapHandler = this._handleTap.bind(this);
    this._i18n       = _FALLBACK;
    this._lang       = 'en';
  }

  // Tells HA which element to open when the user clicks the visual-editor pencil.
  static getConfigElement() { return document.createElement('flightradar-card-editor'); }

  static getGridOptions() {
    return { columns: 6, rows: 5, min_columns: 4, min_rows: 2 };
  }

  static getStubConfig() {
    return {
      entity:       'sensor.flightradar24_fluge_im_bereich',
      title:        '',
      home_airport: 'ZRH',
    };
  }

  setConfig(config) {
    if (!config.entity) throw new Error('entity required');
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;
    const lang = hass.language || 'en';
    if (lang !== this._lang) {
      this._lang = lang;
      _loadLang(lang).then(t => { this._i18n = t; this._render(); });
    } else {
      this._render();
    }
  }

  getCardSize() {
    return Math.max(2, this._getFlights().length * 3);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Translate a dot-path like "card.departure" -> string from current i18n object.
  _t(path) {
    const v = path.split('.').reduce((o, k) => o?.[k], this._i18n);
    return typeof v === 'string' ? v : path;
  }

  _getFlights() {
    if (!this._hass || !this.config) return [];
    return this._hass.states[this.config.entity]?.attributes?.flights || [];
  }

  _fmtTime(ts) {
    if (!ts) return null;
    return new Date(ts * 1000).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  }

  _flightIcon(f) {
    const home = this.config.home_airport?.trim().toLowerCase();
    if (!home) return 'mdi:airplane';
    const eq = v => v?.trim().toLowerCase() === home;
    if (eq(f.airport_origin_iata)      || eq(f.airport_origin_city))      return 'mdi:airplane-takeoff';
    if (eq(f.airport_destination_iata) || eq(f.airport_destination_city)) return 'mdi:airplane-landing';
    return 'mdi:airplane';
  }

  _flag(code) {
    return code
      ? `<img src="https://flagsapi.com/${code}/shiny/16.png" class="flag" />`
      : '';
  }

  // ── tap_action ─────────────────────────────────────────────────────────────

  _handleTap() {
    const a = this.config.tap_action;
    if (!a || a.action === 'none') return;

    if (a.action === 'navigate' && a.navigation_path) {
      history.pushState(null, '', a.navigation_path);
      window.dispatchEvent(new CustomEvent('location-changed', {
        bubbles: true, composed: true, detail: { replace: false },
      }));
    } else if (a.action === 'more-info') {
      this.dispatchEvent(new CustomEvent('hass-more-info', {
        bubbles: true, composed: true, detail: { entityId: this.config.entity },
      }));
    } else if (a.action === 'url' && a.url_path) {
      window.open(a.url_path, a.url_target || '_blank');
    } else if (a.action === 'call-service' && a.service) {
      const [domain, svc] = a.service.split('.');
      this._hass.callService(domain, svc, a.service_data || {});
    }
  }

  // ── Renderers ──────────────────────────────────────────────────────────────

  _renderFlight(f) {
    const dep = this._fmtTime(f.time_scheduled_departure);
    const arr = this._fmtTime(f.time_scheduled_arrival);
    const alt = f.altitude     > 0 ? `${Math.round(f.altitude     * 0.3048).toLocaleString('de-CH')} m`    : '—';
    const spd = f.ground_speed > 0 ? `${Math.round(f.ground_speed * 1.852) .toLocaleString('de-CH')} km/h` : '—';

    const stat = (icon, labelKey, value) => `
      <div class="stat">
        <ha-icon icon="${icon}" class="icon-muted"></ha-icon>
        <div>
          <div class="stat-label">${this._t(labelKey)}</div>
          <div class="stat-value">${value}</div>
        </div>
      </div>`;

    return `
      <div class="flight-card">
        <div class="flight-header">
          <ha-icon icon="${this._flightIcon(f)}" class="icon-primary"></ha-icon>
          <span class="flight-number">${f.flight_number || '—'}</span>
          <span class="registration">${f.aircraft_registration || ''}</span>
          <span class="airline-badge">${f.airline_short || ''}</span>
        </div>
        <div class="aircraft-model">${f.aircraft_model || ''}</div>
        <div class="route">
          <span class="city">${f.airport_origin_city || '—'} ${this._flag(f.airport_origin_country_code)}</span>
          <ha-icon icon="mdi:arrow-right" class="icon-primary route-arrow"></ha-icon>
          <span class="city">${f.airport_destination_city || '—'} ${this._flag(f.airport_destination_country_code)}</span>
        </div>
        <div class="stats">
          ${dep ? stat('mdi:clock-start',      'card.departure', dep) : '<div class="stat stat-empty"></div>'}
          ${arr ? stat('mdi:clock-end',        'card.arrival',   arr) : '<div class="stat stat-empty"></div>'}
          ${stat('mdi:arrow-collapse-up', 'card.altitude', alt)}
          ${stat('mdi:speedometer',       'card.speed',    spd)}
        </div>
      </div>`;
  }

  _renderFlightCompact(f) {
    return `
      <div class="compact-row">
        <ha-icon icon="${this._flightIcon(f)}" class="icon-primary compact-plane"></ha-icon>
        <div class="compact-info">
          <div class="compact-top">
            <span class="flight-number">${f.flight_number || '—'}</span>
            <span class="registration">${f.aircraft_registration || ''}</span>
            <span class="airline-badge">${f.airline_short || ''}</span>
          </div>
          <div class="compact-route">
            <span class="compact-city">${f.airport_origin_city || '—'} ${this._flag(f.airport_origin_country_code)}</span>
            <ha-icon icon="mdi:arrow-right" class="compact-arrow"></ha-icon>
            <span class="compact-city">${f.airport_destination_city || '—'} ${this._flag(f.airport_destination_country_code)}</span>
          </div>
        </div>
      </div>`;
  }

  // Subclasses override this to switch rendering mode.
  _useCompact() { return false; }

  _render() {
    const flights  = this._getFlights();
    const title    = this.config.title || this._t('card.title_default');
    const stateObj = this._hass?.states[this.config.entity];

    let body;
    if (!stateObj) {
      body = `
        <div class="empty">
          <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
          <span>${this._t('card.entity_not_found')}:<br/><code>${this.config.entity}</code></span>
        </div>`;
    } else if (flights.length === 0) {
      body = `
        <div class="empty">
          <ha-icon icon="mdi:airplane-off"></ha-icon>
          <span>${this._t('card.no_flights')}</span>
        </div>`;
    } else if (this._useCompact()) {
      body = `<div class="compact-list">${flights.map(f => this._renderFlightCompact(f)).join('')}</div>`;
    } else {
      body = flights.map(f => this._renderFlight(f)).join('');
    }

    this.shadowRoot.innerHTML = `<style>${this._css()}</style>
      <ha-card>
        <div class="card-header">
          <ha-icon icon="mdi:radar"></ha-icon>
          <span>${title}</span>
        </div>
        <div class="card-content">${body}</div>
      </ha-card>`;

    // Re-attach tap listener after every innerHTML replacement.
    const card      = this.shadowRoot.querySelector('ha-card');
    const hasAction = this.config.tap_action?.action && this.config.tap_action.action !== 'none';
    if (card) {
      card.removeEventListener('click', this._tapHandler);
      card.style.cursor = hasAction ? 'pointer' : '';
      if (hasAction) card.addEventListener('click', this._tapHandler);
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  _css() { return `
    ha-card { overflow:hidden; }

    .card-header {
      display:flex; align-items:center; gap:8px;
      padding:14px 16px 4px;
      font-size:13px; font-weight:500;
      color:var(--secondary-text-color);
      text-transform:uppercase; letter-spacing:0.6px;
    }
    .card-header ha-icon { color:var(--primary-color); --mdc-icon-size:18px; }

    .card-content { padding:10px 16px 16px; display:flex; flex-direction:column; gap:10px; }

    .flight-card   { border:1px solid var(--divider-color); border-radius:10px; padding:12px 14px; }
    .flight-header { display:flex; align-items:center; gap:7px; margin-bottom:3px; }
    .icon-primary  { color:var(--primary-color); --mdc-icon-size:18px; }
    .icon-muted    { color:var(--secondary-text-color); --mdc-icon-size:16px; flex-shrink:0; }
    .flight-number { font-size:14px; font-weight:500; }
    .registration  { font-size:12px; color:var(--secondary-text-color); }
    .airline-badge {
      margin-left:auto; font-size:11px; white-space:nowrap;
      color:var(--primary-color);
      background:rgba(var(--rgb-primary-color,3,169,244),0.12);
      padding:2px 9px; border-radius:20px;
    }
    .aircraft-model { font-size:11px; color:var(--secondary-text-color); margin-bottom:10px; padding-left:25px; }
    .route {
      display:flex; align-items:center; gap:6px;
      padding:8px 10px; background:var(--secondary-background-color);
      border-radius:8px; margin-bottom:10px;
    }
    .route-arrow { --mdc-icon-size:18px !important; }
    .city  { font-size:13px; font-weight:500; display:flex; align-items:center; gap:4px; }
    .flag  { display:inline-block; vertical-align:middle; }
    .stats { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
    .stat  { display:flex; align-items:center; gap:7px; background:var(--secondary-background-color); border-radius:6px; padding:6px 8px; }
    .stat-empty { background:transparent; }
    .stat-label { font-size:9px; color:var(--secondary-text-color); text-transform:uppercase; letter-spacing:0.5px; line-height:1.2; }
    .stat-value { font-size:13px; font-weight:500; line-height:1.3; }

    .empty { display:flex; flex-direction:column; align-items:center; gap:10px; padding:28px 16px; color:var(--secondary-text-color); font-size:13px; text-align:center; line-height:1.6; }
    .empty ha-icon { --mdc-icon-size:36px; opacity:0.5; }
    .empty code    { font-size:11px; opacity:0.8; }

    .compact-list { border:1px solid var(--divider-color); border-radius:10px; overflow:hidden; }
    .compact-row  { display:flex; align-items:center; gap:10px; padding:9px 12px; border-bottom:1px solid var(--divider-color); }
    .compact-row:last-child { border-bottom:none; }
    .compact-plane { --mdc-icon-size:18px !important; flex-shrink:0; }
    .compact-info  { flex:1; min-width:0; }
    .compact-top   { display:flex; align-items:center; gap:6px; margin-bottom:3px; }
    .compact-route { display:flex; align-items:center; gap:4px; font-size:12px; color:var(--secondary-text-color); }
    .compact-city  { display:flex; align-items:center; gap:3px; }
    .compact-arrow { color:var(--secondary-text-color); --mdc-icon-size:14px !important; flex-shrink:0; }
  `; }
}


// ── Compact Card ──────────────────────────────────────────────────────────────
//
// Standalone compact variant — single-line flights in a horizontal flex layout.
// Fits into rows: 1 at full width; wraps gracefully at narrower sizes.
// Use as: type: custom:flightradar-card-compact

class FlightRadarCardCompact extends FlightRadarCard {
  static getConfigElement() { return document.createElement('flightradar-card-compact-editor'); }

  static getGridOptions() {
    return { columns: 6, rows: 1, min_columns: 6, min_rows: 1 };
  }

  static getStubConfig() {
    return {
      entity:       'sensor.flightradar24_fluge_im_bereich',
      title:        '',
      home_airport: 'ZRH',
    };
  }

  getCardSize() {
    return Math.max(1, Math.ceil(this._getFlights().length / 3));
  }

  _renderFlightItem(f) {
    return `
      <div class="citem">
        <ha-icon icon="${this._flightIcon(f)}" class="icon-primary cicon"></ha-icon>
        <span class="cflight">${f.flight_number || '—'}</span>
        <span class="ciata">${f.airport_origin_iata || ''}</span>
        ${this._flag(f.airport_origin_country_code)}
        <ha-icon icon="mdi:arrow-right" class="carrow"></ha-icon>
        <span class="ciata">${f.airport_destination_iata || ''}</span>
        ${this._flag(f.airport_destination_country_code)}
        <span class="cbadge">${f.airline_short || ''}</span>
      </div>`;
  }

  _render() {
    const flights  = this._getFlights();
    const title    = this.config.title || this._t('card.title_default');
    const stateObj = this._hass?.states[this.config.entity];

    let body;
    if (!stateObj) {
      body = `
        <div class="cempty">
          <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
          <span>${this._t('card.entity_not_found')}: <code>${this.config.entity}</code></span>
        </div>`;
    } else if (flights.length === 0) {
      body = `
        <div class="cempty">
          <ha-icon icon="mdi:airplane-off"></ha-icon>
          <span>${this._t('card.no_flights')}</span>
        </div>`;
    } else {
      body = `<div class="cflights">${flights.map(f => this._renderFlightItem(f)).join('')}</div>`;
    }

    this.shadowRoot.innerHTML = `<style>${this._css()}</style>
      <ha-card>
        <div class="cheader">
          <ha-icon icon="mdi:radar"></ha-icon>
          <span>${title}</span>
        </div>
        <div class="ccontent">${body}</div>
      </ha-card>`;

    const card      = this.shadowRoot.querySelector('ha-card');
    const hasAction = this.config.tap_action?.action && this.config.tap_action.action !== 'none';
    if (card) {
      card.removeEventListener('click', this._tapHandler);
      card.style.cursor = hasAction ? 'pointer' : '';
      if (hasAction) card.addEventListener('click', this._tapHandler);
    }

    // Start (or restart) the ResizeObserver so debug logs fire on every resize
    if (this._debugRO) { this._debugRO.disconnect(); this._debugRO = null; }
    this._debugRO = new ResizeObserver(() => this._logDebug());
    this._debugRO.observe(this);
    this._logDebug();
  }

  disconnectedCallback() {
    if (this._debugRO) { this._debugRO.disconnect(); this._debugRO = null; }
  }

  _logDebug() {
    if (!this.shadowRoot) return;
    const rect   = this.getBoundingClientRect();
    const host   = getComputedStyle(this);
    const ciata  = this.shadowRoot.querySelector('.ciata');
    const cbadge = this.shadowRoot.querySelector('.cbadge');
    console.group('[flightradar-compact] breakpoint debug');
    console.log('host width (getBCR)  :', Math.round(rect.width) + 'px   ← IATA hidden ≤160px | badge hidden ≤500px');
    console.log('host offsetWidth     :', this.offsetWidth + 'px');
    console.log('container-type       :', host.containerType  || '(empty — CSS not applied to :host!)');
    console.log('container-name       :', host.containerName  || '(empty — CSS not applied to :host!)');
    console.log('.ciata  display      :', ciata  ? getComputedStyle(ciata ).display  : 'no .ciata element in DOM');
    console.log('.cbadge display      :', cbadge ? getComputedStyle(cbadge).display  : 'no .cbadge element in DOM');
    console.log('@container support   :', CSS.supports('container-type', 'inline-size'));
    console.groupEnd();
  }

  _css() {
    return super._css() + `
      /* Anchor the container query to the custom element itself so it
         measures our card's actual rendered width, not an HA ancestor. */
      :host {
        display: block;
        container-type: inline-size;
        container-name: frc;
      }

      .cheader {
        display: flex; align-items: center; gap: 6px;
        padding: 6px 12px 0;
        font-size: 11px; font-weight: 500;
        color: var(--secondary-text-color);
        text-transform: uppercase; letter-spacing: 0.6px;
      }
      .cheader ha-icon { color: var(--primary-color); --mdc-icon-size: 14px; }

      .ccontent { padding: 0 12px 5px; }

      .cflights {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        row-gap: 0;
        column-gap: 0;
      }

      .citem {
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        padding: 3px 12px 3px 0;
        margin-right: 12px;
        border-right: 1px solid var(--divider-color);
      }
      .citem:last-child { border-right: none; margin-right: 0; padding-right: 0; }

      .cicon   { --mdc-icon-size: 15px !important; flex-shrink: 0; }
      .cflight { font-size: 13px; font-weight: 600; }
      .ciata   { font-size: 12px; font-weight: 600; letter-spacing: 0.3px; }
      .carrow  { color: var(--secondary-text-color); --mdc-icon-size: 12px !important; flex-shrink: 0; }

      .cbadge {
        font-size: 10px; white-space: nowrap;
        color: var(--primary-color);
        background: rgba(var(--rgb-primary-color, 3,169,244), 0.12);
        padding: 1px 7px; border-radius: 20px;
      }

      /* Progressive disclosure keyed to the custom element's own width (frc).
         Desktop 6-col ≈ 600 px, mobile 12-col ≈ 390 px, mobile 6-col ≈ 195 px.
         >500px  : IATA code + flag + airline badge  (full)
         160–500px : IATA code + flag                (no badge)
         <160px  : flag only                         (no code, no badge) */
      @container frc (max-width: 500px) {
        .cbadge { display: none; }
      }
      @container frc (max-width: 160px) {
        .ciata { display: none; }
      }

      /* Compact single-line empty/error state */
      .cempty {
        display: flex; align-items: center; gap: 6px;
        padding: 3px 0;
        font-size: 12px; color: var(--secondary-text-color);
      }
      .cempty ha-icon { --mdc-icon-size: 14px !important; opacity: 0.5; flex-shrink: 0; }
      .cempty code    { font-size: 11px; }
    `;
  }
}


customElements.define('flightradar-card', FlightRadarCard);
customElements.define('flightradar-card-compact', FlightRadarCardCompact);


// ── Leaflet Loader ─────────────────────────────────────────────────────────────
// Loads Leaflet JS + CSS once per page via jsdelivr (less blocked than cdnjs).
// CSS is fetched and stored as a string so it can be injected as a <style>
// element directly into each card's shadow root — a <link> nested inside a div
// is unreliable in Shadow DOM and causes tiles/markers to vanish.
let _leafletReady = null;
let _leafletCSS   = '';

function _loadLeaflet() {
  if (_leafletReady) return _leafletReady;
  const jsReady = new Promise(resolve => {
    if (window.L) { resolve(); return; }
    const s  = document.createElement('script');
    s.src    = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js';
    s.onload = resolve; s.onerror = resolve;
    document.head.appendChild(s);
  });
  const cssReady = fetch('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css')
    .then(r => r.ok ? r.text() : '')
    .then(css => { _leafletCSS = css; })
    .catch(() => {});
  _leafletReady = Promise.all([jsReady, cssReady]);
  return _leafletReady;
}


// ── Map Card Editor ────────────────────────────────────────────────────────────
class FlightRadarMapCardEditor extends FlightRadarCardEditor {
  _schema() {
    return [
      { name: 'entity',       required: true, selector: { entity: { domain: 'sensor' } } },
      { name: 'title',                        selector: { text: {} } },
      { name: 'home_airport',                 selector: { text: {} } },
      { name: 'lat',                          selector: { number: { min: -90,  max: 90,  step: 0.00001, mode: 'box' } } },
      { name: 'lon',                          selector: { number: { min: -180, max: 180, step: 0.00001, mode: 'box' } } },
      { name: 'zoom',                         selector: { number: { min: 1,    max: 18,  step: 1,       mode: 'slider' } } },
    ];
  }
}

customElements.define('flightradar-card-map-editor', FlightRadarMapCardEditor);


// ── Map Card ───────────────────────────────────────────────────────────────────
//
// Displays nearby flights on an interactive Leaflet map with a dark CartoDB
// tile layer. Aircraft icons are SVG-colored by altitude and rotated by heading.
// Click a marker to open a detailed popup.
// Use as: type: custom:flightradar-card-map

class FlightRadarMapCard extends FlightRadarCard {
  constructor() {
    super();
    this._map        = null;
    this._markers    = new Map();
    this._mapInited  = false;
    this._mapLoading = false;
  }

  static getConfigElement() { return document.createElement('flightradar-card-map-editor'); }

  static getGridOptions() {
    return { columns: 12, rows: 6, min_columns: 6, min_rows: 2 };
  }

  static getStubConfig() {
    return {
      entity:       'sensor.flightradar24_fluge_im_bereich',
      title:        '',
      home_airport: 'ZRH',
      lat:          47.46305,
      lon:          8.77846,
      zoom:         11,
    };
  }

  getCardSize() { return 6; }

  setConfig(config) {
    super.setConfig(config);
    if (this._map) {
      this._map.setView(
        [config.lat ?? 47.46305, config.lon ?? 8.77846],
        config.zoom ?? 11
      );
    }
  }

  disconnectedCallback() {
    if (this._map) { this._map.remove(); this._map = null; }
    this._markers.clear();
    this._mapInited  = false;
    this._mapLoading = false;
  }

  _render() {
    if (!this._hass || !this.config) return;
    if (!this._mapInited && !this._mapLoading) {
      this._buildCard();
    } else if (this._mapInited) {
      this._updateMarkers();
    }
  }

  async _buildCard() {
    this._mapLoading = true;
    const title = this.config.title || this._t('card.title_default');

    // No <link> here — Leaflet CSS is injected as <style> after fetch (see below).
    this.shadowRoot.innerHTML = `
      <style>${this._mapCss()}</style>
      <ha-card>
        <div class="mheader">
          <ha-icon icon="mdi:radar"></ha-icon>
          <span>${title}</span>
          <span class="mhud"><span class="mlive"></span><span class="mcnt">…</span></span>
        </div>
        <div class="mwrap"><div class="mmap"></div></div>
      </ha-card>`;

    await _loadLeaflet();

    if (!this._mapLoading) return; // disconnected during async load

    // Inject Leaflet CSS as <style> directly into the shadow root.
    // A <link> inside a <div> inside Shadow DOM is unreliable — tiles and markers
    // won't render without .leaflet-container { position: relative } being applied.
    if (_leafletCSS) {
      const st = document.createElement('style');
      st.textContent = _leafletCSS;
      this.shadowRoot.insertBefore(st, this.shadowRoot.querySelector('ha-card'));
    }

    const mapEl = this.shadowRoot.querySelector('.mmap');
    if (!mapEl || !window.L) { this._mapLoading = false; return; }

    this._map = window.L.map(mapEl, {
      center:             [this.config.lat ?? 47.46305, this.config.lon ?? 8.77846],
      zoom:               this.config.zoom ?? 11,
      zoomControl:        true,
      attributionControl: false,
    });

    // OpenStreetMap tiles — reliable, rarely blocked by privacy extensions.
    window.L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19, attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>' }
    ).addTo(this._map);

    // Reset-view button — injected into Leaflet's zoom control box so it
    // sits in the same visual group as + / − and inherits the same CSS.
    const zoomCtrl = mapEl.querySelector('.leaflet-control-zoom');
    if (zoomCtrl) {
      const btn = document.createElement('a');
      btn.href  = '#';
      btn.title = 'Ausgangsposition';
      btn.style.cssText = 'display:flex;align-items:center;justify-content:center;';
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>';
      btn.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        this._map.setView([this.config.lat ?? 47.46305, this.config.lon ?? 8.77846], this.config.zoom ?? 11);
      });
      zoomCtrl.appendChild(btn);
    }

    // Force a size recalculation — Leaflet may have initialized with 0×0 dimensions
    // if the shadow root wasn't fully laid out yet.
    requestAnimationFrame(() => { if (this._map) this._map.invalidateSize(); });

    this._mapInited  = true;
    this._mapLoading = false;
    this._updateMarkers();
  }

  _makeAircraftIcon(heading, altFt, onGround, label) {
    const deg  = heading != null ? Math.round(heading) : 0;
    const fill = onGround      ? '#64748b'   // grey   — on ground
               : altFt == null ? '#0369a1'   // blue   — unknown altitude
               : altFt > 25000 ? '#0ea5e9'   // sky    — cruise
               : altFt > 8000  ? '#0284c7'   // mid    — climb/descent
               :                 '#0369a1';  // dark   — low altitude
    // Label is absolutely positioned to the LEFT of the 30×30 badge so it
    // is never covered by the icon. iconAnchor still targets badge center.
    const html = `<div style="position:relative;width:30px;height:30px;">
      <span class="ac-lbl" style="
        position:absolute;right:calc(100% + 5px);
        top:50%;transform:translateY(-50%);
      ">${label || ''}</span>
      <div style="
        width:30px;height:30px;border-radius:50%;
        background:rgba(255,255,255,0.92);
        border:2.5px solid ${fill};
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 5px rgba(0,0,0,0.35);
      "><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"
          style="display:block;transform:rotate(${deg}deg)">
        <path fill="${fill}" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg></div>
    </div>`;
    return window.L.divIcon({ html, className: '', iconSize: [30, 30], iconAnchor: [15, 15] });
  }

  _fmtTimeMap(unix, tzOffset) {
    if (unix == null) return '–';
    const d  = new Date((unix + (tzOffset ?? 0)) * 1000);
    return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
  }

  _delayLabel(sched, actual) {
    if (sched == null || actual == null) return '';
    const diff = Math.round((actual - sched) / 60);
    if (Math.abs(diff) < 1) return '';
    const cls  = diff > 0 ? 'delay' : 'early';
    const sign = diff > 0 ? '+' : '';
    return ` <span class="${cls}">(${sign}${diff} min)</span>`;
  }

  _makePopup(f) {
    const fn  = f.flight_number || f.callsign || f.aircraft_icao_24bit || '?';
    const dep = this._fmtTimeMap(f.time_real_departure   || f.time_scheduled_departure,   f.airport_origin_timezone_offset);
    const arr = this._fmtTimeMap(f.time_estimated_arrival || f.time_real_arrival || f.time_scheduled_arrival, f.airport_destination_timezone_offset);
    const depDelay = this._delayLabel(f.time_scheduled_departure, f.time_real_departure);
    const arrDelay = this._delayLabel(f.time_scheduled_arrival,   f.time_estimated_arrival);

    const altFt = f.altitude      != null ? Math.round(f.altitude).toLocaleString('de-CH') + ' ft' : '–';
    const altM  = f.altitude      != null ? Math.round(f.altitude * 0.3048).toLocaleString('de-CH') + ' m' : '–';
    const spd   = f.ground_speed  != null ? f.ground_speed + ' km/h' : '–';
    const hdg   = f.heading       != null ? String(f.heading).padStart(3, '0') + '°' : '–';
    const vs    = f.vertical_speed != null
      ? (f.vertical_speed > 0 ? '+' : '') + Math.round(f.vertical_speed).toLocaleString('de-CH') + ' fpm'
      : '–';
    const dist  = f.distance != null ? f.distance.toFixed(1) + ' km' : '–';
    const photo = f.aircraft_photo_small
      ? `<img class="pu-photo" src="${f.aircraft_photo_small}" onerror="this.style.display='none'" alt="">`
      : '';

    return `<div class="pu">
      <div class="pu-head">
        <div class="pu-head-info">
          <div class="pu-fn">${fn}</div>
          <div class="pu-airline">${f.airline || ''} · ${f.aircraft_model || f.aircraft_code || ''}</div>
        </div>${photo}
      </div>
      <div class="pu-route">
        <div class="pu-apt"><div class="pu-apt-code">${f.airport_origin_code_iata || '?'}</div><div class="pu-apt-city">${f.airport_origin_city || ''}</div></div>
        <div class="pu-arrow"><div class="pu-arrow-line"></div><div class="pu-arrow-icon">✈</div><div class="pu-arrow-line"></div></div>
        <div class="pu-apt"><div class="pu-apt-code">${f.airport_destination_code_iata || '?'}</div><div class="pu-apt-city">${f.airport_destination_city || ''}</div></div>
      </div>
      <div class="pu-times">
        <div class="pu-time-block">
          <div class="pu-time-label">Abflug</div>
          <div class="pu-time-val">${dep}</div>
          <div class="pu-time-sub">${this._fmtTimeMap(f.time_scheduled_departure, f.airport_origin_timezone_offset)} geplant${depDelay}</div>
        </div>
        <div class="pu-time-block">
          <div class="pu-time-label">Ankunft</div>
          <div class="pu-time-val">${arr}</div>
          <div class="pu-time-sub">${this._fmtTimeMap(f.time_scheduled_arrival, f.airport_destination_timezone_offset)} geplant${arrDelay}</div>
        </div>
      </div>
      <div class="pu-sep"></div>
      <div class="pu-rows">
        <span class="pu-k">Höhe</span>    <span class="pu-v">${altFt} / ${altM}</span>
        <span class="pu-k">Speed</span>   <span class="pu-v">${spd}</span>
        <span class="pu-k">Kurs</span>    <span class="pu-v">${hdg}</span>
        <span class="pu-k">V/S</span>     <span class="pu-v">${vs}</span>
        <span class="pu-k">Distanz</span> <span class="pu-v">${dist}</span>
      </div>
      ${f.on_ground ? '<div class="pu-ground">⚠ Am Boden</div>' : ''}
    </div>`;
  }

  _updateMarkers() {
    if (!this._map || !window.L) return;
    const flights = this._getFlights().filter(f => f.latitude != null && f.longitude != null);
    const seen    = new Set();

    for (const f of flights) {
      const id    = f.id || f.aircraft_icao_24bit || f.flight_number;
      const label = f.flight_number || f.callsign || id;
      seen.add(id);

      const icon  = this._makeAircraftIcon(f.heading, f.altitude, f.on_ground, label);
      const popup = this._makePopup(f);

      if (this._markers.has(id)) {
        const { mk } = this._markers.get(id);
        mk.setLatLng([f.latitude, f.longitude]).setIcon(icon).setPopupContent(popup);
      } else {
        const mk = window.L.marker([f.latitude, f.longitude], { icon, zIndexOffset: f.on_ground ? 0 : 200 })
          .addTo(this._map)
          .bindPopup(popup, { maxWidth: 270, closeOnClick: false });
        this._markers.set(id, { mk });
      }
    }

    for (const [id, { mk }] of [...this._markers]) {
      if (!seen.has(id)) { mk.remove(); this._markers.delete(id); }
    }

    const cnt = this.shadowRoot.querySelector('.mcnt');
    if (cnt) cnt.textContent = `✈ ${flights.length}`;
  }

  _mapCss() {
    return `
      :host { display: block; height: 100%; }
      ha-card { height: 100%; min-height: 300px; display: flex; flex-direction: column; overflow: hidden; }

      .mheader {
        display: flex; align-items: center; gap: 8px; flex-shrink: 0;
        padding: 10px 14px 6px;
        font-size: 12px; font-weight: 500;
        color: var(--secondary-text-color);
        text-transform: uppercase; letter-spacing: 0.6px;
      }
      .mheader ha-icon { color: var(--primary-color); --mdc-icon-size: 16px; }

      .mhud {
        margin-left: auto;
        background: var(--card-background-color,#fff); border: 1px solid var(--divider-color);
        border-radius: 20px; padding: 2px 9px;
        font-family: ui-monospace,'SF Mono',monospace; font-size: 11px;
        display: flex; align-items: center; gap: 5px;
        color: var(--primary-text-color);
      }
      .mlive {
        width: 6px; height: 6px; border-radius: 50%;
        background: #22c55e; flex-shrink: 0;
        animation: blink 2s ease-in-out infinite;
      }
      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.25} }

      /* Map fills remaining card height; min-height ensures Leaflet gets real dimensions.
         rows:6 ≈ 336px card − ~44px header = ~292px map area. */
      .mwrap { flex: 1; min-height: 290px; position: relative; overflow: hidden; }
      .mmap  { position: absolute; inset: 0; }

      /* Leaflet zoom controls — theme-aware */
      .leaflet-control-zoom { border: none !important; box-shadow: none !important; margin: 8px 8px 0 0 !important; }
      .leaflet-control-zoom a {
        width: 28px !important; height: 28px !important; line-height: 28px !important;
        background: var(--card-background-color,#fff) !important;
        color: var(--primary-color) !important;
        border: 1px solid var(--divider-color) !important;
        border-radius: 6px !important; margin-bottom: 2px !important;
        font-size: 16px !important; font-weight: 700 !important;
      }
      .leaflet-control-zoom a:hover { opacity: 0.8; }
      .leaflet-control-attribution {
        font-size: 9px !important;
        background: rgba(255,255,255,0.75) !important;
      }

      /* Aircraft call-sign label — white pill for contrast on any tile style */
      .ac-lbl {
        display: inline-block;
        background: rgba(255,255,255,0.92);
        border-radius: 4px; padding: 1px 5px;
        font-family: ui-monospace,'SF Mono',monospace;
        font-size: 9px; font-weight: 700; letter-spacing: 0.3px;
        color: #1e3a5f; line-height: 1.4;
        white-space: nowrap; pointer-events: none;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      }

      /* Popup — dark overlay on the light map */
      .leaflet-popup-content-wrapper {
        background: rgba(15,23,42,0.97) !important; border: 1px solid rgba(56,189,248,0.25) !important;
        border-radius: 12px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        padding: 0 !important; overflow: hidden;
      }
      .leaflet-popup-content { margin: 0 !important; }
      .leaflet-popup-tip-container { display: none !important; }
      .leaflet-popup-close-button { color: #64748b !important; top: 8px !important; right: 10px !important; font-size: 18px !important; }
      .leaflet-popup-close-button:hover { color: #cbd5e1 !important; }

      .pu { min-width: 220px; font-family: ui-monospace,'SF Mono',monospace; }
      .pu-head { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px 8px; }
      .pu-head-info { flex: 1; min-width: 0; }
      .pu-fn { font-size: 15px; font-weight: 800; color: #38bdf8; letter-spacing: 0.5px; }
      .pu-airline { font-size: 10px; color: #64748b; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pu-photo { width: 60px; height: 38px; object-fit: cover; border-radius: 5px; border: 1px solid rgba(56,189,248,0.15); flex-shrink: 0; }

      .pu-route { display: flex; align-items: center; padding: 0 14px 8px; }
      .pu-apt { text-align: center; }
      .pu-apt-code { font-size: 15px; font-weight: 800; color: #e2e8f0; letter-spacing: 1px; }
      .pu-apt-city { font-size: 9px; color: #475569; margin-top: 1px; }
      .pu-arrow { flex: 1; display: flex; align-items: center; padding: 0 6px; }
      .pu-arrow-line { flex: 1; height: 1px; background: linear-gradient(90deg,rgba(56,189,248,0.3),rgba(56,189,248,0.6),rgba(56,189,248,0.3)); }
      .pu-arrow-icon { font-size: 11px; color: #38bdf8; margin: 0 3px; }

      .pu-times { display: flex; justify-content: space-between; padding: 0 14px 8px; }
      .pu-time-block { text-align: center; }
      .pu-time-label { font-size: 8px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
      .pu-time-val { font-size: 12px; font-weight: 700; color: #cbd5e1; margin-top: 1px; }
      .pu-time-sub { font-size: 9px; color: #475569; margin-top: 1px; }
      .delay { color: #f87171; }
      .early { color: #34d399; }

      .pu-sep { height: 1px; background: rgba(56,189,248,0.1); margin: 0 14px 8px; }
      .pu-rows { padding: 0 14px 12px; display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; }
      .pu-k { font-size: 10px; color: #475569; align-self: center; }
      .pu-v { font-size: 10px; color: #cbd5e1; text-align: right; align-self: center; }
      .pu-ground { padding: 0 14px 10px; font-size: 10px; color: #f59e0b; }
    `;
  }
}

customElements.define('flightradar-card-map', FlightRadarMapCard);


window.customCards = window.customCards || [];
window.customCards.push({
  type:        'flightradar-card',
  name:        'Flightradar Card',
  description: 'Zeigt Fluege aus einem FlightRadar24-Sensor uebersichtlich an.',
  preview:     true,
});
window.customCards.push({
  type:        'flightradar-card-compact',
  name:        'Flightradar Card Compact',
  description: 'Zeigt Fluege kompakt aus einem FlightRadar24-Sensor an.',
  preview:     true,
});
window.customCards.push({
  type:        'flightradar-card-map',
  name:        'Flightradar Card Map',
  description: 'Zeigt Fluege auf einer interaktiven Karte aus einem FlightRadar24-Sensor an.',
  preview:     true,
});
