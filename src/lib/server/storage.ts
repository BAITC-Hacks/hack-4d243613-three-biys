// Server store for Collector data: Upstash Redis when UPSTASH_REDIS_REST_URL is set, else JSON files in .data/.
// STUB (H1): file/redis switch + typed get/set; real collections land in H3.
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type StorageKind = 'redis' | 'file' | 'memory';

// redis on Vercel when Upstash is configured; JSON files in .data/ locally; memory (per-instance, ephemeral) when
// running serverless without Upstash — good enough for a demo, but the README says to set Upstash for persistence.
// Vercel's Upstash integration names the vars KV_REST_API_*; a manual setup uses UPSTASH_REDIS_REST_*.
const redisUrl = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export function storageKind(): StorageKind {
  if (redisUrl() && redisToken()) return 'redis';
  return process.env.VERCEL ? 'memory' : 'file';
}

const memory = new Map<string, unknown>();

const DATA_DIR = path.join(process.cwd(), '.data');

async function fileGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${key}.json`), 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
async function fileSet<T>(key: string, value: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, `${key}.json`), JSON.stringify(value, null, 2));
}

async function redis() {
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url: redisUrl()!, token: redisToken()! });
}

export async function getJson<T>(key: string, fallback: T): Promise<T> {
  const kind = storageKind();
  if (kind === 'memory') return (memory.has(key) ? memory.get(key) : fallback) as T;
  if (kind === 'redis') {
    const v = await (await redis()).get<T>(`taskforge:${key}`);
    return v ?? fallback;
  }
  return fileGet(key, fallback);
}

export async function setJson<T>(key: string, value: T): Promise<void> {
  const kind = storageKind();
  if (kind === 'memory') { memory.set(key, value); return; }
  if (kind === 'redis') {
    await (await redis()).set(`taskforge:${key}`, value);
    return;
  }
  await fileSet(key, value);
}
