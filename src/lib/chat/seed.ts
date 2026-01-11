/**
 * Firebase Chat - Database Seed Script
 *
 * Populates Firestore with realistic test data for development and testing.
 * 
 * Usage:
 * 1. Make sure Firebase Emulator is running: firebase emulators:start
 * 2. Run: npx tsx src/lib/chat/seed.ts
 * 3. Or import seedDatabase() in your app initialization
 *
 * NOTE: This will clear existing data before seeding!
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

/**
 * Test Users - Create these in Firebase Auth first with same UIDs
 */
const testUsers = [
  {
    uid: 'user-john-doe',
    name: 'John Doe',
    role: 'DSP' as const,
    avatar: 'JD',
  },
  {
    uid: 'user-jane-smith',
    name: 'Jane Smith',
    role: 'Client' as const,
    avatar: 'JS',
  },
  {
    uid: 'user-bob-wilson',
    name: 'Bob Wilson',
    role: 'DSP' as const,
    avatar: 'BW',
  },
  {
    uid: 'user-alice-johnson',
    name: 'Alice Johnson',
    role: 'Admin' as const,
    avatar: 'AJ',
  },
  {
    uid: 'user-charlie-brown',
    name: 'Charlie Brown',
    role: 'Client' as const,
    avatar: 'CB',
  },
];

/**
 * Seed Users Collection and Firebase Auth
 */
async function seedUsers(): Promise<void> {
  console.log('🌱 Seeding users...');

  for (const user of testUsers) {
    try {
      // Create Firestore user document
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      });
      console.log(`  ✓ Created user: ${user.name}`);

      // Create Firebase Auth user (password = email for easy testing)
      const email = `${user.uid}@test.com`;
      const password = 'Test123456!';
      
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log(`  ✓ Created auth account: ${email}`);
      } catch (authError: any) {
        // User might already exist, that's okay
        if (authError.code !== 'auth/email-already-in-use') {
          throw authError;
        }
        console.log(`  ⏭️  Auth account already exists: ${email}`);
      }
    } catch (error) {
      console.error(`  ❌ Error seeding user ${user.name}:`, error);
    }
  }

  console.log(`✅ ${testUsers.length} users created\n`);
}

/**
 * Seed Threads and Messages
 */
async function seedThreads(): Promise<void> {
  console.log('🌱 Seeding threads and messages...');

  const now = Timestamp.now();
  const oneHourAgo = Timestamp.fromDate(
    new Date(Date.now() - 60 * 60 * 1000)
  );
  const twoHoursAgo = Timestamp.fromDate(
    new Date(Date.now() - 2 * 60 * 60 * 1000)
  );
  const threeDaysAgo = Timestamp.fromDate(
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  );

  // Thread 1: John & Jane (Recent conversation)
  const thread1Id = 'thread-john-jane-001';
  await setDoc(doc(db, 'threads', thread1Id), {
    participants: ['user-john-doe', 'user-jane-smith'],
    lastMessage: 'Thanks for the update!',
    lastMessageAt: now,
    createdAt: threeDaysAgo,
  });

  const thread1Messages = [
    {
      id: 'msg-1-1',
      senderId: 'user-john-doe',
      text: 'Hi Jane! How are you doing?',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 2 * 60 * 60 * 1000)
      ),
    },
    {
      id: 'msg-1-2',
      senderId: 'user-jane-smith',
      text: 'Great! Just finished the report you asked for.',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 90 * 60 * 1000)
      ),
    },
    {
      id: 'msg-1-3',
      senderId: 'user-john-doe',
      text: 'Perfect! Can you send it to me?',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 60 * 60 * 1000)
      ),
    },
    {
      id: 'msg-1-4',
      senderId: 'user-jane-smith',
      text: 'Sure, checking the attachment now...',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 45 * 60 * 1000)
      ),
    },
    {
      id: 'msg-1-5',
      senderId: 'user-jane-smith',
      text: 'Sent! Let me know if you need any changes.',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 30 * 60 * 1000)
      ),
    },
    {
      id: 'msg-1-6',
      senderId: 'user-john-doe',
      text: 'Looking good! Will review and get back to you.',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 20 * 60 * 1000)
      ),
    },
    {
      id: 'msg-1-7',
      senderId: 'user-jane-smith',
      text: 'Thanks for the update!',
      createdAt: now,
    },
  ];

  for (const msg of thread1Messages) {
    await setDoc(
      doc(db, `threads/${thread1Id}/messages`, msg.id),
      {
        senderId: msg.senderId,
        text: msg.text,
        createdAt: msg.createdAt,
      }
    );
  }
  console.log(`  ✓ Thread 1 (John ↔ Jane): ${thread1Messages.length} messages`);

  // Thread 2: Bob & Alice (Older conversation)
  const thread2Id = 'thread-bob-alice-002';
  await setDoc(doc(db, 'threads', thread2Id), {
    participants: ['user-bob-wilson', 'user-alice-johnson'],
    lastMessage: 'See you at the meeting!',
    lastMessageAt: twoHoursAgo,
    createdAt: threeDaysAgo,
  });

  const thread2Messages = [
    {
      id: 'msg-2-1',
      senderId: 'user-bob-wilson',
      text: 'Hi Alice, can we schedule a meeting?',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 4 * 60 * 60 * 1000)
      ),
    },
    {
      id: 'msg-2-2',
      senderId: 'user-alice-johnson',
      text: 'Sure! How about tomorrow at 10 AM?',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 3.5 * 60 * 60 * 1000)
      ),
    },
    {
      id: 'msg-2-3',
      senderId: 'user-bob-wilson',
      text: 'Perfect! I\'ll send you the meeting link.',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 3 * 60 * 60 * 1000)
      ),
    },
    {
      id: 'msg-2-4',
      senderId: 'user-alice-johnson',
      text: 'Great! Looking forward to it.',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 2.5 * 60 * 60 * 1000)
      ),
    },
    {
      id: 'msg-2-5',
      senderId: 'user-bob-wilson',
      text: 'See you at the meeting!',
      createdAt: twoHoursAgo,
    },
  ];

  for (const msg of thread2Messages) {
    await setDoc(
      doc(db, `threads/${thread2Id}/messages`, msg.id),
      {
        senderId: msg.senderId,
        text: msg.text,
        createdAt: msg.createdAt,
      }
    );
  }
  console.log(`  ✓ Thread 2 (Bob ↔ Alice): ${thread2Messages.length} messages`);

  // Thread 3: Jane & Charlie (Very recent)
  const thread3Id = 'thread-jane-charlie-003';
  await setDoc(doc(db, 'threads', thread3Id), {
    participants: ['user-jane-smith', 'user-charlie-brown'],
    lastMessage: 'No problem! Talk later.',
    lastMessageAt: oneHourAgo,
    createdAt: Timestamp.fromDate(
      new Date(Date.now() - 12 * 60 * 60 * 1000)
    ),
  });

  const thread3Messages = [
    {
      id: 'msg-3-1',
      senderId: 'user-charlie-brown',
      text: 'Hey Jane, can you review my document?',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 2 * 60 * 60 * 1000)
      ),
    },
    {
      id: 'msg-3-2',
      senderId: 'user-jane-smith',
      text: 'Sure, I can do that. Send it over!',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 90 * 60 * 1000)
      ),
    },
    {
      id: 'msg-3-3',
      senderId: 'user-charlie-brown',
      text: 'Just sent it via email',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 75 * 60 * 1000)
      ),
    },
    {
      id: 'msg-3-4',
      senderId: 'user-jane-smith',
      text: 'Got it! Will check and send feedback by EOD',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 60 * 60 * 1000)
      ),
    },
    {
      id: 'msg-3-5',
      senderId: 'user-charlie-brown',
      text: 'Thanks! I really appreciate it.',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 45 * 60 * 1000)
      ),
    },
    {
      id: 'msg-3-6',
      senderId: 'user-jane-smith',
      text: 'No problem! Talk later.',
      createdAt: oneHourAgo,
    },
  ];

  for (const msg of thread3Messages) {
    await setDoc(
      doc(db, `threads/${thread3Id}/messages`, msg.id),
      {
        senderId: msg.senderId,
        text: msg.text,
        createdAt: msg.createdAt,
      }
    );
  }
  console.log(`  ✓ Thread 3 (Jane ↔ Charlie): ${thread3Messages.length} messages`);

  // Thread 4: John & Bob (DSP Team)
  const thread4Id = 'thread-john-bob-004';
  await setDoc(doc(db, 'threads', thread4Id), {
    participants: ['user-john-doe', 'user-bob-wilson'],
    lastMessage: 'Sounds good to me!',
    lastMessageAt: Timestamp.fromDate(
      new Date(Date.now() - 30 * 60 * 1000)
    ),
    createdAt: Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ),
  });

  const thread4Messages = [
    {
      id: 'msg-4-1',
      senderId: 'user-john-doe',
      text: 'Hey Bob, how did the training go?',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 1.5 * 60 * 60 * 1000)
      ),
    },
    {
      id: 'msg-4-2',
      senderId: 'user-bob-wilson',
      text: 'Really well! Everyone got their certs.',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 90 * 60 * 1000)
      ),
    },
    {
      id: 'msg-4-3',
      senderId: 'user-john-doe',
      text: 'Awesome! Let\'s do the next session next week?',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 60 * 60 * 1000)
      ),
    },
    {
      id: 'msg-4-4',
      senderId: 'user-bob-wilson',
      text: 'Sounds good to me!',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 30 * 60 * 1000)
      ),
    },
  ];

  for (const msg of thread4Messages) {
    await setDoc(
      doc(db, `threads/${thread4Id}/messages`, msg.id),
      {
        senderId: msg.senderId,
        text: msg.text,
        createdAt: msg.createdAt,
      }
    );
  }
  console.log(`  ✓ Thread 4 (John ↔ Bob): ${thread4Messages.length} messages`);

  // Thread 5: Alice & Charlie (Admin & Client)
  const thread5Id = 'thread-alice-charlie-005';
  await setDoc(doc(db, 'threads', thread5Id), {
    participants: ['user-alice-johnson', 'user-charlie-brown'],
    lastMessage: 'Will do! 👍',
    lastMessageAt: Timestamp.fromDate(
      new Date(Date.now() - 15 * 60 * 1000)
    ),
    createdAt: Timestamp.fromDate(
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    ),
  });

  const thread5Messages = [
    {
      id: 'msg-5-1',
      senderId: 'user-charlie-brown',
      text: 'Hi Alice, I have a quick question about billing.',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 1 * 60 * 60 * 1000)
      ),
    },
    {
      id: 'msg-5-2',
      senderId: 'user-alice-johnson',
      text: 'Of course! What do you need help with?',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 50 * 60 * 1000)
      ),
    },
    {
      id: 'msg-5-3',
      senderId: 'user-charlie-brown',
      text: 'Can you send me an updated invoice for last month?',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 40 * 60 * 1000)
      ),
    },
    {
      id: 'msg-5-4',
      senderId: 'user-alice-johnson',
      text: 'Will do! 👍',
      createdAt: Timestamp.fromDate(
        new Date(Date.now() - 15 * 60 * 1000)
      ),
    },
  ];

  for (const msg of thread5Messages) {
    await setDoc(
      doc(db, `threads/${thread5Id}/messages`, msg.id),
      {
        senderId: msg.senderId,
        text: msg.text,
        createdAt: msg.createdAt,
      }
    );
  }
  console.log(`  ✓ Thread 5 (Alice ↔ Charlie): ${thread5Messages.length} messages`);

  console.log(`✅ 5 threads with 28 total messages created\n`);
}

/**
 * Clear all chat data (use with caution!)
 */
async function clearAllChatData(): Promise<void> {
  console.log('⚠️  Clearing all existing chat data...');

  // Clear messages in all threads
  const threadsSnapshot = await getDocs(collection(db, 'threads'));
  for (const threadDoc of threadsSnapshot.docs) {
    const messagesSnapshot = await getDocs(
      collection(db, `threads/${threadDoc.id}/messages`)
    );
    for (const msgDoc of messagesSnapshot.docs) {
      await deleteDoc(doc(db, `threads/${threadDoc.id}/messages`, msgDoc.id));
    }
    await deleteDoc(doc(db, 'threads', threadDoc.id));
  }

  // Clear all users
  const usersSnapshot = await getDocs(collection(db, 'users'));
  for (const userDoc of usersSnapshot.docs) {
    await deleteDoc(doc(db, 'users', userDoc.id));
  }

  console.log('✅ All chat data cleared\n');
}

/**
 * Main seed function
 */
export async function seedDatabase(): Promise<void> {
  try {
    console.log('\n🚀 Starting database seed...\n');

    // Clear existing data
    await clearAllChatData();

    // Seed fresh data
    await seedUsers();
    await seedThreads();

    console.log('✅ Database seeding completed successfully!\n');
    console.log('📝 Login Credentials - Test any of these:\n');
    testUsers.forEach(user => {
      const email = `${user.uid}@test.com`;
      console.log(`   📧 ${email}`);
      console.log(`   🔐 Password: Test123456!`);
      console.log(`   👤 Name: ${user.name} (${user.role})\n`);
    });
    console.log('💡 The page will refresh shortly. Log in with any of the above accounts to see the test conversations.\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}
