// TaskForge Collector — Electron main process (tray + window + IPC). Owner: A.
// H1 skeleton: tray, window, settings, IPC stubs. tracker.ts / meeting.ts land in H3–H4. (Telegram: roadmap only.)
import { app, BrowserWindow, ipcMain, Menu, session, Tray, nativeImage } from 'electron';
import path from 'node:path';
import { loadSettings, saveSettings, type CollectorSettings } from './settings';
import { Tracker, type TrackerStats } from './tracker';
import { MeetingUploader, type MeetingStats } from './meeting';

export interface CollectorStatus {
  settings: CollectorSettings;
  tracker: TrackerStats;
  meeting: MeetingStats;
  server: { reachable: boolean; lastCheckAt?: string; error?: string };
}

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let settings = loadSettings();
const status: CollectorStatus = {
  settings,
  tracker: { running: false, eventsSent: 0, eventsPending: 0 },
  meeting: { recording: false, chunksSent: 0, transcriptLength: 0 },
  server: { reachable: false },
};

const tracker = new Tracker(
  { serverUrl: settings.serverUrl, ingestToken: settings.ingestToken, team: settings.team },
  (t) => { status.tracker = t; emitStatus(); },
);

const meeting = new MeetingUploader(
  { serverUrl: settings.serverUrl, ingestToken: settings.ingestToken, team: settings.team },
  (m) => { status.meeting = m; emitStatus(); },
  (t) => emitTranscript(t),
);

async function applyToggles() {
  const cfg = { serverUrl: settings.serverUrl, ingestToken: settings.ingestToken, team: settings.team };
  tracker.updateConfig(cfg);
  meeting.updateConfig(cfg);
  if (settings.trackerEnabled) await tracker.start(); else await tracker.stop();
  // Autostart with Windows only while the tracker is enabled (opt-in).
  if (process.platform === 'win32') app.setLoginItemSettings({ openAtLogin: settings.trackerEnabled, args: ['--hidden'] });
}

// Brand icons (B): collector/renderer/assets. Tray LED: lime = collecting, red = recording, grey = paused.
const asset = (f: string) => path.join(__dirname, '..', 'renderer', 'assets', f);
let trayIcon = '';

function updateTrayIcon() {
  const file = status.meeting.recording ? 'tray-recording.png' : status.tracker.running ? 'tray.png' : 'tray-paused.png';
  if (!tray || file === trayIcon) return;
  trayIcon = file;
  tray.setImage(nativeImage.createFromPath(asset(file)));
}

function emitStatus() {
  status.settings = settings;
  updateTrayIcon();
  win?.webContents.send('collector:status', status);
}

export function emitTranscript(payload: { meetingId: string; seq: number; text: string }) {
  win?.webContents.send('collector:transcript', payload);
}

function createWindow() {
  win = new BrowserWindow({
    width: 520,
    height: 640,
    show: false,
    icon: asset('icon.ico'),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.on('close', (e: { preventDefault: () => void }) => { e.preventDefault(); win?.hide(); }); // stay in tray
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(asset('tray-paused.png')));
  trayIcon = 'tray-paused.png';
  tray.setToolTip('Көпір Collector');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open', click: () => win?.show() },
    { label: 'Quit', click: () => { win?.removeAllListeners('close'); app.quit(); } },
  ]));
  tray.on('click', () => win?.show());
}

async function checkServer() {
  try {
    const res = await fetch(`${settings.serverUrl.replace(/\/$/, '')}/api/health`);
    status.server = { reachable: res.ok, lastCheckAt: new Date().toISOString() };
  } catch (e) {
    status.server = { reachable: false, lastCheckAt: new Date().toISOString(), error: String(e) };
  }
  emitStatus();
}

ipcMain.handle('collector:getStatus', () => status);
ipcMain.handle('collector:setToggle', async (_e: unknown, name: 'tracker' | 'meeting', on: boolean) => {
  if (name === 'tracker') settings.trackerEnabled = on;
  if (name === 'meeting') settings.meetingEnabled = on; // TODO(H4): meeting recorder
  saveSettings(settings);
  await applyToggles();
  emitStatus();
  return status;
});
ipcMain.handle('collector:saveSettings', async (_e: unknown, s: Partial<CollectorSettings>) => {
  settings = { ...settings, ...s };
  saveSettings(settings);
  await applyToggles();
  await checkServer();
  return status;
});

// Meeting notes: renderer calls getDisplayMedia({ audio: true }); we grant the whole screen with system-audio loopback
// (Windows). Video track is stopped by the renderer immediately — only audio is recorded.
ipcMain.handle('collector:startMeeting', (_e: unknown, title: string) => { const id = meeting.start(title); emitStatus(); return id; });
ipcMain.handle('collector:stopMeeting', async () => { await meeting.stop(); emitStatus(); return status; });
ipcMain.handle('collector:pushAudioChunk', async (_e: unknown, bytes: ArrayBuffer, mime?: string) => { await meeting.pushChunk(bytes, mime); return status.meeting; });

app.whenReady().then(async () => {
  session.defaultSession.setDisplayMediaRequestHandler((_req, callback) => {
    void (async () => {
      const { desktopCapturer } = await import('electron');
      const sources = await desktopCapturer.getSources({ types: ['screen'] });
      callback({ video: sources[0], audio: 'loopback' });
    })();
  });
  createWindow();
  createTray();
  if (!process.argv.includes('--hidden')) win?.show();
  await checkServer();
  await applyToggles();
});

app.on('before-quit', () => { void tracker.stop(); });

app.on('window-all-closed', () => { /* keep running in tray */ });
