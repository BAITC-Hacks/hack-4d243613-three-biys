// @ts-check
// КӨПІР Collector window (owner: B). Plain browser JS: no framework, no build step, no Node APIs.
// Talks only to window.collector from ../src/preload.ts (contextIsolation: true).
// Screens: loading, sign in, consent, app shell with tabs (Collect, Transcript, Privacy, Settings), confirm dialog.
// Opened without the bridge (for example straight in a browser), it runs on local sample data and sends nothing;
// ?screen=signin|consent|collect|transcript|privacy|settings|signout then opens one screen for a static preview.
'use strict';

/**
 * Shapes mirror collector/src/main.ts (CollectorStatus), settings.ts, tracker.ts and meeting.ts.
 * @typedef {{ serverUrl: string, ingestToken: string, team: string, trackerEnabled: boolean, meetingEnabled: boolean }} Settings
 * @typedef {{ running: boolean, eventsSent: number, eventsPending: number, lastSentAt?: string, lastError?: string, currentApp?: string }} TrackerStats
 * @typedef {{ recording: boolean, meetingId?: string, title?: string, chunksSent: number, transcriptLength: number, lastError?: string }} MeetingStats
 * @typedef {{ reachable: boolean, lastCheckAt?: string, error?: string }} ServerState
 * @typedef {{ settings: Settings, tracker: TrackerStats, meeting: MeetingStats, server: ServerState }} Status
 * @typedef {{ serverUrl: string, ingestToken: string, team: string }} FormValues
 * @typedef {'collect' | 'transcript' | 'privacy' | 'settings'} Tab
 * @typedef {'loading' | 'signin' | 'consent' | 'app'} ScreenName
 *
 * Everything except getStatus is optional so an older or partial bridge degrades instead of crashing.
 * @typedef {object} CollectorApi
 * @property {() => Promise<unknown>} getStatus
 * @property {(name: 'tracker' | 'meeting', on: boolean) => Promise<unknown>} [setToggle]
 * @property {(s: Partial<Settings>) => Promise<unknown>} [saveSettings]
 * @property {(title: string) => Promise<unknown>} [startMeeting]
 * @property {() => Promise<unknown>} [stopMeeting]
 * @property {(bytes: ArrayBuffer, mime?: string) => Promise<unknown>} [pushAudioChunk]
 * @property {(cb: (status: unknown) => void) => unknown} [onStatus]
 * @property {(cb: (payload: unknown) => void) => unknown} [onTranscript]
 * @property {() => Promise<unknown>} [checkServer] not exposed yet; used as soon as preload adds it
 */

(() => {
  // ---------- constants ----------

  /** One audio file per 30 s. Every file is a complete webm, because the server transcribes each chunk on its own. */
  const CHUNK_MS = 30_000;
  /** Tails shorter than this carry no speech worth a transcription call. */
  const MIN_CHUNK_MS = 1500;
  const MIN_CHUNK_BYTES = 4096;
  /** Speech needs far less than the 128 kbps default; 64 kbps keeps a chunk around 240 KB. */
  const AUDIO_BITS_PER_SECOND = 64_000;
  const CALL_TIMEOUT_MS = 20_000;
  const STOP_TIMEOUT_MS = 60_000;
  /** After a new token is saved, older 401 errors still sit in the stats until the next batch (30 s). */
  const AUTH_GRACE_MS = 35_000;
  const MAX_LINES = 400;
  const METER_SEGMENTS = 12;
  /** collector/package.json version; preload does not expose app.getVersion(). */
  const APP_VERSION = '0.1.0';
  const CONSENT_KEY = 'kopir:collector:consent:v1';
  const TODAY_KEY = 'kopir:collector:today:v1';
  const PAUSE_KEY = 'kopir:collector:paused:v1';
  const FONTS_URL =
    'https://fonts.googleapis.com/css2?family=Tektur:wght@800&family=Rubik:wght@400;500;600;700;800&display=swap';
  /** en-GB: 24-hour clock ("15:42:10") and "1,284" grouping. */
  const LOCALE = 'en-GB';
  /** @type {Tab[]} */
  const TABS = ['collect', 'transcript', 'privacy', 'settings'];
  const AUTH_ERROR = /INGEST_TOKEN|UNAUTHORI[SZ]ED|\b401\b/i;
  /** Browser preview only. Speakers are roles, never names: the same rule the real meeting notes follow. */
  const SAMPLE_SCRIPT = [
    'Head of sales: dealer orders arrive as Excel files and we retype them into the CRM by hand.',
    'Manager: one order takes about ten minutes, and we get around forty a day.',
    'Finance: the manual entry leaves duplicate orders in our reports.',
    'Head of sales: we need a spreadsheet import into the CRM with a duplicate check.',
    'CEO: let us describe this as a task for students and publish it to the catalog.',
  ];

  /** @type {Record<string, string>} */
  const CATEGORY_LABELS = {
    CRM: 'CRM',
    Spreadsheet: 'Spreadsheet',
    Email: 'Email',
    Messenger: 'Messenger',
    ERP: 'ERP',
    Docs: 'Documents',
    Browser: 'Browser',
    Meeting: 'Video call',
    Other: 'Other',
  };

  // ---------- DOM ----------

  /** @param {string} id */
  const $ = (id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Collector UI: #${id} is missing in index.html`);
    return el;
  };
  /** @param {string} id */
  const $btn = (id) => /** @type {HTMLButtonElement} */ ($(id));
  /** @param {string} id */
  const $input = (id) => /** @type {HTMLInputElement} */ ($(id));

  const els = {
    screenLoading: $('screen-loading'),
    screenSignin: $('screen-signin'),
    screenConsent: $('screen-consent'),
    screenApp: $('screen-app'),
    loadingText: $('loading-text'),
    loadingError: $('loading-error'),
    loadingRetry: $btn('loading-retry'),

    signinCard: $('signin-card'),
    signinForm: /** @type {HTMLFormElement} */ ($('signin-form')),
    signinSaved: $('signin-saved'),
    signinSavedHost: $('signin-saved-host'),
    signinSavedTeam: $('signin-saved-team'),
    signinChange: $btn('signin-change'),
    signinConn: $('signin-conn'),
    siServer: $input('si-server'),
    siServerMsg: $('si-server-msg'),
    siTeam: $input('si-team'),
    siTeamMsg: $('si-team-msg'),
    siToken: $input('si-token'),
    siTokenMsg: $('si-token-msg'),
    siTokenToggle: $btn('si-token-toggle'),
    signinBtn: $btn('signin-btn'),
    signinBtnLabel: $('signin-btn-label'),
    signinTest: $btn('signin-test'),
    signinStatus: $('signin-status'),

    consentCard: $('consent-card'),
    consentTitle: $('consent-title'),
    consentCheck: $input('consent-check'),
    consentUrl: $('consent-url'),
    consentContinue: $btn('consent-continue'),
    consentLed: $('consent-led'),
    consentBack: $btn('consent-back'),

    pill: $('pill'),
    pillLed: $('pill-led'),
    pillText: $('pill-text'),
    pauseBtn: $btn('pause-btn'),
    tablist: $('tabs'),
    /** @type {Record<Tab, HTMLButtonElement>} */
    tabs: {
      collect: $btn('tab-collect'),
      transcript: $btn('tab-transcript'),
      privacy: $btn('tab-privacy'),
      settings: $btn('tab-settings'),
    },
    /** @type {Record<Tab, HTMLElement>} */
    panels: {
      collect: $('panel-collect'),
      transcript: $('panel-transcript'),
      privacy: $('panel-privacy'),
      settings: $('panel-settings'),
    },
    tabTranscriptDot: $('tab-transcript-dot'),
    main: $('main'),
    banner: $('bridge-banner'),
    offlineBanner: $('offline-banner'),
    offlineText: $('offline-text'),
    offlineRetry: $btn('offline-retry'),
    tokenBanner: $('token-banner'),
    tokenSignin: $btn('token-signin'),

    hero: $('hero'),
    heroLed: $('hero-led'),
    heroTitle: $('hero-title'),
    heroSub: $('hero-sub'),
    heroCount: $('hero-count'),
    heroCountLabel: $('hero-count-label'),
    heroStart: $btn('hero-start'),
    heroStartLabel: $('hero-start-label'),

    trackerCard: $('tracker-card'),
    trackerSwitch: $btn('tracker-switch'),
    trackerLed: $('tracker-led'),
    trackerLive: $('tracker-live'),
    trackerApp: $('tracker-app'),
    trackerSent: $('tracker-sent'),
    trackerSentSub: $('tracker-sent-sub'),
    trackerPending: $('tracker-pending'),
    trackerLast: $('tracker-last'),
    trackerLastSub: $('tracker-last-sub'),
    trackerError: $('tracker-error'),

    meetingCard: $('meeting-card'),
    meetingSwitch: $btn('meeting-switch'),
    rec: $('rec'),
    recTime: $('rec-time'),
    recTitle: $('rec-title'),
    meters: $('meters'),
    meterSys: $('meter-sys'),
    meterMic: $('meter-mic'),
    meetingName: $input('meeting-name'),
    meetingBtn: $btn('meeting-btn'),
    meetingBtnIcon: $('meeting-btn-icon'),
    meetingBtnLabel: $('meeting-btn-label'),
    meetingNote: $('meeting-note'),
    meetingChunks: $('meeting-chunks'),
    meetingChunksSub: $('meeting-chunks-sub'),
    meetingText: $('meeting-text'),
    meetingTextSub: $('meeting-text-sub'),
    meetingWarning: $('meeting-warning'),
    meetingError: $('meeting-error'),

    copyBtn: $btn('copy-btn'),
    clearBtn: $btn('clear-btn'),
    txRec: $('tx-rec'),
    txRecTime: $('tx-rec-time'),
    txRecTitle: $('tx-rec-title'),
    transcript: $('transcript'),
    transcriptEmpty: $('transcript-empty'),
    transcriptEmptyText: $('transcript-empty-text'),
    transcriptEmptyBtn: $btn('transcript-empty-btn'),

    consentDate: $('consent-date'),
    batchSummary: $('batch-summary'),
    batchChips: $('batch-chips'),
    batchNote: $('batch-note'),
    deletionBtn: $btn('deletion-btn'),
    deletionInfo: $('deletion-info'),
    withdrawBtn: $btn('withdraw-btn'),

    form: /** @type {HTMLFormElement} */ ($('settings-form')),
    serverUrl: $input('server-url'),
    serverUrlMsg: $('server-url-msg'),
    token: $input('ingest-token'),
    tokenMsg: $('ingest-token-msg'),
    tokenToggle: $btn('token-toggle'),
    team: $input('team'),
    teamMsg: $('team-msg'),
    saveBtn: $btn('save-btn'),
    checkBtn: $btn('check-btn'),
    saveStatus: $('save-status'),
    appVersion: $('app-version'),
    signoutBtn: $btn('signout-btn'),

    dialog: /** @type {HTMLDialogElement} */ ($('confirm-dialog')),
    confirmTitle: $('confirm-title'),
    confirmText: $('confirm-text'),
    confirmError: $('confirm-error'),
    confirmCancel: $btn('confirm-cancel'),
    confirmOk: $btn('confirm-ok'),
  };

  // ---------- formatting ----------

  const numberFmt = new Intl.NumberFormat(LOCALE);
  const clockFmt = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const shortFmt = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const pluralRules = new Intl.PluralRules(LOCALE);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /** @param {number} n */
  const fmtNum = (n) => numberFmt.format(n);
  /** @param {number} t */
  const fmtClock = (t) => clockFmt.format(t);
  /** @param {number} n @param {string} one @param {string} other */
  const plural = (n, one, other) => (pluralRules.select(n) === 'one' ? one : other);

  /** @param {string | undefined} iso */
  function toTime(iso) {
    const t = iso ? Date.parse(iso) : NaN;
    return Number.isFinite(t) ? t : null;
  }

  /** @param {number} t */
  function fmtAgo(t) {
    const s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 5) return 'just now';
    if (s < 60) return `${s} s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h ago`;
    return shortFmt.format(t);
  }

  /** @param {number} ms */
  function fmtDuration(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  /** @param {string} url */
  function hostOf(url) {
    try {
      return new URL(url).host || url;
    } catch {
      return url;
    }
  }

  /** @param {number} t */
  function localDay(t) {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ---------- small DOM helpers ----------

  /** @param {Element} el @param {string} text */
  function setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }

  /** Buttons stay focusable while busy (a disabled button would drop keyboard focus), so busy is aria-disabled. */
  /** @param {HTMLElement} el @param {boolean} disabled */
  function setDisabled(el, disabled) {
    const value = String(disabled);
    if (el.getAttribute('aria-disabled') !== value) el.setAttribute('aria-disabled', value);
  }

  /** @param {HTMLElement} el */
  const isDisabled = (el) => el.getAttribute('aria-disabled') === 'true';

  /** Writes only on change: render runs every second and on every status tick. */
  /** @param {HTMLElement} el @param {string} key @param {string} value */
  function setData(el, key, value) {
    if (el.dataset[key] !== value) el.dataset[key] = value;
  }

  /** @param {Element} el @param {string} className */
  function setClass(el, className) {
    if (el.className !== className) el.className = className;
  }

  /** @param {HTMLElement} el @param {string} text @param {string} [detail] raw error, kept as a tooltip */
  function showMessage(el, text, detail = '') {
    el.hidden = !text;
    setText(el, text);
    if (el.title !== detail) el.title = detail;
  }

  /** Restarts a one-shot CSS animation (lime flash). */
  /** @param {HTMLElement} el @param {string} className */
  function flash(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  /** @type {WeakMap<HTMLElement, { value: number, raf: number }>} */
  const tickers = new WeakMap();

  /** Counters tick up to the new value; with reduced motion or a hidden window they jump. */
  /** @param {HTMLElement} el @param {number} value */
  function tickTo(el, value) {
    const state = tickers.get(el) ?? { value: NaN, raf: 0 };
    if (state.value === value) return;
    const from = Number.isFinite(state.value) ? state.value : value;
    cancelAnimationFrame(state.raf);
    state.value = value;
    tickers.set(el, state);
    if (reducedMotion.matches || document.hidden || value <= from) {
      setText(el, fmtNum(value));
      return;
    }
    const start = performance.now();
    const duration = 600;
    /** @param {number} now */
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setText(el, fmtNum(Math.round(from + (value - from) * (1 - (1 - p) ** 3))));
      if (p < 1) state.raf = requestAnimationFrame(step);
    };
    state.raf = requestAnimationFrame(step);
    // requestAnimationFrame pauses in a hidden window; the final value still lands.
    window.setTimeout(() => {
      if (state.value === value) setText(el, fmtNum(value));
    }, duration + 80);
  }

  /** @param {number} ms */
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  /**
   * @template T
   * @param {Promise<T>} promise
   * @param {number} ms
   * @returns {Promise<T>}
   */
  function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('timeout')), ms);
      promise.then(
        (value) => {
          window.clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          window.clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  // ---------- errors ----------

  /** @param {unknown} err */
  function rawError(err) {
    const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
    // ipcRenderer.invoke wraps main-process errors: "Error invoking remote method 'collector:x': Error: text".
    return msg
      .replace(/^Error invoking remote method '[^']*': /, '')
      .replace(/^[A-Za-z]*Error: /, '')
      .trim();
  }

  /** Main process and server errors are terse one-liners; show what the user can do about them. */
  /** @param {string} raw */
  function humanize(raw) {
    if (!raw) return '';
    if (raw === 'timeout') return 'The app did not respond within 20 seconds.';
    if (AUTH_ERROR.test(raw)) return 'The server rejected the access token.';
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|getaddrinfo|network|Failed to fetch/i.test(raw)) {
      return 'Server unreachable. Check the address and the internet connection.';
    }
    if (/Invalid URL|Failed to parse URL/i.test(raw)) return 'Invalid server address.';
    if (/Unexpected token|not valid JSON|JSON/i.test(raw)) return 'Unexpected response from the server. Check the address.';
    if (/\b(404|405)\b/.test(raw)) return 'No Көпір server at this address. Check the address.';
    return raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
  }

  /** @param {unknown} err */
  function mediaErrorText(err) {
    const name = err instanceof Error || err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'No access to audio. Allow microphone access in Windows Settings: Privacy & security, Microphone.';
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone or computer audio found.';
    if (name === 'NotReadableError' || name === 'AbortError') return 'The audio device is busy in another app.';
    if (name === 'NotSupportedError' || rawError(err) === 'no-media') return 'Audio recording is not supported in this window.';
    return humanize(rawError(err)) || 'Could not get audio.';
  }

  // ---------- status ----------

  /** @param {unknown} v */
  const asObj = (v) => /** @type {Record<string, unknown>} */ (v && typeof v === 'object' ? v : {});
  /** @param {unknown} v */
  const asStr = (v) => (typeof v === 'string' ? v : '');
  /** @param {unknown} v */
  const asNum = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

  /** Accepts whatever came over IPC and fills the gaps, so rendering never trips over a missing field. */
  /** @param {unknown} raw @returns {Status} */
  function normalize(raw) {
    const s = asObj(raw);
    const settings = asObj(s.settings);
    const tracker = asObj(s.tracker);
    const meeting = asObj(s.meeting);
    const server = asObj(s.server);
    return {
      settings: {
        serverUrl: asStr(settings.serverUrl),
        ingestToken: asStr(settings.ingestToken),
        team: asStr(settings.team),
        trackerEnabled: settings.trackerEnabled === true,
        meetingEnabled: settings.meetingEnabled === true,
      },
      tracker: {
        running: tracker.running === true,
        eventsSent: asNum(tracker.eventsSent),
        eventsPending: asNum(tracker.eventsPending),
        lastSentAt: asStr(tracker.lastSentAt) || undefined,
        lastError: asStr(tracker.lastError) || undefined,
        currentApp: asStr(tracker.currentApp) || undefined,
      },
      meeting: {
        recording: meeting.recording === true,
        meetingId: asStr(meeting.meetingId) || undefined,
        title: asStr(meeting.title) || undefined,
        chunksSent: asNum(meeting.chunksSent),
        transcriptLength: asNum(meeting.transcriptLength),
        lastError: asStr(meeting.lastError) || undefined,
      },
      server: {
        reachable: server.reachable === true,
        lastCheckAt: asStr(server.lastCheckAt) || undefined,
        error: asStr(server.error) || undefined,
      },
    };
  }

  /** @param {unknown} raw */
  function looksLikeStatus(raw) {
    const s = asObj(raw);
    return 'settings' in s || 'tracker' in s || 'meeting' in s || 'server' in s;
  }

  // ---------- bridge and storage ----------

  const bridge = /** @type {Partial<CollectorApi> | undefined} */ (/** @type {any} */ (window).collector);
  const connected = !!bridge && typeof bridge.getStatus === 'function';
  /** @type {CollectorApi} */
  const api = connected ? /** @type {CollectorApi} */ (bridge) : createSampleApi();
  const previewScreen = connected ? '' : new URLSearchParams(window.location.search).get('screen') ?? '';

  /** localStorage of the Collector window; the browser preview keeps everything in memory instead. */
  /** @type {Map<string, string>} */
  const memory = new Map();
  const store = {
    /** @param {string} key */
    read(key) {
      try {
        const raw = connected ? window.localStorage.getItem(key) : memory.get(key) ?? null;
        return raw ? /** @type {unknown} */ (JSON.parse(raw)) : null;
      } catch {
        return null;
      }
    },
    /** @param {string} key @param {unknown} value */
    write(key, value) {
      try {
        const raw = value === null || value === undefined ? null : JSON.stringify(value);
        if (!connected) {
          if (raw === null) memory.delete(key);
          else memory.set(key, raw);
        } else if (raw === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, raw);
      } catch {
        /* storage blocked: the app keeps working and simply forgets */
      }
    },
  };

  function readConsent() {
    const acceptedAt = asStr(asObj(store.read(CONSENT_KEY)).acceptedAt);
    return toTime(acceptedAt) ? { acceptedAt } : null;
  }

  // ---------- state ----------

  /** @type {Status} */
  let status = normalize(null);
  let loaded = false;
  let loadError = '';
  let checking = false;
  let saving = false;
  let submitted = false;
  /** @type {{ tracker: boolean | null, meeting: boolean | null }} */
  const pendingToggle = { tracker: null, meeting: null };
  const toggleError = { tracker: '', meeting: '' };
  /** Settings the form was last filled from; edits are compared against it. @type {FormValues | null} */
  let formSeen = null;
  /** @type {{ kind: '' | 'dirty' | 'saving' | 'ok' | 'error', text: string }} */
  let saveState = { kind: '', text: '' };
  /** @type {{ kind: '' | 'ok' | 'error', text: string }} */
  let signinState = { kind: '', text: '' };
  /** What "Resume" turns back on after "Pause all". @type {{ tracker: boolean, meeting: boolean } | null} */
  let pausedFrom = null;

  const ui = {
    /** @type {ScreenName} */
    screen: 'loading',
    /** @type {Tab} */
    tab: 'collect',
    signinExpanded: false,
    /** @type {'' | 'rejected' | 'signedout' | 'withdrawn'} */
    signinReason: '',
    signingIn: false,
    testingSignin: false,
    /** @type {'' | 'signout' | 'withdraw'} */
    confirm: '',
    confirmBusy: false,
    pausing: false,
    authGraceUntil: 0,
  };

  /** Events sent today, kept across app restarts. */
  const today = { day: localDay(Date.now()), count: 0, lastSent: -1 };

  /** Seconds per app category between batches, counted from the live status (the batch itself is not exposed). */
  const tally = {
    /** @type {Map<string, number>} */
    current: new Map(),
    /** @type {{ at: string, events: number | null, secs: Map<string, number> | null } | null} */
    last: null,
    version: 0,
    renderedVersion: -1,
    lastSample: 0,
    lastApp: '',
    lastSentAt: '',
    lastEventsSent: 0,
  };

  const capture = {
    /** @type {'idle' | 'starting' | 'recording' | 'stopping'} */
    phase: 'idle',
    meetingId: '',
    startedAt: 0,
    lastDurationMs: 0,
    /** @type {MediaStream[]} */
    streams: [],
    /** @type {AudioContext | null} */
    ctx: null,
    /** @type {MediaStream | null} */
    mixed: null,
    mime: '',
    /** @type {{ rec: MediaRecorder, done: Promise<void> } | null} */
    segment: null,
    /** @type {number | undefined} */
    rotateTimer: undefined,
    /** @type {Set<Promise<void>>} */
    uploads: new Set(),
    /** @type {AnalyserNode | null} */
    sysAnalyser: null,
    /** @type {AnalyserNode | null} */
    micAnalyser: null,
    /** @type {number | undefined} */
    meterTimer: undefined,
    warning: '',
    error: '',
  };

  /** Transcript lines by "meetingId#seq". @type {Map<string, HTMLElement>} */
  const lines = new Map();
  /** Titles for transcript groups, by meeting id. @type {Map<string, string>} */
  const meetingTitles = new Map();
  /** Follow new lines until the user scrolls up to read. */
  let pinned = true;

  // ---------- derived state ----------

  const isRecording = () => capture.phase === 'recording';
  const isCollecting = () => status.tracker.running || isRecording();
  const anyActive = () => status.settings.trackerEnabled || status.settings.meetingEnabled || isRecording();
  const serverChecked = () => !!toTime(status.server.lastCheckAt);

  function tokenRejected() {
    if (!status.settings.ingestToken || Date.now() < ui.authGraceUntil) return false;
    return AUTH_ERROR.test(`${status.tracker.lastError ?? ''} ${status.meeting.lastError ?? ''}`);
  }

  /** @param {number} sent */
  function trackToday(sent) {
    const day = localDay(Date.now());
    if (day !== today.day) {
      today.day = day;
      today.count = 0;
    }
    if (today.lastSent >= 0 && sent > today.lastSent) {
      today.count += sent - today.lastSent;
      store.write(TODAY_KEY, { day: today.day, count: today.count });
    }
    today.lastSent = sent;
  }

  /** @param {TrackerStats} t */
  function trackTally(t) {
    const now = Date.now();
    if (tally.lastApp && tally.lastSample) {
      // Cap gaps (sleep, a frozen window) so one long pause does not dominate the picture.
      const secs = Math.min(10, (now - tally.lastSample) / 1000);
      tally.current.set(tally.lastApp, (tally.current.get(tally.lastApp) ?? 0) + secs);
    }
    tally.lastSample = t.running ? now : 0;
    tally.lastApp = t.running ? t.currentApp ?? '' : '';
    if (t.lastSentAt && t.lastSentAt !== tally.lastSentAt) {
      const watched = !!tally.lastSentAt;
      tally.last = {
        at: t.lastSentAt,
        events: watched ? t.eventsSent - tally.lastEventsSent : null,
        secs: watched ? new Map(tally.current) : null,
      };
      tally.current = new Map();
      tally.lastSentAt = t.lastSentAt;
      tally.lastEventsSent = t.eventsSent;
      tally.version += 1;
    }
  }

  // ---------- screens and tabs ----------

  /** @param {ScreenName} name @param {{ tab?: Tab, focusTab?: boolean }} [opts] */
  function showScreen(name, opts = {}) {
    ui.screen = name;
    els.screenLoading.hidden = name !== 'loading';
    els.screenSignin.hidden = name !== 'signin';
    els.screenConsent.hidden = name !== 'consent';
    els.screenApp.hidden = name !== 'app';
    if (name === 'signin') {
      prepareSignin();
      focusSignin();
    } else if (name === 'consent') {
      prepareConsent();
      els.consentTitle.focus();
    } else if (name === 'app') {
      selectTab(opts.tab ?? ui.tab, !!opts.focusTab);
    }
    renderAll();
  }

  function routeFromStatus() {
    if (!status.settings.ingestToken) return showScreen('signin');
    if (!readConsent()) return showScreen('consent');
    return showScreen('app', { tab: 'collect' });
  }

  /** @param {Tab} name @param {boolean} [focus] */
  function selectTab(name, focus = false) {
    ui.tab = name;
    for (const t of TABS) {
      const on = t === name;
      els.tabs[t].setAttribute('aria-selected', String(on));
      els.tabs[t].tabIndex = on ? 0 : -1;
      els.panels[t].hidden = !on;
    }
    els.main.scrollTop = 0;
    if (focus) els.tabs[name].focus();
    renderAll();
  }

  /** @param {KeyboardEvent} ev */
  function onTabKey(ev) {
    const index = TABS.indexOf(ui.tab);
    /** @type {Record<string, number>} */
    const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 };
    if (!(ev.key in moves)) return;
    ev.preventDefault();
    const next = TABS[(moves[ev.key] + TABS.length) % TABS.length];
    selectTab(next, true);
  }

  // ---------- rendering ----------

  function renderAll() {
    if (ui.screen === 'signin') renderSignin();
    if (ui.screen === 'consent') renderConsent();
    if (ui.screen !== 'app') return;
    renderHeader();
    renderBanners();
    renderHero();
    renderTracker();
    renderMeeting();
    renderTranscriptTools();
    renderPrivacy();
    renderSettingsButtons();
  }

  function renderHeader() {
    const { server, settings, tracker } = status;
    const host = settings.serverUrl ? hostOf(settings.serverUrl) : 'no server';
    const team = settings.team || 'no team';
    let state = 'checking';
    let text = 'Checking connection…';
    let led = 'led led--off';
    if (loadError) {
      state = 'down';
      text = 'No response from the app';
    } else if (!loaded || checking || !serverChecked()) {
      state = 'checking';
    } else if (!server.reachable) {
      state = 'down';
      text = `Offline, ${fmtNum(tracker.eventsPending)} queued`;
    } else if (!isCollecting()) {
      state = 'paused';
      text = `Paused · ${team} · ${host}`;
    } else {
      state = 'ok';
      text = `Connected · ${team} · ${host}`;
      led = 'led';
    }
    setData(els.pill, 'state', state);
    setClass(els.pillLed, led);
    setText(els.pillText, text);
    if (els.pill.title !== text) els.pill.title = text;

    const active = anyActive();
    let label = active ? 'Pause all' : pausedFrom ? 'Resume' : 'Pause all';
    if (ui.pausing) label = active ? 'Pausing…' : 'Resuming…';
    setText(els.pauseBtn, label);
    setDisabled(els.pauseBtn, ui.pausing || (!active && !pausedFrom) || !api.setToggle);
    els.tabTranscriptDot.hidden = !isRecording();
  }

  function renderBanners() {
    els.banner.hidden = connected;
    const offline = loaded && !checking && serverChecked() && !status.server.reachable && !!status.settings.ingestToken;
    els.offlineBanner.hidden = !offline;
    const queued = status.tracker.eventsPending;
    setText(
      els.offlineText,
      queued
        ? `${fmtNum(queued)} ${plural(queued, 'event waits', 'events wait')} in the queue.`
        : 'Events wait in the queue until the server is back.',
    );
    els.tokenBanner.hidden = !tokenRejected();
  }

  function renderHero() {
    const recording = isRecording();
    const live = status.tracker.running;
    let state = 'paused';
    let title = 'Paused';
    let sub = 'Nothing is collected right now.';
    let led = 'led led--xl led--off';
    if (recording) {
      state = 'rec';
      title = 'Recording';
      sub = `${status.meeting.title ?? 'Meeting'} · ${fmtDuration(Date.now() - capture.startedAt)}`;
      led = 'led led--xl led--rec';
    } else if (live) {
      state = 'live';
      title = 'Collecting';
      sub = status.settings.meetingEnabled ? 'Tracker on, meeting notes ready' : 'Tracker on';
      led = 'led led--xl';
    } else if (status.settings.trackerEnabled) {
      state = 'live';
      title = 'Starting…';
      sub = 'The tracker is starting.';
    }
    setData(els.hero, 'state', state);
    setClass(els.heroLed, led);
    setText(els.heroTitle, title);
    setText(els.heroSub, sub);
    tickTo(els.heroCount, today.count);
    setText(els.heroCountLabel, `${plural(today.count, 'event', 'events')} sent today`);
    els.heroStart.hidden = recording || live || status.settings.trackerEnabled;
    setText(els.heroStartLabel, pausedFrom ? 'Resume collecting' : 'Start collecting');
    setDisabled(els.heroStart, ui.pausing || pendingToggle.tracker !== null || !api.setToggle);
  }

  /** @param {HTMLButtonElement} el @param {boolean} on @param {boolean} disabled */
  function setSwitch(el, on, disabled) {
    const checked = String(on);
    if (el.getAttribute('aria-checked') !== checked) el.setAttribute('aria-checked', checked);
    setDisabled(el, disabled);
  }

  function renderTracker() {
    const t = status.tracker;
    const busy = pendingToggle.tracker !== null;
    const on = pendingToggle.tracker ?? status.settings.trackerEnabled;
    setSwitch(els.trackerSwitch, on, busy || !api.setToggle);
    setData(els.trackerCard, 'on', String(on));

    let live = 'Off';
    let app = '';
    if (busy) live = on ? 'Turning on…' : 'Turning off…';
    else if (t.running && t.currentApp) {
      live = 'Now:';
      app = CATEGORY_LABELS[t.currentApp] ?? t.currentApp;
    } else if (t.running) live = 'Running, detecting the app…';
    else if (on) live = 'Starting…';
    setClass(els.trackerLed, t.running && !busy ? 'led' : 'led led--off');
    setText(els.trackerLive, live);
    setText(els.trackerApp, app);

    tickTo(els.trackerSent, t.eventsSent);
    setText(els.trackerSentSub, `${plural(t.eventsSent, 'event', 'events')} since launch`);
    setText(els.trackerPending, fmtNum(t.eventsPending));
    const last = toTime(t.lastSentAt);
    setText(els.trackerLast, last ? fmtClock(last) : 'none yet');
    els.trackerLast.classList.toggle('stat__value--muted', !last);
    setText(els.trackerLastSub, last ? fmtAgo(last) : 'every 30 s');

    let error = toggleError.tracker;
    if (!error && t.lastError && !tokenRejected()) {
      const queued = t.eventsPending ? ' Events stay queued.' : '';
      error = `Not sent. ${humanize(rawError(t.lastError))}${queued}`;
    }
    showMessage(els.trackerError, error, t.lastError ?? '');
  }

  function renderMeeting() {
    const m = status.meeting;
    const phase = capture.phase;
    const hasApi = !!api.startMeeting && !!api.stopMeeting && (!connected || !!api.pushAudioChunk);
    const busyToggle = pendingToggle.meeting !== null;
    const enabled = pendingToggle.meeting ?? status.settings.meetingEnabled;
    setSwitch(els.meetingSwitch, enabled, busyToggle || phase === 'starting' || phase === 'stopping' || !api.setToggle);
    setData(els.meetingCard, 'on', String(enabled));

    // Main still has an open meeting that this window no longer captures: the window was reloaded mid-meeting,
    // or meeting-end failed. The button then only closes the meeting on the server.
    const orphan = connected && loaded && m.recording && phase === 'idle';
    const active = phase === 'recording' || phase === 'stopping' || orphan;
    const elapsed = phase === 'recording' ? Date.now() - capture.startedAt : capture.lastDurationMs;

    els.rec.hidden = phase !== 'recording';
    els.txRec.hidden = phase !== 'recording';
    const recTitle = m.title ?? '';
    for (const [time, name] of [
      [els.recTime, els.recTitle],
      [els.txRecTime, els.txRecTitle],
    ]) {
      setText(time, fmtDuration(elapsed));
      setText(name, recTitle);
    }
    els.meters.hidden = !(connected && phase === 'recording');

    // One button that starts or stops, so keyboard focus never lands on a hidden control.
    const btn = els.meetingBtn;
    const btnDisabled = phase === 'starting' || phase === 'stopping' || (!active && (!enabled || !hasApi || busyToggle));
    setData(btn, 'action', active ? 'stop' : 'start');
    setClass(btn, active ? 'btn btn--stop btn--meeting' : 'btn btn--primary btn--meeting');
    setClass(els.meetingBtnIcon, active ? 'stop-icon' : btnDisabled ? 'led led--off' : 'led');
    let label = 'Start recording';
    if (phase === 'starting') label = 'Connecting…';
    else if (phase === 'stopping') label = 'Finishing…';
    else if (orphan) label = 'End meeting';
    else if (active) label = 'Stop recording';
    setText(els.meetingBtnLabel, label);
    setDisabled(btn, btnDisabled);
    els.meetingName.disabled = phase !== 'idle' || orphan || !enabled;

    let note = 'Tell participants before you record.';
    if (!hasApi) note = 'Meeting notes are not available in this app version.';
    else if (phase === 'starting') note = 'Connecting audio…';
    else if (phase === 'recording') note = 'You can close the window, recording continues in the tray.';
    else if (phase === 'stopping') note = 'Finishing: sending the last chunk…';
    else if (orphan) note = 'A meeting is still open, audio is not recorded. End it here.';
    else if (!enabled) note = 'Turn on the switch to record meetings.';
    else if (capture.lastDurationMs) note = `Last recording ${fmtDuration(capture.lastDurationMs)}. Text is in the Transcript tab.`;
    setText(els.meetingNote, note);

    tickTo(els.meetingChunks, m.chunksSent);
    setText(els.meetingChunksSub, `${plural(m.chunksSent, 'chunk', 'chunks')} sent`);
    tickTo(els.meetingText, m.transcriptLength);
    setText(els.meetingTextSub, plural(m.transcriptLength, 'character', 'characters'));

    showMessage(els.meetingWarning, capture.warning);
    let error = toggleError.meeting || capture.error;
    if (!error && m.lastError && !tokenRejected()) error = `Server error. ${humanize(rawError(m.lastError))}`;
    showMessage(els.meetingError, error, m.lastError ?? '');
  }

  function renderTranscriptTools() {
    const empty = lines.size === 0;
    setDisabled(els.copyBtn, empty);
    setDisabled(els.clearBtn, empty);
    els.transcriptEmpty.hidden = !empty;
    let text = 'No transcript yet. Start meeting notes to see text here.';
    if (!api.onTranscript) text = 'Transcripts are not available in this app version.';
    else if (isRecording()) text = 'Listening. The first text arrives in about 30 seconds.';
    setText(els.transcriptEmptyText, text);
    els.transcriptEmptyBtn.hidden = !api.onTranscript || isRecording();
  }

  function renderPrivacy() {
    const consent = readConsent();
    setText(els.consentDate, consent ? `Consent given on ${dateFmt.format(Date.parse(consent.acceptedAt))}.` : 'Consent not given yet.');
    if (tally.renderedVersion === tally.version) return;
    tally.renderedVersion = tally.version;
    const last = tally.last;
    els.batchChips.replaceChildren();
    if (!last) {
      setText(els.batchSummary, 'No batch sent yet. Turn on the tracker to start.');
      els.batchNote.hidden = true;
      return;
    }
    const at = toTime(last.at);
    const events = last.events === null ? '' : ` · ${fmtNum(last.events)} ${plural(last.events, 'event', 'events')}`;
    setText(els.batchSummary, `Last batch at ${at ? fmtClock(at) : 'unknown time'}${events}.`);
    const entries = [...(last.secs ?? new Map())].filter(([, s]) => s >= 1).sort((a, b) => b[1] - a[1]);
    for (const [category, secs] of entries) {
      const chip = document.createElement('li');
      chip.className = 'chip';
      const value = document.createElement('b');
      value.textContent = `${Math.round(secs)} s`;
      chip.append(`${CATEGORY_LABELS[category] ?? category} `, value);
      els.batchChips.append(chip);
    }
    els.batchNote.hidden = entries.length === 0;
  }

  function renderSettingsButtons() {
    setDisabled(els.checkBtn, checking);
    setText(els.checkBtn, checking ? 'Testing…' : 'Test connection');
  }

  /** @param {Status} next @param {{ fillForm?: boolean }} [opts] */
  function applyStatus(next, opts = {}) {
    status = next;
    loaded = true;
    loadError = '';
    trackToday(next.tracker.eventsSent);
    trackTally(next.tracker);
    // Main finished the meeting on its own: release the microphone and the loopback here too.
    if (
      connected &&
      capture.phase === 'recording' &&
      capture.meetingId &&
      next.meeting.meetingId === capture.meetingId &&
      !next.meeting.recording
    ) {
      void stopRecording({ external: true });
    }
    syncForm(!!opts.fillForm);
    refreshFieldMessages();
    renderAll();
  }

  /** IPC handlers return the fresh status; anything else means "ask again". */
  /** @param {unknown} res @param {{ fillForm?: boolean }} [opts] */
  async function adopt(res, opts) {
    if (looksLikeStatus(res)) applyStatus(normalize(res), opts);
    else applyStatus(normalize(await api.getStatus()), opts);
  }

  // ---------- sign in ----------

  function prepareSignin() {
    const s = status.settings;
    els.siServer.value = s.serverUrl;
    els.siTeam.value = s.team;
    els.siToken.value = '';
    els.siToken.type = 'password';
    setText(els.siTokenToggle, 'Show');
    // One step when the server and the team are already known: only the token is asked.
    ui.signinExpanded = !(s.serverUrl && s.team);
    setFieldMessage(els.siServer, els.siServerMsg, null);
    setFieldMessage(els.siTeam, els.siTeamMsg, null);
    setFieldMessage(
      els.siToken,
      els.siTokenMsg,
      ui.signinReason === 'rejected' ? ['error', 'The server rejected the last token. Paste a new one.'] : null,
    );
    signinState = { kind: '', text: '' };
    if (ui.signinReason === 'signedout') signinState = { kind: '', text: 'Signed out. Collection is off on this computer.' };
    if (ui.signinReason === 'withdrawn') signinState = { kind: '', text: 'Consent withdrawn. Collection is off, the token is removed.' };
  }

  function focusSignin() {
    if (!ui.signinExpanded) els.siToken.focus();
    else if (!els.siServer.value) els.siServer.focus();
    else if (!els.siTeam.value) els.siTeam.focus();
    else els.siToken.focus();
  }

  function renderSignin() {
    const collapsed = !ui.signinExpanded;
    els.signinSaved.hidden = !collapsed;
    els.signinConn.hidden = collapsed;
    setText(els.signinSavedHost, hostOf(els.siServer.value.trim()) || 'no server');
    setText(els.signinSavedTeam, els.siTeam.value.trim() || 'no team');
    setText(els.signinBtnLabel, ui.signingIn ? 'Signing in…' : 'Sign in');
    const led = els.signinBtn.querySelector('.led');
    if (led) setClass(led, ui.signingIn ? 'led led--off' : 'led');
    setDisabled(els.signinBtn, ui.signingIn);
    setText(els.signinTest, ui.testingSignin ? 'Testing…' : 'Test connection');
    setDisabled(els.signinTest, ui.testingSignin || ui.signingIn);
    setData(els.signinStatus, 'kind', signinState.kind);
    setText(els.signinStatus, signinState.text);
  }

  /** @returns {FormValues} */
  function readSignin() {
    return { serverUrl: els.siServer.value.trim(), ingestToken: els.siToken.value.trim(), team: els.siTeam.value.trim() };
  }

  /** @param {FormValues} v @param {boolean} needToken */
  function validateSignin(v, needToken) {
    const errors = validate(v);
    setFieldMessage(els.siServer, els.siServerMsg, errors.serverUrl ? ['error', errors.serverUrl] : null);
    setFieldMessage(els.siTeam, els.siTeamMsg, errors.team ? ['error', 'Enter your team.'] : null);
    const tokenError = needToken && !v.ingestToken ? 'Paste the access token.' : '';
    setFieldMessage(els.siToken, els.siTokenMsg, tokenError ? ['error', tokenError] : null);
    if (errors.serverUrl || errors.team) {
      ui.signinExpanded = true;
      renderSignin();
      (errors.serverUrl ? els.siServer : els.siTeam).focus();
      return false;
    }
    if (tokenError) {
      els.siToken.focus();
      return false;
    }
    return true;
  }

  /** Main checks /api/health on every saveSettings; a server-only save is the one way to probe an address today. */
  /** @param {string} serverUrl */
  async function probeServer(serverUrl) {
    const save = api.saveSettings;
    if (!save) throw new Error('Signing in is not available in this app version.');
    const res = await withTimeout(save({ serverUrl }), CALL_TIMEOUT_MS);
    await adopt(res);
    return status.server;
  }

  /** @param {SubmitEvent | Event} ev */
  async function onSignin(ev) {
    ev.preventDefault();
    if (ui.signingIn) return;
    const v = readSignin();
    if (!validateSignin(v, true)) return;
    ui.signingIn = true;
    signinState = { kind: '', text: 'Checking the server…' };
    renderSignin();
    try {
      // 1. Reach the server first, so a token is never stored for an address that does not answer.
      const server = await probeServer(v.serverUrl);
      if (!server.reachable) {
        ui.signinExpanded = true;
        signinState = { kind: '', text: '' };
        setFieldMessage(els.siServer, els.siServerMsg, ['error', humanize(rawError(server.error ?? '')) || 'The server does not answer.']);
        renderSignin();
        els.siServer.focus();
        return;
      }
      // 2. Save the token and the team.
      const save = /** @type {NonNullable<CollectorApi['saveSettings']>} */ (api.saveSettings);
      await adopt(await withTimeout(save(v), CALL_TIMEOUT_MS), { fillForm: true });
      ui.authGraceUntil = Date.now() + AUTH_GRACE_MS;
      ui.signinReason = '';
      signinState = { kind: 'ok', text: 'Signed in.' };
      renderSignin();
      flash(els.signinCard, 'flash-ok');
      await sleep(reducedMotion.matches ? 0 : 450);
      if (readConsent()) showScreen('app', { tab: 'collect', focusTab: true });
      else showScreen('consent');
    } catch (err) {
      signinState = { kind: 'error', text: `Not signed in. ${humanize(rawError(err))}` };
    } finally {
      ui.signingIn = false;
      renderAll();
    }
  }

  async function onSigninTest() {
    if (ui.testingSignin || ui.signingIn) return;
    const v = readSignin();
    const errors = validate(v);
    if (errors.serverUrl) {
      ui.signinExpanded = true;
      setFieldMessage(els.siServer, els.siServerMsg, ['error', errors.serverUrl]);
      renderSignin();
      els.siServer.focus();
      return;
    }
    ui.testingSignin = true;
    renderSignin();
    try {
      const server = await probeServer(v.serverUrl);
      if (server.reachable) {
        setFieldMessage(els.siServer, els.siServerMsg, ['ok', `Server online at ${hostOf(v.serverUrl)}.`]);
        signinState = { kind: 'ok', text: `Server online at ${hostOf(v.serverUrl)}.` };
      } else {
        ui.signinExpanded = true;
        setFieldMessage(els.siServer, els.siServerMsg, ['error', humanize(rawError(server.error ?? '')) || 'The server does not answer.']);
        signinState = { kind: 'error', text: 'Server unreachable.' };
      }
    } catch (err) {
      signinState = { kind: 'error', text: humanize(rawError(err)) };
    } finally {
      ui.testingSignin = false;
      renderSignin();
    }
  }

  // ---------- consent ----------

  function prepareConsent() {
    els.consentCheck.checked = false;
    const base = status.settings.serverUrl.replace(/\/+$/, '');
    setText(els.consentUrl, `${base || '<server>'}/legal/collector`);
  }

  function renderConsent() {
    const ok = els.consentCheck.checked;
    setDisabled(els.consentContinue, !ok);
    setClass(els.consentLed, ok ? 'led' : 'led led--off');
  }

  async function onConsentContinue() {
    if (!els.consentCheck.checked) {
      els.consentCheck.focus();
      return;
    }
    store.write(CONSENT_KEY, { acceptedAt: new Date().toISOString() });
    flash(els.consentCard, 'flash-ok');
    await sleep(reducedMotion.matches ? 0 : 350);
    showScreen('app', { tab: 'collect', focusTab: true });
  }

  // ---------- connection test (Settings, offline banner) ----------

  async function onCheck() {
    if (checking) return;
    checking = true;
    renderAll();
    try {
      // preload has no health-check call yet. saveSettings({}) keeps the settings as they are and makes main re-run
      // checkServer() (GET /api/health) before it answers, so it doubles as "test connection".
      const call = api.checkServer
        ? api.checkServer()
        : api.saveSettings
          ? api.saveSettings({})
          : api.getStatus();
      await adopt(await withTimeout(call, CALL_TIMEOUT_MS));
    } catch (err) {
      const raw = rawError(err);
      status.server = {
        reachable: false,
        lastCheckAt: new Date().toISOString(),
        error: raw === 'timeout' ? 'The server did not respond within 20 seconds' : raw || 'Connection test failed',
      };
    } finally {
      checking = false;
      renderAll();
      flash(els.pill, 'flash-ok');
    }
  }

  // ---------- toggles and pause ----------

  /** @param {'tracker' | 'meeting'} name @param {boolean} target */
  async function setToggleTo(name, target) {
    const setToggle = api.setToggle;
    if (!setToggle || pendingToggle[name] !== null) return false;
    toggleError[name] = '';
    // Switching meeting notes off ends a running recording first, so no audio is left half-uploaded.
    if (name === 'meeting' && !target && isRecording()) await stopRecording();
    pendingToggle[name] = target;
    renderAll();
    try {
      await adopt(await withTimeout(setToggle(name, target), CALL_TIMEOUT_MS));
      return true;
    } catch (err) {
      toggleError[name] = `Could not turn ${target ? 'on' : 'off'}. ${humanize(rawError(err))}`;
      return false;
    } finally {
      pendingToggle[name] = null;
      renderAll();
    }
  }

  /** @param {'tracker' | 'meeting'} name */
  async function onToggle(name) {
    const el = name === 'tracker' ? els.trackerSwitch : els.meetingSwitch;
    if (isDisabled(el)) return;
    // A manual switch replaces whatever "Resume" would have restored.
    pausedFrom = null;
    store.write(PAUSE_KEY, null);
    await setToggleTo(name, !(name === 'tracker' ? status.settings.trackerEnabled : status.settings.meetingEnabled));
  }

  async function onPauseAll() {
    if (ui.pausing) return;
    ui.pausing = true;
    renderAll();
    try {
      if (anyActive()) {
        pausedFrom = { tracker: status.settings.trackerEnabled, meeting: status.settings.meetingEnabled };
        store.write(PAUSE_KEY, pausedFrom);
        if (isRecording()) await stopRecording();
        if (status.settings.trackerEnabled) await setToggleTo('tracker', false);
        if (status.settings.meetingEnabled) await setToggleTo('meeting', false);
      } else if (pausedFrom) {
        const resume = pausedFrom;
        if (resume.tracker) await setToggleTo('tracker', true);
        if (resume.meeting) await setToggleTo('meeting', true);
        pausedFrom = null;
        store.write(PAUSE_KEY, null);
      }
    } finally {
      ui.pausing = false;
      renderAll();
    }
  }

  async function onHeroStart() {
    if (isDisabled(els.heroStart)) return;
    if (pausedFrom) await onPauseAll();
    else await setToggleTo('tracker', true);
  }

  // ---------- sign out and withdraw consent ----------

  /** @type {HTMLElement | null} */
  let dialogTrigger = null;

  /** @param {'signout' | 'withdraw'} kind */
  function openConfirm(kind) {
    ui.confirm = kind;
    const withdraw = kind === 'withdraw';
    setText(els.confirmTitle, withdraw ? 'Withdraw consent?' : 'Sign out of this computer?');
    setText(
      els.confirmText,
      withdraw
        ? 'Collection stops, your consent is cleared and the access token is removed from this computer.'
        : 'Collection stops and the access token is removed from this computer.',
    );
    setText(els.confirmOk, withdraw ? 'Withdraw consent' : 'Sign out');
    setDisabled(els.confirmOk, false);
    showMessage(els.confirmError, '');
    dialogTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!els.dialog.open) els.dialog.showModal();
    els.confirmCancel.focus();
  }

  async function onConfirm() {
    if (ui.confirmBusy || !ui.confirm) return;
    const withdraw = ui.confirm === 'withdraw';
    ui.confirmBusy = true;
    setDisabled(els.confirmOk, true);
    setText(els.confirmOk, withdraw ? 'Withdrawing…' : 'Signing out…');
    try {
      await signOut(withdraw);
      els.dialog.close();
    } catch (err) {
      showMessage(els.confirmError, `Could not finish. ${humanize(rawError(err))}`);
      setDisabled(els.confirmOk, false);
      setText(els.confirmOk, withdraw ? 'Withdraw consent' : 'Sign out');
    } finally {
      ui.confirmBusy = false;
    }
  }

  /** Stops everything, removes the token, keeps server and team for the next sign in. */
  /** @param {boolean} withdraw */
  async function signOut(withdraw) {
    if (isRecording()) await stopRecording();
    const setToggle = api.setToggle;
    if (setToggle) {
      await adopt(await withTimeout(setToggle('tracker', false), CALL_TIMEOUT_MS));
      await adopt(await withTimeout(setToggle('meeting', false), CALL_TIMEOUT_MS));
    }
    const save = api.saveSettings;
    if (!save) throw new Error('Signing out is not available in this app version.');
    await adopt(await withTimeout(save({ ingestToken: '', trackerEnabled: false, meetingEnabled: false }), CALL_TIMEOUT_MS), {
      fillForm: true,
    });
    if (withdraw) store.write(CONSENT_KEY, null);
    pausedFrom = null;
    store.write(PAUSE_KEY, null);
    ui.signinReason = withdraw ? 'withdrawn' : 'signedout';
    showScreen('signin');
  }

  function onDialogClose() {
    ui.confirm = '';
    if (ui.screen === 'signin') focusSignin();
    else if (dialogTrigger && dialogTrigger.isConnected) dialogTrigger.focus();
    dialogTrigger = null;
  }

  // ---------- settings form ----------

  /** @returns {FormValues} */
  function readForm() {
    return { serverUrl: els.serverUrl.value.trim(), ingestToken: els.token.value.trim(), team: els.team.value.trim() };
  }

  /** @param {Settings} s @returns {FormValues} */
  const formPart = (s) => ({ serverUrl: s.serverUrl.trim(), ingestToken: s.ingestToken.trim(), team: s.team.trim() });

  /** @param {FormValues} a @param {FormValues} b */
  const sameForm = (a, b) => a.serverUrl === b.serverUrl && a.ingestToken === b.ingestToken && a.team === b.team;

  const isDirty = () => !!formSeen && !sameForm(readForm(), formSeen);

  /**
   * Status arrives every 2 s while the tracker runs. The form is refilled only on first load, after a save,
   * or when the settings really changed and the user has no edits of their own.
   * @param {boolean} force
   */
  function syncForm(force) {
    const next = formPart(status.settings);
    if (!force && formSeen && sameForm(next, formSeen)) return;
    const keepEdits = !force && isDirty();
    formSeen = next;
    if (!keepEdits) {
      if (els.serverUrl.value !== next.serverUrl) els.serverUrl.value = next.serverUrl;
      if (els.token.value !== next.ingestToken) els.token.value = next.ingestToken;
      if (els.team.value !== next.team) els.team.value = next.team;
    }
    updateDirtyState();
  }

  /** @param {string} value */
  function isHttpUrl(value) {
    try {
      const u = new URL(value);
      return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname;
    } catch {
      return false;
    }
  }

  /** @param {string} value */
  function plainHttpWarning(value) {
    try {
      const u = new URL(value);
      const local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/.test(u.hostname);
      if (u.protocol === 'http:' && !local) return 'No https: the token would travel unencrypted.';
    } catch {
      /* the error branch reports a broken address */
    }
    return '';
  }

  /** @param {FormValues} v */
  function validate(v) {
    /** @type {{ serverUrl?: string, team?: string }} */
    const errors = {};
    if (!v.serverUrl) errors.serverUrl = 'Enter the server address.';
    else if (!isHttpUrl(v.serverUrl)) errors.serverUrl = 'The address must start with http:// or https://';
    if (!v.team) errors.team = 'Enter a team.';
    return errors;
  }

  /**
   * @param {HTMLInputElement} input
   * @param {HTMLElement} msg
   * @param {['error' | 'warn' | 'ok', string] | null} message
   */
  function setFieldMessage(input, msg, message) {
    const [kind, text] = message ?? ['', msg.dataset.hint ?? ''];
    if (kind === 'error') input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    msg.dataset.kind = kind;
    setText(msg, text);
  }

  /** Hints by default, warnings as you type, errors only after the first save attempt. */
  function refreshFieldMessages() {
    const v = readForm();
    const errors = submitted ? validate(v) : {};
    const httpWarning = plainHttpWarning(v.serverUrl);
    setFieldMessage(
      els.serverUrl,
      els.serverUrlMsg,
      errors.serverUrl ? ['error', errors.serverUrl] : httpWarning ? ['warn', httpWarning] : null,
    );
    setFieldMessage(els.token, els.tokenMsg, formSeen && !v.ingestToken ? ['warn', 'Without a token nothing is accepted.'] : null);
    setFieldMessage(els.team, els.teamMsg, errors.team ? ['error', errors.team] : null);
  }

  function updateDirtyState() {
    if (saving) return;
    if (isDirty()) saveState = { kind: 'dirty', text: 'Unsaved changes' };
    else if (saveState.kind === 'dirty') saveState = { kind: '', text: '' };
    renderSaveState();
  }

  function renderSaveState() {
    els.saveStatus.dataset.kind = saveState.kind;
    setText(els.saveStatus, saveState.text);
    setDisabled(els.saveBtn, saving);
    setText(els.saveBtn, saving ? 'Saving…' : 'Save');
  }

  /** @param {SubmitEvent | Event} ev */
  async function onSubmit(ev) {
    ev.preventDefault();
    if (saving) return;
    submitted = true;
    refreshFieldMessages();
    const values = readForm();
    const errors = validate(values);
    if (errors.serverUrl || errors.team) {
      (errors.serverUrl ? els.serverUrl : els.team).focus();
      return;
    }
    const saveSettings = api.saveSettings;
    if (!saveSettings) {
      saveState = { kind: 'error', text: 'Saving is not available in this app version.' };
      renderSaveState();
      return;
    }
    const tokenChanged = values.ingestToken !== status.settings.ingestToken;
    saving = true;
    saveState = { kind: 'saving', text: 'Saving and testing the connection…' };
    renderSaveState();
    try {
      await adopt(await withTimeout(saveSettings(values), CALL_TIMEOUT_MS), { fillForm: true });
      if (tokenChanged) ui.authGraceUntil = Date.now() + AUTH_GRACE_MS;
      const at = fmtClock(Date.now());
      let text = `Saved at ${at}. Server unreachable for now.`;
      if (!connected) text = `Saved at ${at}, in this preview only.`;
      else if (status.server.reachable) text = `Saved at ${at}. Server online.`;
      saveState = { kind: 'ok', text };
      submitted = false;
    } catch (err) {
      const raw = rawError(err);
      saveState = {
        kind: 'error',
        text: raw === 'timeout' ? 'The app is taking too long. Test the connection again in a minute.' : `Not saved. ${humanize(raw)}`,
      };
    } finally {
      saving = false;
      renderSaveState();
      if (saveState.kind === 'ok') flash(els.saveStatus, 'flash');
      refreshFieldMessages();
      renderAll();
    }
  }

  function onFormInput() {
    if (saveState.kind === 'ok' || saveState.kind === 'error') saveState = { kind: '', text: '' };
    updateDirtyState();
    refreshFieldMessages();
  }

  /** @param {HTMLButtonElement} button @param {HTMLInputElement} input */
  function bindReveal(button, input) {
    button.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      setText(button, show ? 'Hide' : 'Show');
    });
  }

  // ---------- meeting capture ----------

  function onMeetingButton() {
    if (isDisabled(els.meetingBtn)) return;
    if (els.meetingBtn.dataset.action === 'stop') void stopRecording();
    else void startRecording();
  }

  async function startRecording() {
    const startMeeting = api.startMeeting;
    if (capture.phase !== 'idle' || !startMeeting) return;
    capture.phase = 'starting';
    capture.error = '';
    capture.warning = '';
    capture.lastDurationMs = 0;
    renderAll();
    const title = els.meetingName.value.trim() || `Meeting ${shortFmt.format(Date.now())}`;
    try {
      // Audio first: getDisplayMedia needs the click's user activation, and a meeting without audio is useless.
      if (connected) await openAudio();
      const id = await withTimeout(startMeeting(title), CALL_TIMEOUT_MS);
      capture.meetingId = typeof id === 'string' ? id : '';
      if (capture.meetingId) meetingTitles.set(capture.meetingId, title);
      capture.startedAt = Date.now();
      capture.phase = 'recording';
      if (connected) {
        startSegment();
        startMeters();
      }
    } catch (err) {
      closeAudio();
      capture.phase = 'idle';
      capture.error = `Recording did not start. ${mediaErrorText(err)}`;
    }
    renderAll();
  }

  /** @param {{ external?: boolean }} [opts] external: main already ended the meeting */
  async function stopRecording(opts = {}) {
    const stopMeeting = api.stopMeeting;
    if (capture.phase === 'idle') {
      // Orphaned meeting in main (window reloaded mid-meeting): just close it on the server.
      if (!status.meeting.recording || !stopMeeting) return;
      capture.phase = 'stopping';
      renderAll();
      try {
        await adopt(await withTimeout(stopMeeting(), STOP_TIMEOUT_MS));
      } catch (err) {
        capture.error = `The meeting was not closed on the server. ${humanize(rawError(err))}`;
      }
      capture.phase = 'idle';
      renderAll();
      return;
    }
    if (capture.phase !== 'recording') return;
    capture.phase = 'stopping';
    capture.lastDurationMs = Date.now() - capture.startedAt;
    renderAll();
    window.clearTimeout(capture.rotateTimer);
    stopMeters();
    await finishSegment();
    // meeting-end must come after the last chunk is stored, otherwise the tail of the meeting is lost.
    await Promise.allSettled([...capture.uploads]);
    closeAudio();
    if (!opts.external && stopMeeting) {
      try {
        await adopt(await withTimeout(stopMeeting(), STOP_TIMEOUT_MS));
      } catch (err) {
        capture.error = `The meeting was not closed on the server. ${humanize(rawError(err))}`;
      }
    }
    capture.phase = 'idle';
    capture.meetingId = '';
    renderAll();
  }

  /** System audio (Windows loopback, granted by main's setDisplayMediaRequestHandler) plus the microphone, mixed. */
  async function openAudio() {
    const media = navigator.mediaDevices;
    if (!media || typeof MediaRecorder === 'undefined') throw new Error('no-media');
    /** @type {MediaStream | null} */
    let sys = null;
    /** @type {MediaStream | null} */
    let mic = null;
    /** @type {unknown} */
    let sysError = null;
    /** @type {unknown} */
    let micError = null;
    try {
      const display = await media.getDisplayMedia({ video: true, audio: true });
      // Only the audio is needed; main grants the screen because Chromium requires a video source.
      for (const track of display.getVideoTracks()) {
        track.stop();
        display.removeTrack(track);
      }
      if (display.getAudioTracks().length) sys = display;
      else sysError = new Error('no-loopback');
    } catch (err) {
      sysError = err;
    }
    try {
      mic = await media.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    } catch (err) {
      micError = err;
    }
    if (!sys && !mic) throw micError ?? sysError ?? new Error('no-audio');
    // Registered before anything else can throw, so closeAudio() always releases the devices.
    capture.streams = /** @type {MediaStream[]} */ ([sys, mic].filter(Boolean));

    const ctx = new AudioContext();
    capture.ctx = ctx;
    const mix = ctx.createMediaStreamDestination();
    /** @param {MediaStream} stream */
    const tap = (stream) => {
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(mix);
      source.connect(analyser);
      return analyser;
    };
    capture.mixed = mix.stream;
    capture.sysAnalyser = sys ? tap(sys) : null;
    capture.micAnalyser = mic ? tap(mic) : null;
    capture.mime = ['audio/webm;codecs=opus', 'audio/webm'].find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
    for (const stream of capture.streams) {
      for (const track of stream.getAudioTracks()) track.addEventListener('ended', onTrackEnded);
    }
    if (!sys) capture.warning = 'Computer audio unavailable, recording the mic only. Zoom or Teams voices may be missing.';
    else if (!mic) capture.warning = `Mic unavailable, recording computer audio only. ${mediaErrorText(micError)}`;
  }

  function onTrackEnded() {
    if (capture.phase !== 'recording') return;
    const anyLive = capture.streams.some((s) => s.getAudioTracks().some((t) => t.readyState === 'live'));
    if (anyLive) {
      capture.warning = 'One audio source disconnected, recording continues with the other.';
      renderAll();
    } else {
      capture.error = 'The audio source disconnected, recording stopped.';
      void stopRecording();
    }
  }

  function closeAudio() {
    for (const stream of capture.streams) {
      for (const track of stream.getTracks()) {
        track.removeEventListener('ended', onTrackEnded);
        track.stop();
      }
    }
    capture.streams = [];
    capture.sysAnalyser = null;
    capture.micAnalyser = null;
    capture.mixed = null;
    if (capture.ctx) void capture.ctx.close().catch(() => undefined);
    capture.ctx = null;
  }

  /** A fresh MediaRecorder per chunk: only the first blob of a recorder has the webm header. */
  function startSegment() {
    const stream = capture.mixed;
    if (!stream) return;
    /** @type {MediaRecorderOptions} */
    const options = { audioBitsPerSecond: AUDIO_BITS_PER_SECOND };
    if (capture.mime) options.mimeType = capture.mime;
    /** @type {MediaRecorder} */
    let rec;
    try {
      rec = new MediaRecorder(stream, options);
    } catch (err) {
      capture.error = `Audio recording did not start. ${mediaErrorText(err)}`;
      void stopRecording();
      return;
    }
    /** @type {Blob[]} */
    const parts = [];
    const began = Date.now();
    rec.addEventListener('dataavailable', (e) => {
      if (e.data && e.data.size > 0) parts.push(e.data);
    });
    rec.addEventListener('error', () => {
      if (capture.phase !== 'recording') return;
      capture.error = 'Audio recording was interrupted.';
      void stopRecording();
    });
    /** @type {Promise<void>} */
    const done = new Promise((resolve) => {
      rec.addEventListener(
        'stop',
        () => {
          queueUpload(parts, Date.now() - began);
          resolve();
        },
        { once: true },
      );
    });
    rec.start();
    capture.segment = { rec, done };
    capture.rotateTimer = window.setTimeout(rotateSegment, CHUNK_MS);
  }

  function rotateSegment() {
    if (capture.phase !== 'recording') return;
    const previous = capture.segment;
    startSegment(); // the next file starts before the previous one closes, so no audio falls between them
    if (previous && previous.rec.state !== 'inactive') previous.rec.stop();
  }

  async function finishSegment() {
    const segment = capture.segment;
    capture.segment = null;
    if (!segment) return;
    if (segment.rec.state !== 'inactive') segment.rec.stop();
    await Promise.race([segment.done, sleep(3000)]);
  }

  /** @param {Blob[]} parts @param {number} durationMs */
  function queueUpload(parts, durationMs) {
    const push = api.pushAudioChunk;
    if (!push || !parts.length || durationMs < MIN_CHUNK_MS) return;
    const blob = new Blob(parts, { type: 'audio/webm' });
    if (blob.size < MIN_CHUNK_BYTES) return;
    // Main uploads the bytes and reports progress through onStatus / onTranscript. Audio is never written to disk.
    const job = (async () => {
      try {
        await push(await blob.arrayBuffer(), 'audio/webm');
      } catch (err) {
        capture.error = `Chunk not sent. ${humanize(rawError(err))}`;
        renderAll();
      }
    })();
    capture.uploads.add(job);
    void job.finally(() => capture.uploads.delete(job));
  }

  function buildMeters() {
    for (const meter of [els.meterSys, els.meterMic]) {
      const bar = meter.querySelector('.meter__bar');
      if (!bar) continue;
      for (let i = 0; i < METER_SEGMENTS; i += 1) bar.append(document.createElement('i'));
    }
  }

  function startMeters() {
    stopMeters();
    const buffer = new Float32Array(1024);
    const draw = () => {
      if (document.hidden) return;
      drawMeter(els.meterSys, capture.sysAnalyser, buffer);
      drawMeter(els.meterMic, capture.micAnalyser, buffer);
    };
    draw();
    capture.meterTimer = window.setInterval(draw, 100);
  }

  function stopMeters() {
    window.clearInterval(capture.meterTimer);
    capture.meterTimer = undefined;
  }

  /** @param {HTMLElement} meter @param {AnalyserNode | null} analyser @param {Float32Array<ArrayBuffer>} buffer */
  function drawMeter(meter, analyser, buffer) {
    meter.dataset.off = String(!analyser);
    let level = 0;
    if (analyser) {
      analyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) sum += buffer[i] * buffer[i];
      const db = 20 * Math.log10(Math.sqrt(sum / buffer.length) + 1e-9);
      level = Math.min(1, Math.max(0, (db + 60) / 54)); // -60 dB is silence, -6 dB is loud
    }
    const segments = meter.querySelectorAll('.meter__bar i');
    const lit = Math.round(level * segments.length);
    segments.forEach((seg, i) => seg.classList.toggle('on', i < lit));
  }

  // ---------- transcript ----------

  function onTranscriptScroll() {
    const box = els.transcript;
    pinned = box.scrollHeight - box.scrollTop - box.clientHeight < 24;
  }

  /** @param {string} meetingId */
  function groupFor(meetingId) {
    const groups = /** @type {NodeListOf<HTMLElement>} */ (els.transcript.querySelectorAll('.tgroup'));
    const existing = [...groups].find((g) => g.dataset.meeting === meetingId);
    if (existing) return existing;
    const group = document.createElement('div');
    group.className = 'tgroup';
    group.dataset.meeting = meetingId;
    const head = document.createElement('p');
    head.className = 'tgroup__head';
    const title =
      meetingTitles.get(meetingId) ??
      (status.meeting.meetingId === meetingId && status.meeting.title ? status.meeting.title : 'Meeting');
    const startedAt = capture.meetingId === meetingId && capture.startedAt ? capture.startedAt : Date.now();
    head.textContent = `${title} · ${fmtClock(startedAt)}`;
    group.append(head);
    els.transcript.append(group);
    return group;
  }

  /** @param {unknown} raw payload of onTranscript: { meetingId, seq, text } */
  function addTranscript(raw) {
    const payload = asObj(raw);
    const text = asStr(payload.text).trim();
    if (!text) return;
    const meetingId = asStr(payload.meetingId) || 'meeting';
    const seq = Math.max(0, Math.floor(asNum(payload.seq)));
    const key = `${meetingId}#${seq}`;
    let line = lines.get(key);
    if (!line) {
      const group = groupFor(meetingId);
      line = document.createElement('p');
      line.className = 'tline';
      line.dataset.seq = String(seq);
      line.dataset.key = key;
      const at = document.createElement('span');
      at.className = 'tline__at';
      at.textContent = fmtDuration(seq * CHUNK_MS); // chunk start inside the meeting
      const body = document.createElement('span');
      body.className = 'tline__text';
      line.append(at, body);
      // Chunks are uploaded in parallel; keep them in meeting order even if a later one is transcribed first.
      const later = [.../** @type {NodeListOf<HTMLElement>} */ (group.querySelectorAll('.tline'))].find(
        (n) => Number(n.dataset.seq) > seq,
      );
      group.insertBefore(line, later ?? null);
      lines.set(key, line);
      trimTranscript();
    }
    const body = line.querySelector('.tline__text');
    if (body) body.textContent = text;
    renderTranscriptTools();
    if (pinned) els.transcript.scrollTop = els.transcript.scrollHeight;
  }

  function trimTranscript() {
    while (lines.size > MAX_LINES) {
      const first = /** @type {HTMLElement | null} */ (els.transcript.querySelector('.tline'));
      if (!first) break;
      const group = first.parentElement;
      lines.delete(first.dataset.key ?? '');
      first.remove();
      if (group && !group.querySelector('.tline')) group.remove();
    }
  }

  function transcriptPlainText() {
    const groups = /** @type {NodeListOf<HTMLElement>} */ (els.transcript.querySelectorAll('.tgroup'));
    return [...groups]
      .map((group) => {
        const head = group.querySelector('.tgroup__head')?.textContent ?? '';
        const rows = [...group.querySelectorAll('.tline')].map(
          (l) => `[${l.querySelector('.tline__at')?.textContent ?? ''}] ${l.querySelector('.tline__text')?.textContent ?? ''}`,
        );
        return [head, ...rows].join('\n');
      })
      .join('\n\n');
  }

  /** @param {HTMLButtonElement} btn @param {string} text */
  function flashLabel(btn, text) {
    const original = btn.dataset.label ?? btn.textContent?.trim() ?? '';
    btn.dataset.label = original;
    btn.textContent = text;
    window.setTimeout(() => {
      btn.textContent = original;
    }, 1600);
  }

  async function copyTranscript() {
    if (isDisabled(els.copyBtn)) return;
    const text = transcriptPlainText();
    if (!text) return;
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      ok = legacyCopy(text);
    }
    flashLabel(els.copyBtn, ok ? 'Copied' : 'Copy failed');
  }

  /** @param {string} text */
  function legacyCopy(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.className = 'vh';
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }

  function clearTranscript() {
    if (isDisabled(els.clearBtn)) return;
    for (const group of [...els.transcript.querySelectorAll('.tgroup')]) group.remove();
    lines.clear();
    pinned = true;
    renderTranscriptTools();
    els.transcript.focus();
  }

  function goToMeetingNotes() {
    selectTab('collect');
    els.meetingCard.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    (els.meetingName.disabled ? els.meetingSwitch : els.meetingName).focus({ preventScroll: true });
  }

  // ---------- sample mode (no window.collector) ----------

  /** Local stand-in with the preload's shape: moving counters and a scripted meeting. Never touches the network. */
  /** @returns {CollectorApi} */
  function createSampleApi() {
    /** @type {Set<(s: unknown) => void>} */
    const statusListeners = new Set();
    /** @type {Set<(t: unknown) => void>} */
    const transcriptListeners = new Set();
    const now = Date.now();
    /** @type {Status} */
    const sample = {
      settings: {
        serverUrl: 'https://taskforge-app-chi.vercel.app',
        ingestToken: 'demo-ingest-token',
        team: 'Sales',
        trackerEnabled: true,
        meetingEnabled: true,
      },
      tracker: {
        running: true,
        eventsSent: 1284,
        eventsPending: 9,
        lastSentAt: new Date(now - 12_000).toISOString(),
        currentApp: 'Spreadsheet',
      },
      meeting: { recording: false, chunksSent: 0, transcriptLength: 0 },
      // Simulated: the preview has no server, it only shows how a healthy connection looks.
      server: { reachable: true, lastCheckAt: new Date(now).toISOString() },
    };
    const apps = ['Spreadsheet', 'CRM', 'Spreadsheet', 'Email', 'CRM', 'Messenger', 'Browser', 'Docs'];
    const snapshot = () => /** @type {Status} */ (JSON.parse(JSON.stringify(sample)));
    const emit = () => statusListeners.forEach((cb) => cb(snapshot()));

    let tick = 0;
    window.setInterval(() => {
      if (!sample.settings.trackerEnabled) return;
      tick += 1;
      sample.tracker.eventsPending += 1 + (tick % 3);
      if (tick % 2 === 0) sample.tracker.currentApp = apps[(tick / 2) % apps.length];
      if (tick % 15 === 0) {
        sample.tracker.eventsSent += sample.tracker.eventsPending;
        sample.tracker.eventsPending = 0;
        sample.tracker.lastSentAt = new Date().toISOString();
      }
      emit();
    }, 2000);

    /** @type {number | undefined} */
    let meetingTimer;
    return {
      getStatus: async () => snapshot(),
      setToggle: async (name, on) => {
        await sleep(250);
        if (name === 'tracker') {
          sample.settings.trackerEnabled = on;
          sample.tracker.running = on;
          if (!on) sample.tracker.currentApp = undefined;
        } else {
          sample.settings.meetingEnabled = on;
        }
        emit();
        return snapshot();
      },
      saveSettings: async (patch) => {
        await sleep(500);
        Object.assign(sample.settings, patch);
        if (patch.trackerEnabled === false) {
          sample.tracker.running = false;
          sample.tracker.currentApp = undefined;
        }
        sample.server = { reachable: isHttpUrl(sample.settings.serverUrl), lastCheckAt: new Date().toISOString() };
        emit();
        return snapshot();
      },
      startMeeting: async (title) => {
        await sleep(300);
        const meetingId = `sample-${Date.now().toString(36)}`;
        sample.meeting = { recording: true, meetingId, title, chunksSent: 0, transcriptLength: 0 };
        let seq = 0;
        meetingTimer = window.setInterval(() => {
          const text = SAMPLE_SCRIPT[seq % SAMPLE_SCRIPT.length];
          sample.meeting.chunksSent += 1;
          sample.meeting.transcriptLength += text.length + 1;
          transcriptListeners.forEach((cb) => cb({ meetingId, seq, text }));
          seq += 1;
          emit();
        }, 4000);
        emit();
        return meetingId;
      },
      stopMeeting: async () => {
        window.clearInterval(meetingTimer);
        await sleep(400);
        sample.meeting.recording = false;
        emit();
        return snapshot();
      },
      pushAudioChunk: async () => snapshot().meeting,
      onStatus: (cb) => {
        statusListeners.add(cb);
        return () => statusListeners.delete(cb);
      },
      onTranscript: (cb) => {
        transcriptListeners.add(cb);
        return () => transcriptListeners.delete(cb);
      },
    };
  }

  /** Fills the browser preview so every screen has something real-looking to show. */
  function seedPreview() {
    if (connected) return;
    if (previewScreen !== 'consent') {
      store.write(CONSENT_KEY, { acceptedAt: new Date(Date.now() - 2 * 86_400_000).toISOString() });
    }
    today.count = 1284;
    if (previewScreen === 'transcript') {
      meetingTitles.set('preview', 'Sales weekly sync');
      SAMPLE_SCRIPT.forEach((text, seq) => addTranscript({ meetingId: 'preview', seq, text }));
    }
  }

  // ---------- start ----------

  /** Google Fonts are added from here so an offline start is not blocked by a render-blocking stylesheet. */
  function loadFonts() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS_URL;
    link.referrerPolicy = 'no-referrer';
    document.head.append(link);
  }

  function routeAfterLoad() {
    if (connected) return routeFromStatus();
    switch (previewScreen) {
      case 'signin':
        return showScreen('signin');
      case 'consent':
        return showScreen('consent');
      case 'transcript':
      case 'privacy':
      case 'settings':
        return showScreen('app', { tab: previewScreen });
      case 'signout':
        showScreen('app', { tab: 'settings' });
        return openConfirm('signout');
      default:
        return showScreen('app', { tab: 'collect' });
    }
  }

  /** Preview: a plausible last batch, anchored to the sample status so later sample batches continue from it. */
  function seedPreviewBatch() {
    if (connected || !status.tracker.lastSentAt) return;
    tally.last = {
      at: status.tracker.lastSentAt,
      events: 31,
      secs: new Map([
        ['Spreadsheet', 14],
        ['CRM', 9],
        ['Email', 5],
        ['Messenger', 2],
      ]),
    };
    tally.lastSentAt = status.tracker.lastSentAt;
    tally.lastEventsSent = status.tracker.eventsSent;
    tally.version += 1;
  }

  async function loadStatus() {
    els.loadingError.hidden = true;
    els.loadingRetry.hidden = true;
    els.loadingText.hidden = false;
    try {
      applyStatus(normalize(await withTimeout(api.getStatus(), CALL_TIMEOUT_MS)), { fillForm: true });
      seedPreviewBatch();
      routeAfterLoad();
    } catch (err) {
      loaded = true;
      loadError = humanize(rawError(err)) || 'Could not read the app status.';
      els.loadingText.hidden = true;
      showMessage(els.loadingError, `The Collector app did not answer. ${loadError}`);
      els.loadingRetry.hidden = false;
    }
  }

  function init() {
    loadFonts();
    buildMeters();
    setText(els.appVersion, APP_VERSION);
    for (const msg of [els.serverUrlMsg, els.tokenMsg, els.teamMsg, els.siServerMsg, els.siTeamMsg, els.siTokenMsg]) {
      msg.dataset.hint = msg.textContent?.trim() ?? '';
    }
    const savedToday = asObj(store.read(TODAY_KEY));
    if (savedToday.day === today.day) today.count = asNum(savedToday.count);
    const savedPause = asObj(store.read(PAUSE_KEY));
    if ('tracker' in savedPause) pausedFrom = { tracker: savedPause.tracker === true, meeting: savedPause.meeting === true };
    seedPreview();

    els.loadingRetry.addEventListener('click', () => void loadStatus());

    els.signinForm.addEventListener('submit', (e) => void onSignin(e));
    els.signinTest.addEventListener('click', () => void onSigninTest());
    els.signinChange.addEventListener('click', () => {
      ui.signinExpanded = true;
      renderSignin();
      els.siServer.focus();
    });
    els.siToken.addEventListener('input', () => {
      if (ui.signinReason === 'rejected') ui.signinReason = '';
      setFieldMessage(els.siToken, els.siTokenMsg, null);
    });
    bindReveal(els.siTokenToggle, els.siToken);

    els.consentCheck.addEventListener('change', renderConsent);
    els.consentContinue.addEventListener('click', () => void onConsentContinue());
    els.consentBack.addEventListener('click', () => showScreen('signin'));

    for (const t of TABS) els.tabs[t].addEventListener('click', () => selectTab(t));
    els.tablist.addEventListener('keydown', onTabKey);
    els.pauseBtn.addEventListener('click', () => {
      if (!isDisabled(els.pauseBtn)) void onPauseAll();
    });
    els.offlineRetry.addEventListener('click', () => void onCheck());
    els.tokenSignin.addEventListener('click', () => {
      ui.signinReason = 'rejected';
      showScreen('signin');
    });

    els.heroStart.addEventListener('click', () => void onHeroStart());
    els.trackerSwitch.addEventListener('click', () => void onToggle('tracker'));
    els.meetingSwitch.addEventListener('click', () => void onToggle('meeting'));
    els.meetingBtn.addEventListener('click', onMeetingButton);

    els.transcript.addEventListener('scroll', onTranscriptScroll, { passive: true });
    els.copyBtn.addEventListener('click', () => void copyTranscript());
    els.clearBtn.addEventListener('click', clearTranscript);
    els.transcriptEmptyBtn.addEventListener('click', goToMeetingNotes);

    els.deletionBtn.addEventListener('click', () => {
      const open = els.deletionInfo.hidden;
      els.deletionInfo.hidden = !open;
      els.deletionBtn.setAttribute('aria-expanded', String(open));
    });
    els.withdrawBtn.addEventListener('click', () => openConfirm('withdraw'));

    els.form.addEventListener('submit', (e) => void onSubmit(e));
    els.form.addEventListener('input', onFormInput);
    els.checkBtn.addEventListener('click', () => {
      if (!isDisabled(els.checkBtn)) void onCheck();
    });
    bindReveal(els.tokenToggle, els.token);
    els.signoutBtn.addEventListener('click', () => openConfirm('signout'));

    els.confirmCancel.addEventListener('click', () => {
      if (!ui.confirmBusy) els.dialog.close();
    });
    els.confirmOk.addEventListener('click', () => void onConfirm());
    els.dialog.addEventListener('cancel', (e) => {
      if (ui.confirmBusy) e.preventDefault();
    });
    els.dialog.addEventListener('close', onDialogClose);

    if (api.onStatus) {
      api.onStatus((next) => {
        if (looksLikeStatus(next)) applyStatus(normalize(next));
      });
    }
    if (api.onTranscript) api.onTranscript(addTranscript);

    renderSaveState();
    void loadStatus();
    // Relative times ("12 s ago"), the recording clock and the auth grace period.
    window.setInterval(renderAll, 1000);
  }

  init();
})();
