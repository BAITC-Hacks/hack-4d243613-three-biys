// Collector settings (PLAN.md §5). Stored in Electron userData/settings.json — never committed.
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export interface CollectorSettings {
  serverUrl: string;
  ingestToken: string;
  team: string;
  trackerEnabled: boolean;
  meetingEnabled: boolean;
}

export const defaultSettings: CollectorSettings = {
  serverUrl: 'http://localhost:3000',
  ingestToken: '',
  team: 'Sales',
  trackerEnabled: false,
  meetingEnabled: false,
};

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): CollectorSettings {
  try {
    return { ...defaultSettings, ...JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(s: CollectorSettings): void {
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(s, null, 2));
}
