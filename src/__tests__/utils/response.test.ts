import { Response } from 'express';
import { sendResponse, sendSuccess, sendError } from '../../utils/response';

describe('Response Utilities', () => {
  let mockResponse: Partial<Response>;
  let jsonOutput: any;
  let statusCode: number;

  beforeEach(() => {
    jsonOutput = null;
    statusCode = 0;

    mockResponse = {
      status: jest.fn().mockImplementation((code) => {
        statusCode = code;
        return mockResponse;
      }),
      json: jest.fn().mockImplementation((data) => {
        jsonOutput = data;
        return mockResponse;
      }),
    };
  });

  describe('sendResponse', () => {
    it('should return correct response structure with all fields', () => {
      sendResponse(
        mockResponse as Response,
        200,
        true,
        'Success message',
        { data: 'test' },
        { page: 1, limit: 10, total: 100, totalPages: 10 }
      );

      expect(statusCode).toBe(200);
      expect(jsonOutput).toEqual({
        success: true,
        message: 'Success message',
        data: { data: 'test' },
        meta: { page: 1, limit: 10, total: 100, totalPages: 10 },
      });
    });

    it('should omit message if not provided', () => {
      sendResponse(mockResponse as Response, 200, true, undefined, { data: 'test' });

      expect(jsonOutput).not.toHaveProperty('message');
    });

    it('should omit data if not provided', () => {
      sendResponse(mockResponse as Response, 200, true, 'OK');

      expect(jsonOutput).not.toHaveProperty('data');
    });
  });

  describe('sendSuccess', () => {
    it('should return 200 success response by default', () => {
      sendSuccess(mockResponse as Response, { id: '123' }, 'Data retrieved');

      expect(statusCode).toBe(200);
      expect(jsonOutput.success).toBe(true);
      expect(jsonOutput.message).toBe('Data retrieved');
      expect(jsonOutput.data).toEqual({ id: '123' });
    });

    it('should return 201 for creation', () => {
      sendSuccess(mockResponse as Response, { id: 'new' }, 'Created', 201);

      expect(statusCode).toBe(201);
    });

    it('should use default message if not provided', () => {
      sendSuccess(mockResponse as Response, { id: '123' });

      expect(jsonOutput.message).toBe('Success');
    });
  });

  describe('sendError', () => {
    it('should return 500 error response by default', () => {
      sendError(mockResponse as Response);

      expect(statusCode).toBe(500);
      expect(jsonOutput.success).toBe(false);
      expect(jsonOutput.message).toBe('Internal Server Error');
    });

    it('should return custom status code', () => {
      sendError(mockResponse as Response, 'Not Found', 404);

      expect(statusCode).toBe(404);
      expect(jsonOutput.message).toBe('Not Found');
    });

    it('should return error with custom message', () => {
      sendError(mockResponse as Response, 'Custom error message', 422);

      expect(jsonOutput.success).toBe(false);
      expect(jsonOutput.message).toBe('Custom error message');
    });
  });
});
