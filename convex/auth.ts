import { ConvexError } from 'convex/values';

// Single-owner site: every function takes the owner token, checked against
// the OWNER_TOKEN deployment env var (npx convex env set OWNER_TOKEN ...).
export function requireOwner(token: string) {
  const expected = process.env.OWNER_TOKEN;
  if (!expected || token !== expected) throw new ConvexError('unauthorized');
}
