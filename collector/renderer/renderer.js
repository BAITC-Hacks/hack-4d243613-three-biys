// @ts-check
// КӨПІР Collector window (owner: B). Plain browser JS: no framework, no build step, no Node APIs.
// Talks only to window.collector from ../src/preload.ts (contextIsolation: true).
// Opened without that bridge (for example straight in a browser), it runs on local sample data and sends nothing.
'use strict';

/**
 * Shapes mirror collector/src/main.ts (CollectorStatus), settings.ts, tracker.ts and meeting.ts.
 * @typedef {{ serverUrl: string, ingestToken: string, team: string, trackerEnabled: boolean, meetingEnabled: boolean }} Settings
 * @typedef {{ running: boolean, eventsSent: number, eventsPending: number, lastSentAt?: string, lastError?: string, currentApp?: string }} TrackerStats
 * @typedef {{ recording: boolean, meetingId?: string, title?: string, chunksSent: number, transcriptLength: number, lastError?: string }} MeetingStats
 * @typedef {{ reachable: boolean, lastCheckAt?: string, error?: string }} ServerState
 * @typedef {{ settings: Settings, tracker: TrackerStats, meeting: MeetingStats, server: ServerState }} Status
 * @typedef {{ serverUrl: string, ingestToken: string, team: string }} FormValues
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
  const MAX_LINES = 400;
  const METER_SEGMENTS = 12;
  const FONTS_URL =
    'https://fonts.googleapis.com/css2?family=Tektur:wght@800&family=Rubik:wght@400;500;600;700;800&display=swap';
  /** en-GB: 24-hour clock ("15:42:10") and "1,284" grouping. */
  const LOCALE = 'en-GB';
  const EMPTY_TRANSCRIPT = 'Text appears here while recording: the server sends a transcript every 30 seconds.';

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

  const els = {
    checkBtn: /** @type {HTMLButtonElement} */ ($('check-btn')),
    conn: $('conn'),
    connLed: $('conn-led'),
    connTitle: $('conn-title'),
    connDetail: $('conn-detail'),
    banner: $('bridge-banner'),

    trackerCard: $('tracker-card'),
    trackerSwitch: /** @type {HTMLButtonElement} */ ($('tracker-switch')),
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
    meetingSwitch: /** @type {HTMLButtonElement} */ ($('meeting-switch')),
    meetingLed: $('meeting-led'),
    meetingLive: $('meeting-live'),
    meetingName: /** @type {HTMLInputElement} */ ($('meeting-name')),
    meetingBtn: /** @type {HTMLButtonElement} */ ($('meeting-btn')),
    meetingBtnIcon: $('meeting-btn-icon'),
    meetingBtnLabel: $('meeting-btn-label'),
    meetingNote: $('meeting-note'),
    meters: $('meters'),
    meterSys: $('meter-sys'),
    meterMic: $('meter-mic'),
    meetingDuration: $('meeting-duration'),
    meetingDurationSub: $('meeting-duration-sub'),
    meetingChunks: $('meeting-chunks'),
    meetingChunksSub: $('meeting-chunks-sub'),
    meetingText: $('meeting-text'),
    meetingTextSub: $('meeting-text-sub'),
    meetingWarning: $('meeting-warning'),
    meetingError: $('meeting-error'),

    form: /** @type {HTMLFormElement} */ ($('settings-form')),
    serverUrl: /** @type {HTMLInputElement} */ ($('server-url')),
    serverUrlMsg: $('server-url-msg'),
    token: /** @type {HTMLInputElement} */ ($('ingest-token')),
    tokenMsg: $('ingest-token-msg'),
    tokenToggle: /** @type {HTMLButtonElement} */ ($('token-toggle')),
    team: /** @type {HTMLInputElement} */ ($('team')),
    teamMsg: $('team-msg'),
    saveBtn: /** @type {HTMLButtonElement} */ ($('save-btn')),
    saveStatus: $('save-status'),

    transcript: $('transcript'),
    transcriptEmpty: $('transcript-empty'),
    copyBtn: /** @type {HTMLButtonElement} */ ($('copy-btn')),
    clearBtn: /** @type {HTMLButtonElement} */ ($('clear-btn')),
  };

  // ---------- formatting ----------

  const numberFmt = new Intl.NumberFormat(LOCALE);
  const clockFmt = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const shortFmt = new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const pluralRules = new Intl.PluralRules(LOCALE);

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
    if (/INGEST_TOKEN|UNAUTHORI[SZ]ED|\b401\b/i.test(raw)) {
      return 'The server rejected the ingest token. Check the token under Connection.';
    }
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET|getaddrinfo|network|Failed to fetch/i.test(raw)) {
      return 'Server unreachable. Check the address and the internet connection.';
    }
    if (/Invalid URL|Failed to parse URL/i.test(raw)) return 'Invalid server address.';
    if (/Unexpected token|not valid JSON|JSON/i.test(raw)) return 'Unexpected response from the server. Check the server address.';
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

  // ---------- bridge ----------

  const bridge = /** @type {Partial<CollectorApi> | undefined} */ (/** @type {any} */ (window).collector);
  const connected = !!bridge && typeof bridge.getStatus === 'function';
  /** @type {CollectorApi} */
  const api = connected ? /** @type {CollectorApi} */ (bridge) : createSampleApi();

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

  // ---------- rendering ----------

  function renderAll() {
    renderConnection();
    renderTracker();
    renderMeeting();
    renderTranscriptTools();
  }

  function renderConnection() {
    const { server, settings, tracker, meeting } = status;
    const host = settings.serverUrl ? hostOf(settings.serverUrl) : 'no address set';
    const checkedAt = toTime(server.lastCheckAt);
    /** @type {'ok' | 'down' | 'checking'} */
    let state = 'down';
    let title = '';
    let detail = '';
    if (!connected) {
      title = 'App not connected';
      detail = 'showing sample data';
    } else if (loadError) {
      title = 'No response from the app';
      detail = loadError;
    } else if (checking || !loaded || !checkedAt) {
      // main.ts checks /api/health right after launch; until then there is nothing honest to show.
      state = 'checking';
      title = 'Checking connection…';
      detail = host;
    } else if (server.reachable) {
      state = 'ok';
      title = 'Server online';
      const rejected = /INGEST_TOKEN|UNAUTHORI[SZ]ED|\b401\b/i.test(`${tracker.lastError ?? ''} ${meeting.lastError ?? ''}`);
      const tokenNote = !settings.ingestToken ? 'no token set' : rejected ? 'token rejected' : '';
      detail = [host, tokenNote || `checked ${fmtClock(checkedAt)}`].join(' · ');
    } else {
      title = 'Server offline';
      const reason = server.error ? humanize(rawError(server.error)) : 'The server returned an error. Check the address.';
      detail = `${host} · ${reason}`;
    }
    setData(els.conn, 'state', state);
    setClass(els.connLed, state === 'ok' ? 'led' : 'led led--off');
    setText(els.connTitle, title);
    setText(els.connDetail, detail);
    const tip = server.error ? rawError(server.error) : '';
    if (els.connDetail.title !== tip) els.connDetail.title = tip;
    setDisabled(els.checkBtn, checking);
    setText(els.checkBtn, checking ? 'Testing…' : 'Test connection');
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

    let live = 'Off. Nothing is collected.';
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

    setText(els.trackerSent, fmtNum(t.eventsSent));
    setText(els.trackerSentSub, `${plural(t.eventsSent, 'event', 'events')} since launch`);
    setText(els.trackerPending, fmtNum(t.eventsPending));
    const last = toTime(t.lastSentAt);
    setText(els.trackerLast, last ? fmtClock(last) : 'none yet');
    els.trackerLast.classList.toggle('stat__value--muted', !last);
    setText(els.trackerLastSub, last ? fmtAgo(last) : 'every 30 s');

    let error = toggleError.tracker;
    if (!error && t.lastError) {
      const queued = t.eventsPending ? ' Events stay queued and go out with the next batch.' : '';
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

    let ledClass = 'led led--off';
    let live = 'Not recording';
    if (phase === 'starting') live = 'Connecting audio…';
    else if (phase === 'recording') {
      ledClass = 'led led--rec';
      live = m.title ? `Recording: “${m.title}”` : 'Recording';
    } else if (phase === 'stopping') {
      ledClass = 'led led--rec';
      live = 'Finishing: sending the last chunk…';
    } else if (orphan) {
      ledClass = 'led led--warn';
      live = 'Meeting still open, audio is no longer recorded';
    }
    setClass(els.meetingLed, ledClass);
    setText(els.meetingLive, live);

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
    else if (active) label = 'Stop';
    setText(els.meetingBtnLabel, label);
    setDisabled(btn, btnDisabled);
    els.meetingName.disabled = phase !== 'idle' || orphan || !enabled;

    let note = 'Tell participants before you record.';
    if (!hasApi) note = 'Meeting notes are not available in this app version.';
    else if (!enabled && !active) note = 'Turn on the switch to record meetings.';
    else if (phase === 'recording') note = 'You can close the window: recording continues in the tray. Text arrives every 30 s.';
    setText(els.meetingNote, note);

    els.meters.hidden = !(connected && phase === 'recording');

    setText(els.meetingDuration, fmtDuration(elapsed));
    setText(els.meetingDurationSub, phase === 'recording' ? 'recording' : elapsed ? 'last recording' : 'no recording yet');
    setText(els.meetingChunks, fmtNum(m.chunksSent));
    setText(els.meetingChunksSub, `${plural(m.chunksSent, 'chunk', 'chunks')} of 30 s`);
    setText(els.meetingText, fmtNum(m.transcriptLength));
    setText(els.meetingTextSub, plural(m.transcriptLength, 'character', 'characters'));

    showMessage(els.meetingWarning, capture.warning);
    const error = toggleError.meeting || capture.error || (m.lastError ? `Server error. ${humanize(rawError(m.lastError))}` : '');
    showMessage(els.meetingError, error, m.lastError ?? '');
  }

  function renderTranscriptTools() {
    setDisabled(els.copyBtn, lines.size === 0);
    setDisabled(els.clearBtn, lines.size === 0);
    els.transcriptEmpty.hidden = lines.size > 0;
    setText(els.transcriptEmpty, api.onTranscript ? EMPTY_TRANSCRIPT : 'Transcripts are not available in this app version.');
  }

  function flashConnection() {
    els.conn.classList.remove('conn--flash');
    void els.conn.offsetWidth; // restart the animation
    els.conn.classList.add('conn--flash');
  }

  /** @param {Status} next @param {{ fillForm?: boolean }} [opts] */
  function applyStatus(next, opts = {}) {
    status = next;
    loaded = true;
    loadError = '';
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

  // ---------- connection test ----------

  async function onCheck() {
    if (checking) return;
    checking = true;
    renderConnection();
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
      flashConnection();
    }
  }

  // ---------- toggles ----------

  /** @param {'tracker' | 'meeting'} name */
  async function onToggle(name) {
    const el = name === 'tracker' ? els.trackerSwitch : els.meetingSwitch;
    const setToggle = api.setToggle;
    if (isDisabled(el) || pendingToggle[name] !== null || !setToggle) return;
    const target = !(name === 'tracker' ? status.settings.trackerEnabled : status.settings.meetingEnabled);
    toggleError[name] = '';
    // Switching meeting notes off ends a running recording first, so no audio is left half-uploaded.
    if (name === 'meeting' && !target && capture.phase === 'recording') await stopRecording();
    pendingToggle[name] = target;
    renderAll();
    try {
      await adopt(await withTimeout(setToggle(name, target), CALL_TIMEOUT_MS));
    } catch (err) {
      toggleError[name] = `Could not turn ${target ? 'on' : 'off'}. ${humanize(rawError(err))}`;
    } finally {
      pendingToggle[name] = null;
      renderAll();
    }
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
   * @param {['error' | 'warn', string] | null} message
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
    setFieldMessage(
      els.token,
      els.tokenMsg,
      formSeen && !v.ingestToken ? ['warn', 'Without a token the server rejects events and recordings.'] : null,
    );
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
    saving = true;
    saveState = { kind: 'saving', text: 'Saving and testing the connection…' };
    renderSaveState();
    try {
      await adopt(await withTimeout(saveSettings(values), CALL_TIMEOUT_MS), { fillForm: true });
      const at = fmtClock(Date.now());
      let text = `Saved at ${at}. Server unreachable for now.`;
      if (!connected) text = `Saved at ${at}, in this window only.`;
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
      refreshFieldMessages();
      renderAll();
    }
  }

  function onFormInput() {
    if (saveState.kind === 'ok' || saveState.kind === 'error') saveState = { kind: '', text: '' };
    updateDirtyState();
    refreshFieldMessages();
  }

  function toggleTokenVisibility() {
    const show = els.token.type === 'password';
    els.token.type = show ? 'text' : 'password';
    setText(els.tokenToggle, show ? 'Hide' : 'Show');
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
    renderMeeting();
    const title = els.meetingName.value.trim() || `Meeting ${shortFmt.format(Date.now())}`;
    try {
      // Audio first: getDisplayMedia needs the click's user activation, and a meeting without audio is useless.
      if (connected) await openAudio();
      const id = await withTimeout(startMeeting(title), CALL_TIMEOUT_MS);
      capture.meetingId = typeof id === 'string' ? id : '';
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
      renderMeeting();
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
    renderMeeting();
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
    if (!sys) {
      capture.warning =
        'Computer audio is unavailable, recording the microphone only. Voices from Zoom or Teams may be missing.';
    } else if (!mic) {
      capture.warning = `Microphone unavailable, recording computer audio only. ${mediaErrorText(micError)}`;
    }
  }

  function onTrackEnded() {
    if (capture.phase !== 'recording') return;
    const anyLive = capture.streams.some((s) => s.getAudioTracks().some((t) => t.readyState === 'live'));
    if (anyLive) {
      capture.warning = 'One audio source disconnected, recording continues with the other.';
      renderMeeting();
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
        renderMeeting();
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

  /** Transcript lines by "meetingId#seq". @type {Map<string, HTMLElement>} */
  const lines = new Map();
  /** Follow new lines until the user scrolls up to read. */
  let pinned = true;

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
    const title = status.meeting.meetingId === meetingId && status.meeting.title ? status.meeting.title : 'Meeting';
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
        serverUrl: 'https://taskforge-roan.vercel.app',
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
      server: { reachable: false, lastCheckAt: new Date(now).toISOString() },
    };
    // Speakers are roles, never names: the same rule the real meeting notes follow.
    const script = [
      'Head of sales: dealer orders arrive as Excel files and we retype them into the CRM by hand.',
      'Manager: one order takes about ten minutes, and we get around forty a day.',
      'Finance: the manual entry leaves duplicate orders in our reports.',
      'Head of sales: we need a spreadsheet import into the CRM with a duplicate check.',
      'CEO: let us describe this as a task for students and publish it to the catalog.',
    ];
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
        sample.server.lastCheckAt = new Date().toISOString();
        emit();
        return snapshot();
      },
      startMeeting: async (title) => {
        await sleep(300);
        const meetingId = `sample-${Date.now().toString(36)}`;
        sample.meeting = { recording: true, meetingId, title, chunksSent: 0, transcriptLength: 0 };
        let seq = 0;
        meetingTimer = window.setInterval(() => {
          const text = script[seq % script.length];
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

  // ---------- start ----------

  /** Google Fonts are added from here so an offline start is not blocked by a render-blocking stylesheet. */
  function loadFonts() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS_URL;
    link.referrerPolicy = 'no-referrer';
    document.head.append(link);
  }

  async function loadStatus() {
    try {
      applyStatus(normalize(await withTimeout(api.getStatus(), CALL_TIMEOUT_MS)), { fillForm: true });
    } catch (err) {
      loaded = true;
      loadError = humanize(rawError(err)) || 'Could not read the app status.';
      renderAll();
    }
  }

  function init() {
    loadFonts();
    buildMeters();
    for (const msg of [els.serverUrlMsg, els.tokenMsg, els.teamMsg]) msg.dataset.hint = msg.textContent?.trim() ?? '';
    els.banner.hidden = connected;

    els.checkBtn.addEventListener('click', () => void onCheck());
    els.trackerSwitch.addEventListener('click', () => void onToggle('tracker'));
    els.meetingSwitch.addEventListener('click', () => void onToggle('meeting'));
    els.meetingBtn.addEventListener('click', onMeetingButton);
    els.form.addEventListener('submit', (e) => void onSubmit(e));
    els.form.addEventListener('input', onFormInput);
    els.tokenToggle.addEventListener('click', toggleTokenVisibility);
    els.transcript.addEventListener('scroll', onTranscriptScroll, { passive: true });
    els.copyBtn.addEventListener('click', () => void copyTranscript());
    els.clearBtn.addEventListener('click', clearTranscript);

    if (api.onStatus) {
      api.onStatus((next) => {
        if (looksLikeStatus(next)) applyStatus(normalize(next));
      });
    }
    if (api.onTranscript) api.onTranscript(addTranscript);

    renderAll();
    renderSaveState();
    void loadStatus();
    // Relative times ("12 s ago") and the recording clock.
    window.setInterval(renderAll, 1000);
  }

  init();
})();
