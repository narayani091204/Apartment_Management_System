import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Notice } from '../models/Notice.js';
import { logger } from '../utils/logger.js';

/* Idempotent seed: creates a bootstrap admin, a demo resident + security guard,
 * and a welcome notice. Safe to re-run. */
async function seed(): Promise<void> {
  await connectDB();

  let admin = await User.findOne({ email: env.seed.adminEmail });
  if (!admin) {
    admin = await User.create({
      name: env.seed.adminName,
      email: env.seed.adminEmail,
      password: env.seed.adminPassword,
      role: 'admin',
    });
    logger.info(`Created admin: ${admin.email}`);
  } else {
    logger.info(`Admin already exists: ${admin.email}`);
  }

  const demo = [
    {
      name: 'Demo Resident',
      email: 'resident@apartment.local',
      password: 'Resident@123',
      role: 'resident' as const,
      apartmentNumber: 'A-101',
      block: 'A',
      phone: '5550100',
    },
    {
      name: 'Demo Guard',
      email: 'security@apartment.local',
      password: 'Security@123',
      role: 'security' as const,
      phone: '5550199',
    },
  ];

  for (const u of demo) {
    if (!(await User.findOne({ email: u.email }))) {
      await User.create(u);
      logger.info(`Created ${u.role}: ${u.email}`);
    }
  }

  if (!(await Notice.findOne({ title: 'Welcome to the community portal' }))) {
    await Notice.create({
      title: 'Welcome to the community portal',
      content:
        'This is the community notice board. Admins post updates here and residents are notified in real time.',
      category: 'general',
      audience: 'all',
      pinned: true,
      postedBy: admin._id,
    });
    logger.info('Created welcome notice');
  }

  logger.info('Seed complete.');
  await disconnectDB();
  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
