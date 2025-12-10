#!/usr/bin/env node

/**
 * Set Admin User Script
 * 
 * This script sets a user as an admin in the database.
 * Run with: node scripts/set-admin.js <email>
 */

import { db } from '../server/db.js';
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/set-admin.js <email>');
  console.error('Example: node scripts/set-admin.js bryce@example.com');
  process.exit(1);
}

try {
  // Find the user by email
  const [user] = await db.select().from(users).where(eq(users.email, email));
  
  if (!user) {
    console.error(`❌ User with email "${email}" not found`);
    process.exit(1);
  }
  
  // Update user to be admin
  await db.update(users)
    .set({ isAdmin: true })
    .where(eq(users.id, user.id));
  
  console.log(`✅ Successfully set ${email} as admin`);
  console.log(`   User ID: ${user.id}`);
  console.log(`   Name: ${user.firstName || ''} ${user.lastName || ''}`);
  console.log('');
  console.log('You can now access the admin dashboard at /admin');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Error setting admin:', error);
  process.exit(1);
}


