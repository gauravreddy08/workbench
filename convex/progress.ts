import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireOwner } from './auth';

export const all = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    requireOwner(token);
    const rows = await ctx.db.query('progress').collect();
    return rows.map((r) => ({ key: r.key, value: r.value, updatedAt: r.updatedAt }));
  },
});

export const set = mutation({
  args: { token: v.string(), key: v.string(), value: v.string() },
  handler: async (ctx, { token, key, value }) => {
    requireOwner(token);
    const existing = await ctx.db.query('progress').withIndex('by_key', (q) => q.eq('key', key)).unique();
    if (existing) await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    else await ctx.db.insert('progress', { key, value, updatedAt: Date.now() });
  },
});
