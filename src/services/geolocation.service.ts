/**
 * Geolocation Service using Redis Geospatial
 * Provides fast nearby shop lookup using Redis GEOSEARCH
 */

import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ShopLocation extends Coordinates {
  shopId: string;
  distance?: number; // in kilometers
}

const REDIS_GEO_KEY = 'shops:locations';

/**
 * Add or update shop location in Redis Geospatial index
 */
export const addShopLocation = async (
  shopId: string,
  longitude: number,
  latitude: number
): Promise<void> => {
  try {
    // Redis GEOADD: longitude comes first, then latitude
    await redis.geoadd(REDIS_GEO_KEY, longitude, latitude, shopId);
    logger.debug(`Added shop ${shopId} to geospatial index at [${latitude}, ${longitude}]`);
  } catch (error) {
    logger.error(`Failed to add shop location to Redis: ${error}`);
    throw error;
  }
};

/**
 * Remove shop location from Redis Geospatial index
 */
export const removeShopLocation = async (shopId: string): Promise<void> => {
  try {
    await redis.zrem(REDIS_GEO_KEY, shopId);
    logger.debug(`Removed shop ${shopId} from geospatial index`);
  } catch (error) {
    logger.error(`Failed to remove shop location from Redis: ${error}`);
    throw error;
  }
};

/**
 * Find nearby shops within a radius (in kilometers)
 * Uses GEOSEARCH (Redis >= 6.2) with WITHCOORD + WITHDIST, sorted nearest first.
 */
export const findNearbyShops = async (
  userLat: number,
  userLon: number,
  radiusKm: number = 10,
  count: number = 50
): Promise<ShopLocation[]> => {
  try {
    const results = (await (redis as any).geosearch(
      REDIS_GEO_KEY,
      'FROMLONLAT',
      userLon,
      userLat,
      'BYRADIUS',
      radiusKm,
      'km',
      'WITHDIST',
      'WITHCOORD',
      'ASC',
      'COUNT',
      count
    )) as unknown as Array<[string, string, [string, string]]>;

    return results.map(([shopId, distance, coords]) => ({
      shopId,
      longitude: parseFloat(coords[0]),
      latitude: parseFloat(coords[1]),
      distance: Math.round(parseFloat(distance) * 10) / 10,
    }));
  } catch (error) {
    logger.error(`Failed to search nearby shops: ${error}`);
    return [];
  }
};

/**
 * Get distance between user and a specific shop (in kilometers)
 */
export const getDistanceToShop = async (
  shopId: string,
  userLat: number,
  userLon: number
): Promise<number | null> => {
  try {
    const position = await redis.geopos(REDIS_GEO_KEY, shopId);
    if (!position || !position[0]) {
      return null;
    }

    const [shopLon, shopLat] = position[0];
    const distance = calculateHaversineDistance(
      userLat,
      userLon,
      parseFloat(shopLat),
      parseFloat(shopLon)
    );

    return Math.round(distance * 10) / 10;
  } catch (error) {
    logger.error(`Failed to get distance to shop: ${error}`);
    return null;
  }
};

/**
 * Clear geospatial index and rebuild from given shops
 */
export const syncShopsToRedis = async (
  shops: Array<{ id: string; latitude?: number | null; longitude?: number | null }>
): Promise<number> => {
  let syncedCount = 0;

  await redis.del(REDIS_GEO_KEY).catch(() => undefined);

  for (const shop of shops) {
    if (shop.latitude != null && shop.longitude != null) {
      try {
        await addShopLocation(shop.id, shop.longitude, shop.latitude);
        syncedCount++;
      } catch (error) {
        logger.warn(`Failed to sync shop ${shop.id}: ${error}`);
      }
    }
  }

  logger.info(`Synced ${syncedCount}/${shops.length} shops to Redis geospatial index`);
  return syncedCount;
};

/**
 * Haversine formula to calculate distance between two coordinates
 * Returns distance in kilometers
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
