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

// Demo defaults: the hosted server and its public demo token, so the app connects with no setup (judges included).
// The token only gates writes of anonymized demo data; override both in Settings for a real deployment.
export const DEMO_SERVER_URL = 'https://taskforge-app-chi.vercel.app';
export const DEMO_INGEST_TOKEN = '12345';

export const defaultSettings: CollectorSettings = {
  serverUrl: DEMO_SERVER_URL,
  ingestToken: DEMO_INGEST_TOKEN,
  team: 'Sales',
  trackerEnabled: false,
  meetingEnabled: false,
};

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): CollectorSettings {
  try {
    const saved = { ...defaultSettings, ...JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) } as CollectorSettings;
    // Settings saved by an older build may hold an empty token/URL — fall back to the demo defaults.
    if (!saved.ingestToken) saved.ingestToken = DEMO_INGEST_TOKEN;
    if (!saved.serverUrl) saved.serverUrl = DEMO_SERVER_URL;
    return saved;
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(s: CollectorSettings): void {
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(s, null, 2));
}
