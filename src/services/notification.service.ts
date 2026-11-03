/**
 * Notification Service using Redis Streams
 * Real-time persistent notifications with stream history and consumer group support.
 * 
 * Why Streams over Pub/Sub for Notifications?
 * 1. Persistence: Messages are saved in stream, staff missing events can replay history.
 * 2. Reliable Delivery: Consumer Groups support message ACK & retry for multi-staff outlets.
 * 3. Range Queries: Retrieve notification history without DB hits.
 */

import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export enum NotificationStream {
  ORDERS = 'stream:notifications:orders',
  SHOPS = 'stream:notifications:shops',
  SYSTEM = 'stream:notifications:system',
}

export interface OrderNotification {
  type: 'ORDER_CREATED' | 'ORDER_UPDATED' | 'ORDER_CANCELLED' | 'ORDER_COMPLETED';
  orderId: string;
  orderNumber: string;
  shopId: string;
  status?: string;
  message: string;
  timestamp: string;
}

export interface NotificationEntry {
  id: string; // Redis Stream ID (e.g. 1767225600000-0)
  data: Record<string, string>;
}

const MAX_STREAM_LENGTH = 1000; // Cap stream size to prevent memory bloat

/**
 * Add event to Redis Stream
 */
export const addStreamNotification = async (
  stream: NotificationStream,
  fields: Record<string, string>
): Promise<string> => {
  try {
    const payload = [
      'MAXLEN',
      '~',
      String(MAX_STREAM_LENGTH),
      '*', // Auto generate ID
    ];

    for (const [key, value] of Object.entries(fields)) {
      payload.push(key, String(value ?? ''));
    }

    const id = await redis.xadd(stream, ...payload);
    logger.debug(`Notification added to stream ${stream} with ID: ${id}`);
    return id || '';
  } catch (error) {
    logger.error(`Failed to add notification to stream ${stream}: ${error}`);
    throw error;
  }
};

/**
 * Read recent notification history from stream
 */
export const getStreamHistory = async (
  stream: NotificationStream,
  count: number = 20
): Promise<NotificationEntry[]> => {
  try {
    // XRANGE stream + - COUNT count (latest entries)
    // Using XREVRANGE to get newest first
    const raw = await redis.xrevrange(stream, '+', '-', 'COUNT', count);
    
    return raw.map(([id, fieldValues]) => {
      const data: Record<string, string> = {};
      for (let i = 0; i < fieldValues.length; i += 2) {
        data[fieldValues[i]] = fieldValues[i + 1];
      }
      return { id, data };
    });
  } catch (error) {
    logger.error(`Failed to fetch history for ${stream}: ${error}`);
    return [];
  }
};

/**
 * Read new stream entries starting from specific ID or '$' (last seen)
 */
export const readStreamNew = async (
  stream: NotificationStream,
  lastId: string = '$',
  blockMs: number = 2000
): Promise<NotificationEntry[]> => {
  try {
    // XREAD BLOCK blockMs STREAMS stream lastId
    const response = await redis.xread('BLOCK', blockMs, 'STREAMS', stream, lastId);
    if (!response) return [];

    const [, entries] = response[0];
    return entries.map(([id, fieldValues]) => {
      const data: Record<string, string> = {};
      for (let i = 0; i < fieldValues.length; i += 2) {
        data[fieldValues[i]] = fieldValues[i + 1];
      }
      return { id, data };
    });
  } catch (error) {
    logger.error(`Failed to read stream ${stream}: ${error}`);
    return [];
  }
};

/**
 * Publish order notification to Redis Stream
 */
export const notifyOrderUpdate = async (
  type: OrderNotification['type'],
  orderId: string,
  orderNumber: string,
  shopId: string,
  status?: string,
  message?: string
): Promise<string> => {
  return addStreamNotification(NotificationStream.ORDERS, {
    type,
    orderId,
    orderNumber,
    shopId,
    status: status || '',
    message: message || `Order ${orderNumber} ${type.toLowerCase().replace('_', ' ')}`,
    timestamp: Date.now().toString(),
  });
};

/**
 * Publish shop status change
 */
export const notifyShopUpdate = async (
  type: string,
  shopId: string,
  shopName: string,
  message?: string
): Promise<string> => {
  return addStreamNotification(NotificationStream.SHOPS, {
    type,
    shopId,
    shopName,
    message: message || `Shop ${shopName} status updated`,
    timestamp: Date.now().toString(),
  });
};
