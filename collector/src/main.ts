// TaskForge Collector — Electron main process (tray + window + IPC). Owner: A.
// H1 skeleton: tray, window, settings, IPC stubs. tracker.ts / meeting.ts land in H3–H4. (Telegram: roadmap only.)
import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron';
import path from 'node:path';
import { loadSettings, saveSettings, type CollectorSettings } from './settings';

export interface CollectorStatus {
  settings: CollectorSettings;
  tracker: { running: boolean; eventsSent: number; lastSentAt?: string };
  meeting: { recording: boolean; meetingId?: string; chunksSent: number };
  server: { reachable: boolean; lastCheckAt?: string; error?: string };
}

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let settings = loadSettings();
const status: CollectorStatus = {
  settings,
  tracker: { running: false, eventsSent: 0 },
  meeting: { recording: false, chunksSent: 0 },
  server: { reachable: false },
};

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
ipcMain.handle('collector:setToggle', (_e: unknown, name: 'tracker' | 'meeting', on: boolean) => {
  if (name === 'tracker') settings.trackerEnabled = on;
  if (name === 'meeting') settings.meetingEnabled = on;
  saveSettings(settings);
  // TODO(H3/H4): start/stop tracker and meeting recorder
  emitStatus();
  return status;
});
ipcMain.handle('collector:saveSettings', async (_e: unknown, s: Partial<CollectorSettings>) => {
  settings = { ...settings, ...s };
  saveSettings(settings);
  await checkServer();
  return status;
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  win?.show();
  void checkServer();
});

app.on('window-all-closed', () => { /* keep running in tray */ });
