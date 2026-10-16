import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Served at gtadkapally.com/learn-cs (a rewrite in the personal site proxies to this project).
const base = '/learn-cs';

// Lessons write internal links as /lessons/<slug>/; prefix the base at build time.
function rehypeBaseLinks() {
  const walk = (node) => {
    if (node.type === 'element' && node.tagName === 'a') {
      const href = node.properties?.href;
      if (typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') && !href.startsWith(base + '/') && href !== base) {
        // no trailing slashes: the personal site (Next.js) strips them, so we match
        const [path, hash = ''] = href.split('#');
        const clean = path === '/' ? '' : path.replace(/\/$/, '');
        node.properties.href = base + clean + (hash ? '#' + hash : '');
      }
    }
    node.children?.forEach(walk);
  };
  return (tree) => walk(tree);
}

export default defineConfig({
  base,
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [mdx({ rehypePlugins: [rehypeBaseLinks] })],
  markdown: {
    rehypePlugins: [rehypeBaseLinks],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: false,
    },
  },
});
