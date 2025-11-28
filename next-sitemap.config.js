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
  additionalPaths: async (config) => {
    const externalPages = [
      'https://www.producthunt.com/products/syns6?launch=syns6',
      'https://trylaunch.ai/launch/syns6',
      'https://www.instagram.com/_syns6_/',
      'https://www.tiktok.com/@_syns6_',
      'https://x.com/_syns6_',
    ];

    return externalPages.map((url) => ({
      loc: url,
      changefreq: 'weekly',
      priority: 0.5,
      lastmod: new Date().toISOString(),
    }));
  },
};

