import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const tag = v.union(v.literal(''), v.literal('now'), v.literal('map'), v.literal('later'));

export default defineSchema({
  // Things Gaurav ran into and wants to learn. Triaged by Claude Code (see .claude/skills/workbench).
  inbox: defineTable({
    term: v.string(),
    source: v.string(),
    track: v.string(),
    tag,
    status: v.union(v.literal('open'), v.literal('done')),
    note: v.optional(v.string()), // what Claude did with it, e.g. "stub added: tracks.scale/foo"
  }).index('by_status', ['status']),

  // Progress synced across devices: same keys the site uses in localStorage
  // (wb:task:<slug>:<id>, wb:predict:<slug>:<id>, wb:visited:<slug>).
  progress: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),
});
