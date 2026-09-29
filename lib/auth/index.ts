import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { environment } from '@config/environments';

// Separate files per environment and browser avoid parallel setup writers.
export function storageStatePath(browserName: string): string {
  return path.resolve('.auth', environment.ENV, `${browserName}.json`);
}

export async function ensureAuthDirectory(): Promise<void> {
  await mkdir(path.dirname(storageStatePath('chromium')), { recursive: true });
}
