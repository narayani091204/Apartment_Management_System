import type { Types } from 'mongoose';
import { Notification, type NotificationType } from '../models/Notification.js';
import { User, type Role } from '../models/User.js';
import { emitToUser } from '../realtime/socket.js';
import { logger } from '../utils/logger.js';

const EVENT = 'notification:new';

interface NotifyInput {
  recipient: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/* Persist a notification and push it to the recipient in real time. */
export async function notifyUser(input: NotifyInput) {
  const notification = await Notification.create(input);
  emitToUser(String(input.recipient), EVENT, notification.toJSON());
  return notification;
}

/* Fan out the same notification to every active user of one or more roles. */
export async function notifyRoles(
  roles: Role[],
  input: Omit<NotifyInput, 'recipient'>,
): Promise<void> {
  const users = await User.find({ role: { $in: roles }, isActive: true })
    .select('_id')
    .lean();
  await Promise.all(
    users.map((u) => notifyUser({ ...input, recipient: u._id })),
  );
  logger.info(`Notified ${users.length} user(s) in roles [${roles.join(', ')}]: ${input.title}`);
}
