// Podcast RSS. Apple Podcasts, Overcast and Pocket Casts all accept a feed added by URL.

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function upsertEpisode(list, ep) {
  return [...list.filter((e) => e.slug !== ep.slug), ep];
}

// public: listed in directories (Apple, Spotify, YouTube), which verify ownership by emailing ownerEmail.
// Otherwise the feed asks directories not to list it and carries no email.
export function buildFeed({ title, description, link, image, feedUrl, public: isPublic = false, ownerName = 'Workbench', ownerEmail }, episodes) {
  const owner = isPublic && ownerEmail
    ? `\n    <itunes:owner>\n      <itunes:name>${esc(ownerName)}</itunes:name>\n      <itunes:email>${esc(ownerEmail)}</itunes:email>\n    </itunes:owner>`
    : '';
  const items = [...episodes]
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .map((e) => `    <item>
      <title>${esc(e.title)}</title>
      <description>${esc(e.description)}</description>
      <enclosure url="${esc(e.url)}" length="${e.bytes}" type="audio/mpeg"/>
      <guid isPermaLink="false">${esc(e.slug)}</guid>
      <pubDate>${new Date(e.pubDate).toUTCString()}</pubDate>
      <itunes:duration>${Math.round(e.seconds)}</itunes:duration>
      <link>${esc(`${link}/lessons/${e.slug}`)}</link>
    </item>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(title)}</title>
    <description>${esc(description)}</description>
    <link>${esc(link)}</link>
    <language>en</language>
    <atom:link href="${esc(feedUrl)}" rel="self" type="application/rss+xml"/>
    <itunes:image href="${esc(image)}"/>
    <itunes:author>${esc(ownerName)}</itunes:author>${owner}
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Technology"/>
${isPublic ? '' : '    <itunes:block>Yes</itunes:block>\n'}${items}
  </channel>
</rss>
`;
}
