/**
 * DeepSeek Harness decoration: an animated ASCII ocean behind the conversation.
 *
 * The ocean simulation, ink renderer, shark geometry and motion are adapted from
 * s1egg/ascii-sharks-wallpaper (MIT). See THIRD_PARTY_NOTICES.md.
 *
 * This module is bundled by esbuild into `client.js`; it is not loaded directly.
 */
import { OceanEngine } from '../src/engine';

/* ------------------------------------------------------------------------- *
 * Tuning
 *
 * Everything a user is likely to adjust lives here. Values are also exposed at
 * runtime through `window.dshAsciiSharks.configure(...)` (see the README).
 * ------------------------------------------------------------------------- */
const TUNING = {
  /** Simulation speed for everything: 0.5 is a slow drift, 1.5 is brisk. */
  speed: 0.8,
  /** Render cap. The scene is intentionally calm, so 30 is plenty. */
  frameRate: 30,
  /** Device-pixel-ratio cap; lower this on a slow machine. */
  pixelRatio: 1.5,
  /** Smaller cell = finer characters. Cell width = clamp(width / density, 6, 9). */
  cellDensity: 200,
  /** CSS blur applied to the shark canvas only (softens the ASCII edge). */
  blurPx: 0.85,
  /** Mixed-scene shark sizes, relative to the wallpaper defaults. */
  sharkScale: 0.7,
  /** Feathered paper veil that keeps text readable. `feather` is a blur radius. */
  protection: {
    chat: { strength: 0.7, feather: 64, pad: 8 },
    composer: { strength: 0.9, feather: 48, pad: 10 },
    header: { strength: 0.66, feather: 40, pad: 6 },
    minHeight: 90,
  },
};

const SCENES = {
  classic: [
    { kind: 'classic', size: 1 },
    { kind: 'classic', size: 0.7 },
    { kind: 'classic', size: 0.84 },
    { kind: 'classic', size: 0.77 },
  ],
  mixed: [
    { kind: 'hammerhead', size: 1 },
    { kind: 'tiger', size: 0.84 },
    { kind: 'mako', size: 0.77 },
    { kind: 'thresher', size: 0.7 },
  ],
  solo: [{ kind: 'classic', size: 1 }],
};

const SETTINGS_KEY = 'dsh-ascii-sharks.settings.v1';

const DEFAULT_SETTINGS = {
  enabled: true,
  opacity: 0.78,
  density: 1,
  inkColor: null,
  fishSpeed: 1,
  fishCount: null,
  scene: 'mixed',
  fishScatter: false,
  veil: 0.7,
};

function clampNumber(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function normalizeSettings(raw) {
  const out = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return out;
  if (typeof raw.enabled === 'boolean') out.enabled = raw.enabled;
  out.opacity = clampNumber(raw.opacity, 0.05, 1, out.opacity);
  out.density = clampNumber(raw.density, 0, 1, out.density);
  if (typeof raw.inkColor === 'string' && /^#[0-9a-f]{6}$/i.test(raw.inkColor)) out.inkColor = raw.inkColor;
  else if (raw.inkColor === null) out.inkColor = null;
  out.fishSpeed = clampNumber(raw.fishSpeed, 0.1, 3, out.fishSpeed);
  if (raw.fishCount === null) out.fishCount = null;
  else if (Number.isFinite(raw.fishCount)) out.fishCount = Math.max(0, Math.min(100, Math.round(raw.fishCount)));
  if (typeof raw.scene === 'string' && Object.hasOwn(SCENES, raw.scene)) out.scene = raw.scene;
  if (typeof raw.fishScatter === 'boolean') out.fishScatter = raw.fishScatter;
  out.veil = clampNumber(raw.veil, 0, 1, out.veil);
  return out;
}

function readSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return normalizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

const SETTINGS = readSettings();
const settingsListeners = new Set();

function saveSettings() {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS));
  } catch {
    /* Private mode or blocked storage: keep the in-memory value. */
  }
}

function notifySettings() {
  for (const listener of settingsListeners) {
    try {
      listener();
    } catch {
      /* A detached settings page must not break the live layer. */
    }
  }
}

function applyEnabledToDom() {
  const hosts = Array.from(document.querySelectorAll('.dsh-ascii-sharks'));
  hosts.forEach((host, index) => {
    const visible = SETTINGS.enabled && index === hosts.length - 1;
    const canvas = host.querySelector('.dsh-ascii-sharks__canvas');
    if (canvas) canvas.style.setProperty('--dsh-sharks-ink', visible ? String(SETTINGS.opacity) : '0');
    if (visible) {
      delete host.dataset.dshDisabled;
      host.style.display = '';
    } else {
      host.dataset.dshDisabled = '1';
      if (!SETTINGS.enabled) host.style.display = '';
    }
  });
}

function updateSettings(patch) {
  Object.assign(SETTINGS, normalizeSettings({ ...SETTINGS, ...patch }));
  saveSettings();
  applyEnabledToDom();
  try {
    live?.applySettings();
  } finally {
    notifySettings();
  }
}

const STYLE_ID = 'dsh-ascii-sharks-style';

const CSS = `
/* Let the page background (and the ocean behind it) show through the
   conversation column. Every other panel keeps its own opaque surface. */
[data-phase]:has([data-conversation-content]) { background: transparent !important; }

.dsh-ascii-sharks {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  contain: layout paint;
  user-select: none;
}
.dsh-ascii-sharks__paper {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--dsw-alias-bg-base, #ffffff);
  pointer-events: none;
}
.dsh-ascii-sharks[data-dsh-disabled="1"] .dsh-ascii-sharks__canvas { opacity: 0 !important; }
.dsh-ascii-sharks__canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  filter: blur(var(--dsh-sharks-blur, 0.85px)) var(--dsh-sharks-glow, );
  opacity: var(--dsh-sharks-ink, 0.78);
  font-family: Menlo, Monaco, "SFMono-Regular", ui-monospace, monospace;
}
.dsh-ascii-sharks__shield {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.dsh-ascii-sharks__zone {
  position: absolute;
  border-radius: 64px;
  background: var(--dsw-alias-bg-base, #ffffff);
  filter: blur(var(--dsh-sharks-feather, 64px));
  pointer-events: none;
}
`;

const SETTINGS_CSS = `
.dsh-ascii-sharks[data-dsh-disabled="1"] .dsh-ascii-sharks__canvas { opacity: 0 !important; }
.dsh-ocean-settings {
  box-sizing: border-box;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 4px 0 48px;
  color: var(--dsw-alias-label-primary, #1f2328);
  font-size: var(--dsh-content-font-size, 14px);
  line-height: 1.5;
}
.dsh-ocean-settings__head { margin-bottom: 16px; }
.dsh-ocean-settings__title { margin: 0 0 6px; font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
.dsh-ocean-settings__lead { margin: 0; color: var(--dsw-alias-label-secondary, #6b7280); font-size: 13px; }
.dsh-ocean-settings__status { display: flex; align-items: center; gap: 8px; margin: 0 0 14px; color: var(--dsw-alias-label-secondary, #6b7280); font-size: 12px; }
.dsh-ocean-settings__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dsw-alias-state-success-primary, #16a34a); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 16%, transparent); }
.dsh-ocean-settings__dot[data-warn="true"] { background: var(--dsw-alias-state-warn-primary, #d97706); box-shadow: none; }
.dsh-ocean-settings__dot[data-off="true"] { background: var(--dsw-alias-border-l3, #d4d4d8); box-shadow: none; }
.dsh-ocean-preview { position: relative; height: 190px; margin: 0 0 18px; border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12)); border-radius: 12px; overflow: hidden; background: var(--dsw-alias-bg-base, #ffffff); }
.dsh-ocean-preview__canvas { position: absolute; inset: 0; z-index: 0; display: block; width: 100%; height: 100%; filter: blur(0.6px) var(--dsh-sharks-glow, ); font-family: Menlo, Monaco, "SFMono-Regular", ui-monospace, monospace; }
.dsh-ocean-preview__veil { position: absolute; left: 20%; right: 20%; top: 10px; bottom: 10px; z-index: 1; border-radius: 22px; background: var(--dsw-alias-bg-base, #ffffff); filter: blur(24px); pointer-events: none; }
.dsh-ocean-preview__off { position: absolute; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--dsw-alias-label-secondary, #6b7280); background: color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 55%, transparent); }
.dsh-ocean-settings__note { margin: -8px 0 16px; font-size: 12px; color: var(--dsw-alias-label-secondary, #6b7280); }
.dsh-ocean-settings__card { border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12)); border-radius: 14px; overflow: hidden; background: var(--dsw-alias-bg-layer-1, transparent); }
.dsh-ocean-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 16px 20px; border-top: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); }
.dsh-ocean-row:first-child { border-top: 0; }
.dsh-ocean-row__copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.dsh-ocean-row__title { font-weight: 500; }
.dsh-ocean-row__hint { color: var(--dsw-alias-label-secondary, #6b7280); font-size: 12px; }
.dsh-ocean-row__control { display: flex; align-items: center; gap: 10px; flex: 0 1 auto; min-width: 0; }
.dsh-ocean-range { width: 300px; max-width: 36vw; accent-color: var(--dsw-alias-brand-primary, #4176e6); cursor: pointer; }
.dsh-ocean-range:disabled { opacity: .45; cursor: default; }
.dsh-ocean-value { min-width: 46px; text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-secondary, #6b7280); }
.dsh-ocean-switch { position: relative; width: 44px; height: 26px; padding: 3px; border: none; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-label-primary, #111) 16%, transparent); box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l2, rgba(0,0,0,.16)); cursor: pointer; transition: background .15s ease; flex: none; }
.dsh-ocean-switch[data-on="true"] { background: var(--dsw-alias-brand-primary, #4176e6); box-shadow: inset 0 0 0 1px color-mix(in srgb, #ffffff 18%, transparent); }
.dsh-ocean-switch span { display: block; width: 20px; height: 20px; border-radius: 50%; background: var(--dsw-alias-switch-thumb, var(--dsw-alias-bg-base, #ffffff)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--dsw-alias-label-primary, #111) 14%, transparent), 0 1px 2px rgba(0,0,0,.25); transform: translateX(0); transition: transform .15s ease; }
.dsh-ocean-switch[data-on="true"] span { transform: translateX(18px); }
.dsh-ocean-select { min-width: 190px; padding: 6px 10px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.16)); background: var(--dsw-alias-bg-base, #fff); color: inherit; font: inherit; cursor: pointer; }
.dsh-ocean-color { width: 44px; height: 30px; padding: 2px; border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.16)); border-radius: 8px; background: transparent; cursor: pointer; }
.dsh-ocean-linkbtn { border: none; background: none; color: var(--dsw-alias-brand-primary, #4176e6); font: inherit; font-size: 12px; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
.dsh-ocean-linkbtn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06)); }
.dsh-ocean-check { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dsw-alias-label-secondary, #6b7280); white-space: nowrap; }
.dsh-ocean-check input { accent-color: var(--dsw-alias-brand-primary, #4176e6); }
.dsh-ocean-footnote { margin: 14px 0 0; font-size: 12px; color: var(--dsw-alias-label-secondary, #6b7280); }
@media (max-width: 760px) {
  .dsh-ocean-row { flex-direction: column; align-items: flex-start; gap: 10px; }
  .dsh-ocean-row__control { width: 100%; }
  .dsh-ocean-range { width: 100%; max-width: none; }
  .dsh-ocean-select { width: 100%; }
}
`;

let live = null;
let lastFailure = null;
let lifecycle = 'idle';
let themeRevision = 0;

/* ------------------------------------------------------------------------- *
 * Colour helpers
 * ------------------------------------------------------------------------- */

function parseColor(value) {
  if (!value) return null;
  const text = String(value).trim();
  let match = /^#([0-9a-f]{3,8})$/i.exec(text);
  if (match) {
    let hex = match[1];
    if (hex.length === 3 || hex.length === 4) hex = hex.slice(0, 3).split('').map((c) => c + c).join('');
    const n = Number.parseInt(hex.slice(0, 6), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  match = /^rgba?\(([^)]+)\)$/i.exec(text);
  if (match) {
    const parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.every(Number.isFinite)) {
      return { r: parts[0], g: parts[1], b: parts[2] };
    }
  }
  return null;
}

function luminance(color) {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function readPalette(frame) {
  const frameStyle = getComputedStyle(frame);
  const bodyStyle = getComputedStyle(document.body);
  const token = frameStyle.getPropertyValue('--dsw-alias-bg-base').trim()
    || bodyStyle.getPropertyValue('--dsw-alias-bg-base').trim();
  const color = parseColor(token)
    || parseColor(frameStyle.backgroundColor)
    || parseColor(bodyStyle.backgroundColor)
    || parseColor(getComputedStyle(document.documentElement).backgroundColor)
    || { r: 255, g: 255, b: 255 };
  const darkAttr = document.body.hasAttribute('data-ds-dark-theme')
    || document.documentElement.hasAttribute('data-ds-dark-theme');
  const dark = darkAttr || luminance(color) < 0.35;
  return {
    dark,
    paper: `rgb(${color.r}, ${color.g}, ${color.b})`,
    ink: dark ? '#eef3f7' : '#5d656c',
    glow: dark ? 'drop-shadow(0 0 5px rgba(198, 228, 255, 0.45))' : '',
    mist: dark ? '#2a3238' : '#eef1f3',
    clay: dark ? '#242a2f' : '#f3efe8',
    light: dark ? '#20262c' : '#fbfaf7',
  };
}

function mixInk(settings, palette) {
  const paper = parseColor(palette.paper) || { r: 255, g: 255, b: 255 };
  const base = parseColor(settings.inkColor || palette.ink) || { r: 93, g: 101, b: 108 };
  const t = 1 - settings.density;
  const mix = (a, b) => Math.round(a + (b - a) * t);
  return `rgb(${mix(base.r, paper.r)}, ${mix(base.g, paper.g)}, ${mix(base.b, paper.b)})`;
}

/* ------------------------------------------------------------------------- *
 * Mount
 * ------------------------------------------------------------------------- */

function engineOptions() {
  return {
    paused: !SETTINGS.enabled,
    frameRate: TUNING.frameRate,
    speed: TUNING.speed,
    pixelRatio: Math.min(window.devicePixelRatio || 1, TUNING.pixelRatio),
    interaction: SETTINGS.fishScatter,
    cellDensity: TUNING.cellDensity,
    fishCount: SETTINGS.fishCount,
    fishSpeed: SETTINGS.fishSpeed,
  };
}

function mount(marker) {
  const overlay = marker && marker.closest('[data-shell-overlay]');
  const frame = overlay && overlay.parentElement;
  if (!frame) return { dispose() {}, rebuild() {}, refresh() {} };

  const previousIsolation = frame.style.isolation;
  frame.style.isolation = 'isolate';

  const host = document.createElement('div');
  host.className = 'dsh-ascii-sharks';
  host.style.left = '0px';
  host.style.top = '0px';
  host.style.width = '0px';
  host.style.height = '0px';
  host.setAttribute('aria-hidden', 'true');
  host.setAttribute('role', 'presentation');

  const paper = document.createElement('div');
  paper.className = 'dsh-ascii-sharks__paper';
  paper.setAttribute('aria-hidden', 'true');
  host.appendChild(paper);

  const canvas = document.createElement('canvas');
  canvas.className = 'dsh-ascii-sharks__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const shield = document.createElement('div');
  shield.className = 'dsh-ascii-sharks__shield';
  shield.setAttribute('aria-hidden', 'true');
  host.appendChild(shield);

  const zones = {};
  for (const name of ['header', 'chat', 'composer']) {
    const zone = document.createElement('div');
    zone.className = 'dsh-ascii-sharks__zone';
    zone.dataset.zone = name;
    zone.style.display = 'none';
    shield.appendChild(zone);
    zones[name] = zone;
  }

  // A hot-reloaded Client generation can leave an older ocean host behind.
  // Remove it before taking over so only one canvas is visible and controllable.
  for (const existing of frame.querySelectorAll('.dsh-ascii-sharks')) existing.remove();
  frame.appendChild(host);

  let palette = readPalette(frame);
  canvas.style.setProperty('--water-ink', palette.ink);
  canvas.style.setProperty('--water-paper', palette.paper);
  canvas.style.setProperty('--water-mist', palette.mist);
  canvas.style.setProperty('--water-clay', palette.clay);
  canvas.style.setProperty('--water-light', palette.light);
  canvas.style.setProperty('--dsh-sharks-glow', palette.glow);
  canvas.style.setProperty('--dsh-sharks-ink', String(SETTINGS.enabled ? SETTINGS.opacity : 0));
  canvas.style.setProperty('--dsh-sharks-blur', `${TUNING.blurPx}px`);

  let options = engineOptions();
  let engine = null;

  const startEngine = () => {
    const specs = SCENES[SETTINGS.scene] || SCENES.mixed;
    const scaled = specs.map((shark) => ({ kind: shark.kind, size: shark.size * TUNING.sharkScale }));
    engine = new OceanEngine(canvas, scaled, { ...options });
  };

  startEngine();

  let frameRequest = 0;
  const scheduleRefresh = () => {
    if (frameRequest) return;
    frameRequest = requestAnimationFrame(() => {
      frameRequest = 0;
      refreshZones();
    });
  };

  let currentScene = SETTINGS.scene;
  let currentFishCount = SETTINGS.fishCount;

  function effectiveInk() {
    return mixInk(SETTINGS, palette);
  }

  function applySettings() {
    options = {
      ...options,
      paused: !SETTINGS.enabled,
      fishCount: SETTINGS.fishCount,
      fishSpeed: SETTINGS.fishSpeed,
      interaction: SETTINGS.fishScatter,
    };
    canvas.style.setProperty('--dsh-sharks-ink', String(SETTINGS.enabled ? SETTINGS.opacity : 0));
    const changed = SETTINGS.scene !== currentScene || SETTINGS.fishCount !== currentFishCount;
    currentScene = SETTINGS.scene;
    currentFishCount = SETTINGS.fishCount;
    if (!SETTINGS.enabled) {
      // Destroy rather than pause: an off switch must not leave a scheduling loop
      // or a running preview anywhere.
      engine?.destroy();
      engine = null;
      for (const other of document.querySelectorAll('.dsh-ascii-sharks')) {
        if (other !== host) other.style.display = 'none';
      }
      scheduleRefresh();
      return;
    }
    if (!engine || changed) {
      engine?.destroy();
      startEngine();
    } else {
      engine.configure(options);
    }
    engine?.setInkColor(effectiveInk());
    engine?.setFishSpeed(SETTINGS.fishSpeed);
    engine?.setInteraction(SETTINGS.fishScatter);
    scheduleRefresh();
  }

  const zoneStyle = new Map();
  const setStyle = (zone, key, value) => {
    let cache = zoneStyle.get(zone);
    if (!cache) {
      cache = {};
      zoneStyle.set(zone, cache);
    }
    if (cache[key] === value) return;
    cache[key] = value;
    zone.style[key] = value;
  };

  const applyZone = (zone, next, frameRect) => {
    if (!next) {
      setStyle(zone, 'display', 'none');
      return;
    }
    const { rect, config } = next;
    const width = rect.width + config.pad * 2;
    const height = rect.height + config.pad * 2;
    if (width < 8 || height < 8) {
      setStyle(zone, 'display', 'none');
      return;
    }
    setStyle(zone, 'display', 'block');
    setStyle(zone, 'left', `${rect.left - frameRect.left - config.pad}px`);
    setStyle(zone, 'top', `${rect.top - frameRect.top - config.pad}px`);
    setStyle(zone, 'width', `${width}px`);
    setStyle(zone, 'height', `${height}px`);
    setStyle(zone, 'opacity', String(Math.min(1, SETTINGS.veil * (config.strength / TUNING.protection.chat.strength))));
    setStyle(zone, 'filter', `blur(${config.feather}px)`);
  };

  const touchedSurfaces = new Map();
  let clearedColumn = null;
  let layoutObserver = null;
  let observedAnchor = null;
  let observedSeat = null;

  function observeLayout(anchor, seat) {
    if (typeof ResizeObserver !== 'function') return;
    if (!layoutObserver) layoutObserver = new ResizeObserver(() => scheduleRefresh());
    if (anchor !== observedAnchor || seat !== observedSeat) {
      layoutObserver.disconnect();
      observedAnchor = anchor;
      observedSeat = seat;
      if (anchor) layoutObserver.observe(anchor);
      if (seat) layoutObserver.observe(seat);
    }
  }

  function restoreSurface(surface) {
    if (!surface) return;
    const background = touchedSurfaces.get(surface);
    touchedSurfaces.delete(surface);
    if (!surface.isConnected) return;
    delete surface.dataset.dshSharks;
    if (background) surface.style.setProperty('background', background);
    else surface.style.removeProperty('background');
  }

  function revealOceanBehind(root, column) {
    if (clearedColumn && clearedColumn !== column) {
      restoreSurface(clearedColumn);
      clearedColumn = null;
    }
    clearedColumn = column;
    for (const surface of [root, column]) {
      if (!surface) continue;
      if (!touchedSurfaces.has(surface)) {
        touchedSurfaces.set(surface, surface.style.getPropertyValue('background'));
      }
      surface.dataset.dshSharks = '1';
      surface.style.setProperty('background', 'transparent', 'important');
    }
  }

  function columnOf(content) {
    let node = content;
    while (node && node.parentElement && node.parentElement !== frame) node = node.parentElement;
    return node && node.parentElement === frame ? node : frame;
  }

  function refreshZones() {
    const frameRect = frame.getBoundingClientRect();
    if (frameRect.width < 2 || frameRect.height < 2) return;

    let header = null;
    let chat = null;
    let composer = null;
    const content = findConversationContent(frame);
    if (!content && clearedColumn) {
      restoreSurface(clearedColumn);
      clearedColumn = null;
    }
    if (content) {
      const root = content.parentElement;
      const column = columnOf(content);
      revealOceanBehind(root, column);
      const anchor = root || column;
      if (anchor) {
        const columnRect = anchor.getBoundingClientRect();
        const left = Math.round(columnRect.left - frameRect.left);
        const top = Math.round(columnRect.top - frameRect.top);
        const width = Math.round(columnRect.width);
        const height = Math.round(columnRect.height);
        if (host.style.left !== `${left}px`) host.style.left = `${left}px`;
        if (host.style.top !== `${top}px`) host.style.top = `${top}px`;
        if (host.style.width !== `${width}px`) host.style.width = `${width}px`;
        if (host.style.height !== `${height}px`) host.style.height = `${height}px`;
      }
      const phase = root && root.getAttribute('data-phase');
      const seat = content.querySelector('[data-composer-seat]');
      const scroll = content.querySelector('[data-conversation-scroll]');
      const headerEl = root && (root.querySelector(':scope > header') || root.querySelector('header'));
      if (root) observeLayout(root, seat);

      if (headerEl) {
        const rect = headerEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) header = { rect, config: TUNING.protection.header };
      }
      if (seat) {
        const rect = seat.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) composer = { rect, config: TUNING.protection.composer };
      }

      // The hero stack already contains the headline and the composer; only the
      // active transcript needs a separate reading column.
      if (phase !== 'hero' && seat && scroll) {
        const scrollRect = scroll.getBoundingClientRect();
        const seatRect = seat.getBoundingClientRect();
        const flow = content.querySelector('[data-chat-flow]');
        let left;
        let width;
        if (flow) {
          const flowRect = flow.getBoundingClientRect();
          left = flowRect.left;
          width = flowRect.width;
        } else {
          width = Math.min(920, Math.max(560, scrollRect.width * 0.64));
          left = scrollRect.left + (scrollRect.width - width) / 2;
        }
        const top = Math.max(scrollRect.top, 0);
        const bottom = Math.min(scrollRect.bottom, seatRect.top);
        if (width >= 320 && bottom - top >= TUNING.protection.minHeight) {
          chat = { rect: { left, top, width, height: bottom - top }, config: TUNING.protection.chat };
        }
      }
    }

    const hostRect = host.getBoundingClientRect();
    applyZone(zones.header, header, hostRect);
    applyZone(zones.composer, composer, hostRect);
    applyZone(zones.chat, chat, hostRect);
  }

  function findConversationContent(root) {
    const candidates = root.querySelectorAll('[data-conversation-content]');
    for (const candidate of candidates) {
      const rect = candidate.getBoundingClientRect();
      if (rect.width > 240 && rect.height > 160) return candidate;
    }
    return null;
  }

  refreshZones();
  applySettings();

  const onResize = () => scheduleRefresh();
  window.addEventListener('resize', onResize);
  document.addEventListener('scroll', scheduleRefresh, true);
  const timer = window.setInterval(scheduleRefresh, 500);

  const onPointerMove = (event) => {
    if (!SETTINGS.fishScatter || !engine) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    engine.pointer({
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      active: true,
    });
  };
  const onPointerLeave = () => {
    engine?.pointer({ x: 0, y: 0, active: false });
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('blur', onPointerLeave);
  document.addEventListener('mouseleave', onPointerLeave);

  const api = {
    configure(patch = {}) {
      if (typeof patch.speed === 'number') {
        TUNING.speed = patch.speed;
        options = { ...options, speed: TUNING.speed };
        engine?.configure(options);
      }
      if (typeof patch.inkOpacity === 'number') updateSettings({ opacity: patch.inkOpacity });
      if (typeof patch.fishSpeed === 'number') updateSettings({ fishSpeed: patch.fishSpeed });
      if ('fishCount' in patch) updateSettings({ fishCount: patch.fishCount });
      if (typeof patch.blur === 'number') {
        TUNING.blurPx = patch.blur;
        canvas.style.setProperty('--dsh-sharks-blur', `${TUNING.blurPx}px`);
      }
      if (patch.protection) {
        for (const key of ['chat', 'composer', 'header']) {
          if (patch.protection[key]) Object.assign(TUNING.protection[key], patch.protection[key]);
        }
        if (typeof patch.protection.minHeight === 'number') {
          TUNING.protection.minHeight = patch.protection.minHeight;
        }
        scheduleRefresh();
      }
      if (typeof patch.paused === 'boolean') {
        options = { ...options, paused: patch.paused };
        engine?.configure(options);
      }
    },
    refresh: scheduleRefresh,
    applySettings,
    settings: {
      get: () => ({ ...SETTINGS }),
      set: updateSettings,
    },
    options: TUNING,
  };

  if (window.dshAsciiSharks) delete window.dshAsciiSharks;
  window.dshAsciiSharks = api;

  function zoneSummary() {
    const out = {};
    for (const [name, zone] of Object.entries(zones)) {
      if (zone.style.display === 'none') {
        out[name] = { display: 'none' };
        continue;
      }
      const r = zone.getBoundingClientRect();
      out[name] = {
        display: 'block',
        x: Math.round(r.left),
        y: Math.round(r.top),
        width: Math.round(r.width),
        height: Math.round(r.height),
        opacity: zone.style.opacity,
        filter: zone.style.filter,
      };
    }
    return out;
  }

  function inkSample() {
    try {
      const context = canvas.getContext('2d');
      if (!context || !canvas.width || !canvas.height) return null;
      const width = Math.min(canvas.width, 900);
      const height = Math.min(canvas.height, 600);
      const data = context.getImageData(0, 0, width, height).data;
      let nonzero = 0;
      let maxAlpha = 0;
      let samples = 0;
      for (let i = 3; i < data.length; i += 4 * 11) {
        samples++;
        const alpha = data[i];
        if (alpha > 0) nonzero++;
        if (alpha > maxAlpha) maxAlpha = alpha;
      }
      return { width, height, samples, nonzero, maxAlpha };
    } catch (error) {
      return { error: String(error) };
    }
  }

  function paintChain(x, y) {
    const start = document.elementFromPoint(x, y);
    const chain = [];
    let el = start;
    while (el && chain.length < 22) {
      const cs = getComputedStyle(el);
      chain.push({
        tag: el.tagName,
        cls: String(el.className || '').slice(0, 70),
        bg: cs.backgroundColor,
        bgImage: cs.backgroundImage === 'none' ? 'none' : cs.backgroundImage.slice(0, 80),
        opacity: cs.opacity,
        position: cs.position,
        zIndex: cs.zIndex,
      });
      el = el.parentElement;
    }
    return { top: start ? start.tagName : null, chain };
  }

  function status() {
    const frameRect = frame.getBoundingClientRect();
    const content = findConversationContent(frame);
    const root = content && content.parentElement;
    const stats = engine && typeof engine.stats === 'function' ? engine.stats() : null;
    const centerX = frameRect.left + frameRect.width / 2;
    const centerY = frameRect.top + frameRect.height / 2;
    const centerStack = typeof document.elementsFromPoint === 'function'
      ? document.elementsFromPoint(centerX, centerY).slice(0, 5).map((el) => ({
        tag: el.tagName,
        cls: String(el.className || '').slice(0, 60),
        insideOceanLayer: host.contains(el),
      }))
      : [];
    return {
      mounted: host.isConnected,
      url: location.href,
      title: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 },
      frame: {
        width: Math.round(frameRect.width),
        height: Math.round(frameRect.height),
        isolation: getComputedStyle(frame).isolation,
        background: getComputedStyle(frame).backgroundColor,
      },
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      host: {
        x: Math.round(host.getBoundingClientRect().left),
        y: Math.round(host.getBoundingClientRect().top),
        width: Math.round(host.getBoundingClientRect().width),
        height: Math.round(host.getBoundingClientRect().height),
        zIndex: getComputedStyle(host).zIndex,
        pointerEvents: getComputedStyle(host).pointerEvents,
      },
      canvas: { width: canvas.width, height: canvas.height, cssOpacity: getComputedStyle(canvas).opacity, filter: getComputedStyle(canvas).filter },
      engine: stats ? {
        frames: stats.frames,
        simulationTime: Math.round(stats.simulationTime),
        sharks: stats.sharks,
        fish: stats.fish,
        scheduled: stats.scheduled,
        reducedMotion: stats.reducedMotion,
        hidden: stats.hidden,
      } : null,
      settings: { ...SETTINGS },
      hosts: document.querySelectorAll('.dsh-ascii-sharks').length,
      conversation: content ? {
        phase: root && root.getAttribute('data-phase'),
        rootBackground: root && getComputedStyle(root).backgroundColor,
      } : null,
      layers: {
        paper: { zIndex: getComputedStyle(paper).zIndex, background: getComputedStyle(paper).backgroundColor },
        canvas: { zIndex: getComputedStyle(canvas).zIndex },
        shield: { zIndex: getComputedStyle(shield).zIndex },
      },
      zones: zoneSummary(),
      centerStack,
      htmlBackground: getComputedStyle(document.documentElement).backgroundColor,
      paintCenter: paintChain(centerX, centerY),
      paintGutter: paintChain(frameRect.left + 300, frameRect.top + 320),
      ink: inkSample(),
    };
  }

  return {
    status,
    rebuild() {
      // Re-tint in place: the world keeps swimming across a theme switch. Only
      // the glyph atlas, the glow and the page surfaces change.
      const next = readPalette(frame);
      palette = next;
      canvas.style.setProperty('--water-ink', next.ink);
      canvas.style.setProperty('--water-paper', next.paper);
      canvas.style.setProperty('--water-mist', next.mist);
      canvas.style.setProperty('--water-clay', next.clay);
      canvas.style.setProperty('--water-light', next.light);
      canvas.style.setProperty('--dsh-sharks-glow', next.glow);
      applySettings();
      scheduleRefresh();
    },
    refresh: scheduleRefresh,
    dispose() {
      window.clearInterval(timer);
      layoutObserver?.disconnect();
      layoutObserver = null;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('blur', onPointerLeave);
      document.removeEventListener('mouseleave', onPointerLeave);
      document.removeEventListener('scroll', scheduleRefresh, true);
      if (frameRequest) cancelAnimationFrame(frameRequest);
      engine?.destroy();
      engine = null;
      host.remove();
      frame.style.isolation = previousIsolation;
      for (const [surface, background] of touchedSurfaces) {
        if (!surface.isConnected) continue;
        delete surface.dataset.dshSharks;
        if (background) surface.style.setProperty('background', background);
        else surface.style.removeProperty('background');
      }
      touchedSurfaces.clear();
      if (window.dshAsciiSharks === api) delete window.dshAsciiSharks;
    },
  };
}

/* ------------------------------------------------------------------------- *
 * Client plugin
 * ------------------------------------------------------------------------- */

window.__ModuleLoader__.load({
  id: '@local/ascii-sharks',
  factory(require) {
    const React = require('react');

    function useSettings() {
      const [state, setState] = React.useState(() => ({ ...SETTINGS }));
      React.useEffect(() => {
        const sync = () => setState({ ...SETTINGS });
        settingsListeners.add(sync);
        return () => settingsListeners.delete(sync);
      }, []);
      return state;
    }

    function useThemeRevision() {
      const [value, setValue] = React.useState(themeRevision);
      React.useEffect(() => {
        const sync = () => setValue(themeRevision);
        settingsListeners.add(sync);
        return () => settingsListeners.delete(sync);
      }, []);
      return value;
    }

    function OceanSwitch({ checked, onChange, label }) {
      return React.createElement('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': checked,
        'aria-label': label,
        className: 'dsh-ocean-switch',
        'data-on': checked ? 'true' : 'false',
        onClick: () => onChange(!checked),
      }, React.createElement('span'));
    }

    function OceanRow({ title, hint, control }) {
      return React.createElement('div', { className: 'dsh-ocean-row' },
        React.createElement('div', { className: 'dsh-ocean-row__copy' },
          React.createElement('span', { className: 'dsh-ocean-row__title' }, title),
          hint ? React.createElement('span', { className: 'dsh-ocean-row__hint' }, hint) : null),
        React.createElement('div', { className: 'dsh-ocean-row__control' }, control));
    }

    function OceanSlider({ value, min, max, step, onChange, format, disabled }) {
      return React.createElement('div', { className: 'dsh-ocean-row__control' },
        React.createElement('input', {
          type: 'range',
          className: 'dsh-ocean-range',
          min, max, step,
          value,
          disabled: disabled === true,
          onChange: (event) => onChange(Number(event.target.value)),
        }),
        React.createElement('span', { className: 'dsh-ocean-value' }, format(value)));
    }

    function OceanSettings() {
      const s = useSettings();
      const themeTick = useThemeRevision();
      const connected = Boolean(live);
      const zh = (document.documentElement.lang || navigator.language || '').toLowerCase().startsWith('zh');
      const dark = document.body.hasAttribute('data-ds-dark-theme');
      const ink = s.inkColor || (dark ? '#eef3f7' : '#5d656c');
      const set = updateSettings;
      const [countDraft, setCountDraft] = React.useState(s.fishCount === null ? 34 : s.fishCount);
      const countTimer = React.useRef(0);
      React.useEffect(() => {
        setCountDraft(s.fishCount === null ? 34 : s.fishCount);
      }, [s.fishCount]);
      React.useEffect(() => () => window.clearTimeout(countTimer.current), []);

      const commitCount = (value, immediate) => {
        window.clearTimeout(countTimer.current);
        setCountDraft(value);
        if (immediate) {
          updateSettings({ fishCount: value });
          return;
        }
        countTimer.current = window.setTimeout(() => updateSettings({ fishCount: value }), 180);
      };

      const previewRef = React.useRef(null);
      const previewEngine = React.useRef(null);

      React.useEffect(() => {
        const canvas = previewRef.current;
        if (!canvas) return undefined;
        if (!s.enabled) {
          previewEngine.current = null;
          canvas.style.opacity = '0';
          return undefined;
        }
        const palette = readPalette(document.body);
        canvas.style.setProperty('--water-ink', palette.ink);
        canvas.style.setProperty('--water-paper', palette.paper);
        canvas.style.setProperty('--water-mist', palette.mist);
        canvas.style.setProperty('--water-clay', palette.clay);
        canvas.style.setProperty('--water-light', palette.light);
        canvas.style.setProperty('--dsh-sharks-glow', palette.glow);
        const specs = (SCENES[s.scene] || SCENES.mixed).map((shark) => ({
          kind: shark.kind,
          size: shark.size * 0.55,
        }));
        const engine = new OceanEngine(canvas, specs, {
          paused: !s.enabled,
          frameRate: 30,
          speed: TUNING.speed,
          pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
          interaction: false,
          cellDensity: 150,
          fishCount: s.fishCount === null ? 16 : s.fishCount,
          fishSpeed: s.fishSpeed,
        });
        engine.setInkColor(mixInk(s, palette));
        previewEngine.current = engine;
        canvas.style.opacity = String(s.enabled ? s.opacity : 0);
        return () => {
          engine.destroy();
          if (previewEngine.current === engine) previewEngine.current = null;
        };
      }, [s.scene, s.fishCount, s.enabled]);

      React.useEffect(() => {
        const canvas = previewRef.current;
        const engine = previewEngine.current;
        if (!canvas || !engine) return;
        const palette = readPalette(document.body);
        canvas.style.setProperty('--dsh-sharks-glow', palette.glow);
        canvas.style.opacity = String(s.enabled ? s.opacity : 0);
        engine.setInkColor(mixInk(s, palette));
        engine.setFishSpeed(s.fishSpeed);
        engine.configure({
          paused: !s.enabled,
          frameRate: 30,
          speed: TUNING.speed,
          pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
          interaction: false,
          cellDensity: 150,
          fishCount: s.fishCount === null ? 16 : s.fishCount,
          fishSpeed: s.fishSpeed,
        });
      }, [s.enabled, s.opacity, s.density, s.inkColor, s.fishSpeed, themeTick]);

      return React.createElement('section', { className: 'dsh-ocean-settings' },
        React.createElement('div', { className: 'dsh-ocean-settings__head' },
          React.createElement('h2', { className: 'dsh-ocean-settings__title' }, zh ? 'ASCII 海洋' : 'ASCII ocean'),
          React.createElement('p', { className: 'dsh-ocean-settings__lead' },
            zh ? '对话页背后的一片 ASCII 海。修改会立即生效。' : 'An ASCII ocean behind the conversation. Changes apply immediately.')),
        React.createElement('div', { className: 'dsh-ocean-settings__status' },
          React.createElement('span', {
            className: 'dsh-ocean-settings__dot',
            'data-off': s.enabled ? undefined : 'true',
            'data-warn': s.enabled && !connected ? 'true' : undefined,
          }),
          React.createElement('span', null, !s.enabled
            ? (zh ? '已关闭' : 'Off')
            : (connected
              ? (zh ? '正在对话页背后运行' : 'Running behind the conversation')
              : (zh ? '已启用；当前页面未连接动画层，刷新一次后生效' : 'Enabled; this page is not connected to the ocean layer yet')))),
        React.createElement('div', { className: 'dsh-ocean-preview' },
          React.createElement('canvas', {
            ref: previewRef,
            className: 'dsh-ocean-preview__canvas',
            'aria-hidden': true,
          }),
          React.createElement('div', {
            className: 'dsh-ocean-preview__veil',
            style: { opacity: s.veil },
          }),
          s.enabled ? null : React.createElement('div', { className: 'dsh-ocean-preview__off' },
            zh ? '已关闭' : 'Off')),
        React.createElement('p', { className: 'dsh-ocean-settings__note' },
          zh ? '预览中间的纸色带模拟阅读保护；100% 会完全盖住中间，0% 则露出原样。' : 'The paper band simulates the reading veil: 100% fully covers it, 0% shows the raw ocean.'),
        React.createElement('div', { className: 'dsh-ocean-settings__card' },
          React.createElement(OceanRow, {
            title: zh ? '启用' : 'Enabled',
            hint: zh ? '总开关；关闭后动画完全停止' : 'Stops the animation completely when off',
            control: React.createElement(OceanSwitch, {
              checked: s.enabled,
              label: zh ? '启用 ASCII 海洋' : 'Enable ASCII ocean',
              onChange: (value) => set({ enabled: value }),
            }),
          }),
          React.createElement(OceanRow, {
            title: zh ? '透明度' : 'Opacity',
            hint: zh ? '整体墨迹的透明度' : 'Overall ink opacity',
            control: React.createElement(OceanSlider, {
              value: s.opacity, min: 0.05, max: 1, step: 0.01,
              onChange: (value) => set({ opacity: value }),
              format: (value) => `${Math.round(value * 100)}%`,
            }),
          }),
          React.createElement(OceanRow, {
            title: zh ? '浓淡' : 'Ink density',
            hint: zh ? '墨色与纸色的混合程度' : 'Blend between the ink colour and the paper',
            control: React.createElement(OceanSlider, {
              value: s.density, min: 0, max: 1, step: 0.01,
              onChange: (value) => set({ density: value }),
              format: (value) => `${Math.round(value * 100)}%`,
            }),
          }),
          React.createElement(OceanRow, {
            title: zh ? '阅读保护' : 'Reading veil',
            hint: zh ? '0% 露出原样，100% 完全盖住文字后的墨迹' : '0% raw ocean, 100% fully hides ink behind text',
            control: React.createElement(OceanSlider, {
              value: s.veil, min: 0, max: 1, step: 0.01,
              onChange: (value) => set({ veil: value }),
              format: (value) => `${Math.round(value * 100)}%`,
            }),
          }),
          React.createElement(OceanRow, {
            title: zh ? '鱼的速度' : 'Fish speed',
            hint: zh ? '只影响鱼群；鲨鱼保持自己的节奏' : 'Fish only; sharks keep their own pace',
            control: React.createElement(OceanSlider, {
              value: s.fishSpeed, min: 0.1, max: 3, step: 0.05,
              onChange: (value) => set({ fishSpeed: value }),
              format: (value) => `${value.toFixed(2)}×`,
            }),
          }),
          React.createElement(OceanRow, {
            title: zh ? '鱼的数量' : 'Fish count',
            hint: zh ? '“自动”会按窗口面积计算' : 'Auto derives the count from the window area',
            control: React.createElement('div', { className: 'dsh-ocean-row__control' },
              React.createElement('label', { className: 'dsh-ocean-check' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: s.fishCount === null,
                  onChange: (event) => {
                    if (event.target.checked) {
                      window.clearTimeout(countTimer.current);
                      updateSettings({ fishCount: null });
                    } else {
                      commitCount(34, true);
                    }
                  },
                }),
                zh ? '自动' : 'Auto'),
              React.createElement('input', {
                type: 'range',
                className: 'dsh-ocean-range',
                min: 0, max: 80, step: 1,
                value: s.fishCount === null ? 34 : countDraft,
                disabled: s.fishCount === null,
                onChange: (event) => commitCount(Number(event.target.value), false),
              }),
              React.createElement('span', { className: 'dsh-ocean-value' },
                s.fishCount === null ? (zh ? '自动' : 'auto') : String(s.fishCount))),
          }),
          React.createElement(OceanRow, {
            title: zh ? '墨色' : 'Ink colour',
            hint: zh ? '选择墨水的颜色；可跟随主题' : 'Pick the ink colour, or follow the theme',
            control: React.createElement('div', { className: 'dsh-ocean-row__control' },
              React.createElement('input', {
                type: 'color',
                className: 'dsh-ocean-color',
                value: ink,
                'aria-label': zh ? '墨色' : 'Ink colour',
                onChange: (event) => set({ inkColor: event.target.value }),
              }),
              React.createElement('button', {
                type: 'button',
                className: 'dsh-ocean-linkbtn',
                onClick: () => set({ inkColor: null }),
              }, zh ? '跟随主题' : 'Theme')),
          }),
          React.createElement(OceanRow, {
            title: zh ? '场景' : 'Scene',
            hint: zh ? '混合 / 经典 / 单鲨' : 'Mixed / Classic / Solo',
            control: React.createElement('select', {
              className: 'dsh-ocean-select',
              value: s.scene,
              onChange: (event) => set({ scene: event.target.value }),
            },
              React.createElement('option', { value: 'mixed' }, zh ? '混合 · 4 种鲨鱼' : 'Mixed · four species'),
              React.createElement('option', { value: 'classic' }, zh ? '经典 · 4 条' : 'Classic · four sharks'),
              React.createElement('option', { value: 'solo' }, zh ? '单鲨' : 'Solo')),
          }),
          React.createElement(OceanRow, {
            title: zh ? '鼠标划过时驱散鱼群' : 'Scatter fish on pointer',
            hint: zh ? '鼠标经过动画区域时，鱼群会让开' : 'Schools give way when the pointer crosses the water',
            control: React.createElement(OceanSwitch, {
              checked: s.fishScatter,
              label: zh ? '鼠标划过时驱散鱼群' : 'Scatter fish on pointer',
              onChange: (value) => set({ fishScatter: value }),
            }),
          })),
        React.createElement('p', { className: 'dsh-ocean-footnote' },
          zh ? '设置保存在本机；总开关关闭时动画暂停。' : 'Saved on this device; the master switch pauses the animation.'));
    }

    function SharkLayer() {
      lifecycle = 'render';
      const marker = React.useRef(null);
      React.useEffect(() => {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.dataset.plugin = '@local/ascii-sharks';
        style.textContent = CSS;
        document.head.appendChild(style);

        // A previous module generation may still own a canvas and its RAF loop.
        // Dispose those first through the page-level registry.
        const registryKey = '__dshAsciiSharksDisposers';
        const previous = Array.isArray(window[registryKey]) ? window[registryKey].splice(0) : [];
        for (const dispose of previous) {
          try {
            dispose();
          } catch {
            /* A stale instance must not block the new one. */
          }
        }

        lifecycle = 'effect-start';
        let instance = null;
        let cleaned = false;
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          if (live === instance) live = null;
          lifecycle = 'disposed';
          instance?.dispose();
          style.remove();
        };
        try {
          instance = mount(marker.current);
          live = instance;
          lifecycle = 'mounted';
          const disposers = window[registryKey] || (window[registryKey] = []);
          disposers.push(cleanup);
        } catch (error) {
          lastFailure = String(error && error.stack ? error.stack : error);
          lifecycle = 'mount-failed';
          console.error('[ascii-sharks] mount failed', error);
        }
        return () => {
          const disposers = window[registryKey];
          const index = Array.isArray(disposers) ? disposers.indexOf(cleanup) : -1;
          if (index >= 0) disposers.splice(index, 1);
          cleanup();
        };
      }, []);
      // The marker itself lives in the overlay and is never visible.
      return React.createElement('div', { ref: marker, hidden: true });
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const settingsStyle = document.createElement('style');
        settingsStyle.dataset.plugin = '@local/ascii-sharks';
        settingsStyle.textContent = SETTINGS_CSS;
        document.head.appendChild(settingsStyle);
        ctx.effect(() => () => settingsStyle.remove(), 'ascii-sharks: settings styles');

        let themeTimer = 0;
        const syncTheme = () => {
          if (themeTimer) return;
          // Defer one task: the theme presenter writes the document tokens from
          // the same event, and readPalette must see the new variables.
          themeTimer = window.setTimeout(() => {
            themeTimer = 0;
            themeRevision += 1;
            live?.rebuild();
            notifySettings();
          }, 0);
        };
        ctx.on('theme/change', syncTheme);
        if (typeof MutationObserver === 'function') {
          const themeObserver = new MutationObserver(syncTheme);
          themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] });
          ctx.effect(() => () => {
            themeObserver.disconnect();
            if (themeTimer) window.clearTimeout(themeTimer);
          }, 'ascii-sharks: theme observer');
        }
        const inspect = ctx.get('cordisInspect');
        if (inspect !== undefined && typeof inspect.register === 'function') {
          ctx.effect(() => inspect.register({
            manifest: {
              id: 'AsciiSharks',
              description: 'Read-only diagnostics for the ASCII shark background layer.',
              methods: [{
                name: 'status',
                description: 'Return live layer geometry, animation state, protection zones and a canvas ink sample.',
                inputSchema: { type: 'object', properties: {}, additionalProperties: false },
                outputSchema: { type: 'object', additionalProperties: true },
              }],
            },
            query(method) {
              if (method !== 'status') throw new Error(`unknown AsciiSharks inspect method "${method}"`);
              return live ? { ...live.status(), lifecycle, error: lastFailure } : { mounted: false, lifecycle, error: lastFailure };
            },
          }), 'ascii-sharks: inspect provider');
        }
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'dsh-ascii-sharks-ocean',
          order: 50,
          label: 'ASCII sharks',
        }, SharkLayer));

        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'ascii-ocean',
          order: 25,
          label: () => {
            const lang = (document.documentElement.lang || navigator.language || '').toLowerCase();
            return lang.startsWith('zh') ? 'ASCII 海洋' : 'ASCII ocean';
          },
        }, OceanSettings));
      },
    };
  },
});
