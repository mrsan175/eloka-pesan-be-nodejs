// Mock Redis Client
export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
};

// Export as named export for direct import
export const redis = mockRedis;
