// ==UserScript==
// @name         Canvas Glowup
// @namespace    https://github.com/Decentblup/decentblups-canvas-reskin
// @version      8.2
// @description  A cleaner, faster Canvas: course shortcuts, header tabs, floating rounded UI, light/dark/custom themes, Vim keys and more. Gear button in the sidebar opens settings.
// @author       Decentblup
// @homepageURL  https://github.com/Decentblup/decentblups-canvas-reskin
// @supportURL   https://github.com/Decentblup/decentblups-canvas-reskin/issues
// @updateURL    https://raw.githubusercontent.com/Decentblup/decentblups-canvas-reskin/main/canvas-glowup.user.js
// @downloadURL  https://raw.githubusercontent.com/Decentblup/decentblups-canvas-reskin/main/canvas-glowup.user.js
// @match        https://canvas.ubc.ca/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  /* ======================= config ======================= */

  const KEEP_NAV = ['global_nav_profile_link', 'global_nav_dashboard_link'];
  const TOP_TABS = ['home', 'modules', 'assignments']; // moved to the front of the top bar
  const SHOW_CRUMBS = false; // true = keep breadcrumbs next to the tabs
  const LIGHT_DIM = 0.92;    // light pages: 1 = full white, lower = softer (0.92 turns white into ~#ebebeb)
  const KEYS = { features: 'cqs_features', courses: 'cqs_courses', pins: 'cqs_pins', rsHidden: 'cqs_rs_hidden', keymap: 'cqs_keys' };
  const RS_WIDTH = 300;      // floating side panel width (px)
  const CARD_COL = 400;      // card lists: minimum column width (px); columns stretch to fill the row
  const CARD_GAP = 12;       // card lists: space between cards (px), 0 = touching

  // live: true  -> applies instantly (CSS class on <html>)
  // live: false -> rearranges the page, needs a reload
  const FEATURES = [
    { id: 'darkPages',  group: 'Appearance', label: 'Dark Canvas pages',         desc: 'In dark theme, darken Canvas itself too',      live: true  },
    { id: 'monoLinks',  group: 'Appearance', label: 'Theme-coloured links',      desc: 'Links + main buttons use the theme colour',        live: true  },
    { id: 'siteFont',   group: 'Appearance', label: 'Halyard font',              desc: 'oryzo.ai’s typeface (free lookalike if not installed)', live: true },
    { id: 'courses',    group: 'Layout',     label: 'Course shortcuts',          desc: 'Courses, Inbox and Calendar in the left bar',  live: false },
    { id: 'tabs',       group: 'Layout',     label: 'Course tabs in top bar',    desc: 'Moves the course menu into the header',        live: false },
    { id: 'fileRow',    group: 'Layout',     label: 'Compact file pages',        desc: 'Title, download and prev/next in one row',     live: false },
    { id: 'floatNav',   group: 'Layout',     label: 'Floating sidebar',          desc: 'Detached, rounded global navigation',          live: true  },
    { id: 'floatRight', group: 'Layout',     label: 'Floating side panel',       desc: 'Right column floats and can be hidden',        live: true  },
    { id: 'cards',      group: 'Layout',     label: 'Rounded sections',          desc: 'Cards everywhere; assignments + modules side by side', live: true },
    { id: 'homeTidy',   group: 'Cleanup',    label: 'Tidy course home',          desc: 'Hides empty announcements, calmer side column', live: true },
    { id: 'hideReader', group: 'Cleanup',    label: 'Hide Immersive Reader',     desc: 'Removes the Immersive Reader button',          live: true  },
    { id: 'noAnim',     group: 'Cleanup',    label: 'Disable Canvas animations', desc: 'Snappier page, keeps these controls smooth',   live: true  },
    { id: 'vim',        group: 'Keyboard',   label: 'Vim keys',                  desc: 'j/k to scroll, f for link hints, ? for all keys', live: true },
  ];
  const THEMES = [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark'], ['comfy', 'Comfy'], ['custom', 'Custom']];

  // colour themes: page background, panels (bars, menus, cards), raised (hover, tiles), accent (active / highlight), text
  const PALETTES = {
    comfy: { bg: '#241015', panel: '#49292f', raised: '#5e3640', accent: '#ffc7d4', text: '#fff4f7' },
  };
  const PALETTE_FIELDS = [['bg', 'Background'], ['panel', 'Panels'], ['raised', 'Raised'], ['accent', 'Accent'], ['text', 'Text']];

  /* ======================= helpers ======================= */

  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const addStyle = (css) => {
    const s = document.createElement('style');
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  };

  const onReady = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  };

  const waitFor = (selector, cb, timeout = 0) => {
    const hit = document.querySelector(selector);
    if (hit) return cb(hit);
    const obs = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) { obs.disconnect(); cb(found); }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    if (timeout) setTimeout(() => obs.disconnect(), timeout);
  };

  // Small DOM builder: string children become text nodes, never parsed as HTML.
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else node.setAttribute(k, v);
    }
    node.append(...children);
    return node;
  };

  // "CPSC_V 221 101/102 2026W1" -> "CPSC 221"
  const shorten = (code = '') => code.replace(/_V\b/g, '').trim().split(/\s+/).slice(0, 2).join(' ');
  const isActive = (href) => location.pathname === href || location.pathname.startsWith(href + '/');

  /* ======================= icons (static markup) ======================= */

  const svg = (body, size = 20) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

  const ICONS = {
    gear: svg(`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>`),
    inbox: svg(`<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>`),
    calendar: svg(`<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`),
    pin: svg(`<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>`, 12),
    panelClose: svg(`<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/><path d="m8 9 3 3-3 3"/>`, 18),
    panelOpen: svg(`<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/><path d="m10 15-3-3 3-3"/>`, 20),
  };

  /* ======================= settings + theme ======================= */

  const DEFAULTS = { theme: 'auto', custom: { ...PALETTES.comfy }, ...Object.fromEntries(FEATURES.map((f) => [f.id, true])) };
  const stored = load(KEYS.features, {});
  if ('glassNav' in stored && !('floatNav' in stored)) stored.floatNav = stored.glassNav; // carry over v3.0 setting
  delete stored.glassNav;
  const settings = { ...DEFAULTS, ...stored };
  const master = settings.master !== false; // master switch: off = Canvas as normal, only the gear stays
  const atLoad = { ...settings };
  const root = document.documentElement;

  const darkMQ = matchMedia('(prefers-color-scheme: dark)');

  /* ----- colour helpers for palette themes ----- */
  const hexToRgb = (hex) => {
    const h = String(hex || '').replace('#', '');
    const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, '0').slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  };
  const rgbToHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
  const rgba = (hex, a) => `rgba(${hexToRgb(hex).map((v) => Math.round(v * 255)).join(',')},${a})`;
  const mix = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const luminance = (hex) => {
    const [r, g, b] = hexToRgb(hex).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

  // Dark Canvas pages run the page through invert -> hue-rotate(180deg) -> contrast(.88).
  // To make something *end up* a given colour, give it the colour that filter turns into it.
  const HUE180 = [[-0.574, 1.43, 0.144], [0.426, 0.43, 0.144], [0.426, 1.43, -0.856]];
  const preDark = (hex) => {
    const c = hexToRgb(hex).map((v) => (v - 0.06) / 0.88);                 // undo contrast(.88)
    const h = HUE180.map((row) => row.reduce((sum, k, i) => sum + k * c[i], 0)); // undo hue-rotate (it's its own inverse)
    return rgbToHex(h.map((v) => 1 - Math.min(1, Math.max(0, v))));         // undo invert
  };

  const activePalette = () => {
    const p = settings.theme === 'custom' ? settings.custom : PALETTES[settings.theme];
    if (!p) return null;
    const full = { ...PALETTES.comfy, ...p };
    const darkBase = luminance(full.bg) < 0.25;
    full.text = full.text || (darkBase ? mix('#ffffff', full.accent, 0.12) : '#1b1b1f');
    return full;
  };
  const isDark = () => {
    const p = activePalette();
    if (p) return luminance(p.bg) < 0.25;
    return settings.theme === 'dark' || (settings.theme === 'auto' && darkMQ.matches);
  };

  // palette -> the script's colour tokens, plus Canvas page colours
  const paletteCss = (p) => {
    if (!p) return '';
    const onAccent = onAccentOf(p);
    return `
      html.cqs-palette.cqs-palette {
        --cqs-panel: ${p.panel}; --cqs-border: ${rgba(p.text, 0.08)};
        --cqs-tile: ${p.raised}; --cqs-hover: ${rgba(p.raised, 0.85)};
        --cqs-text: ${rgba(p.text, 0.88)}; --cqs-muted: ${rgba(p.text, 0.64)}; --cqs-strong: ${p.text};
        --cqs-line: ${rgba(p.text, 0.12)};
        --cqs-accent: ${p.accent}; --cqs-on-accent: ${onAccent};
        --cqs-shadow: 0 12px 32px -12px rgba(0,0,0,.55);
        --cqs-seg-bg: ${p.raised}; --cqs-switch-off: ${p.raised}; --cqs-knob-on: ${onAccent}; --cqs-menu-lens: ${p.raised};
        --cqs-cursor-ring: ${rgba(p.accent, 0.75)}; --cqs-cursor-fill: ${rgba(p.accent, 0.08)};
        --cqs-page-hover: ${rgba(p.text, 0.07)};
      }
      /* dark palettes + dark Canvas pages: Canvas itself takes the palette (colours pre-inverted for the page filter) */
      html.cqs-palette.cqs-darkPages.cqs-darkPages { background: ${preDark(p.bg)} !important; --cqs-page-panel: ${preDark(p.panel)}; }
      html.cqs-palette.cqs-darkPages :is(body, #application, #wrapper, #main) { background-color: ${preDark(p.bg)} !important; }
      html.cqs-palette.cqs-darkPages.cqs-monoLinks #wrapper a:not(.btn):not(.Button):not([role="button"]) { color: ${preDark(p.accent)}; }
      /* light palettes: Canvas pages use the palette directly */
      html.cqs-palette.cqs-light { --cqs-page-panel: ${p.panel}; }
      html.cqs-on.cqs-palette.cqs-light:not(.cqs-darkPages) :is(body, #application, #wrapper, #main) { background-color: ${p.bg} !important; }
    `;
  };

  // text on the accent: the theme's own background if it's readable there, else black or white
  const onAccentOf = (p) => (contrast(p.bg, p.accent) >= 4.5 ? p.bg
    : contrast('#000000', p.accent) >= contrast('#ffffff', p.accent) ? '#000000' : '#ffffff');

  // Canvas's primary / selected buttons (e.g. "Show by date") take the theme accent instead of Canvas blue/green
  const accentButtonsCss = () => {
    const p = activePalette();
    const dark = isDark();
    const accent = p ? p.accent : dark ? '#f4f4f5' : '#111827';
    const on = p ? onAccentOf(p) : dark ? '#111214' : '#ffffff';
    const invertedPage = settings.darkPages && dark; // dark pages are colour-inverted, so pre-invert
    const bg = invertedPage ? preDark(accent) : accent;
    const fg = invertedPage ? preDark(on) : on;
    return `
      html.cqs-monoLinks #wrapper :is(.btn-primary, .Button--primary, .btn.active, .Button.active, .btn-group .active,
                                      .ui-state-active, .ui-button.ui-state-active):not([class*="cqs-"]) {
        background: ${bg} !important; color: ${fg} !important;
        border-color: transparent !important; text-shadow: none !important; box-shadow: none !important;
      }
      html.cqs-monoLinks #wrapper :is(.btn-primary, .Button--primary, .btn.active, .Button.active, .btn-group .active,
                                      .ui-state-active) :is(i, span) { color: inherit !important; }
    `;
  };

  let themeStyle = null;
  const applyPalette = () => {
    if (!themeStyle) { themeStyle = document.createElement('style'); themeStyle.dataset.cqsTheme = ''; }
    // keep it last so it wins over the base theme tokens
    (document.head || root).appendChild(themeStyle);
    const p = activePalette();
    themeStyle.textContent = paletteCss(p) + accentButtonsCss();
    root.classList.toggle('cqs-palette', !!p);
  };

  // our own dark mode replaces Dark Reader; this tag tells Dark Reader to stay off so pages aren't darkened twice
  const setDarkReaderLock = (on) => {
    const mine = document.querySelector('meta[name="darkreader-lock"][data-cqs]');
    if (on && !mine) (document.head || root).appendChild(el('meta', { name: 'darkreader-lock', 'data-cqs': '' }));
    if (!on && mine) mine.remove();
  };

  const applyLive = () => {
    const dark = isDark();
    root.classList.toggle('cqs-on', master);
    root.classList.toggle('cqs-dark', dark);   // theme classes stay so the settings menu keeps its look
    root.classList.toggle('cqs-light', !dark);
    for (const f of FEATURES) {
      if (!f.live) continue;
      const on = master && (f.id === 'darkPages' ? settings.darkPages && dark : !!settings[f.id]);
      root.classList.toggle(`cqs-${f.id}`, on);
    }
    setDarkReaderLock(master && settings.darkPages && dark);
    applyPalette();
  };
  // Fonts: Halyard Display is an Adobe Fonts typeface, used when it's installed on this computer
  // (e.g. activated through Creative Cloud). Instrument Sans (free) stands in otherwise; DM Mono matches oryzo's mono.
  const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=DM+Mono:wght@400;500&display=swap';
  const loadFonts = () => {
    if (!master || !settings.siteFont || document.querySelector('link[data-cqs-fonts]')) return;
    (document.head || root).appendChild(el('link', { rel: 'stylesheet', href: FONT_CSS, 'data-cqs-fonts': '' }));
  };

  applyLive(); // before first paint, so there's no flash
  loadFonts();
  darkMQ.addEventListener('change', applyLive);

  /* ----- page-change effect: blur/zoom out on leave, back in on arrival ----- */

  const NAV_FX_KEY = 'cqs_nav_fx';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let leaveTimer = 0;

  // arriving from a Shift switch: start blurred (with the loading dots), settle once the page is ready
  try {
    const fx = JSON.parse(sessionStorage.getItem(NAV_FX_KEY) || 'null');
    sessionStorage.removeItem(NAV_FX_KEY);
    if (master && fx && Date.now() - fx.t < 10000 && !reducedMotion.matches) {
      if (fx.x) root.style.setProperty('--cqs-load-x', `${fx.x}px`);
      root.classList.add('cqs-arriving');
    }
  } catch {}

  const settleIn = () => {
    if (!root.classList.contains('cqs-arriving')) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.add('cqs-settling');
      root.classList.remove('cqs-arriving');
      setTimeout(() => root.classList.remove('cqs-settling'), 600);
    }));
  };
  onReady(() => setTimeout(settleIn, 60));

  // only real page loads get the effect (not the Account tray, new tabs, or "#" links)
  const navigates = (a) => {
    const href = a?.getAttribute?.('href');
    return !!href && href !== '#' && !href.startsWith('javascript:') &&
      a.id !== 'global_nav_profile_link' && a.target !== '_blank';
  };

  const navAway = () => {
    if (!master || reducedMotion.matches) return;
    // centre the loading dots over the content column (and remember where, for the next page)
    const r = document.querySelector('#content')?.getBoundingClientRect();
    const x = Math.round(r && r.width ? r.left + r.width / 2 : innerWidth / 2);
    root.style.setProperty('--cqs-load-x', `${x}px`);
    try { sessionStorage.setItem(NAV_FX_KEY, JSON.stringify({ t: Date.now(), x })); } catch {}
    root.classList.add('cqs-leaving');
    clearTimeout(leaveTimer);
    // if the page never actually changes, don't leave it blurred
    leaveTimer = setTimeout(() => {
      root.classList.remove('cqs-leaving');
      try { sessionStorage.removeItem(NAV_FX_KEY); } catch {}
    }, 5000);
  };

  // coming back via the Back button restores the old page as it was: un-blur it
  const cancelNavFx = () => {
    clearTimeout(leaveTimer);
    root.classList.remove('cqs-leaving');
    try { sessionStorage.removeItem(NAV_FX_KEY); } catch {}
  };

  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    root.classList.remove('cqs-leaving', 'cqs-arriving', 'cqs-settling');
    unloading = false;
    revertActive(); // the page we left is shown again: put its "current" highlight back
  });

  /* ======================= shared styles ======================= */

  // Dark Canvas pages: invert the whole page, then flip back anything that should keep its real colours
  // (photos, video, embedded tools, and this script's own bars, which have their own dark design).
  const DARK_PAGE = 'invert(1) hue-rotate(180deg) contrast(.88)';
  const UNDO_DARK = 'contrast(1.136) hue-rotate(180deg) invert(1)';
  const KEEP_REAL = '.ic-app-header, .cqs-tabbar, .cqs-panel, .cqs-rs-open, .cqs-hints, .cqs-help, .cqs-toast, .cqs-cursor, .cqs-page-lens, img, picture, video, canvas, iframe, embed, object, [style*="background-image"]';

  addStyle(`
    /* ---------- theme tokens ---------- */
    html.cqs-light {
      --cqs-panel: #ffffff;
      --cqs-border: rgba(15,23,42,.08);
      --cqs-tile: rgba(15,23,42,.05);
      --cqs-hover: rgba(15,23,42,.06);
      --cqs-text: rgba(15,23,42,.82);
      --cqs-muted: rgba(15,23,42,.60);
      --cqs-strong: #0f172a;
      --cqs-line: rgba(15,23,42,.10);
      --cqs-accent: #111827;
      --cqs-on-accent: #ffffff;
      --cqs-shadow: 0 10px 30px -12px rgba(15,23,42,.22);
      --cqs-seg-bg: #eef1f4;
      --cqs-switch-off: #d4d8dd;
      --cqs-knob-on: #ffffff;
      --cqs-menu-lens: #f1f4f7;
    }
    html.cqs-dark {
      --cqs-panel: #1f2125;
      --cqs-border: rgba(255,255,255,.06);
      --cqs-tile: rgba(255,255,255,.07);
      --cqs-hover: rgba(255,255,255,.09);
      --cqs-text: rgba(255,255,255,.86);
      --cqs-muted: rgba(255,255,255,.62);
      --cqs-strong: #ffffff;
      --cqs-line: rgba(255,255,255,.10);
      --cqs-accent: #f4f4f5;
      --cqs-on-accent: #111214;
      --cqs-shadow: 0 12px 32px -12px rgba(0,0,0,.6);
      --cqs-seg-bg: rgba(255,255,255,.06);
      --cqs-switch-off: #3a3d43;
      --cqs-knob-on: #1f2125;
      --cqs-menu-lens: rgba(255,255,255,.07);
    }

    /* ---------- dark Canvas pages ---------- */
    html.cqs-darkPages { filter: ${DARK_PAGE}; background: #fff !important; }
    html.cqs-darkPages body { background: #fff; }
    html.cqs-darkPages :is(${KEEP_REAL}):not(:is(${KEEP_REAL}) *) { filter: ${UNDO_DARK} !important; }

    /* ---------- light Canvas pages: softer, no flashbang ---------- */
    /* page background a step below white so white cards read as cards, then dim everything slightly */
    html.cqs-on:not(.cqs-darkPages) { filter: brightness(${LIGHT_DIM}); }
    html.cqs-on:not(.cqs-darkPages) body,
    html.cqs-on:not(.cqs-darkPages) #application,
    html.cqs-on:not(.cqs-darkPages) #wrapper,
    html.cqs-on:not(.cqs-darkPages) #main { background-color: #f3f4f6 !important; }

    /* ---------- floating side panel (right column) ---------- */
    /* it holds Canvas content, so it's styled as part of the page (dark pages invert it):
       #fff -> white card on light pages; #ebebeb -> ~#212121 on dark pages, matching the bars */
    html { --cqs-page-panel: #ffffff; }
    html.cqs-darkPages { --cqs-page-panel: #ebebeb; }
    .cqs-rs-head, .cqs-rs-open { display: none; }
    @media (min-width: 1024px) {
      html.cqs-floatRight.cqs-rs-on #right-side-wrapper {
        position: fixed !important; z-index: 50;
        top: var(--cqs-rs-top, 78px); right: 12px; bottom: auto !important; left: auto !important;
        width: ${RS_WIDTH}px !important; max-width: none !important;
        max-height: calc(100vh - var(--cqs-rs-top, 78px) - 12px);
        overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; scrollbar-width: thin;
        clip-path: inset(0 round 20px); /* keep all four corners rounded, scrollbar included */
        margin: 0 !important; padding: 0 16px 16px !important;
        border-radius: 20px; border: 1px solid rgba(0,0,0,.08);
        background: var(--cqs-page-panel) !important;
        box-shadow: 0 10px 30px -12px rgba(15,23,42,.22);
      }
      html.cqs-floatRight.cqs-rs-on.cqs-darkPages #right-side-wrapper { box-shadow: none; }
      html.cqs-floatRight.cqs-rs-on #right-side { margin: 0 !important; padding: 0 !important; width: auto !important; }
      html.cqs-floatRight.cqs-rs-on #right-side * { max-width: 100%; box-sizing: border-box; }
      html.cqs-floatRight.cqs-rs-on #not_right_side { margin-right: 0 !important; }
      html.cqs-floatRight.cqs-rs-on:not(.cqs-rs-hidden) #main { padding-right: ${RS_WIDTH + 24}px !important; }
      html.cqs-floatRight.cqs-rs-on.cqs-rs-hidden #right-side-wrapper { display: none !important; }

      html.cqs-floatRight.cqs-rs-on .cqs-rs-head {
        position: sticky; top: 0; z-index: 2;
        display: flex; align-items: center; justify-content: space-between;
        margin: 0 -4px 4px; padding: 12px 4px 8px;
        background: var(--cqs-page-panel);
      }
      .cqs-rs-title { font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: .65; }
      .cqs-rs-hide {
        width: 30px; height: 30px; padding: 0; display: grid; place-items: center;
        border: 0; border-radius: 8px; background: transparent; color: inherit; cursor: pointer; opacity: .75;
        transition: background-color .2s ease, opacity .2s ease;
      }
      .cqs-rs-hide:hover { background: rgba(127,127,127,.16); opacity: 1; }

      /* the "bring it back" button: one of this script's own controls, so it uses the bar theme */
      html.cqs-floatRight.cqs-rs-on.cqs-rs-hidden .cqs-rs-open {
        position: fixed; z-index: 50; top: var(--cqs-rs-top, 78px); right: 12px;
        display: grid; place-items: center; width: 44px; height: 44px; padding: 0; cursor: pointer;
        border-radius: 14px; border: 1px solid var(--cqs-border);
        background: var(--cqs-panel); color: var(--cqs-text); box-shadow: var(--cqs-shadow);
        transition: background-color .2s ease, color .2s ease;
      }
      .cqs-rs-open:hover { color: var(--cqs-strong); }
      .cqs-rs-open:focus-visible, .cqs-rs-hide:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
    }

    /* ---------- Halyard font (oryzo.ai's typeface) ---------- */
    html.cqs-siteFont {
      --cqs-font: "Halyard Display", "Halyard Display Variable", "halyard-display-variable", "halyard-display",
                  "Instrument Sans", LatoWeb, Lato, system-ui, sans-serif;
      --cqs-mono: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    /* everything with text, except icon fonts, maths and code */
    html.cqs-siteFont body,
    html.cqs-siteFont body :not(i, [class^="icon-"], [class*=" icon-"], [class*="instructure_icon"],
                                code, pre, kbd, samp, .cqs-hint, .cqs-keyhint, .cqs-kbd,
                                .MathJax, .MathJax *, mjx-container, mjx-container *, svg, svg *) {
      font-family: var(--cqs-font) !important;
    }
    html.cqs-siteFont :is(code, pre, kbd, samp, .cqs-hint, .cqs-keyhint, .cqs-kbd) {
      font-family: var(--cqs-mono) !important;
    }

    /* ---------- neutral links ---------- */
    /* dark pages are colour-inverted, so black here shows up as near-white */
    html.cqs-monoLinks.cqs-darkPages #wrapper a:not(.btn):not(.Button):not([role="button"]) { color: #000; }
    html.cqs-monoLinks:not(.cqs-darkPages) #wrapper a:not(.btn):not(.Button):not([role="button"]) { color: #111827; }
    /* inside course content, underline so links still look like links */
    html.cqs-monoLinks #wrapper :is(.user_content, .show-content) a:not(.btn):not(.Button) {
      text-decoration: underline;
      text-decoration-thickness: 1px;
      text-underline-offset: 2px;
      text-decoration-color: color-mix(in srgb, currentColor 45%, transparent);
    }
    html.cqs-monoLinks #wrapper :is(.user_content, .show-content) a:not(.btn):not(.Button):hover {
      text-decoration-color: currentColor;
    }

    /* ---------- Canvas global nav picks up the theme ---------- */
    html.cqs-on.cqs-light, html.cqs-on.cqs-dark {
      --ic-brand-global-nav-bgd: var(--cqs-panel);
      --ic-brand-global-nav-logo-bgd: var(--cqs-panel);
      --ic-brand-global-nav-ic-icon-svg-fill: var(--cqs-text);
      --ic-brand-global-nav-ic-icon-svg-fill--active: var(--cqs-strong);
      --ic-brand-global-nav-menu-item__text-color: var(--cqs-text);
      --ic-brand-global-nav-menu-item__text-color--active: var(--cqs-strong);
      --ic-brand-global-nav-menu-item__badge-bgd: var(--cqs-accent);
      --ic-brand-global-nav-menu-item__badge-text: var(--cqs-on-accent);
      --ic-brand-global-nav-avatar-border: transparent;
    }
    html.cqs-on .ic-app-header { background: var(--cqs-panel) !important; border-right: 1px solid var(--cqs-border); }
    html.cqs-on .ic-app-header .ic-icon-svg { fill: var(--cqs-text) !important; }
    html.cqs-on .ic-app-header .menu-item__text { color: var(--cqs-text) !important; }
    html.cqs-on .ic-app-header #primaryNavToggle { color: var(--cqs-text) !important; }
    html.cqs-on .ic-app-header #primaryNavToggle svg { fill: currentColor !important; }

    html.cqs-on #menu.ic-app-header__menu-list { position: relative; }
    html.cqs-on #menu > li:not(.cqs-lens) { position: relative; z-index: 1; }
    html.cqs-on #menu > li > a.ic-app-header__menu-list-link {
      margin: 0 6px; border-radius: 12px; background: transparent !important;
    }
    /* active item: soft fill + accent bar on the left edge */
    html.cqs-on #menu > li.ic-app-header__menu-list-item--active > a.ic-app-header__menu-list-link { background: var(--cqs-hover) !important; }
    html.cqs-on #menu > li.ic-app-header__menu-list-item--active .menu-item__text { color: var(--cqs-strong) !important; font-weight: 600; }
    html.cqs-on #menu > li.ic-app-header__menu-list-item--active .ic-icon-svg { fill: var(--cqs-strong) !important; }
    html.cqs-on #menu > li.ic-app-header__menu-list-item--active::before {
      content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; z-index: 2;
      width: 3px; border-radius: 0 3px 3px 0; background: var(--cqs-accent);
    }

    /* initials instead of the blank default avatar */
    html.cqs-on #global_nav_profile_link .ic-avatar { border: 0 !important; background: transparent !important; }
    html.cqs-on #global_nav_profile_link .ic-avatar:has(.cqs-initials) img { display: none !important; }
    .cqs-initials {
      display: flex; align-items: center; justify-content: center;
      width: 100%; height: 100%; border-radius: 50%;
      background: var(--cqs-tile); color: var(--cqs-strong);
      font-weight: 700; font-size: 13px; letter-spacing: .03em;
    }

    /* ---------- floating sidebar (desktop widths only) ---------- */
    @media (min-width: 768px) {
      html.cqs-floatNav .ic-app-header {
        position: fixed !important;
        top: 12px !important; left: 12px !important; bottom: 12px !important;
        height: auto !important; border-radius: 20px; overflow: hidden;
        border: 1px solid var(--cqs-border);
        box-shadow: var(--cqs-shadow);
      }
      html.cqs-floatNav #wrapper {
        margin-left: calc(var(--cqs-nav-w, 84px) + 24px) !important;
      }
    }

    /* ---------- buttons that lean slightly toward the cursor ---------- */
    .cqs-mag {
      position: relative;
      transform: translate(var(--tx, 0px), var(--ty, 0px));
      transition: transform .4s cubic-bezier(.2,.8,.2,1), color .2s ease, background-color .2s ease;
    }
    .cqs-mag:active { transform: translate(var(--tx, 0px), var(--ty, 0px)) scale(.97); }

    /* ---------- sliding hover highlight: sidebar, top bar, settings menu ---------- */
    .cqs-lens {
      position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 0;
      list-style: none; pointer-events: none; opacity: 0;
      border-radius: 12px; background: var(--cqs-hover);
      transition: transform .45s cubic-bezier(.2,.9,.25,1.1), width .45s cubic-bezier(.2,.9,.25,1.1),
                  height .45s cubic-bezier(.2,.9,.25,1.1), opacity .2s ease;
    }
    .cqs-lens.is-on { opacity: 1; }
    .cqs-lens.no-move { transition: opacity .2s ease; }
    html:not(.cqs-on) #menu > .cqs-lens { display: none; }

    /* ---------- disable animations everywhere except this script's own controls ---------- */
    html.cqs-noAnim :where(:not(.cqs-anim):not(.cqs-anim *):not(.cqs-pressed):not(#content):not(#right-side-wrapper)),
    html.cqs-noAnim :where(:not(.cqs-anim):not(.cqs-anim *):not(.cqs-pressed):not(#content):not(#right-side-wrapper))::before,
    html.cqs-noAnim :where(:not(.cqs-anim):not(.cqs-anim *):not(.cqs-pressed):not(#content):not(#right-side-wrapper))::after {
      animation: none !important; transition: none !important;
    }

    /* ---------- hide Immersive Reader ---------- */
    html.cqs-hideReader #immersive_reader_mount_point,
    html.cqs-hideReader #immersive_reader_mobile_mount_point,
    html.cqs-hideReader [data-cqs-ir="1"] { display: none !important; }

    /* ---------- bottom tools: Inbox, Calendar, gear ---------- */
    .cqs-tools {
      list-style: none; display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 10px 0 8px;
    }
    .cqs-tool {
      position: relative; width: 40px; height: 40px; padding: 0;
      display: grid; place-items: center; cursor: pointer;
      border: 0; border-radius: 12px; text-decoration: none !important;
      background: var(--cqs-tile); color: var(--cqs-text) !important;
      transition: background-color .2s ease, color .2s ease;
    }
    .cqs-tool:hover, .cqs-tool[aria-expanded="true"] { background: var(--cqs-hover); color: var(--cqs-strong) !important; }
    .cqs-tool.is-active { background: var(--cqs-accent); color: var(--cqs-on-accent) !important; }
    .cqs-tool:focus-visible { outline: 2px solid var(--cqs-strong); outline-offset: 2px; }
    .cqs-gear svg { transition: transform .6s cubic-bezier(.2,.8,.2,1); }
    .cqs-gear:hover svg, .cqs-gear[aria-expanded="true"] svg { transform: rotate(90deg); }
    .cqs-count {
      position: absolute; top: -4px; right: -4px;
      min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
      display: grid; place-items: center;
      background: var(--cqs-accent); color: var(--cqs-on-accent); font: 700 10px/1 system-ui, sans-serif;
      box-shadow: 0 0 0 2px var(--cqs-panel);
    }
    .cqs-count:empty { display: none; }
    html:not(.cqs-on) .cqs-tool { background: rgba(255,255,255,.14) !important; color: #fff !important; }
    html:not(.cqs-on) .cqs-tool:hover { background: rgba(255,255,255,.24) !important; }

    /* ---------- settings panel ---------- */
    .cqs-panel {
      position: fixed; z-index: 10000; width: 312px; padding: 14px; box-sizing: border-box;
      max-height: calc(100vh - 24px); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin;
      border-radius: 20px; color: var(--cqs-strong); background: var(--cqs-panel);
      font: 13px/1.35 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
      border: 1px solid var(--cqs-border);
      box-shadow: 0 20px 48px -16px rgba(0,0,0,.4);
      opacity: 0; visibility: hidden; pointer-events: none;
      transform: translateX(-8px) scale(.97); transform-origin: left bottom;
      transition: opacity .2s ease, transform .35s cubic-bezier(.2,.9,.25,1.15), visibility 0s linear .2s;
    }
    .cqs-panel.is-open {
      opacity: 1; visibility: visible; pointer-events: auto; transform: none;
      transition: opacity .2s ease, transform .35s cubic-bezier(.2,.9,.25,1.15), visibility 0s;
    }
    .cqs-panel-head { padding: 4px 8px 10px !important; margin: 0 0 4px !important; border-bottom: 1px solid var(--cqs-line); border-radius: 0 !important; }
    .cqs-panel.is-off .cqs-panel-head { border-bottom: 0; }
    .cqs-panel.is-off :is(.cqs-panel-list, .cqs-reload) { display: none !important; }
    .cqs-off-note { margin: 0; padding: 0 8px 6px; color: var(--cqs-muted); font-size: 12px; line-height: 1.4; }
    .cqs-panel-title { font-weight: 700; font-size: 15px; letter-spacing: -.01em; }
    .cqs-panel-sub { color: var(--cqs-muted); font-size: 12px; margin-top: 2px; }
    .cqs-panel-list { position: relative; }
    .cqs-panel-list > .cqs-lens { background: var(--cqs-menu-lens); border-radius: 10px; }
    .cqs-panel-group {
      margin: 8px 8px 4px; color: var(--cqs-muted);
      font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
    }
    .cqs-row {
      z-index: 1;
      display: flex; align-items: center; gap: 12px;
      margin: 2px 0; padding: 9px 10px; border-radius: 10px; cursor: pointer;
    }
    .cqs-row-static { cursor: default; }
    .cqs-panel .cqs-row { box-sizing: border-box; width: 100%; margin-left: 0 !important; margin-right: 0 !important; }
    .cqs-row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .cqs-panel .cqs-row-title, .cqs-panel .cqs-row-desc { overflow-wrap: anywhere; }
    .cqs-row-title { font-weight: 600; }
    .cqs-row-desc { color: var(--cqs-muted); font-size: 11.5px; }

    /* switches: written with high specificity + !important so Canvas's own checkbox styles can't hide or move them */
    .cqs-panel .cqs-row input.cqs-switch[type="checkbox"] {
      appearance: none !important; -webkit-appearance: none !important;
      position: relative !important; display: inline-block !important; flex: 0 0 auto !important;
      width: 40px !important; height: 24px !important; min-width: 40px; margin: 0 !important; padding: 0 !important;
      opacity: 1 !important; clip: auto !important; overflow: visible !important; left: auto !important; top: auto !important;
      border: 0 !important; border-radius: 999px !important; box-shadow: none !important; cursor: pointer;
      background: var(--cqs-switch-off) !important;
      transition: background-color .25s ease;
    }
    .cqs-panel .cqs-row input.cqs-switch[type="checkbox"]::before {
      content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%;
      background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25);
      transition: transform .3s cubic-bezier(.2,.9,.25,1.2), background-color .25s ease;
    }
    .cqs-panel .cqs-row input.cqs-switch[type="checkbox"]:checked { background: var(--cqs-accent) !important; }
    .cqs-panel .cqs-row input.cqs-switch[type="checkbox"]:checked::before { transform: translateX(16px); background: var(--cqs-knob-on); }
    .cqs-switch:focus-visible { outline: 2px solid var(--cqs-strong); outline-offset: 2px; }

    /* theme picker: swatches */
    .cqs-themes { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin: 2px 0 6px; }
    .cqs-theme-chip {
      display: flex; flex-direction: column; align-items: center; gap: 5px;
      padding: 8px 2px 6px; border: 0; border-radius: 12px; cursor: pointer;
      background: transparent; color: var(--cqs-muted);
      font: inherit; font-size: 11px; font-weight: 600;
      transition: background-color .2s ease, color .2s ease, box-shadow .2s ease;
    }
    .cqs-theme-chip:hover { background: var(--cqs-menu-lens); color: var(--cqs-strong); }
    .cqs-theme-chip[aria-checked="true"] { background: var(--cqs-menu-lens); color: var(--cqs-strong); box-shadow: inset 0 0 0 2px var(--cqs-accent); }
    .cqs-theme-chip:focus-visible { outline: 2px solid var(--cqs-strong); outline-offset: 1px; }
    .cqs-swatch { width: 26px; height: 26px; border-radius: 50%; box-shadow: 0 0 0 1px var(--cqs-border), 0 1px 3px rgba(0,0,0,.25); }

    /* custom theme colours */
    .cqs-custom { display: none; grid-template-columns: 1fr auto; align-items: center; gap: 6px 10px; margin: 0 0 6px; padding: 8px 10px 10px; border-radius: 12px; background: var(--cqs-menu-lens); }
    .cqs-panel.is-custom .cqs-custom { display: grid; }
    .cqs-custom-label { font-weight: 600; font-size: 12px; }
    .cqs-panel input.cqs-color[type="color"] {
      -webkit-appearance: none !important; appearance: none !important;
      width: 40px !important; height: 24px !important; padding: 0 !important; margin: 0 !important;
      border: 0 !important; border-radius: 7px !important; background: none !important; cursor: pointer;
      opacity: 1 !important; position: static !important; box-shadow: 0 0 0 1px var(--cqs-border);
    }
    .cqs-panel input.cqs-color::-webkit-color-swatch-wrapper { padding: 0; }
    .cqs-panel input.cqs-color::-webkit-color-swatch { border: 0; border-radius: 7px; }
    .cqs-panel input.cqs-color::-moz-color-swatch { border: 0; border-radius: 7px; }
    .cqs-custom-reset { grid-column: 1 / -1; margin-top: 4px; }

    /* theme picker: segmented control */
    .cqs-seg {
      position: relative; display: flex; gap: 2px; padding: 3px;
      border-radius: 10px; background: var(--cqs-seg-bg);
    }
    .cqs-seg > .cqs-lens { border-radius: 8px; background: var(--cqs-hover); }
    .cqs-seg-btn {
      position: relative; z-index: 1;
      padding: 5px 10px; border: 0; border-radius: 8px; cursor: pointer;
      background: transparent; color: var(--cqs-muted);
      font: inherit; font-size: 12px; font-weight: 600;
      transition: background-color .2s ease, color .2s ease;
    }
    .cqs-seg-btn:hover { color: var(--cqs-strong); }
    .cqs-seg-btn[aria-checked="true"] { background: var(--cqs-accent); color: var(--cqs-on-accent); }
    .cqs-seg-btn:focus-visible { outline: 2px solid var(--cqs-strong); outline-offset: 1px; }

    .cqs-reload {
      display: none; width: 100%; margin-top: 10px; height: 38px;
      border: 0; border-radius: 12px; cursor: pointer;
      color: var(--cqs-on-accent); font: inherit; font-weight: 600; background: var(--cqs-accent);
      transition: opacity .2s ease;
    }
    .cqs-reload:hover { opacity: .88; }
    .cqs-panel.has-pending .cqs-reload { display: block; }

    /* ---------- vim keys: link hints, help sheet, toast ---------- */
    .cqs-hints { position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; }
    .cqs-hint {
      position: absolute; padding: 1px 5px; border-radius: 5px;
      background: var(--cqs-accent); color: var(--cqs-on-accent);
      font: 700 11px/16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      letter-spacing: .04em; text-transform: uppercase; white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,.35), 0 0 0 1px var(--cqs-border);
    }
    .cqs-hint .typed { opacity: .45; }
    /* whole rows/cards are clickable (handled in JS), so no underlines needed on their titles */
    html.cqs-cards #content :is(.ig-row, .ic-announcement-row, .ic-discussion-row, tr.student_assignment) { cursor: pointer; }
    html.cqs-cards #content :is(.ig-row, .ic-announcement-row, .ic-discussion-row, tr.student_assignment) a {
      text-decoration: none !important;
    }

    /* sliding hover highlight for rows on Canvas pages (same motion as the top bar) */
    html.cqs-light { --cqs-page-hover: rgba(15,23,42,.06); }
    html.cqs-dark  { --cqs-page-hover: rgba(255,255,255,.07); }
    .cqs-page-lens {
      position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 30;
      pointer-events: none; opacity: 0; border-radius: 10px;
      background: var(--cqs-page-hover);
      /* quicker than the bar highlight: rows are close together and you move across them fast */
      transition: transform .16s cubic-bezier(.25,.8,.3,1), width .16s cubic-bezier(.25,.8,.3,1),
                  height .16s cubic-bezier(.25,.8,.3,1), border-radius .16s ease, opacity .15s ease;
    }
    .cqs-page-lens.is-on { opacity: 1; }
    .cqs-page-lens.no-move { transition: opacity .2s ease; }

    /* j/k page cursor: same sliding motion as the hover highlight */
    html.cqs-light { --cqs-cursor-ring: rgba(17,24,39,.55); --cqs-cursor-fill: rgba(17,24,39,.045); }
    html.cqs-dark  { --cqs-cursor-ring: rgba(255,255,255,.6); --cqs-cursor-fill: rgba(255,255,255,.06); }
    .cqs-cursor {
      position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 40;
      pointer-events: none; opacity: 0; border-radius: 10px;
      background: var(--cqs-cursor-fill);
      box-shadow: 0 0 0 2px var(--cqs-cursor-ring);
      transition: transform .45s cubic-bezier(.2,.9,.25,1.1), width .45s cubic-bezier(.2,.9,.25,1.1),
                  height .45s cubic-bezier(.2,.9,.25,1.1), opacity .2s ease;
    }
    .cqs-cursor.is-on { opacity: 1; }
    .cqs-cursor.no-move { transition: opacity .2s ease; }

    /* page change after a Shift switch: the middle zooms out + blurs, then the new page zooms back in */
    html.cqs-leaving :is(#content, #right-side-wrapper),
    html.cqs-arriving :is(#content, #right-side-wrapper) {
      transform: scale(.965) !important; filter: blur(6px) !important; opacity: .5 !important;
    }
    html.cqs-leaving :is(#content, #right-side-wrapper),
    html.cqs-settling :is(#content, #right-side-wrapper) {
      transform-origin: 50% 240px;
      transition: transform .42s cubic-bezier(.2,.9,.25,1), filter .42s ease, opacity .42s ease !important;
    }

    /* "..." loading indicator while leaving / arriving: three big dots, no box.
       Drawn with the root element's own ::after, so it can show before the new page has any DOM. */
    /* always present but invisible, so it can fade in and out instead of popping */
    html::after {
      content: ''; position: fixed; z-index: 2147483640; pointer-events: none;
      left: var(--cqs-load-x, 50%); top: 42vh; transform: translate(-50%, -50%);
      width: 24px; height: 24px; border-radius: 50%;
      color: var(--cqs-strong); background: currentColor;
      box-shadow: -44px 0 0 currentColor, 44px 0 0 currentColor;
      opacity: 0; transition: opacity .18s ease;
      animation: cqs-dots 1s infinite ease-in-out paused; /* paused (not removed) so the fade-out doesn't flash */
    }
    html.cqs-leaving::after, html.cqs-arriving::after {
      opacity: 1;
      animation-play-state: running;
    }
    @keyframes cqs-dots {
      0%, 100% { background: color-mix(in srgb, currentColor 25%, transparent);
                 box-shadow: -44px 0 0 currentColor, 44px 0 0 color-mix(in srgb, currentColor 25%, transparent); }
      33%      { background: currentColor;
                 box-shadow: -44px 0 0 color-mix(in srgb, currentColor 25%, transparent), 44px 0 0 color-mix(in srgb, currentColor 25%, transparent); }
      66%      { background: color-mix(in srgb, currentColor 25%, transparent);
                 box-shadow: -44px 0 0 color-mix(in srgb, currentColor 25%, transparent), 44px 0 0 currentColor; }
    }
    /* dark pages invert everything under <html>; flip the dots back to their real colour */
    html.cqs-darkPages::after { filter: ${UNDO_DARK}; }

    /* confirmation when a Shift pick opens: the item takes the "current" style and gives a quick press */
    @keyframes cqs-press { 0% { transform: scale(1); } 35% { transform: scale(.92); } 100% { transform: scale(1); } }
    .cqs-pressed { animation: cqs-press .38s cubic-bezier(.2,.9,.25,1.25) !important; }

    /* item picked with Shift+H/L or Shift+J/K: looks exactly like mouse hover (the sliding highlight does the rest) */
    .cqs-tabbar #section-tabs li a.cqs-picked { color: var(--cqs-strong) !important; }
    .cqs-tabbar #section-tabs li a.cqs-picked.active { color: var(--cqs-on-accent) !important; }
    .cqs-tool.cqs-picked:not(.is-active) { background: var(--cqs-hover); color: var(--cqs-strong) !important; }
    /* "?" key hints: stickers showing which key reaches each thing */
    .cqs-keyhint {
      position: absolute; padding: 1px 6px; border-radius: 6px; transform: translate(-70%, -45%);
      background: var(--cqs-accent); color: var(--cqs-on-accent);
      font: 700 11px/16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,.35), 0 0 0 2px var(--cqs-panel);
    }
    .cqs-keylegend {
      position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%);
      display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 6px 16px;
      max-width: calc(100vw - 48px); padding: 10px 16px; border-radius: 16px;
      background: var(--cqs-panel); color: var(--cqs-text);
      border: 1px solid var(--cqs-border); box-shadow: var(--cqs-shadow);
      font: 500 12.5px/1.3 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    }
    .cqs-keylegend > span { white-space: nowrap; }
    .cqs-kbd {
      display: inline-block; min-width: 18px; margin-right: 5px; padding: 0 5px; text-align: center;
      border-radius: 5px; background: var(--cqs-tile); color: var(--cqs-strong);
      border: 1px solid var(--cqs-border); border-bottom-width: 2px;
      font: 600 11px/17px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .cqs-help-scrim {
      position: fixed; inset: 0; z-index: 2147483645; background: rgba(0,0,0,.35);
      display: grid; place-items: center;
    }
    .cqs-help {
      width: min(720px, calc(100vw - 48px)); max-height: calc(100vh - 48px); overflow-y: auto;
      padding: 20px 22px; border-radius: 20px;
      background: var(--cqs-panel); color: var(--cqs-strong);
      border: 1px solid var(--cqs-border); box-shadow: 0 30px 70px -20px rgba(0,0,0,.5);
      font: 13px/1.4 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
    }
    .cqs-help h2 { margin: 0 0 4px; font-size: 16px; font-weight: 700; color: inherit; }
    .cqs-help-sub { margin: 0 0 14px; color: var(--cqs-muted); font-size: 12px; }
    .cqs-help-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 6px 24px; }
    .cqs-help h3 {
      margin: 10px 0 6px; color: var(--cqs-muted);
      font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
    }
    .cqs-help-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 3px 0; }
    .cqs-help-row span { color: var(--cqs-text); }
    .cqs-help kbd {
      display: inline-block; min-width: 20px; margin-left: 3px; padding: 1px 6px; text-align: center;
      border-radius: 6px; background: var(--cqs-tile); color: var(--cqs-strong);
      border: 1px solid var(--cqs-border); border-bottom-width: 2px;
      font: 600 11.5px/18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .cqs-help-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .cqs-help-actions { display: flex; gap: 8px; flex: 0 0 auto; }
    .cqs-btn {
      height: 32px; padding: 0 14px; border: 0; border-radius: 10px; cursor: pointer; white-space: nowrap;
      background: var(--cqs-tile); color: var(--cqs-strong); font-family: inherit; font-size: 12.5px; font-weight: 600; line-height: 1;
      transition: background-color .2s ease, opacity .2s ease;
    }
    .cqs-btn:hover { background: var(--cqs-hover); }
    .cqs-btn-primary { background: var(--cqs-accent); color: var(--cqs-on-accent); }
    .cqs-btn-primary:hover { background: var(--cqs-accent); opacity: .88; }
    .cqs-btn:focus-visible { outline: 2px solid var(--cqs-strong); outline-offset: 2px; }
    .cqs-keycell { display: flex; align-items: center; gap: 2px; }
    .cqs-keychip {
      min-width: 44px; padding: 3px 6px; border: 0; border-radius: 8px; cursor: pointer;
      background: transparent; color: inherit; font: inherit; text-align: right;
      transition: background-color .15s ease;
    }
    .cqs-keychip:hover { background: var(--cqs-hover); }
    .cqs-keychip.is-recording { background: var(--cqs-hover); box-shadow: inset 0 0 0 2px var(--cqs-accent); }
    .cqs-keychip:focus-visible { outline: 2px solid var(--cqs-strong); outline-offset: 1px; }
    .cqs-keyreset {
      width: 24px; height: 24px; padding: 0; border: 0; border-radius: 6px; cursor: pointer;
      background: transparent; color: var(--cqs-muted); font-size: 14px; line-height: 1;
    }
    .cqs-keyreset:hover { background: var(--cqs-hover); color: var(--cqs-strong); }
    .cqs-keyreset[hidden] { display: inline-block; visibility: hidden; }
    .cqs-unset { color: var(--cqs-muted); font-size: 12px; font-style: italic; }

    .cqs-toast {
      position: fixed; left: 50%; bottom: 24px; z-index: 2147483646;
      padding: 8px 14px; border-radius: 12px;
      background: var(--cqs-panel); color: var(--cqs-strong);
      border: 1px solid var(--cqs-border); box-shadow: var(--cqs-shadow);
      font: 600 13px/1.3 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      opacity: 0; transform: translate(-50%, 8px); pointer-events: none;
      transition: opacity .2s ease, transform .3s cubic-bezier(.2,.9,.25,1.1);
    }
    .cqs-toast.is-on { opacity: 1; transform: translate(-50%, 0); }

    /* ---------- card lists: assignment groups (side by side) + modules (stacked) ---------- */
    /* these hold Canvas content, so they use the page palette (inverted on dark pages) */
    /* packed into columns (masonry style), so short cards don't leave holes under them */
    html.cqs-cards :is(ul, ol, div):has(> .item-group-condensed) {
      display: block !important; columns: ${CARD_COL}px; column-gap: ${CARD_GAP}px;
      margin: 0 !important; padding: 0 !important; list-style: none !important; border: 0 !important;
    }
    html.cqs-cards .item-group-condensed,
    html.cqs-cards .context_module {
      border-radius: 16px !important; overflow: hidden;
      border: 1px solid rgba(127,127,127,.24) !important;
      background: var(--cqs-page-panel) !important;
      box-shadow: none !important;
    }
    html.cqs-cards .item-group-condensed {
      display: block !important; width: 100% !important; max-width: 100%;
      margin: 0 0 ${CARD_GAP}px !important;
      break-inside: avoid; -webkit-column-break-inside: avoid;
    }
    html.cqs-cards .context_module:not(.item-group-condensed) { margin: 0 0 ${CARD_GAP}px !important; }

    html.cqs-cards :is(.item-group-condensed, .context_module) .ig-header {
      border: 0 !important; border-radius: 0 !important; box-shadow: none !important;
      padding: 12px 16px !important;
      background: rgba(127,127,127,.08) !important;
    }
    html.cqs-cards :is(.item-group-condensed, .context_module) :is(.ig-list, .content, .items) {
      border: 0 !important; margin: 0 !important; background: transparent !important;
    }
    html.cqs-cards :is(.item-group-condensed, .context_module) .ig-row {
      border: 0 !important; border-top: 1px solid rgba(127,127,127,.14) !important;
      border-radius: 0 !important; background: transparent !important;
      padding-top: 10px !important; padding-bottom: 10px !important;
      transition: background-color .15s ease;
    }

    /* other sections (announcements, discussions, grades, syllabus, people, pages, files): rounded, stacked normally */
    html.cqs-cards #content :is(.ic-announcement-row, .ic-discussion-row) {
      border-radius: 16px !important; overflow: hidden;
      border: 1px solid rgba(127,127,127,.24) !important;
      background: var(--cqs-page-panel) !important; box-shadow: none !important;
      margin: 0 0 ${CARD_GAP}px !important;
      transition: background-color .15s ease;
    }
    html.cqs-cards #content :is(table#grades_summary, table.summary, table.roster, table.ic-Table, table.collectionViewItems) {
      border-collapse: separate !important; border-spacing: 0 !important;
      border-radius: 16px !important; overflow: hidden;
      border: 1px solid rgba(127,127,127,.24) !important;
      background: var(--cqs-page-panel) !important; box-shadow: none !important;
      margin-bottom: ${CARD_GAP}px !important;
    }
    html.cqs-cards #content :is(table#grades_summary, table.summary, table.roster, table.ic-Table, table.collectionViewItems) :is(th, td) {
      border-left: 0 !important; border-right: 0 !important;
    }
    html.cqs-cards #content :is(table#grades_summary, table.summary, table.roster, table.ic-Table, table.collectionViewItems) tr:last-child > :is(th, td) {
      border-bottom: 0 !important;
    }
    html.cqs-cards #content .ef-main {
      border-radius: 16px !important; overflow: hidden;
      border: 1px solid rgba(127,127,127,.24) !important; background: var(--cqs-page-panel) !important;
    }

    /* announcements / discussions: card stays inside the page; only the middle text column may shrink
       (avatar, unread dot and "Posted on" keep their size and stay on one line) */
    html.cqs-cards #content :is(.ic-announcement-row, .ic-discussion-row) {
      box-sizing: border-box !important; max-width: 100% !important;
      padding-left: 14px !important; padding-right: 16px !important;
      overflow: visible !important; /* the unread dot sits on the edge; don't clip it */
    }
    html.cqs-cards #content :is(.ic-announcement-row, .ic-discussion-row) :is(
      [class*="__select-col"], [class*="__drag-col"], [class*="__author-col"], [class*="__meta-col"], [class*="unread"], .ic-avatar) {
      flex-shrink: 0 !important; min-width: auto !important;
    }
    html.cqs-cards #content :is(.ic-announcement-row, .ic-discussion-row) [class*="__meta-col"] { white-space: nowrap !important; }
    html.cqs-cards #content :is(.ic-announcement-row, .ic-discussion-row) [class*="__content-col"] { flex: 1 1 auto !important; min-width: 0 !important; }

    /* modules / assignments: nothing may poke out of its column (that's what caused the sideways scrollbar) */
    html.cqs-cards :is(ul, ol, div):has(> .item-group-condensed) { overflow-x: clip !important; }
    html.cqs-cards .item-group-condensed, html.cqs-cards .item-group-condensed * { min-width: 0 !important; max-width: 100%; }
    html.cqs-cards .item-group-condensed :is(.ig-title, .item_name, .title) { white-space: normal !important; overflow-wrap: anywhere; }

    /* Canvas's page-area containers have their own white backgrounds, which show up as a box behind everything
       once the page takes a theme colour. Make them see-through so the page background shows. */
    html.cqs-cards :is(#not_right_side, #content-wrapper, #content, .ic-Layout-contentMain, .ic-app-main-content,
                       .ic-Layout-columns, .ic-Layout-contentWrapper, .ic-app-main-content__primary,
                       #sticky-container, .sticky-toolbar, .header-bar, .header-bar-outer-container) {
      background-color: transparent !important; background-image: none !important; box-shadow: none !important;
    }

    /* cards: header starts at the very top (no empty band above it) */
    html.cqs-cards :is(.item-group-condensed, .context_module) { padding: 0 !important; }
    html.cqs-cards :is(.item-group-condensed, .context_module) > .ig-header {
      margin: 0 !important; min-height: 0 !important; height: auto !important;
    }

    /* search boxes built as an icon + input pair (e.g. Assignments): keep them on one line */
    html.cqs-cards #wrapper :is(.ic-Input-group, div:has(> input[type="search"]), span:has(> input[type="search"])) {
      display: flex !important; flex-wrap: nowrap !important; align-items: center !important;
    }
    html.cqs-cards #wrapper :is(.ic-Input-group, div:has(> input[type="search"]), span:has(> input[type="search"])) > input {
      flex: 1 1 auto !important; min-width: 0 !important; width: auto !important;
    }
    html.cqs-cards #wrapper :is(.ic-Input-group, div:has(> input[type="search"]), span:has(> input[type="search"])) > :not(input) {
      position: static !important; flex: 0 0 auto !important;
    }

    /* embedded frames (file previews, external tools, videos): rounded like everything else */
    html.cqs-cards #content :is(#doc_preview, .ef-file-preview-frame, .file-upload-submission-attachment, .canvadoc_holder) {
      border-radius: 16px !important; overflow: hidden !important;
    }
    html.cqs-cards #wrapper :is(#content, #tool_content_wrapper, .tool_content_wrapper) :is(iframe, embed, object, video) {
      border-radius: 16px !important; overflow: hidden;
      border: 1px solid rgba(127,127,127,.24) !important;
    }
    html.cqs-cards #wrapper :is(#tool_content, .tool_launch) { border-radius: 16px !important; }

    /* search / text boxes with an icon inside: icon and text on one line */
    html.cqs-cards #wrapper :is([class*="textInput__layout"], [class*="textInput__facade"] > span, [class*="textInput__inputLayout"]) {
      flex-wrap: nowrap !important; align-items: center !important;
    }
    html.cqs-cards #wrapper :is([class*="textInput__layout"], [class*="textInput__inputLayout"]) input {
      flex: 1 1 auto !important; min-width: 0 !important; width: auto !important;
    }
    html.cqs-cards #wrapper [class*="textInput__facade"] { border-radius: 10px !important; }

    /* every button and dropdown gets the same rounding */
    html.cqs-cards #wrapper :is(button, .btn, .Button, .ui-button, select, input[type="button"], input[type="submit"], input[type="reset"],
                                 [role="button"], [role="combobox"], [class*="baseButton"]):not([class*="cqs-"]):not(.cqs-tabbar *) {
      border-radius: 10px !important;
    }

    /* ---------- tidy course home ---------- */
    /* hide "Recent Announcements" until it actually has announcements in it */
    html.cqs-homeTidy #announcements_on_home_page:not(:has(a[href*="/discussion_topics/"], a[href*="/announcements/"])) {
      display: none !important;
    }
    /* course page title = the clear top-level heading */
    html.cqs-homeTidy #content h1.page-title {
      color: inherit !important; font-size: 1.9rem !important; font-weight: 700 !important;
      line-height: 1.2 !important; margin: 0 0 16px !important;
    }
    /* right column: neutral headings */
    html.cqs-homeTidy #right-side h2,
    html.cqs-homeTidy #right-side h3,
    html.cqs-homeTidy #right-side .h2 {
      color: inherit !important; font-size: 15px !important; font-weight: 600 !important;
      border-bottom: 0 !important; padding-bottom: 0 !important; margin: 18px 0 4px !important;
    }
    html.cqs-homeTidy #right-side h2 a, html.cqs-homeTidy #right-side h3 a { color: inherit !important; text-decoration: none !important; }
    /* "View Course …" buttons -> plain list rows */
    html.cqs-homeTidy #right-side a.btn,
    html.cqs-homeTidy #right-side a.button-sidebar-wide {
      display: flex !important; align-items: center; gap: 8px; width: 100%;
      margin: 0 0 2px !important; padding: 8px 10px !important;
      border: 0 !important; border-radius: 8px !important;
      background: transparent !important; box-shadow: none !important;
      color: inherit !important; text-align: left !important; font-weight: 500;
    }
    html.cqs-homeTidy #right-side a.btn:hover,
    html.cqs-homeTidy #right-side a.button-sidebar-wide:hover { background: rgba(127,127,127,.14) !important; }
    /* empty sections: small, quiet note */
    html.cqs-homeTidy .cqs-empty-note {
      font-size: 12px !important; opacity: .7; margin: 0 !important; padding: 0 !important; border: 0 !important;
    }
    /* line the right column up with the main heading */
    html.cqs-homeTidy #right-side { margin-top: var(--cqs-right-shift, 0px) !important; }
  `);

  /* ======================= shared behaviour ======================= */

  // .cqs-mag elements lean a few px toward the cursor (strength from data-mag)
  let magTarget = null;
  const resetMag = (t) => { t.style.setProperty('--tx', '0px'); t.style.setProperty('--ty', '0px'); };

  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest?.('.cqs-mag');
    if (t !== magTarget) {
      if (magTarget) resetMag(magTarget);
      magTarget = t;
    }
    if (!t) return;
    const r = t.getBoundingClientRect();
    const mag = Number(t.dataset.mag || 0);
    t.style.setProperty('--tx', `${((e.clientX - r.left) / r.width - 0.5) * mag}px`);
    t.style.setProperty('--ty', `${((e.clientY - r.top) / r.height - 0.5) * mag * 0.6}px`);
  }, { passive: true });

  document.addEventListener('pointerleave', () => {
    if (magTarget) resetMag(magTarget);
    magTarget = null;
  });

  // sliding highlight that follows whichever item is hovered inside `container`
  // (container must be position: relative; items need z-index above the lens)
  function attachLens(container, itemSelector) {
    const lens = el(container.tagName === 'UL' ? 'li' : 'div', { class: 'cqs-lens cqs-keep cqs-anim', 'aria-hidden': 'true' });
    container.prepend(lens);

    // position relative to the container, even if the item sits inside a positioned wrapper
    const offsetIn = (node) => {
      let x = 0, y = 0;
      while (node && node !== container) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; }
      return { x, y };
    };

    const move = (item) => {
      const first = !lens.classList.contains('is-on');
      if (first) lens.classList.add('no-move'); // appear in place instead of sliding in from 0,0
      const { x, y } = offsetIn(item);
      lens.style.transform = `translate(${x}px, ${y}px)`;
      lens.style.width = `${item.offsetWidth}px`;
      lens.style.height = `${item.offsetHeight}px`;
      if (first) { void lens.offsetWidth; lens.classList.remove('no-move'); }
      lens.classList.add('is-on');
    };

    container.addEventListener('pointerover', (e) => {
      const item = e.target.closest(itemSelector);
      if (item && container.contains(item)) move(item);
    });
    container.addEventListener('pointerleave', () => lens.classList.remove('is-on'));

    // let keyboard pickers drive the same highlight
    container._cqsLens = { move, hide: () => lens.classList.remove('is-on') };
  }

  // sidebar: sliding hover highlight
  waitFor('#menu.ic-app-header__menu-list', (menu) => attachLens(menu, 'li > a.ic-app-header__menu-list-link'));

  // floating nav: track the real nav width so content offset stays right when it collapses/expands
  waitFor('.ic-app-header', (h) => {
    const set = () => root.style.setProperty('--cqs-nav-w', `${h.offsetWidth}px`);
    set();
    new ResizeObserver(set).observe(h);
  });

  /* ----- sliding hover highlight for page rows ----- */

  const HOVER_ITEMS = '.ig-row, .ic-announcement-row, .ic-discussion-row, tr.student_assignment, ' +
    '#content :is(table.ic-Table, table.summary, table.roster, table.collectionViewItems) tbody tr';
  let pageLens = null;
  let pageLensTarget = null;

  const hidePageLens = () => { pageLens?.classList.remove('is-on'); pageLensTarget = null; };

  const movePageLens = (node) => {
    if (!pageLens) { pageLens = el('div', { class: 'cqs-page-lens cqs-anim', 'aria-hidden': 'true' }); document.body.append(pageLens); }
    const r = node.getBoundingClientRect();
    // rows that are their own rounded card get an exact match; rows inside a card get a slightly inset pill
    const own = getComputedStyle(node).borderTopLeftRadius;
    const rounded = own && own !== '0px';
    const ix = rounded ? 0 : 4, iy = rounded ? 0 : 2;
    const first = !pageLens.classList.contains('is-on');
    if (first) pageLens.classList.add('no-move'); // appear in place, then slide from there
    pageLens.style.transform = `translate(${r.left + scrollX + ix}px, ${r.top + scrollY + iy}px)`;
    pageLens.style.width = `${Math.max(0, r.width - ix * 2)}px`;
    pageLens.style.height = `${Math.max(0, r.height - iy * 2)}px`;
    pageLens.style.borderRadius = rounded ? own : '10px';
    if (first) { void pageLens.offsetWidth; pageLens.classList.remove('no-move'); }
    pageLens.classList.add('is-on');
    pageLensTarget = node;
  };

  document.addEventListener('pointerover', (e) => {
    if (!root.classList.contains('cqs-cards') || e.pointerType === 'touch') return;
    const item = e.target.closest?.(HOVER_ITEMS);
    if (item && item.closest('#content')) { if (item !== pageLensTarget) movePageLens(item); }
    else if (pageLensTarget) hidePageLens();
  }, { passive: true });
  document.addEventListener('pointerleave', hidePageLens);
  addEventListener('resize', hidePageLens);

  /* ----- whole-row click: anywhere on a row/card opens its main link ----- */

  const CLICK_ROWS = '.ig-row, .ic-announcement-row, .ic-discussion-row, tr.student_assignment';
  const OWN_CONTROLS = 'a[href], button, input, select, textarea, label, summary, [role="button"], [role="menuitem"], [role="checkbox"], [contenteditable="true"]';
  const MAIN_LINK = 'a.ig-title, a.item_link, a.ic-item-row__title-link, a[href]:not([href="#"]):not([href^="javascript:"])';

  const rowLink = (e) => {
    if (!root.classList.contains('cqs-cards')) return null;
    const row = e.target.closest?.(CLICK_ROWS);
    if (!row || !row.closest('#content')) return null;
    if (e.target.closest(OWN_CONTROLS)) return null;           // the row's own links/buttons keep working as usual
    if (String(getSelection?.() || '').trim()) return null;     // selecting text shouldn't open anything
    return row.querySelector(MAIN_LINK);
  };

  // opening a row (or its title link) gets the same loading effect as the top bar
  const rowNavFx = (link) => {
    if (!navigates(link) || root.classList.contains('cqs-leaving')) return;
    hidePageLens(); hideCursor();
    navAway();
    confirmNavigation(); // un-blurs if the link turns out to open elsewhere (new tab, popup)
  };

  document.addEventListener('click', (e) => {
    if (e.button !== 0 || e.defaultPrevented) return;
    const plain = !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey);

    // a link inside a row, clicked directly: let it work normally, just add the effect
    const direct = e.target.closest?.('a[href]');
    if (direct) {
      if (plain && root.classList.contains('cqs-cards') && direct.closest(CLICK_ROWS) && direct.closest('#content')) rowNavFx(direct);
      return;
    }

    // anywhere else on the row: open its main link
    const link = rowLink(e);
    if (!link) return;
    e.preventDefault();
    if (!plain) { window.open(link.href, '_blank', 'noopener'); return; }
    rowNavFx(link);
    link.click();
  });

  // middle-click a row: open it in a new tab, like a normal link
  document.addEventListener('auxclick', (e) => {
    if (e.button !== 1) return;
    const link = rowLink(e);
    if (!link) return;
    e.preventDefault();
    window.open(link.href, '_blank', 'noopener');
  });

  // account avatar -> initials
  onReady(() => {
    if (!master) return;
    const avatar = document.querySelector('#global_nav_profile_link .ic-avatar');
    if (!avatar || avatar.querySelector('.cqs-initials')) return;
    const name = window.ENV?.current_user?.display_name || avatar.querySelector('img')?.alt || '';
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return;
    const initials = (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
    avatar.append(el('span', { class: 'cqs-initials', 'aria-hidden': 'true' }, initials));
  });

  // line the right column up with the main column's first heading
  const alignRight = () => {
    if (!root.classList.contains('cqs-homeTidy')) return;
    if (root.classList.contains('cqs-floatRight') && root.classList.contains('cqs-rs-on') && innerWidth >= 1024) {
      root.style.setProperty('--cqs-right-shift', '0px'); // floating panel positions itself
      return;
    }
    const firstVisible = (sel) => [...document.querySelectorAll(sel)]
      .find((n) => n.offsetParent !== null && n.getBoundingClientRect().height > 0);
    const main = firstVisible('#content h1, #content h2');
    const side = firstVisible('#right-side > *');
    if (!main || !side) return;
    const current = parseFloat(root.style.getPropertyValue('--cqs-right-shift')) || 0;
    const diff = main.getBoundingClientRect().top - side.getBoundingClientRect().top;
    const next = Math.round(current + diff);
    if (Math.abs(diff) > 1 && Math.abs(next) <= 64) root.style.setProperty('--cqs-right-shift', `${next}px`);
  };

  /* ---------- floating side panel ---------- */

  root.classList.toggle('cqs-rs-hidden', !!load(KEYS.rsHidden, false));

  // sit just under the top bar, then stick 12px from the top once you scroll past it
  const updateRsTop = () => {
    const bar = document.querySelector('.ic-app-nav-toggle-and-crumbs');
    const bottom = bar ? bar.getBoundingClientRect().bottom : 0;
    root.style.setProperty('--cqs-rs-top', `${Math.max(12, Math.round(bottom + 4))}px`);
  };

  const setRsHidden = (hidden) => {
    root.classList.toggle('cqs-rs-hidden', hidden);
    save(KEYS.rsHidden, hidden);
    (hidden ? document.querySelector('.cqs-rs-open') : document.querySelector('.cqs-rs-hide'))?.focus();
  };

  const mountSidePanel = () => {
    const wrap = document.querySelector('#right-side-wrapper');
    if (!wrap || wrap.querySelector('.cqs-rs-head')) return;

    const hide = el('button', { type: 'button', class: 'cqs-rs-hide', title: 'Hide panel', 'aria-label': 'Hide side panel' });
    hide.innerHTML = ICONS.panelClose;
    hide.addEventListener('click', () => setRsHidden(true));
    wrap.prepend(el('div', { class: 'cqs-rs-head' }, el('span', { class: 'cqs-rs-title' }, 'Details'), hide));

    const open = el('button', { type: 'button', class: 'cqs-rs-open cqs-anim', title: 'Show panel', 'aria-label': 'Show side panel' });
    open.innerHTML = ICONS.panelOpen;
    open.addEventListener('click', () => setRsHidden(false));
    document.body.append(open);

    updateRsTop();
  };

  // only float it when the right column actually has something in it
  const checkSidePanel = () => {
    const rs = document.querySelector('#right-side');
    const hasContent = !!rs && rs.textContent.trim().length > 0;
    root.classList.toggle('cqs-rs-on', hasContent);
    if (hasContent) mountSidePanel();
  };

  let rsQueued = false;
  addEventListener('scroll', () => {
    if (rsQueued) return;
    rsQueued = true;
    requestAnimationFrame(() => { rsQueued = false; updateRsTop(); });
  }, { passive: true });
  addEventListener('resize', () => requestAnimationFrame(updateRsTop));

  // one throttled pass over late-rendered Canvas content
  let passQueued = false;
  const tagPass = () => {
    passQueued = false;
    checkSidePanel();
    // Immersive Reader buttons, so the CSS toggle can hide them instantly
    document.querySelectorAll('button:not([data-cqs-ir])').forEach((b) => {
      b.dataset.cqsIr = /immersive\s*reader/i.test(b.textContent) ? '1' : '0';
    });
    // "Nothing for now" notes in the right column
    document.querySelectorAll('#right-side *:not(.cqs-empty-note)').forEach((n) => {
      if (!n.children.length && /^\s*nothing for now\s*$/i.test(n.textContent)) n.classList.add('cqs-empty-note');
    });
    alignRight();
  };
  onReady(() => {
    tagPass();
    new MutationObserver(() => {
      if (!passQueued) { passQueued = true; requestAnimationFrame(tagPass); }
    }).observe(document.body, { childList: true, subtree: true });
    addEventListener('resize', () => requestAnimationFrame(alignRight));
  });

  // save + apply settings, and let the open settings menu re-sync its controls
  const settingsChanged = () => {
    save(KEYS.features, settings);
    applyLive();
    loadFonts();
    dispatchEvent(new CustomEvent('cqs-settings'));
    requestAnimationFrame(alignRight);
  };

  /* ======================= bottom tools + settings panel ======================= */

  function buildPanel(gear) {
    const panel = el('div', { class: 'cqs-panel cqs-anim', role: 'dialog', 'aria-label': 'Canvas tweaks' });
    // master switch: off = Canvas exactly as normal (only this gear stays). Reloads, since some features rebuild the page.
    const masterSw = el('input', { type: 'checkbox', class: 'cqs-switch', role: 'switch', 'aria-label': 'Canvas Tweaks on/off' });
    masterSw.checked = master;
    masterSw.addEventListener('change', () => {
      settings.master = masterSw.checked;
      save(KEYS.features, settings);
      location.reload();
    });
    panel.append(el('div', { class: 'cqs-row cqs-row-static cqs-panel-head' },
      el('span', { class: 'cqs-row-text' },
        el('span', { class: 'cqs-panel-title' }, 'Canvas Tweaks'),
        el('span', { class: 'cqs-panel-sub' }, master ? 'Changes save automatically' : 'Off \u2014 Canvas is back to normal')),
      masterSw));
    if (!master) {
      panel.classList.add('is-off');
      panel.append(el('p', { class: 'cqs-off-note' },
        'Everything is turned off. Turn the switch back on to bring your settings back exactly as they were.'));
    }

    const list = el('div', { class: 'cqs-panel-list' });
    panel.append(list);

    const refresh = () => {
      panel.classList.toggle('has-pending', FEATURES.some((f) => !f.live && settings[f.id] !== atLoad[f.id]));
    };
    const commit = () => settingsChanged();
    const switches = [];
    addEventListener('cqs-settings', () => {
      refresh();
      syncThemes();
      switches.forEach(([id, sw]) => { sw.checked = !!settings[id]; });
    });

    // theme picker: a swatch per theme
    const swatchOf = (value) => {
      if (value === 'auto') return 'linear-gradient(135deg, #ffffff 50%, #1f2125 50%)';
      if (value === 'light') return 'linear-gradient(135deg, #ffffff 50%, #111827 50%)';
      if (value === 'dark') return 'linear-gradient(135deg, #1f2125 50%, #f4f4f5 50%)';
      const p = value === 'custom' ? { ...PALETTES.comfy, ...settings.custom } : PALETTES[value];
      return `linear-gradient(135deg, ${p.panel} 50%, ${p.accent} 50%)`;
    };
    const themeGrid = el('div', { class: 'cqs-themes', role: 'radiogroup', 'aria-label': 'Theme' });
    const themeBtns = THEMES.map(([value, label]) => {
      const sw = el('span', { class: 'cqs-swatch' });
      const b = el('button', { type: 'button', class: 'cqs-theme-chip', role: 'radio', 'data-v': value, title: `${label} theme` }, sw, label);
      b.addEventListener('click', () => { settings.theme = value; commit(); });
      return b;
    });
    themeGrid.append(...themeBtns);

    // custom theme colours
    const custom = el('div', { class: 'cqs-custom' });
    const colorInputs = PALETTE_FIELDS.map(([key, label]) => {
      const input = el('input', { type: 'color', class: 'cqs-color', 'aria-label': `${label} colour` });
      input.addEventListener('input', () => {
        settings.custom = { ...settings.custom, [key]: input.value };
        if (settings.theme !== 'custom') settings.theme = 'custom';
        commit();
      });
      custom.append(el('span', { class: 'cqs-custom-label' }, label), input);
      return [key, input];
    });
    const resetCustom = el('button', { type: 'button', class: 'cqs-btn cqs-custom-reset' }, 'Start from Comfy');
    resetCustom.addEventListener('click', () => { settings.custom = { ...PALETTES.comfy }; commit(); });
    custom.append(resetCustom);

    const syncThemes = () => {
      themeBtns.forEach((b) => {
        b.setAttribute('aria-checked', String(b.dataset.v === settings.theme));
        b.firstChild.style.background = swatchOf(b.dataset.v);
      });
      colorInputs.forEach(([key, input]) => { input.value = ({ ...PALETTES.comfy, ...settings.custom })[key]; });
      panel.classList.toggle('is-custom', settings.theme === 'custom');
    };
    syncThemes();

    list.append(el('div', { class: 'cqs-panel-group' }, 'Appearance'), themeGrid, custom);

    let group = 'Appearance';
    for (const f of FEATURES) {
      if (f.group !== group) {
        group = f.group;
        list.append(el('div', { class: 'cqs-panel-group' }, group));
      }
      const sw = el('input', { type: 'checkbox', class: 'cqs-switch', role: 'switch', 'aria-label': f.label });
      sw.checked = !!settings[f.id];
      switches.push([f.id, sw]);
      sw.addEventListener('change', () => { settings[f.id] = sw.checked; commit(); });
      list.append(el('label', { class: 'cqs-row cqs-mag', 'data-mag': '3' },
        el('span', { class: 'cqs-row-text' },
          el('span', { class: 'cqs-row-title' }, f.label),
          el('span', { class: 'cqs-row-desc' }, f.desc)),
        sw));
    }
    // keyboard: open the key editor
    const editKeys = el('button', { type: 'button', class: 'cqs-btn' }, 'Edit');
    editKeys.addEventListener('click', () => { close(); openKeyEditor(); });
    list.append(el('div', { class: 'cqs-row cqs-row-static' },
      el('span', { class: 'cqs-row-text' },
        el('span', { class: 'cqs-row-title' }, 'Customize keys'),
        el('span', { class: 'cqs-row-desc' }, 'Change any Vim shortcut')),
      editKeys));

    attachLens(list, '.cqs-row:not(.cqs-row-static)');

    const reload = el('button', { type: 'button', class: 'cqs-reload' }, 'Reload to apply');
    reload.addEventListener('click', () => location.reload());
    panel.append(reload);
    refresh();

    const isOpen = () => panel.classList.contains('is-open');
    const place = () => {
      const r = gear.getBoundingClientRect();
      const h = panel.offsetHeight;
      const top = Math.max(12, Math.min(r.bottom - h, innerHeight - h - 12));
      panel.style.left = `${r.right + 16}px`;
      panel.style.top = `${top}px`;
    };
    const open = () => { place(); panel.classList.add('is-open'); gear.setAttribute('aria-expanded', 'true'); };
    const close = () => { panel.classList.remove('is-open'); gear.setAttribute('aria-expanded', 'false'); };

    gear.addEventListener('click', (e) => { e.stopPropagation(); isOpen() ? close() : open(); });
    document.addEventListener('pointerdown', (e) => {
      if (isOpen() && !panel.contains(e.target) && !gear.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) { close(); gear.focus(); } });
    addEventListener('resize', () => { if (isOpen()) place(); });

    document.body.append(panel);
  }

  function quickLink(href, label, icon) {
    const a = el('a', { href, class: 'cqs-tool', title: label, 'aria-label': label });
    a.innerHTML = icon;
    if (isActive(href)) a.classList.add('is-active');
    return a;
  }

  async function loadUnread(badge) {
    try {
      const res = await fetch('/api/v1/conversations/unread_count', {
        headers: { Accept: 'application/json' }, credentials: 'same-origin',
      });
      if (!res.ok) return;
      const n = Number((await res.json()).unread_count) || 0;
      badge.textContent = n > 99 ? '99+' : n ? String(n) : '';
    } catch {}
  }

  function mountTools() {
    if (document.querySelector('.cqs-tools')) return;

    const tools = el('li', { class: 'cqs-tools cqs-keep cqs-anim' });

    // Inbox + Calendar come back here, since course shortcuts replace Canvas's own nav links
    if (master && settings.courses) {
      const inbox = quickLink('/conversations', 'Inbox', ICONS.inbox);
      const badge = el('span', { class: 'cqs-count' });
      inbox.append(badge);
      loadUnread(badge);
      tools.append(inbox, quickLink('/calendar', 'Calendar', ICONS.calendar));
    }

    const gear = el('button', {
      type: 'button', class: 'cqs-tool cqs-gear',
      title: 'Canvas tweaks', 'aria-label': 'Canvas tweaks settings',
      'aria-haspopup': 'dialog', 'aria-expanded': 'false',
    });
    gear.innerHTML = ICONS.gear;
    tools.append(gear);

    // Prefer the bottom section of the nav (above "collapse"); fall back to the end of the main menu.
    const secondary = document.querySelector('.ic-app-header__secondary-navigation ul');
    if (secondary) secondary.prepend(tools);
    else document.querySelector('#menu')?.append(tools);

    buildPanel(gear);
  }

  onReady(mountTools);

  /* ======================= vim keys ======================= */

  const toast = (() => {
    let node = null, timer = 0;
    return (msg) => {
      if (!node) { node = el('div', { class: 'cqs-toast cqs-anim', role: 'status' }); document.body.append(node); }
      node.textContent = msg;
      void node.offsetWidth;
      node.classList.add('is-on');
      clearTimeout(timer);
      timer = setTimeout(() => node.classList.remove('is-on'), 1400);
    };
  })();

  const isTyping = (t) => !!t && (t.isContentEditable ||
    !!t.closest?.('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable=""], [contenteditable="true"]'));

  const courseBase = () => location.pathname.match(/^\/courses\/\d+/)?.[0] || null;

  // scroll the window, or the scrollable box in the middle of the screen if the page itself doesn't scroll
  const scroller = () => {
    const se = document.scrollingElement || root;
    if (se.scrollHeight > se.clientHeight + 1) return window;
    let n = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    while (n && n !== document.body) {
      if (/(auto|scroll)/.test(getComputedStyle(n).overflowY) && n.scrollHeight > n.clientHeight + 1) return n;
      n = n.parentElement;
    }
    return window;
  };
  const scrollStep = (dy, smooth) => scroller().scrollBy({ top: dy, behavior: smooth ? 'smooth' : 'auto' });
  const scrollEdge = (bottom) => scroller().scrollTo({ top: bottom ? 1e9 : 0, behavior: 'smooth' });

  const go = (path, needsCourse) => {
    const base = courseBase();
    if (needsCourse && !base) return toast('Open a course first');
    location.href = needsCourse ? base + path : path;
  };

  /* ----- Shift pickers: hold Shift, tap H/L (top bar) or J/K (sidebar), release Shift to open ----- */

  const PICK_KEYS = { H: ['tabs', -1], L: ['tabs', 1], K: ['side', -1], J: ['side', 1] };
  let picker = null; // { kind, items, start, index }

  const pickerItems = (kind) => (kind === 'tabs'
    ? [...document.querySelectorAll('#section-tabs li > a[href]')]
    : [...document.querySelectorAll('#menu > li > a.ic-app-header__menu-list-link, .cqs-tools .cqs-tool')]
  ).filter((n) => n.getClientRects().length);

  const pickerStart = (kind, items) => items.findIndex((n) => (kind === 'tabs'
    ? n.classList.contains('active')
    : !!n.closest('.ic-app-header__menu-list-item--active') || n.classList.contains('is-active')));

  const lensHost = (node) => node?.closest('#section-tabs, #menu');

  const clearPick = () => {
    document.querySelectorAll('.cqs-picked').forEach((n) => n.classList.remove('cqs-picked'));
    document.querySelectorAll('#section-tabs, #menu').forEach((c) => c._cqsLens?.hide());
  };

  // same motion as hovering: the highlight slides from item to item (it isn't hidden between moves)
  const showPick = () => {
    const node = picker.items[picker.index];
    document.querySelectorAll('.cqs-picked').forEach((n) => n.classList.remove('cqs-picked'));
    const host = lensHost(node);
    document.querySelectorAll('#section-tabs, #menu').forEach((c) => { if (c !== host) c._cqsLens?.hide(); });
    if (!node) return;
    node.classList.add('cqs-picked');
    node.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    host?._cqsLens?.move(node);
  };

  const movePicker = (kind, dir) => {
    if (!picker || picker.kind !== kind) {
      const items = pickerItems(kind);
      if (!items.length) return toast(kind === 'tabs' ? 'No course tabs here' : 'Sidebar not found');
      const start = pickerStart(kind, items);
      picker = { kind, items, start, index: start };
      // start the highlight on where you are now, so the first move slides out from it
      if (start >= 0) {
        document.querySelectorAll('#section-tabs, #menu').forEach((c) => c._cqsLens?.hide());
        lensHost(items[start])?._cqsLens?.move(items[start]);
      }
    }
    const n = picker.items.length;
    picker.index = picker.index < 0 ? (dir > 0 ? 0 : n - 1) : (picker.index + dir + n) % n;
    showPick();
  };

  const cancelPick = () => { picker = null; clearPick(); };

  // show the choice landed right away: move the "current" styling to it and give it a press,
  // so there's feedback while the next page loads
  let activeSnapshot = null; // what was "current" before the last switch, so it can be put back

  const markActive = (kind, target) => {
    activeSnapshot = {
      tabs: [...document.querySelectorAll('#section-tabs li > a.active')],
      items: [...document.querySelectorAll('.ic-app-header__menu-list-item--active')],
      tools: [...document.querySelectorAll('.cqs-tool.is-active')],
    };
    if (kind === 'tabs') {
      document.querySelectorAll('#section-tabs li > a.active').forEach((a) => a.classList.remove('active'));
      target.classList.add('active');
    } else {
      document.querySelectorAll('.ic-app-header__menu-list-item--active')
        .forEach((li) => li.classList.remove('ic-app-header__menu-list-item--active'));
      document.querySelectorAll('.cqs-tool.is-active').forEach((t) => t.classList.remove('is-active'));
      if (target.classList.contains('cqs-tool')) target.classList.add('is-active');
      else target.closest('li.ic-app-header__menu-list-item')?.classList.add('ic-app-header__menu-list-item--active');
    }
    const pressed = target.querySelector('.cqs-badge') || target;
    pressed.classList.remove('cqs-pressed');
    void pressed.offsetWidth; // restart the animation
    pressed.classList.add('cqs-pressed');
    setTimeout(() => pressed.classList.remove('cqs-pressed'), 450);
  };

  const revertActive = () => {
    const snap = activeSnapshot;
    activeSnapshot = null;
    if (!snap) return;
    document.querySelectorAll('#section-tabs li > a.active').forEach((a) => a.classList.remove('active'));
    document.querySelectorAll('.ic-app-header__menu-list-item--active')
      .forEach((li) => li.classList.remove('ic-app-header__menu-list-item--active'));
    document.querySelectorAll('.cqs-tool.is-active').forEach((t) => t.classList.remove('is-active'));
    snap.tabs.forEach((a) => a.classList.add('active'));
    snap.items.forEach((li) => li.classList.add('ic-app-header__menu-list-item--active'));
    snap.tools.forEach((t) => t.classList.add('is-active'));
  };

  // Some links open in a new browser tab, so this page never actually changes.
  // If this page hasn't started unloading shortly after a switch, undo the highlight and the blur.
  let unloading = false;
  addEventListener('beforeunload', () => { unloading = true; });
  addEventListener('pagehide', () => { unloading = true; });
  const confirmNavigation = () => {
    setTimeout(() => {
      if (unloading) return;
      revertActive();
      cancelNavFx();
    }, 600);
  };

  const commitPick = () => {
    const p = picker;
    cancelPick();
    const target = p?.items[p.index];
    if (!target || p.index === p.start) return;
    if (!navigates(target)) { target.click(); return; } // new-tab links, the Account tray, etc.
    markActive(p.kind, target);
    hideCursor();
    navAway();
    target.click();
    confirmNavigation();
  };

  const openCourse = (n) => {
    const links = [...document.querySelectorAll('.cqs-item > a.ic-app-header__menu-list-link')];
    if (links[n - 1]) {
      markActive('side', links[n - 1]);
      hideCursor(); navAway();
      location.href = links[n - 1].getAttribute('href');
      return;
    }
    const cached = load(KEYS.courses, [])[n - 1];
    if (cached) { navAway(); location.href = cached.href; }
    else toast(`No course #${n}`);
  };

  const clickModuleButton = (cls) => {
    const b = document.querySelector(`.module-sequence-footer-button--${cls}`);
    const target = b?.matches('a, button') ? b : b?.querySelector('a, button');
    if (target) target.click(); else toast(cls === 'next' ? 'No next item' : 'No previous item');
  };

  const toggleTheme = () => {
    settings.theme = isDark() ? 'light' : 'dark';
    settingsChanged();
    toast(`${settings.theme === 'dark' ? 'Dark' : 'Light'} theme`);
  };

  const toggleSidePanel = () => {
    if (!root.classList.contains('cqs-rs-on') || !root.classList.contains('cqs-floatRight')) return toast('No side panel here');
    setRsHidden(!root.classList.contains('cqs-rs-hidden'));
  };

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(location.href); toast('Link copied'); }
    catch { toast('Couldn’t copy the link'); }
  };

  /* ----- j/k: jump between items on the page, with a sliding cursor ----- */

  // list-style pages (modules, assignments, dashboard cards, grades): jump row to row
  const ROW_ITEMS = '.ig-header, .ig-row, .ic-DashboardCard, tr.student_assignment, .ic-announcement-row, .ic-discussion-row';
  // everything else (course home, pages, announcements): jump block to block
  const BLOCK_ITEMS = 'h1, h2, h3, h4, h5, p, li, tr, pre, blockquote, img, video, iframe, .ig-row';

  const isShown = (n) => {
    if (n.closest('.cqs-anim, .cqs-hints, [aria-hidden="true"]')) return false;
    const r = n.getBoundingClientRect();
    return r.width >= 20 && r.height >= 8 && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden';
  };
  const hasStuff = (n) => n.textContent.trim().length > 0 || n.matches('img, video, iframe') || !!n.querySelector('img, video, iframe');

  const pageItems = () => {
    const scope = document.querySelector('#content') || document.querySelector('#main') || document.body;
    let rows = [...scope.querySelectorAll(`${ROW_ITEMS}, h1, h2`)].filter(isShown);
    const rowSet = new Set(rows.filter((n) => n.matches(ROW_ITEMS)));
    if (rowSet.size) {
      // headings that sit inside a row belong to that row; keep the outermost of anything nested
      rows = rows.filter((n) => (n.matches(ROW_ITEMS) || !n.closest(ROW_ITEMS)));
      return rows.filter((n) => !rows.some((o) => o !== n && o.contains(n)));
    }
    const blocks = [...scope.querySelectorAll(BLOCK_ITEMS)].filter((n) => isShown(n) && hasStuff(n));
    // keep the innermost block (a paragraph rather than the list item wrapping it)
    return blocks.filter((n) => !blocks.some((o) => o !== n && n.contains(o)));
  };

  let cursorNode = null;
  let cursorTarget = null;

  const placeCursor = (animate) => {
    if (!cursorNode || !cursorTarget) return;
    if (!cursorTarget.isConnected) return hideCursor();
    const r = cursorTarget.getBoundingClientRect();
    const pad = 4;
    if (!animate) cursorNode.classList.add('no-move');
    cursorNode.style.transform = `translate(${r.left + scrollX - pad}px, ${r.top + scrollY - pad}px)`;
    cursorNode.style.width = `${r.width + pad * 2}px`;
    cursorNode.style.height = `${r.height + pad * 2}px`;
    if (!animate) { void cursorNode.offsetWidth; cursorNode.classList.remove('no-move'); }
  };

  const hideCursor = () => {
    cursorNode?.classList.remove('is-on');
    cursorTarget = null;
  };

  const inView = (n) => {
    const r = n.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;
  };

  // returns false when the page has nothing to jump between (j/k then just scroll)
  const jumpItem = (dir, held = false) => {
    const items = pageItems();
    if (!items.length) return false;

    let i = cursorTarget && inView(cursorTarget) ? items.indexOf(cursorTarget) : -1;
    if (i < 0) {
      // start from what's on screen: first item below the top edge (j), or last one above the bottom (k)
      const tops = items.map((n) => n.getBoundingClientRect().top);
      i = dir > 0 ? tops.findIndex((t) => t >= 0) : tops.findLastIndex((t) => t < innerHeight * 0.85);
      if (i < 0) i = dir > 0 ? 0 : items.length - 1;
    } else {
      const next = items[i + dir];
      // holding j/k: stop at the end of a column instead of jumping across to the next one (side-by-side cards)
      if (held && next) {
        const a = cursorTarget.getBoundingClientRect();
        const b = next.getBoundingClientRect();
        if (b.left >= a.right - 1 || b.right <= a.left + 1) return true;
      }
      i = Math.min(items.length - 1, Math.max(0, i + dir));
    }

    moveCursorTo(items[i]);
    return true;
  };

  // slide the cursor to `node` (same motion as the hover highlight) and keep it on screen
  const moveCursorTo = (node) => {
    const first = !cursorNode?.classList.contains('is-on');
    if (!cursorNode) { cursorNode = el('div', { class: 'cqs-cursor cqs-anim', 'aria-hidden': 'true' }); document.body.append(cursorNode); }
    cursorTarget = node;
    placeCursor(!first);
    cursorNode.classList.add('is-on');

    // bring it into view, about a third of the way down the screen
    const r = node.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 40) {
      scroller().scrollBy({ top: r.top - innerHeight * 0.3, behavior: 'smooth' });
    }
  };

  // h/l: the nearest item to the left/right (e.g. the next card over), at about the same height
  const sideItem = (dir) => {
    if (!cursorTarget || !inView(cursorTarget)) return jumpItem(1);
    const items = pageItems();
    const cr = cursorTarget.getBoundingClientRect();
    const cx = cr.left + cr.width / 2;
    const cy = cr.top + cr.height / 2;
    let best = null;
    let bestScore = Infinity;
    for (const n of items) {
      if (n === cursorTarget) continue;
      const r = n.getBoundingClientRect();
      const nx = r.left + r.width / 2;
      if (dir > 0 ? nx <= cx + 10 : nx >= cx - 10) continue;          // must be on that side
      const gap = Math.max(0, dir > 0 ? r.left - cr.right : cr.left - r.right);
      const dy = Math.abs(r.top + r.height / 2 - cy);
      const score = gap + dy * 2;                                       // prefer same row over far columns
      if (score < bestScore) { bestScore = score; best = n; }
    }
    if (best) moveCursorTo(best);
    return true;
  };

  const openItem = () => {
    const n = cursorTarget;
    if (!n) return false;
    const target = n.matches('a[href], button, summary')
      ? n
      : n.querySelector('a.ig-title, a.item_link, a.ic-DashboardCard__link, a[href]:not([href="#"]), button, summary');
    if (!target) { toast('Nothing to open here'); return true; }
    if (target.matches('a[href]') && navigates(target)) { hideCursor(); navAway(); confirmNavigation(); }
    target.click();
    return true;
  };

  // keep the cursor stuck to its item when something other than the window scrolls or the layout changes
  addEventListener('scroll', (e) => { if (cursorTarget && e.target !== document) requestAnimationFrame(() => placeCursor(false)); }, { passive: true, capture: true });
  addEventListener('resize', () => requestAnimationFrame(() => placeCursor(false)));

  /* ----- link hints (f / F) ----- */

  const HINT_CHARS = 'sadfjklewcmpgh';
  const HINT_TARGETS = 'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select, textarea, summary, ' +
    '[role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="switch"], [contenteditable="true"]';

  const makeLabels = (n) => {
    let len = 1;
    while (HINT_CHARS.length ** len < n) len++;
    return Array.from({ length: n }, (_, i) => {
      let s = '';
      for (let j = 0, x = i; j < len; j++, x = Math.floor(x / HINT_CHARS.length)) s = HINT_CHARS[x % HINT_CHARS.length] + s;
      return s;
    });
  };

  const visibleTargets = () => {
    const found = [];
    for (const node of document.querySelectorAll(HINT_TARGETS)) {
      const r = node.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) continue;
      const cs = getComputedStyle(node);
      if (cs.visibility === 'hidden' || cs.pointerEvents === 'none' || (cs.opacity !== '' && Number(cs.opacity) === 0)) continue;
      // skip things covered by something else (e.g. content under the floating panel)
      const cx = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
      const cy = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
      const top = document.elementFromPoint(cx, cy);
      if (top && !(node.contains(top) || top.contains(node) || top.closest('label')?.contains(node))) continue;
      found.push({ node, r });
    }
    // drop targets nested inside another target (keep the outer, clickable one)
    return found.filter(({ node }) => !found.some((o) => o.node !== node && o.node.contains(node)));
  };

  let hintState = null;

  const endHints = () => {
    hintState?.layer.remove();
    hintState = null;
  };

  const activate = (node, newTab) => {
    endHints();
    if (isTyping(node)) { node.focus(); return; }
    const link = node.closest('a[href]');
    if (newTab && link) { window.open(link.href, '_blank', 'noopener'); return; }
    node.focus?.({ preventScroll: true });
    node.click();
  };

  const startHints = (newTab) => {
    endHints();
    const targets = visibleTargets();
    if (!targets.length) return toast('Nothing to click here');
    const labels = makeLabels(targets.length);
    const layer = el('div', { class: 'cqs-hints cqs-anim', 'aria-hidden': 'true' });
    const hints = targets.map(({ node, r }, i) => {
      const tag = el('span', { class: 'cqs-hint' });
      tag.style.left = `${Math.max(0, Math.min(r.left, innerWidth - 28))}px`;
      tag.style.top = `${Math.max(0, Math.min(r.top, innerHeight - 18))}px`;
      layer.append(tag);
      return { node, label: labels[i], tag };
    });
    document.body.append(layer);
    hintState = { layer, hints, typed: '', newTab };
    renderHints();
  };

  const renderHints = () => {
    const { hints, typed } = hintState;
    for (const h of hints) {
      const match = h.label.startsWith(typed);
      h.tag.style.display = match ? '' : 'none';
      if (match) h.tag.replaceChildren(el('span', { class: 'typed' }, typed), h.label.slice(typed.length));
    }
  };

  const hintKey = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') return endHints();
    if (e.key === 'Backspace') { hintState.typed = hintState.typed.slice(0, -1); return renderHints(); }
    const k = e.key.toLowerCase();
    if (k.length !== 1 || !HINT_CHARS.includes(k)) return;
    hintState.typed += k;
    const matches = hintState.hints.filter((h) => h.label.startsWith(hintState.typed));
    if (!matches.length) return endHints();
    if (matches.length === 1 && matches[0].label === hintState.typed) return activate(matches[0].node, hintState.newTab);
    renderHints();
  };

  /* ----- actions + customizable key bindings ----- */

  // every rebindable shortcut: id, section in the help sheet, label, default keys, what it does
  const ACTIONS = [
    { id: 'down', eager: true,     sec: 'Moving around', label: 'Next item on the page', keys: 'j',  run: (e) => jumpItem(1, e.repeat) || scrollStep(70, !e.repeat) },
    { id: 'up', eager: true,       sec: 'Moving around', label: 'Previous item',         keys: 'k',  run: (e) => jumpItem(-1, e.repeat) || scrollStep(-70, !e.repeat) },
    { id: 'left', eager: true,     sec: 'Moving around', label: 'Item to the left',      keys: 'h',  run: () => sideItem(-1) },
    { id: 'right', eager: true,    sec: 'Moving around', label: 'Item to the right',     keys: 'l',  run: () => sideItem(1) },
    { id: 'halfDown', eager: true, sec: 'Moving around', label: 'Half page down',        keys: 's',  run: () => scrollStep(innerHeight / 2, true) },
    { id: 'halfUp', eager: true,   sec: 'Moving around', label: 'Half page up',          keys: 'w',  run: () => scrollStep(-innerHeight / 2, true) },
    { id: 'top',      sec: 'Moving around', label: 'Top of page',           keys: 'ww', run: () => scrollEdge(false) },
    { id: 'bottom',   sec: 'Moving around', label: 'Bottom of page',        keys: 'ss', run: () => scrollEdge(true) },
    { id: 'hints',    sec: 'Clicking',      label: 'Link hints',            keys: 'f',  run: () => startHints(false) },
    { id: 'hintsTab', sec: 'Clicking',      label: 'Link hints, new tab',   keys: 'F',  run: () => startHints(true) },
    { id: 'goDash',    sec: 'Go to', label: 'Dashboard',   keys: 'gd', run: () => go('/', false) },
    { id: 'goHome',    sec: 'Go to', label: 'Course home', keys: 'gh', run: () => go('', true) },
    { id: 'goModules', sec: 'Go to', label: 'Modules',     keys: 'gm', run: () => go('/modules', true) },
    { id: 'goAssign',  sec: 'Go to', label: 'Assignments', keys: 'ga', run: () => go('/assignments', true) },
    { id: 'goGrades',  sec: 'Go to', label: 'Grades',      keys: 'gr', run: () => go('/grades', true) },
    { id: 'goFiles',   sec: 'Go to', label: 'Files',       keys: 'gf', run: () => go('/files', true) },
    { id: 'goInbox',   sec: 'Go to', label: 'Inbox',       keys: 'gi', run: () => go('/conversations', false) },
    { id: 'goCal',     sec: 'Go to', label: 'Calendar',    keys: 'gc', run: () => go('/calendar', false) },
    { id: 'nextItem', sec: 'Navigate', label: 'Next module item',     keys: 'n', run: () => clickModuleButton('next') },
    { id: 'prevItem', sec: 'Navigate', label: 'Previous module item', keys: 'N', run: () => clickModuleButton('previous') },
    { id: 'back',     sec: 'Navigate', label: 'Back',                 keys: '[', run: () => history.back() },
    { id: 'forward',  sec: 'Navigate', label: 'Forward',              keys: ']', run: () => history.forward() },
    { id: 'reload',   sec: 'Navigate', label: 'Reload',               keys: 'r', run: () => location.reload() },
    { id: 'panel',    sec: 'Script', label: 'Show / hide side panel', keys: 'p',  run: () => toggleSidePanel() },
    { id: 'theme',    sec: 'Script', label: 'Light / dark theme',     keys: 'T',  run: () => toggleTheme() },
    { id: 'settings', sec: 'Script', label: 'Settings',               keys: ',',  run: () => document.querySelector('.cqs-gear')?.click() },
    { id: 'copy',     sec: 'Script', label: 'Copy page link',         keys: 'yy', run: () => copyUrl() },
    { id: 'help',     sec: 'Script', label: 'Key hints (twice: this list)', keys: '?', run: () => questionMark() },
  ];
  const ACTION = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));
  const RESERVED = /^[HJKL]$/; // Shift+H/J/K/L are the tab/sidebar switchers

  // fixed keys that aren't rebindable, shown alongside the actions in the help sheet
  const SWITCH_SEC = 'Switch (hold ⇧, release to open)';
  const FIXED_HELP = {
    'Moving around': [[['Enter'], 'Open the highlighted item']],
    'Clicking': [[['Esc'], 'Cancel / leave a text box']],
    [SWITCH_SEC]: [
      [['⇧', '1'], '– ', ['9'], 'Course 1–9'],
      [['⇧', 'H'], ' / ', ['⇧', 'L'], 'Top bar tabs'],
      [['⇧', 'J'], ' / ', ['⇧', 'K'], 'Sidebar items'],
    ],
  };
  const SECTIONS = ['Moving around', 'Clicking', 'Go to', SWITCH_SEC, 'Navigate', 'Script'];

  let keymap = {};
  let COMMANDS = {};
  const keyOf = (id) => keymap[id] || '';

  const rebuildCommands = () => {
    COMMANDS = {};
    for (const a of ACTIONS) if (keymap[a.id]) COMMANDS[keymap[a.id]] = a;
  };
  const loadKeymap = () => {
    const saved = load(KEYS.keymap, {});
    keymap = Object.fromEntries(ACTIONS.map((a) => [a.id, typeof saved[a.id] === 'string' ? saved[a.id] : a.keys]));
    rebuildCommands();
  };
  const saveKeymap = () => {
    // only store what differs from the defaults, so new defaults in later versions still arrive
    save(KEYS.keymap, Object.fromEntries(ACTIONS.filter((a) => keymap[a.id] !== a.keys).map((a) => [a.id, keymap[a.id]])));
    rebuildCommands();
  };
  loadKeymap();

  // returns a message if the binding couldn't be applied as asked
  const setBinding = (id, keys) => {
    if (RESERVED.test(keys)) return `⇧${keys} is used for switching`;
    let note = '';
    const other = ACTIONS.find((a) => a.id !== id && keymap[a.id] === keys);
    if (other) { keymap[other.id] = ''; note = `Removed from “${other.label}”`; }
    keymap[id] = keys;
    saveKeymap();
    return note;
  };

  const keysToKbd = (keys) => (keys ? [...keys].map((k) => el('kbd', {}, k)) : [el('span', { class: 'cqs-unset' }, 'not set')]);

  /* ----- help sheet (?) ----- */

  let helpNode = null;
  const closeHelp = () => { helpNode?.remove(); helpNode = null; };

  const helpRow = (row) => {
    const desc = row[row.length - 1];
    const keys = el('div');
    row.slice(0, -1).forEach((part) => {
      if (Array.isArray(part)) part.forEach((k) => keys.append(el('kbd', {}, k)));
      else keys.append(part);
    });
    return el('div', { class: 'cqs-help-row' }, el('span', {}, desc), keys);
  };

  const toggleHelp = () => {
    if (helpNode) return closeHelp();
    const cols = el('div', { class: 'cqs-help-cols' });
    for (const sec of SECTIONS) {
      const box = el('div', {}, el('h3', {}, sec));
      for (const a of ACTIONS.filter((x) => x.sec === sec)) {
        box.append(el('div', { class: 'cqs-help-row' }, el('span', {}, a.label), el('div', {}, ...keysToKbd(keyOf(a.id)))));
      }
      (FIXED_HELP[sec] || []).forEach((row) => box.append(helpRow(row)));
      cols.append(box);
    }
    const edit = el('button', { type: 'button', class: 'cqs-btn' }, 'Customize keys');
    edit.addEventListener('click', () => { closeHelp(); openKeyEditor(); });
    const sheet = el('div', { class: 'cqs-help', role: 'dialog', 'aria-label': 'Keyboard shortcuts' },
      el('div', { class: 'cqs-help-top' },
        el('div', {}, el('h2', {}, 'Keyboard shortcuts'),
          el('p', { class: 'cqs-help-sub' }, 'Keys are ignored while you’re typing. Press Esc to close.')),
        edit),
      cols);
    helpNode = el('div', { class: 'cqs-help-scrim cqs-anim' }, sheet);
    helpNode.addEventListener('pointerdown', (e) => { if (e.target === helpNode) closeHelp(); });
    document.body.append(helpNode);
  };

  /* ----- key editor ----- */

  let keyEditor = null;   // the open editor's scrim
  let recording = null;   // { id, chip, keys, timer } while capturing a new binding

  const openKeyEditor = () => {
    if (keyEditor) return;
    closeHelp(); closeKeyHints();
    const rows = new Map(); // id -> { chip, reset }

    const render = () => {
      for (const a of ACTIONS) {
        const { chip, reset } = rows.get(a.id);
        if (recording?.id !== a.id) chip.replaceChildren(...keysToKbd(keyOf(a.id)));
        reset.hidden = keyOf(a.id) === a.keys;
      }
    };

    const stopRecording = (keep) => {
      if (!recording) return;
      const { id, chip, keys, timer } = recording;
      clearTimeout(timer);
      recording = null;
      chip.classList.remove('is-recording');
      if (keep && keys) { const note = setBinding(id, keys); if (note) toast(note); }
      render();
    };

    const startRecording = (id, chip) => {
      stopRecording(false);
      recording = { id, chip, keys: '', timer: 0 };
      chip.classList.add('is-recording');
      chip.replaceChildren(el('span', { class: 'cqs-unset' }, 'Press keys…'));
    };

    const cols = el('div', { class: 'cqs-help-cols' });
    for (const sec of SECTIONS) {
      const list = ACTIONS.filter((a) => a.sec === sec);
      if (!list.length) continue;
      const box = el('div', {}, el('h3', {}, sec));
      for (const a of list) {
        const chip = el('button', { type: 'button', class: 'cqs-keychip', title: 'Click, then type the new keys' });
        chip.addEventListener('click', () => (recording?.id === a.id ? stopRecording(true) : startRecording(a.id, chip)));
        const reset = el('button', { type: 'button', class: 'cqs-keyreset', title: `Reset to ${a.keys}`, 'aria-label': `Reset ${a.label}` }, '↺');
        reset.addEventListener('click', () => { stopRecording(false); const note = setBinding(a.id, a.keys); if (note) toast(note); render(); });
        rows.set(a.id, { chip, reset });
        box.append(el('div', { class: 'cqs-help-row' }, el('span', {}, a.label), el('div', { class: 'cqs-keycell' }, reset, chip)));
      }
      cols.append(box);
    }

    const resetAll = el('button', { type: 'button', class: 'cqs-btn' }, 'Reset all');
    resetAll.addEventListener('click', () => {
      stopRecording(false);
      keymap = Object.fromEntries(ACTIONS.map((a) => [a.id, a.keys]));
      saveKeymap();
      render();
      toast('Keys reset');
    });
    const done = el('button', { type: 'button', class: 'cqs-btn cqs-btn-primary' }, 'Done');

    const sheet = el('div', { class: 'cqs-help', role: 'dialog', 'aria-label': 'Customize keys' },
      el('div', { class: 'cqs-help-top' },
        el('div', {}, el('h2', {}, 'Customize keys'),
          el('p', { class: 'cqs-help-sub' },
            'Click a shortcut, then type up to 3 keys (it saves after a moment, or press Enter). ' +
            'Backspace fixes a typo, Esc cancels. A key already in use moves to the new action.')),
        el('div', { class: 'cqs-help-actions' }, resetAll, done)),
      cols);

    const onKey = (e) => {
      if (!recording) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
        return;
      }
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') return stopRecording(false);
      if (e.key === 'Enter') return stopRecording(true);
      if (e.key === 'Backspace') {
        recording.keys = recording.keys.slice(0, -1);
      } else {
        if (e.key.length !== 1 || e.key === ' ' || e.ctrlKey || e.metaKey || e.altKey) return;
        recording.keys += e.key;
      }
      recording.chip.replaceChildren(...(recording.keys ? keysToKbd(recording.keys) : [el('span', { class: 'cqs-unset' }, 'Press keys…')]));
      clearTimeout(recording.timer);
      if (recording.keys.length >= 3) return stopRecording(true);
      if (recording.keys) recording.timer = setTimeout(() => stopRecording(true), 1000);
    };

    const close = () => {
      stopRecording(false);
      removeEventListener('keydown', onKey, true);
      keyEditor?.remove();
      keyEditor = null;
    };
    done.addEventListener('click', close);

    keyEditor = el('div', { class: 'cqs-help-scrim cqs-anim' }, sheet);
    keyEditor.addEventListener('pointerdown', (e) => { if (e.target === keyEditor) close(); });
    addEventListener('keydown', onKey, true);
    document.body.append(keyEditor);
    render();
  };

  /* ----- key hints on screen (?) ----- */

  const legendItems = () => [
    [['left', 'down', 'up', 'right'].map(keyOf).filter(Boolean).join(' '), 'move between items'],
    ['Enter', 'open'],
    [['halfDown', 'halfUp'].map(keyOf).filter(Boolean).join(' '), 'half page'],
    [['top', 'bottom'].map(keyOf).filter(Boolean).join(' '), 'top / bottom'],
    [keyOf('hints'), 'click with hints'],
    ['⇧H ⇧L', 'tabs'], ['⇧J ⇧K', 'sidebar'],
    [['back', 'forward'].map(keyOf).filter(Boolean).join(' '), 'back / forward'],
    [keyOf('theme'), 'theme'], [keyOf('copy'), 'copy link'], [keyOf('help'), 'all keys'], ['Esc', 'close'],
  ].filter(([k]) => k);

  // which on-screen thing each key reaches
  const keyTargets = () => {
    const map = new Map();
    const add = (node, key) => { if (node && key) map.set(node, [...(map.get(node) || []), key]); };
    const $ = (sel) => document.querySelector(sel);

    [...document.querySelectorAll('.cqs-item > a.ic-app-header__menu-list-link')]
      .slice(0, 9).forEach((a, i) => add(a, `⇧${i + 1}`));
    add($('#global_nav_dashboard_link'), keyOf('goDash'));
    add($('.cqs-tool[href="/conversations"]'), keyOf('goInbox'));
    add($('.cqs-tool[href="/calendar"]'), keyOf('goCal'));
    add($('.cqs-gear'), keyOf('settings'));

    const tabs = [...document.querySelectorAll('#section-tabs li > a[href]')];
    for (const [cls, id] of [['home', 'goHome'], ['modules', 'goModules'], ['assignments', 'goAssign'], ['grades', 'goGrades'], ['files', 'goFiles']]) {
      add(tabs.find((a) => a.classList.contains(cls)), keyOf(id));
    }
    const i = tabs.findIndex((a) => a.classList.contains('active'));
    if (i >= 0 && tabs.length > 1) {
      add(tabs[(i - 1 + tabs.length) % tabs.length], '⇧H');
      add(tabs[(i + 1) % tabs.length], '⇧L');
    }

    add($('.cqs-rs-hide'), keyOf('panel'));
    add($('.cqs-rs-open'), keyOf('panel'));
    add($('.module-sequence-footer-button--next'), keyOf('nextItem'));
    add($('.module-sequence-footer-button--previous'), keyOf('prevItem'));
    return map;
  };

  let keyHintsNode = null;
  let keyHintsRaf = 0;

  // put a key sticker on the top-right corner of each target
  const placeStickers = (layer, map) => {
    layer.querySelectorAll('.cqs-keyhint').forEach((n) => n.remove());
    for (const [node, keys] of map) {
      const r = node.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const tag = el('span', { class: 'cqs-keyhint' }, keys.join(' '));
      tag.style.left = `${Math.min(Math.max(r.right, 24), innerWidth - 8)}px`;
      tag.style.top = `${Math.min(Math.max(r.top, 10), innerHeight - 10)}px`;
      layer.prepend(tag);
    }
  };

  const makeLegend = (items) => {
    const legend = el('div', { class: 'cqs-keylegend' });
    for (const [keys, label] of items) {
      const item = el('span');
      keys.split(' ').forEach((k) => item.append(el('span', { class: 'cqs-kbd' }, k)));
      item.append(label);
      legend.append(item);
    }
    return legend;
  };

  const drawKeyHints = () => { if (keyHintsNode) placeStickers(keyHintsNode, keyTargets()); };

  const showKeyHints = () => {
    if (keyHintsNode) return;
    keyHintsNode = el('div', { class: 'cqs-hints cqs-anim', 'aria-hidden': 'true' }, makeLegend(legendItems()));
    document.body.append(keyHintsNode);
    drawKeyHints();
  };

  const closeKeyHints = () => { keyHintsNode?.remove(); keyHintsNode = null; };

  /* ----- holding Shift: show what Shift + key will do from here ----- */

  const SHIFT_LEGEND = [['1–9', 'course'], ['H L', 'tabs'], ['J K', 'sidebar'], ['⇧', 'let go to open'], ['Esc', 'cancel']];
  let shiftNode = null;
  let shiftTimer = 0;

  const shiftTargets = () => {
    const map = new Map();
    const add = (node, key) => { if (node) map.set(node, [...(map.get(node) || []), key]); };

    [...document.querySelectorAll('.cqs-item > a.ic-app-header__menu-list-link')]
      .slice(0, 9).forEach((a, i) => add(a, String(i + 1)));

    // the neighbours of where you are (or of what you've picked so far)
    const around = (kind, prevKey, nextKey) => {
      const items = picker?.kind === kind ? picker.items : pickerItems(kind);
      if (items.length < 2) return;
      const ref = picker?.kind === kind ? picker.index : pickerStart(kind, items);
      const n = items.length;
      add(items[ref < 0 ? n - 1 : (ref - 1 + n) % n], prevKey);
      add(items[ref < 0 ? 0 : (ref + 1) % n], nextKey);
    };
    around('tabs', 'H', 'L');
    around('side', 'K', 'J');
    return map;
  };

  const showShiftHints = () => {
    clearTimeout(shiftTimer);
    if (!shiftNode) {
      shiftNode = el('div', { class: 'cqs-hints cqs-anim', 'aria-hidden': 'true' }, makeLegend(SHIFT_LEGEND));
      document.body.append(shiftNode);
    }
    placeStickers(shiftNode, shiftTargets());
  };

  const hideShiftHints = () => {
    clearTimeout(shiftTimer);
    shiftNode?.remove();
    shiftNode = null;
  };

  // keep stickers attached to their targets while the page moves
  const redrawKeyHints = () => {
    if ((!keyHintsNode && !shiftNode) || keyHintsRaf) return;
    keyHintsRaf = requestAnimationFrame(() => {
      keyHintsRaf = 0;
      drawKeyHints();
      if (shiftNode) placeStickers(shiftNode, shiftTargets());
    });
  };
  addEventListener('scroll', redrawKeyHints, { passive: true, capture: true });
  addEventListener('resize', redrawKeyHints);

  const questionMark = () => {
    if (keyHintsNode) { closeKeyHints(); toggleHelp(); }   // second press: full list
    else if (helpNode) closeHelp();
    else showKeyHints();
  };

  /* ----- key dispatch ----- */

  const AMBIGUOUS_WAIT = 400; // ms to wait when a key is both a command and the start of a longer one (w vs ww)
  let pending = '';
  let pendingRun = null;      // command to run if the longer sequence never comes
  let pendingTimer = 0;

  const runCommand = (seq, action, e) => {
    if (seq !== keyOf('help')) { closeHelp(); closeKeyHints(); }
    cancelPick();
    action.run(e);
  };

  const dispatch = (key, e) => {
    const seq = pending + key;
    const exact = COMMANDS[seq];
    const longer = Object.keys(COMMANDS).some((c) => c.length > seq.length && c.startsWith(seq));
    clearTimeout(pendingTimer);

    if (exact && !longer) {
      pending = ''; pendingRun = null;
      e.preventDefault(); e.stopPropagation();
      runCommand(seq, exact, e);
    } else if (longer) {
      e.preventDefault(); e.stopPropagation();
      pending = seq;
      if (exact?.eager) {
        // movement keys (w, s, j, …) act on the first tap; a quick second tap still triggers the longer one (ww, ss)
        pendingRun = null;
        runCommand(seq, exact, e);
        pendingTimer = setTimeout(() => { pending = ''; }, AMBIGUOUS_WAIT);
      } else {
        // anything else waits to see if the longer shortcut is coming; if not, it runs on its own
        pendingRun = exact ? { seq, action: exact, e } : null;
        pendingTimer = setTimeout(() => {
          const r = pendingRun;
          pending = ''; pendingRun = null;
          if (r) runCommand(r.seq, r.action, r.e);
        }, exact ? AMBIGUOUS_WAIT : 900);
      }
    } else {
      // dead end: finish whatever was waiting, then try this key on its own
      const r = pendingRun;
      const hadPending = pending !== '';
      pending = ''; pendingRun = null;
      if (r) runCommand(r.seq, r.action, r.e);
      if (hadPending) dispatch(key, e);
    }
  };

  addEventListener('keydown', (e) => {
    if (!master || !settings.vim || keyEditor) return;
    if (hintState) return hintKey(e);

    // Shift on its own: after a short hold, show what Shift + key does (a quick Shift for a capital letter shows nothing)
    if (e.key === 'Shift') {
      if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target)) {
        clearTimeout(shiftTimer);
        shiftTimer = setTimeout(showShiftHints, 180);
      }
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) { hideShiftHints(); return; }

    if (e.key === 'Escape') {
      clearTimeout(pendingTimer); pending = ''; pendingRun = null;
      if (picker) { e.preventDefault(); hideShiftHints(); return cancelPick(); }
      hideShiftHints();
      if (helpNode) { e.preventDefault(); return closeHelp(); }
      if (keyHintsNode) { e.preventDefault(); return closeKeyHints(); }
      if (cursorTarget && !isTyping(e.target)) { e.preventDefault(); return hideCursor(); }
      // leave a text box, vim-style (but let dialogs handle their own Esc)
      if (isTyping(e.target) && !e.target.closest('[role="dialog"], .ui-dialog')) e.target.blur();
      return;
    }
    if (isTyping(e.target)) { hideShiftHints(); return; }

    // Shift + 1–9: jump to that course (uses the physical key, so it works whatever Shift+digit types)
    const digit = e.shiftKey && /^Digit([1-9])$/.exec(e.code || '');
    if (digit) {
      e.preventDefault(); e.stopPropagation();
      pending = ''; pendingRun = null; cancelPick(); closeHelp(); closeKeyHints(); hideShiftHints();
      return openCourse(Number(digit[1]));
    }

    // Shift + H/L or J/K: move the picker; it opens on Shift release
    const pick = e.shiftKey && PICK_KEYS[e.key.toUpperCase()];
    if (pick) {
      e.preventDefault(); e.stopPropagation();
      pending = ''; pendingRun = null; closeHelp(); closeKeyHints();
      movePicker(...pick);
      return showShiftHints(); // keep the labels following the picker
    }

    hideShiftHints(); // any other key (G, N, ?, …): not a Shift-switch, so no labels

    // Enter opens the item under the j/k cursor (only when nothing else has keyboard focus)
    if (e.key === 'Enter' && !e.shiftKey && cursorTarget && (document.activeElement === document.body || !document.activeElement)) {
      e.preventDefault(); e.stopPropagation();
      openItem();
      return;
    }

    if (e.key.length !== 1) return;
    dispatch(e.key, e);
  }, true);

  // mouse clicks on the top bar / sidebar get the same feedback + loading effect as the Shift switches.
  // Runs at the window in the bubble phase, so anything Canvas cancels (like the Account tray) is skipped.
  addEventListener('click', (e) => {
    if (!master || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.('#section-tabs li > a[href], #menu > li > a.ic-app-header__menu-list-link, .cqs-tools a.cqs-tool');
    if (!a || !navigates(a) || root.classList.contains('cqs-leaving')) return; // already handled (keyboard switch)
    if (a.origin && a.origin !== location.origin) return;
    markActive(a.closest('#section-tabs') ? 'tabs' : 'side', a);
    hideCursor();
    navAway();
    confirmNavigation();
  });

  // letting go of Shift opens whatever the picker landed on
  addEventListener('keyup', (e) => {
    if (e.key !== 'Shift') return;
    hideShiftHints();
    if (picker) { e.preventDefault(); commitPick(); }
  }, true);
  addEventListener('blur', () => { hideShiftHints(); cancelPick(); }); // switching windows mid-pick: don't navigate

  // clicking anywhere or scrolling the page cancels link hints
  addEventListener('pointerdown', () => { if (hintState) endHints(); if (keyHintsNode) closeKeyHints(); hideCursor(); }, true);
  addEventListener('scroll', () => { if (hintState) endHints(); }, { passive: true, capture: true });

  /* ======================= feature: course shortcuts in global nav ======================= */

  if (master && settings.courses) {
    addStyle(`
      .cqs-item { position: relative; }
      .cqs-badge {
        width: 36px; height: 36px; margin: 0 auto 4px; border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        background: var(--cqs-tile); color: var(--cqs-strong);
        font-weight: 700; font-size: 12.5px; letter-spacing: .01em;
        transition: background-color .2s ease, color .2s ease;
      }
      .cqs-item.ic-app-header__menu-list-item--active .cqs-badge { background: var(--cqs-accent); color: var(--cqs-on-accent); }
      .cqs-item .menu-item__text {
        display: block; max-width: 68px; margin: 0 auto;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        font-size: 11px; line-height: 1.3;
      }
      .cqs-pin {
        position: absolute; top: 4px; right: 8px; z-index: 3;
        width: 20px; height: 20px; padding: 0; display: grid; place-items: center;
        border: 0; border-radius: 6px; background: transparent; cursor: pointer;
        color: var(--cqs-muted); opacity: 0;
      }
      .cqs-item:hover .cqs-pin, .cqs-pin:focus-visible { opacity: 1; }
      .cqs-pin:hover { background: var(--cqs-hover); color: var(--cqs-strong); }
      .cqs-pinned .cqs-pin svg { fill: currentColor; }
      .cqs-section {
        list-style: none; padding: 10px 0 4px; text-align: center;
        color: var(--cqs-muted); font-size: 9.5px; font-weight: 700;
        letter-spacing: .1em; text-transform: uppercase;
      }
      .cqs-divider { height: 1px; margin: 8px 14px 0; background: var(--cqs-line); list-style: none; }
    `);

    let menu = null;
    let courses = load(KEYS.courses, []);

    // tile shows something the label doesn't: the course number, or initials if there isn't one
    const parts = (c) => {
      const full = shorten(c.courseCode || c.shortName) || c.shortName || '?';
      const m = full.match(/^(\S+)\s+(\d{3}[A-Z]?)/);
      if (m) return { tile: m[2], text: m[1] };
      const initials = full.split(/[\s._-]+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
      return { tile: initials || '?', text: full };
    };

    const togglePin = (href) => {
      const pins = load(KEYS.pins, []);
      const i = pins.indexOf(href);
      if (i >= 0) pins.splice(i, 1); else pins.push(href);
      save(KEYS.pins, pins);
      render();
    };

    const makeItem = (c, pinned) => {
      const { tile, text } = parts(c);

      const pin = el('button', { type: 'button', class: 'cqs-pin', title: pinned ? 'Unpin' : 'Pin to top',
        'aria-label': pinned ? 'Unpin' : 'Pin to top' });
      pin.innerHTML = ICONS.pin;
      pin.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePin(c.href);
      });

      const link = el('a', { href: c.href, class: 'ic-app-header__menu-list-link', title: c.shortName || text },
        el('div', { class: 'cqs-badge' }, tile),
        el('div', { class: 'menu-item__text' }, text));

      const li = el('li', { class: 'ic-app-header__menu-list-item cqs-item cqs-anim' }, pin, link);
      li.classList.toggle('cqs-pinned', pinned);
      li.classList.toggle('ic-app-header__menu-list-item--active', isActive(c.href));
      return li;
    };

    function render() {
      if (!menu) return;

      for (const li of [...menu.children]) {
        if (li.classList.contains('cqs-keep')) continue;
        if (!KEEP_NAV.includes(li.querySelector('a')?.id)) li.remove();
      }

      const pins = load(KEYS.pins, []);
      const pinned = pins.map((h) => courses.find((c) => c.href === h)).filter(Boolean);
      const rest = courses.filter((c) => !pins.includes(c.href));

      const frag = document.createDocumentFragment();
      if (pinned.length) {
        frag.append(el('li', { class: 'cqs-divider', role: 'separator' }), el('li', { class: 'cqs-section' }, 'Pinned'));
        pinned.forEach((c) => frag.append(makeItem(c, true)));
      }
      if (rest.length) {
        frag.append(el('li', { class: 'cqs-divider', role: 'separator' }));
        if (pinned.length) frag.append(el('li', { class: 'cqs-section' }, 'Other'));
        rest.forEach((c) => frag.append(makeItem(c, false)));
      }
      menu.append(frag);

      // if the tools fell back into this menu, keep them at the bottom
      const toolsItem = menu.querySelector(':scope > .cqs-tools');
      if (toolsItem) menu.append(toolsItem);
    }

    const fetchCourses = async () => {
      const res = await fetch('/api/v1/dashboard/dashboard_cards', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cards = await res.json();
      return cards.map(({ href, shortName, courseCode, color }) => ({ href, shortName, courseCode, color }));
    };

    waitFor('#menu.ic-app-header__menu-list', async (m) => {
      menu = m;
      if (courses.length) render(); // instant paint from cache
      try {
        courses = await fetchCourses();
        save(KEYS.courses, courses);
      } catch (e) {
        console.warn('[Canvas Glowup] course fetch failed:', e);
      }
      render(); // runs after the menu has fully parsed, cleaning up late Canvas items
    });
  }

  /* ======================= feature: course tabs in the header ======================= */

  if (master && settings.tabs) {
    const EXT_ICON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7 7h10v10'/%3E%3Cpath d='M7 17 17 7'/%3E%3C/svg%3E")`;

    addStyle(`
      #left-side, #courseMenuToggle { display: none !important; }
      ${SHOW_CRUMBS ? '' : '.ic-app-nav-toggle-and-crumbs .ic-app-crumbs { display: none !important; }'}

      /* header strip: just spacing around the floating bar */
      .ic-app-nav-toggle-and-crumbs {
        display: flex !important; align-items: center;
        height: auto !important; min-height: 0 !important;
        padding: 12px 12px 8px !important; margin: 0 !important;
        border: 0 !important; background: transparent !important;
      }
      @media (min-width: 768px) {
        html.cqs-floatNav .ic-app-nav-toggle-and-crumbs { padding-left: 0 !important; }
      }

      /* the bar: same look as the sidebar */
      .cqs-tabbar {
        flex: 0 1 auto; width: auto; max-width: 100%;  /* hug the tabs; shrink + scroll only if they don't fit */
        min-width: 0; display: flex; align-items: center; gap: 6px;
        padding: 6px; border-radius: 20px;
        background: var(--cqs-panel); border: 1px solid var(--cqs-border); box-shadow: var(--cqs-shadow);
      }
      .cqs-coursename {
        flex: 0 0 auto; padding: 0 14px 0 10px;
        border-right: 1px solid var(--cqs-line);
        color: var(--cqs-strong); font-size: 14px; font-weight: 700; letter-spacing: .01em;
        line-height: 22px; white-space: nowrap;
      }
      .cqs-tabbar #section-tabs {
        position: relative; flex: 0 1 auto; min-width: 0;
        display: flex; flex-wrap: nowrap; align-items: center; gap: 2px;
        margin: 0; padding: 0; list-style: none; background: transparent;
        overflow-x: auto; overflow-y: hidden; scrollbar-width: none;
      }
      .cqs-tabbar #section-tabs::-webkit-scrollbar { display: none; }
      .cqs-tabbar #section-tabs li { flex: 0 0 auto; display: flex; margin: 0; padding: 0; }

      /* each tab */
      .cqs-tabbar #section-tabs li a {
        z-index: 1;
        display: inline-flex !important; align-items: center; height: 34px;
        margin: 0 !important; padding: 0 14px !important;
        border: 0 !important; border-radius: 12px !important;
        background: transparent !important; color: var(--cqs-muted) !important;
        font-size: 14px; font-weight: 500; letter-spacing: -.005em;
        white-space: nowrap; text-decoration: none !important;
      }
      .cqs-tabbar #section-tabs li a:hover { color: var(--cqs-strong) !important; }
      .cqs-tabbar #section-tabs li a:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--cqs-strong) !important; }

      /* current page: accent pill */
      .cqs-tabbar #section-tabs li a.active {
        background: var(--cqs-accent) !important; color: var(--cqs-on-accent) !important; font-weight: 600;
      }

      /* count badges (e.g. new grades): theme accent instead of blue */
      .cqs-tabbar #section-tabs li a :is(.nav-badge, .badge, [class*="badge"]) {
        display: inline-grid !important; place-items: center;
        min-width: 18px; height: 18px; margin-left: 6px !important; padding: 0 5px !important;
        border: 0 !important; border-radius: 9px !important;
        background: var(--cqs-accent) !important; color: var(--cqs-on-accent) !important;
        font-size: 11px !important; font-weight: 700 !important; line-height: 1 !important;
        box-shadow: none !important;
      }
      .cqs-tabbar #section-tabs li a.active :is(.nav-badge, .badge, [class*="badge"]) {
        background: var(--cqs-on-accent) !important; color: var(--cqs-accent) !important;
      }

      /* external apps (LTI tools) get a small arrow */
      .cqs-tabbar #section-tabs li a[class*="context_external_tool_"]::after {
        content: ''; width: 10px; height: 10px; margin-left: 6px; flex: 0 0 auto;
        background: currentColor; opacity: .7;
        -webkit-mask: ${EXT_ICON} center / contain no-repeat;
        mask: ${EXT_ICON} center / contain no-repeat;
      }
    `);

    const courseLabel = () => {
      const c = load(KEYS.courses, []).find((x) => x.href && isActive(x.href));
      if (c) return { short: shorten(c.courseCode || c.shortName), full: c.shortName || '' };
      const crumb = document.querySelectorAll('.ic-app-crumbs li')[1]?.textContent.trim() || '';
      return { short: shorten(crumb), full: crumb };
    };

    const buildTabBar = () => {
      const tabs = document.querySelector('#section-tabs');
      const header = document.querySelector('.ic-app-nav-toggle-and-crumbs');
      if (!tabs || !header || tabs.dataset.cqsDone) return;
      tabs.dataset.cqsDone = '1';

      TOP_TABS
        .map((cls) => tabs.querySelector(`a.${cls}`)?.closest('li'))
        .filter(Boolean)
        .reverse()
        .forEach((li) => tabs.prepend(li));

      tabs.querySelectorAll('li > a').forEach((a) => {
        a.classList.add('cqs-mag');
        a.dataset.mag = '3';
        if (a.className.includes('context_external_tool_')) a.title = `${a.textContent.trim()} (external app)`;
      });
      attachLens(tabs, 'li > a');

      const bar = el('div', { class: 'cqs-tabbar cqs-anim' });
      const { short, full } = courseLabel();
      if (short) bar.append(el('span', { class: 'cqs-coursename', title: full }, short));
      bar.append(tabs);
      header.append(bar);
      document.body.classList.remove('course-menu-expanded');

      // vertical mouse wheel scrolls the tab strip sideways
      tabs.addEventListener('wheel', (e) => {
        if (tabs.scrollWidth <= tabs.clientWidth) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          tabs.scrollLeft += e.deltaY;
        }
      }, { passive: false });

      tabs.querySelector('a.active')?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
    };

    onReady(buildTabBar);
  }

  /* ======================= feature: compact file pages ======================= */

  if (master && settings.fileRow) {
    addStyle(`
      .cqs-filerow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 0 0 12px; }
      .cqs-filerow h2 { margin: 0 !important; font-size: 1.25rem; }
      .cqs-filerow .cqs-dl { white-space: nowrap; }
      .cqs-filerow .cqs-nav { margin-left: auto; display: flex; gap: 8px; }
      .cqs-filerow .cqs-nav a { margin: 0 !important; }
      .cqs-hide-footer { display: none !important; }
    `);

    const SIZE_RE = /\(\s*[\d.,]+\s*[KMGT]?B\s*\)/i;

    const buildFileRow = () => {
      const content = document.querySelector('#content');
      const link = content?.querySelector('a[href*="/download?download_frd=1"]');
      if (!content || !link || content.querySelector('.cqs-filerow')) return;

      const title = content.querySelector('h2');

      const dl = el('span', { class: 'cqs-dl' });
      link.before(dl);
      dl.append(link);

      // pull the "(4.8 MB)" text that sits near the link into the download chip
      let node = dl, found = null;
      for (let depth = 0; depth < 4 && node && !found; depth++) {
        for (let sib = node.nextSibling; sib && !found; sib = sib.nextSibling) {
          if (SIZE_RE.test(sib.textContent || '')) found = sib;
        }
        node = node.parentElement;
      }
      if (found) {
        const size = found.textContent.match(SIZE_RE)[0];
        if (found.nodeType === Node.TEXT_NODE || found.textContent.trim() === size) found.remove();
        else found.textContent = found.textContent.replace(SIZE_RE, '');
        dl.append(' ' + size);
      }

      const nav = el('div', { class: 'cqs-nav' });
      const row = el('div', { class: 'cqs-filerow' });
      (title || dl).before(row);
      if (title) row.append(title);
      row.append(dl, nav);

      // module prev/next buttons render late, so wait for them (up to 10s)
      const grabNav = () => {
        const footer = document.querySelector('.module-sequence-footer');
        const prev = footer?.querySelector('.module-sequence-footer-button--previous');
        const next = footer?.querySelector('.module-sequence-footer-button--next');
        if (!prev && !next) return false;
        if (prev) nav.append(prev);
        if (next) nav.append(next);
        footer.classList.add('cqs-hide-footer');
        return true;
      };
      if (!grabNav()) {
        const obs = new MutationObserver(() => { if (grabNav()) obs.disconnect(); });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => obs.disconnect(), 10000);
      }
    };

    onReady(buildFileRow);
  }
})();
