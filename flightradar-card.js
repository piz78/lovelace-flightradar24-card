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
    compact:      'Compact view',
    tap_action:   'Tap action',
  },
  editor_helper: {
    entity:       'FlightRadar24 sensor entity',
    home_airport: 'IATA code or city name (e.g. ZRH or Zurich)',
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

const _CACHE = { en: _FALLBACK };

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
  try {
    const r = await fetch(`${_BASE}/translations/flightradar-card.${lang}.json`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    _CACHE[lang] = await r.json();
  } catch {
    _CACHE[lang] = lang !== 'en' ? await _loadLang('en') : _FALLBACK;
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
      { name: 'compact',                      selector: { boolean: {} } },
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

customElements.define('flightradar-card-editor', FlightRadarCardEditor);


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

  static getStubConfig() {
    return {
      entity:       'sensor.flightradar24_fluge_im_bereich',
      title:        '',
      home_airport: 'ZRH',
      compact:      false,
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
    const n = this._getFlights().length;
    return this._isTruthy(this.config.compact) ? Math.max(1, Math.ceil(n / 2)) : Math.max(2, n * 3);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Translate a dot-path like "card.departure" -> string from current i18n object.
  _t(path) {
    const v = path.split('.').reduce((o, k) => o?.[k], this._i18n);
    return typeof v === 'string' ? v : path;
  }

  // Handles YAML booleans arriving as string "true" from some HA editor versions.
  _isTruthy(val) {
    return val === true || val === 'true' || val === 1 || val === '1';
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

  _render() {
    const flights  = this._getFlights();
    const title    = this.config.title || this._t('card.title_default');
    const compact  = this._isTruthy(this.config.compact);
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
    } else if (compact) {
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

customElements.define('flightradar-card', FlightRadarCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        'flightradar-card',
  name:        'FlightRadar24 Card',
  description: 'Zeigt Fluege aus einem FlightRadar24-Sensor uebersichtlich an.',
  preview:     false,
});
