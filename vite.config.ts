import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', ['SITE_', 'URL']);
  const siteUrl = env.SITE_URL || env.URL;
  const site = siteUrl ? new URL(siteUrl) : undefined;
  if (
    site &&
    (site.protocol !== 'https:' ||
      site.pathname !== '/' ||
      site.search ||
      site.hash ||
      site.username ||
      site.password)
  ) {
    throw new Error('SITE_URL must be an HTTPS origin, for example https://portfolio.example/');
  }
  return {
    plugins: [
      {
        name: 'portfolio-metadata',
        transformIndexHtml(html) {
          if (!site) return html;
          return {
            html: html.replace(
              'content="/images/social-preview.png"',
              `content="${new URL('/images/social-preview.png', site).href}"`,
            ),
            tags: [
              { tag: 'link', attrs: { rel: 'canonical', href: site.href } },
              { tag: 'meta', attrs: { property: 'og:url', content: site.href } },
            ],
          };
        },
      },
    ],
  };
});
