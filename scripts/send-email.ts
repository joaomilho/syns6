/**
 * Script to send test emails using Resend
 * 
 * Usage:
 *   npx tsx scripts/send-email.ts <email-type>
 * 
 * Examples:
 *   npx tsx scripts/send-email.ts welcome
 * 
 * Available email types are based on files in src/emails/
 */

import * as fs from 'fs';
import * as path from 'path';
import { Resend } from 'resend';
import { loadEnv } from './lib/spotifyAuth';

// Load environment variables
loadEnv();

// Configuration
const TO_EMAIL = 'juanmaiz@gmail.com';

// Email template interface
interface EmailTemplate {
  from: string;
  subject: string;
  html: string;
}

async function getEmailTemplate(type: string): Promise<EmailTemplate> {
  const emailsDir = path.join(process.cwd(), 'src', 'emails');
  
  // Check if the email type exists
  const tsFile = path.join(emailsDir, `${type}.ts`);
  
  if (!fs.existsSync(tsFile)) {
    // List available templates
    const files = fs.readdirSync(emailsDir)
      .filter(f => f.endsWith('.ts'))
      .map(f => f.replace('.ts', ''));
    
    throw new Error(
      `Email type "${type}" not found.\n` +
      `Available types: ${files.join(', ')}`
    );
  }
  
  // Dynamic import of the email template
  const templateModule = await import(`../src/emails/${type}`);
  const templateKey = `${type}Email`;
  
  if (!templateModule[templateKey]) {
    throw new Error(
      `Email template "${type}.ts" must export "${templateKey}" object with { from, subject, html }`
    );
  }
  
  return templateModule[templateKey] as EmailTemplate;
}

async function sendEmail(type: string) {
  console.log(`\n📧 Sending "${type}" email to ${TO_EMAIL}...\n`);
  
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY not found in environment variables');
  }
  
  const resend = new Resend(resendApiKey);
  const template = await getEmailTemplate(type);
  
  console.log(`📝 Subject: ${template.subject}`);
  console.log(`📤 From: ${template.from}`);
  console.log(`📥 To: ${TO_EMAIL}`);
  console.log('');
  
  try {
    const { data, error } = await resend.emails.send({
      from: template.from,
      to: TO_EMAIL,
      subject: template.subject,
      html: template.html,
    });
    
    if (error) {
      throw new Error(`Resend error: ${JSON.stringify(error)}`);
    }
    
    console.log('✅ Email sent successfully!');
    console.log(`   ID: ${data?.id}`);
  } catch (err) {
    console.error('❌ Failed to send email:', err);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  // List available email types
  const emailsDir = path.join(process.cwd(), 'src', 'emails');
  const types = fs.readdirSync(emailsDir)
    .filter(f => f.endsWith('.ts'))
    .map(f => f.replace('.ts', ''));
  
  console.log('\n📧 Send Test Email Script\n');
  console.log('Usage: npx tsx scripts/send-email.ts <email-type>\n');
  console.log('Available email types:');
  types.forEach(t => console.log(`  - ${t}`));
  console.log('');
  process.exit(0);
}

const emailType = args[0];
sendEmail(emailType);
