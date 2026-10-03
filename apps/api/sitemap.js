// sitemap.js
import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream, readdirSync } from 'fs';
import path from 'path';

async function buildSitemap() {
    const sitemap = new SitemapStream({ hostname: 'https://nexusthecore.com' });

    // ✅ Static public routes
    const staticRoutes = [
        { url: '/', changefreq: 'daily', priority: 1.0 },
        { url: '/features', changefreq: 'weekly', priority: 0.8 },
        { url: '/pricing', changefreq: 'monthly', priority: 0.7 },
        { url: '/docs', changefreq: 'weekly', priority: 0.7 },
        { url: '/blog', changefreq: 'weekly', priority: 0.6 },
        { url: '/about', changefreq: 'monthly', priority: 0.5 },
        { url: '/contact', changefreq: 'monthly', priority: 0.5 }
    ];
    staticRoutes.forEach(route => sitemap.write(route));

    // ✅ Dynamic blog posts
    const blogDir = path.join(process.cwd(), 'blog'); // adjust if your blog lives elsewhere
    try {
        const files = readdirSync(blogDir);
        files.forEach(file => {
            const slug = file.replace(/\.(md|mdx|html)$/, '');
            sitemap.write({
                url: `/blog/${slug}`,
                changefreq: 'weekly',
                priority: 0.6
            });
        });
    } catch {
        console.warn('⚠️ No blog directory found, skipping dynamic blog routes.');
    }

    sitemap.end();
    const data = await streamToPromise(sitemap);
    createWriteStream('./public/sitemap.xml').write(data);
    console.log('✅ Sitemap generated at ./public/sitemap.xml');
}

buildSitemap().catch(console.error);
