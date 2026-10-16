import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeed, upsertEpisode } from '../lib/feed.mjs';

const channel = {
  title: 'Workbench',
  description: 'Lessons, talked through.',
  link: 'https://gtadkapally.com/learn-cs',
  image: 'https://cdn.example/p/cover.png',
  feedUrl: 'https://cdn.example/p/feed.xml',
};
const ep = (slug, pubDate, extra = {}) => ({
  slug, title: slug, description: 'd', url: `https://cdn.example/p/${slug}.mp3`,
  bytes: 1000, seconds: 3725, pubDate, ...extra,
});

test('escapes XML special characters', () => {
  const xml = buildFeed(channel, [ep('a', '2026-10-16T00:00:00Z', { title: 'Sync & <async>', description: 'p99 < 2s & "fast"' })]);
  assert.ok(xml.includes('Sync &amp; &lt;async&gt;'));
  assert.ok(xml.includes('p99 &lt; 2s &amp; &quot;fast&quot;'));
  assert.ok(!/<async>/.test(xml));
});

test('has enclosure, guid, duration and keeps the feed unlisted', () => {
  const xml = buildFeed(channel, [ep('waiting-vs-working', '2026-10-16T00:00:00Z')]);
  assert.match(xml, /<enclosure url="https:\/\/cdn.example\/p\/waiting-vs-working.mp3" length="1000" type="audio\/mpeg"\/>/);
  assert.match(xml, /<guid isPermaLink="false">waiting-vs-working<\/guid>/);
  assert.match(xml, /<itunes:duration>3725<\/itunes:duration>/);
  assert.match(xml, /<itunes:block>Yes<\/itunes:block>/);
  assert.match(xml, /<pubDate>Fri, 16 Oct 2026 00:00:00 GMT<\/pubDate>/);
});

test('lists newest episodes first', () => {
  const xml = buildFeed(channel, [ep('old', '2026-01-01T00:00:00Z'), ep('new', '2026-10-01T00:00:00Z')]);
  assert.ok(xml.indexOf('<guid isPermaLink="false">new') < xml.indexOf('<guid isPermaLink="false">old'));
});

test('upsert replaces an episode with the same slug', () => {
  const list = [ep('a', '2026-01-01T00:00:00Z'), ep('b', '2026-01-02T00:00:00Z')];
  const next = upsertEpisode(list, ep('a', '2026-02-01T00:00:00Z', { url: 'new.mp3' }));
  assert.equal(next.length, 2);
  assert.equal(next.find((e) => e.slug === 'a').url, 'new.mp3');
});

test('public feeds drop the block flag and carry the owner for directory verification', () => {
  const xml = buildFeed({ ...channel, public: true, ownerName: 'Gaurav & co', ownerEmail: 'me+podcast@example.com' }, []);
  assert.doesNotMatch(xml, /itunes:block/);
  assert.match(xml, /<itunes:owner>\s*<itunes:name>Gaurav &amp; co<\/itunes:name>\s*<itunes:email>me\+podcast@example.com<\/itunes:email>\s*<\/itunes:owner>/);
  assert.match(xml, /<itunes:author>Gaurav &amp; co<\/itunes:author>/);
});

test('private feeds stay blocked and carry no email', () => {
  const xml = buildFeed(channel, []);
  assert.match(xml, /<itunes:block>Yes<\/itunes:block>/);
  assert.doesNotMatch(xml, /itunes:owner/);
});
