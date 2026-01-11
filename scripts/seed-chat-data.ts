/**
 * Chat Database Seed Script
 * 
 * Populates Firestore with realistic test data.
 * 
 * Usage:
 *   pnpm seed:chat
 * 
 * Make sure Firebase Emulator is running first:
 *   pnpm emulators
 */

import { seedDatabase } from '../src/lib/chat/seed';

// Run the seed
seedDatabase().catch(error => {
  console.error('Seed script failed:', error);
  process.exit(1);
});
