#!/usr/bin/env node

/**
 * VAPID Key Generator for Push Notifications
 * 
 * This script generates VAPID keys required for web push notifications.
 * Run with: npm run generate-vapid
 */

import webpush from 'web-push';
import fs from 'fs';
import path from 'path';

console.log('🔑 Generating VAPID keys for push notifications...\n');

try {
  // Generate VAPID keys
  const vapidKeys = webpush.generateVAPIDKeys();
  
  console.log('✅ VAPID keys generated successfully!\n');
  console.log('📋 Copy these keys to your .env file:\n');
  console.log('VITE_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
  console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
  console.log('VAPID_EMAIL=mailto:your-email@example.com');
  console.log('\n⚠️  Important:');
  console.log('- Keep the private key secure and never expose it in client-side code');
  console.log('- The public key can be safely used in your frontend application');
  console.log('- Update the VAPID_EMAIL with your actual email address');
  console.log('- These keys should be the same across all environments for consistency');
  
  // Check if .env file exists and offer to update it
  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('\n📝 .env file found. You can manually update it with the keys above.');
    console.log('   Or run this script with --update flag to automatically update the file.');
  } else {
    console.log('\n📝 No .env file found. Create one with the keys above.');
  }
  
} catch (error) {
  console.error('❌ Error generating VAPID keys:', error);
  process.exit(1);
}