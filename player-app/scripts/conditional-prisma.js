#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const prismaSchemaPath = path.join(cwd, 'prisma', 'schema.prisma');

// Skip Prisma if we're in the site directory or if there's no schema
const isSiteDirectory = cwd.includes('/site') || cwd.endsWith('site') || path.basename(cwd) === 'site';

if (isSiteDirectory) {
  console.log('Site directory detected, skipping prisma generate');
  process.exit(0);
}

if (fs.existsSync(prismaSchemaPath)) {
  const { execSync } = require('child_process');
  console.log('Prisma schema found, running prisma generate...');
  execSync('prisma generate', { stdio: 'inherit' });
} else {
  console.log('No Prisma schema found, skipping prisma generate');
}

