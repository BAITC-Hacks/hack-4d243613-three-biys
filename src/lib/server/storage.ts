// Server store for Collector data: Upstash Redis when UPSTASH_REDIS_REST_URL is set, else JSON files in .data/.
// STUB (H1): file/redis switch + typed get/set; real collections land in H3.
import { promises as fs } from 'node:fs';
import path from 'node:path';

export type StorageKind = 'redis' | 'file';

export function storageKind(): StorageKind {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? 'redis' : 'file';
}

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
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
}

export async function getJson<T>(key: string, fallback: T): Promise<T> {
  if (storageKind() === 'redis') {
    const v = await (await redis()).get<T>(`taskforge:${key}`);
    return v ?? fallback;
  }
  return fileGet(key, fallback);
}

export async function setJson<T>(key: string, value: T): Promise<void> {
  if (storageKind() === 'redis') {
    await (await redis()).set(`taskforge:${key}`, value);
    return;
  }
  await fileSet(key, value);
}
