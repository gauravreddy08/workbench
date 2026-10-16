// Browser-side access to the Workbench Convex DB (inbox + synced progress).
// The owner token lives in this browser's localStorage under wb:token; without it
// the site still works, progress just stays local.
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { CONVEX_URL } from '../data/site';

export { api };
export const client = new ConvexHttpClient(CONVEX_URL);

export function getToken(): string | null {
  try { return localStorage.getItem('wb:token'); } catch { return null; }
}
export function setToken(t: string | null) {
  try { t ? localStorage.setItem('wb:token', t) : localStorage.removeItem('wb:token'); } catch {}
}

const SYNCED = /^wb:(task|predict|visited):/;

// Pull remote progress into localStorage, then tell components to re-read it.
export async function pullProgress() {
  const token = getToken();
  if (!token) return;
  try {
    const rows = await client.query(api.progress.all, { token });
    for (const r of rows) { try { localStorage.setItem(r.key, r.value); } catch {} }
    window.dispatchEvent(new Event('wb:synced'));
  } catch (e) { console.warn('[workbench] progress pull failed', e); }
}

const timers = new Map<string, number>();
// Save locally (always) and push to the DB (debounced) when a token is present.
export function saveProgress(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
  const token = getToken();
  if (!token || !SYNCED.test(key)) return;
  clearTimeout(timers.get(key));
  timers.set(key, window.setTimeout(() => {
    client.mutation(api.progress.set, { token, key, value }).catch((e) => console.warn('[workbench] sync failed', e));
  }, 600));
}
