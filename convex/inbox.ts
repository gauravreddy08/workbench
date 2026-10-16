import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireOwner } from './auth';
import { tag } from './schema';

export const list = query({
  args: { token: v.string(), status: v.optional(v.union(v.literal('open'), v.literal('done'))) },
  handler: async (ctx, { token, status }) => {
    requireOwner(token);
    const rows = status
      ? await ctx.db.query('inbox').withIndex('by_status', (q) => q.eq('status', status)).order('desc').collect()
      : await ctx.db.query('inbox').order('desc').collect();
    return rows;
  },
});

export const add = mutation({
  args: { token: v.string(), term: v.string(), source: v.optional(v.string()), track: v.optional(v.string()), tag: v.optional(tag) },
  handler: async (ctx, { token, term, source, track, tag }) => {
    requireOwner(token);
    const t = term.trim();
    if (!t) throw new Error('term is empty');
    return await ctx.db.insert('inbox', { term: t, source: source?.trim() ?? '', track: track ?? '', tag: tag ?? '', status: 'open' });
  },
});

export const setTag = mutation({
  args: { token: v.string(), id: v.id('inbox'), tag },
  handler: async (ctx, { token, id, tag }) => {
    requireOwner(token);
    await ctx.db.patch(id, { tag });
  },
});

export const resolve = mutation({
  args: { token: v.string(), id: v.id('inbox'), note: v.string() },
  handler: async (ctx, { token, id, note }) => {
    requireOwner(token);
    await ctx.db.patch(id, { status: 'done', note });
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id('inbox') },
  handler: async (ctx, { token, id }) => {
    requireOwner(token);
    await ctx.db.delete(id);
  },
});
