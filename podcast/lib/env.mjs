import { existsSync, readFileSync } from 'node:fs';

// Minimal .env loader: KEY=VALUE lines, # comments, optional quotes. Never overrides real env vars.
export function loadEnv(path = '.env') {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || m[1] in process.env) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

export function requireEnv(...names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) throw new Error(`Missing in .env: ${missing.join(', ')} (see podcast/README.md)`);
  return Object.fromEntries(names.map((n) => [n, process.env[n]]));
}
