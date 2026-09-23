// Activity tracker: foreground-app category every 2 s + clipboard transfers, batched to /api/ingest/events every 30 s.
// What leaves the machine: { ts, event: focus|switch|copy|transfer, app|from|to (category), durationSec }. Nothing else.
import { clipboard } from 'electron';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { categorize, type AppCategory } from './categories';

export interface ActivityEventInput {
  ts: string;
  event: 'focus' | 'switch' | 'copy' | 'transfer';
  app?: AppCategory; from?: AppCategory; to?: AppCategory; durationSec?: number;
}

export interface TrackerConfig { serverUrl: string; ingestToken: string; team: string }
export interface TrackerStats { running: boolean; eventsSent: number; eventsPending: number; lastSentAt?: string; lastError?: string; currentApp?: AppCategory }

const SAMPLE_MS = 2000;
const FLUSH_MS = 30_000;
const TRANSFER_WINDOW_MS = 60_000;

// Stable per-machine pseudonymous id; the server hashes it again and drops it during aggregation.
export const deviceId = createHash('sha256').update(`${os.hostname()}|${os.userInfo().username}`).digest('hex').slice(0, 20);

type ForegroundFn = () => Promise<{ processName: string; title: string } | null>;

async function makeForeground(): Promise<ForegroundFn> {
  try {
    // ESM-only package: keep a real import() (tsc would rewrite a plain `await import()` into require() for CommonJS).
    const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<typeof import('get-windows')>;
    const mod = await dynamicImport('get-windows');
    return async () => {
      const w = await mod.activeWindow();
      return w ? { processName: w.owner.name, title: w.title } : null;
    };
  } catch {
    return powershellForeground; // HACK: fallback when the native module is missing
  }
}

const PS_SCRIPT = `
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class FG { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid); }
"@
$h=[FG]::GetForegroundWindow(); $sb=New-Object System.Text.StringBuilder 512; [void][FG]::GetWindowText($h,$sb,512)
$pid2=0; [void][FG]::GetWindowThreadProcessId($h,[ref]$pid2); $p=Get-Process -Id $pid2 -ErrorAction SilentlyContinue
Write-Output ("{0}|{1}" -f $p.ProcessName, $sb.ToString())`;

function powershellForeground(): Promise<{ processName: string; title: string } | null> {
  if (process.platform !== 'win32') return Promise.resolve(null);
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-Command', PS_SCRIPT], { timeout: 1500 }, (err, out) => {
      if (err || !out) return resolve(null);
      const [processName, ...rest] = out.trim().split('|');
      resolve({ processName: processName ?? '', title: rest.join('|') });
    });
  });
}

export class Tracker {
  private timer: NodeJS.Timeout | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private pending: ActivityEventInput[] = [];
  private current: { app: AppCategory; since: number } | null = null;
  private lastClipboard = '';
  private lastCopy: { app: AppCategory; at: number; transferred: boolean } | null = null;
  private foreground: ForegroundFn | null = null;
  stats: TrackerStats = { running: false, eventsSent: 0, eventsPending: 0 };

  constructor(private config: TrackerConfig, private onChange: (s: TrackerStats) => void) {}

  updateConfig(c: TrackerConfig) { this.config = c; }

  async start() {
    if (this.stats.running) return;
    this.foreground ??= await makeForeground();
    this.lastClipboard = safeClipboard();
    this.stats.running = true;
    this.timer = setInterval(() => void this.sample(), SAMPLE_MS);
    this.flushTimer = setInterval(() => void this.flush(), FLUSH_MS);
    this.emit();
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.timer = this.flushTimer = null;
    this.closeFocus(Date.now());
    this.stats.running = false;
    await this.flush();
    this.emit();
  }

  private emit() { this.stats.eventsPending = this.pending.length; this.onChange({ ...this.stats }); }

  private closeFocus(now: number) {
    if (!this.current) return;
    const durationSec = Math.round((now - this.current.since) / 1000);
    if (durationSec >= 2) this.pending.push({ ts: new Date(this.current.since).toISOString(), event: 'focus', app: this.current.app, durationSec });
    this.current = null;
  }

  private async sample() {
    const now = Date.now();
    const fg = await this.foreground!().catch(() => null);
    if (fg) {
      const app = categorize(fg.processName, fg.title);
      if (!this.current) this.current = { app, since: now };
      else if (this.current.app !== app) {
        const from = this.current.app;
        this.closeFocus(now);
        this.current = { app, since: now };
        this.pending.push({ ts: new Date(now).toISOString(), event: 'switch', from, to: app });
        // A copy in app X followed by moving to app Y within 60 s counts as one X→Y transfer.
        if (this.lastCopy && !this.lastCopy.transferred && now - this.lastCopy.at <= TRANSFER_WINDOW_MS && this.lastCopy.app !== app) {
          this.pending.push({ ts: new Date(now).toISOString(), event: 'transfer', from: this.lastCopy.app, to: app });
          this.lastCopy.transferred = true;
        }
      }
      this.stats.currentApp = app;
    }
    const clip = safeClipboard();
    if (clip && clip !== this.lastClipboard) {
      this.lastClipboard = clip; // content is compared locally only, never stored or sent
      const app = this.current?.app ?? 'Other';
      this.pending.push({ ts: new Date(now).toISOString(), event: 'copy', app });
      this.lastCopy = { app, at: now, transferred: false };
    }
    this.emit();
  }

  async flush() {
    if (!this.pending.length) return;
    const batch = this.pending.splice(0, 500);
    try {
      const res = await fetch(`${this.config.serverUrl.replace(/\/$/, '')}/api/ingest/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.ingestToken}` },
        body: JSON.stringify({ deviceId, team: this.config.team, events: batch }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { accepted: number }; error?: { message: string } };
      if (!json.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
      this.stats.eventsSent += json.data?.accepted ?? batch.length;
      this.stats.lastSentAt = new Date().toISOString();
      this.stats.lastError = undefined;
    } catch (e) {
      this.pending.unshift(...batch); // retry next flush
      if (this.pending.length > 5000) this.pending.length = 5000;
      this.stats.lastError = (e as Error).message;
    }
    this.emit();
  }
}

function safeClipboard(): string {
  try { return clipboard.readText(); } catch { return ''; }
}
