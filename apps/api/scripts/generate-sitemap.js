import fs from 'fs';
import { Router } from 'express';

/**
 * Basic Sitemap Generator for Nexus Core
 * This script creates a static sitemap.xml in the public directory.
 * Run this as part of your build process or via a cron job.
 */

const BASE_URL = 'https://nexus-core.ai'; // Replace with your actual domain

const staticPages = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/docs', changefreq: 'weekly', priority: 0.8 },
  { url: '/architecture', changefreq: 'monthly', priority: 0.7 },
  { url: '/careers', changefreq: 'monthly', priority: 0.5 },
  { url: '/contact', changefreq: 'monthly', priority: 0.5 },
  { url: '/neural-mesh', changefreq: 'weekly', priority: 0.9 },
];

const generateSitemap = () => {
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  
  const xmlFooter = '</urlset>';

  const urlElements = staticPages.map(page => `
  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('');

  const fullSitemap = xmlHeader + urlElements + xmlFooter;

  try {
    fs.writeFileSync('./public/sitemap.xml', fullSitemap);
    console.log('✅ Sitemap.xml generated successfully in /public');
  } catch (err) {
    console.error('❌ Error generating sitemap:', err);
  }
};

generateSitemap();