// TaskForge Collector — Electron main process (tray + window + IPC). Owner: A.
// H1 skeleton: tray, window, settings, IPC stubs. tracker.ts / meeting.ts land in H3–H4. (Telegram: roadmap only.)
import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron';
import path from 'node:path';
import { loadSettings, saveSettings, type CollectorSettings } from './settings';
import { Tracker, type TrackerStats } from './tracker';

export interface CollectorStatus {
  settings: CollectorSettings;
  tracker: TrackerStats;
  meeting: { recording: boolean; meetingId?: string; chunksSent: number };
  server: { reachable: boolean; lastCheckAt?: string; error?: string };
}

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let settings = loadSettings();
const status: CollectorStatus = {
  settings,
  tracker: { running: false, eventsSent: 0, eventsPending: 0 },
  meeting: { recording: false, chunksSent: 0 },
  server: { reachable: false },
};

const tracker = new Tracker(
  { serverUrl: settings.serverUrl, ingestToken: settings.ingestToken, team: settings.team },
  (t) => { status.tracker = t; emitStatus(); },
);

async function applyToggles() {
  tracker.updateConfig({ serverUrl: settings.serverUrl, ingestToken: settings.ingestToken, team: settings.team });
  if (settings.trackerEnabled) await tracker.start(); else await tracker.stop();
  // Autostart with Windows only while the tracker is enabled (opt-in).
  if (process.platform === 'win32') app.setLoginItemSettings({ openAtLogin: settings.trackerEnabled, args: ['--hidden'] });
}

function emitStatus() {
  status.settings = settings;
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
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.on('close', (e: { preventDefault: () => void }) => { e.preventDefault(); win?.hide(); }); // stay in tray
}

function createTray() {
  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip('TaskForge Collector');
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

app.whenReady().then(async () => {
  createWindow();
  createTray();
  if (!process.argv.includes('--hidden')) win?.show();
  await checkServer();
  await applyToggles();
});

app.on('before-quit', () => { void tracker.stop(); });

app.on('window-all-closed', () => { /* keep running in tray */ });
