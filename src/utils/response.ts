import { Response } from 'express';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message?: string,
  data?: T,
  meta?: ApiResponse<T>['meta']
): Response => {
  const response: ApiResponse<T> = {
    success,
    ...(message && { message }),
    ...(data && { data }),
    ...(meta && { meta }),
  };

  return res.status(statusCode).json(response);
};

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message = 'Success',
  statusCode = 200,
  meta?: ApiResponse<T>['meta']
): Response => {
  return sendResponse(res, statusCode, true, message, data, meta);
};

export const sendError = (
  res: Response,
  message = 'Internal Server Error',
  statusCode = 500
): Response => {
  return sendResponse(res, statusCode, false, message);
};
