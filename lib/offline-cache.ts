/**
 * Optional local cache for scripts, tests and offline previews, so re-running
 * doesn't ask SEC or Wikimedia again. Turned on by setting FATHOM_CACHE_DIR.
 * The live website doesn't use it.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Where a response for this address is kept (exported so previews can be seeded). */
export function cachePath(dir: string, url: string): string {
  return path.join(dir, createHash("sha256").update(url).digest("hex").slice(0, 32));
}

export async function fromCache(url: string): Promise<string | undefined> {
  const dir = process.env.FATHOM_CACHE_DIR;
  if (!dir) return undefined;
  try {
    return await readFile(cachePath(dir, url), "utf8");
  } catch {
    return undefined;
  }
}

export async function toCache(url: string, body: string): Promise<void> {
  const dir = process.env.FATHOM_CACHE_DIR;
  if (!dir) return;
  await mkdir(dir, { recursive: true });
  await writeFile(cachePath(dir, url), body, "utf8");
}
