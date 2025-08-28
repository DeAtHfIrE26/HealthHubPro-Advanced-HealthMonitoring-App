import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
) => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  };
  
  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string = 'Internal Server Error',
  statusCode: number = 500,
  error?: any
) => {
  const response: ApiResponse = {
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && error && { details: error })
  };
  
  res.status(statusCode).json(response);
};

export const sendPaginatedResponse = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Success'
) => {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    message,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
  
  res.status(200).json(response);
};