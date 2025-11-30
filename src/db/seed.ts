// AI Singer Studio - Database Seed Script
import { createDb } from './client';
import * as schema from './schema';

export async function seedDatabase(d1: D1Database) {
  const db = createDb(d1);

  console.log('🌱 Seeding database...');

  // Create a test user
  const testUser = {
    id: 'test-user-1',
    email: 'test@aisinger.studio',
    clerkUserId: null,
    stripeCustomerId: null,
    subscriptionTier: 'studio',
    subscriptionStatus: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(schema.users).values(testUser);
  console.log('✅ Created test user:', testUser.email);

  // Create entitlements for test user
  const testEntitlement = {
    id: 'ent-test-1',
    userId: testUser.id,
    tier: 'studio',
    imagesRemaining: 2000,
    songsRemaining: 500,
    videosRemaining: 200,
    imagesUsed: 0,
    songsUsed: 0,
    videosUsed: 0,
    resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(schema.entitlements).values(testEntitlement);
  console.log('✅ Created entitlements for test user');

  // Create a test singer
  const testSinger = {
    id: 'singer-test-1',
    userId: testUser.id,
    name: 'Luna Eclipse',
    description: 'A mystical pop singer with ethereal vocals',
    genre: 'Pop/Electronic',
    referenceImageIds: null,
    characterSheetId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(schema.singers).values(testSinger);
  console.log('✅ Created test singer:', testSinger.name);

  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('Test Credentials:');
  console.log('  Email: test@aisinger.studio');
  console.log('  Tier: Studio (2000 images, 500 songs, 200 videos)');
  console.log('  Singer: Luna Eclipse');
}

// For local development/testing
export async function clearDatabase(d1: D1Database) {
  const db = createDb(d1);

  console.log('🗑️  Clearing database...');

  await db.delete(schema.usageEvents);
  await db.delete(schema.provenance);
  await db.delete(schema.entitlements);
  await db.delete(schema.prompts);
  await db.delete(schema.jobs);
  await db.delete(schema.assets);
  await db.delete(schema.singers);
  await db.delete(schema.users);

  console.log('✅ Database cleared!');
}
