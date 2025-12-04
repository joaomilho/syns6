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
          '/download',
          '/api/*',
        ],
      },
    ],
  },
  exclude: [
    '/player',
    '/share',
    '/waitlist',
    '/download', // Redirects to /app
    '/api/*',
    '/screenshots/*',
  ],
  transform: async (config, path) => {
    // Customize priority and change frequency per page
    let priority = 0.7;
    let changefreq = 'weekly';
    
    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path === '/faq') {
      priority = 0.8; // High priority for SEO
      changefreq = 'weekly';
    } else if (path === '/app') {
      priority = 0.9; // High priority for app download page
      changefreq = 'weekly';
    }
    
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

