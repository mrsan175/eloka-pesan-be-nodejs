import { Request, Response } from 'express';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import {
  NotificationStream,
  getStreamHistory,
  type NotificationEntry,
} from '../services/notification.service';
import type Redis from 'ioredis';
import { ForbiddenError } from '../utils/errors';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

const isAllowedForStaff = (entry: NotificationEntry, shopIds: Set<string>): boolean =>
  !entry.data.shopId || shopIds.has(entry.data.shopId);

async function getStaffShopIds(userId: string): Promise<Set<string>> {
  const assignments = await prisma.shopStaff.findMany({
    where: { userId },
    select: { shopId: true },
  });
  return new Set(assignments.map((assignment) => assignment.shopId));
}

export class NotificationController {
  static async getHistory(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) throw new ForbiddenError('Authentication required');

    const shopIds = req.user.role === 'STAFF'
      ? await getStaffShopIds(req.user.id)
      : new Set<string>();
    const entries = await getStreamHistory(NotificationStream.ORDERS, 50);
    const visibleEntries = req.user.role === 'STAFF'
      ? entries.filter((entry) => isAllowedForStaff(entry, shopIds))
      : entries;

    res.json({ success: true, message: 'Notifications retrieved successfully', data: visibleEntries });
  }

  static async stream(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) throw new ForbiddenError('Authentication required');

    const shopIds = req.user.role === 'STAFF'
      ? await getStaffShopIds(req.user.id)
      : new Set<string>();
    const lastId = typeof req.query.lastId === 'string' ? req.query.lastId : '$';
    const subscriber = redis.duplicate();

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let active = true;
    let cursor = lastId;
    const send = (entry: NotificationEntry) => {
      if (req.user?.role === 'STAFF' && !isAllowedForStaff(entry, shopIds)) return;
      res.write(`id: ${entry.id}\ndata: ${JSON.stringify(entry)}\n\n`);
    };

    const close = () => {
      active = false;
      subscriber.disconnect();
      res.end();
    };
    req.on('close', close);

    try {
      while (active) {
        const entries = await readStreamNewFromClient(subscriber, cursor);
        entries.forEach(send);
        if (entries.length > 0) cursor = entries[entries.length - 1].id;
        if (entries.length === 0 && active) res.write(': keep-alive\n\n');
      }
    } finally {
      subscriber.disconnect();
      req.removeListener('close', close);
    }
  }
}

async function readStreamNewFromClient(
  client: Redis,
  lastId: string,
): Promise<NotificationEntry[]> {
  const response = await client.xread(
    'BLOCK',
    15000,
    'STREAMS',
    NotificationStream.ORDERS,
    lastId,
  );
  if (!response) return [];
  return response[0][1].map(([id, fieldValues]) => {
    const data: Record<string, string> = {};
    for (let index = 0; index < fieldValues.length; index += 2) {
      data[fieldValues[index]] = fieldValues[index + 1];
    }
    return { id, data };
  });
}
