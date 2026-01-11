/**
 * Firebase Chat - Database Seed Script (Disabled)
 *
 * This file has been disabled as Firebase Firestore implementation has been removed.
 * Chat functionality needs to be implemented with a backend API.
 * 
 * Once a backend API is implemented, a proper seeding mechanism can be added.
 */

import { auth } from '@/lib/firebase';

/**
 * Placeholder seed function
 * 
 * @deprecated - Requires backend API implementation
 */
export async function seedDatabase(): Promise<void> {
  console.warn('⚠️ Chat seeding not available - awaiting backend API implementation');
  
  // This is where database seeding would happen once a backend is in place
  // For now, we only have Firebase Auth available on the frontend
  
  return Promise.resolve();
}
