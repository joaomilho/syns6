/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://syns6.com',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/player',
          '/share',
          '/waitlist',
          '/api/*',
        ],
      },
    ],
  },
  exclude: [
    '/player',
    '/share',
    '/waitlist',
    '/api/*',
    '/screenshots/*',
  ],
  transform: async (config, path) => {
    // Customize priority and change frequency per page
    const priority = path === '/' ? 1.0 : 0.7;
    const changefreq = path === '/' ? 'daily' : 'weekly';
    
    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
};

