// sitemap.js
import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream } from 'fs';

async function buildSitemap() {
    const sitemap = new SitemapStream({ hostname: 'https://nexusthecore.com' });

    // ✅ Important public routes
    sitemap.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    sitemap.write({ url: '/features', changefreq: 'weekly', priority: 0.8 });
    sitemap.write({ url: '/pricing', changefreq: 'monthly', priority: 0.7 });
    sitemap.write({ url: '/docs', changefreq: 'weekly', priority: 0.7 });
    sitemap.write({ url: '/blog', changefreq: 'weekly', priority: 0.6 });
    sitemap.write({ url: '/about', changefreq: 'monthly', priority: 0.5 });
    sitemap.write({ url: '/contact', changefreq: 'monthly', priority: 0.5 });

    sitemap.end();

    const data = await streamToPromise(sitemap);
    createWriteStream('./public/sitemap.xml').write(data);
    console.log('✅ Sitemap generated at ./public/sitemap.xml');
}

buildSitemap().catch(console.error);
