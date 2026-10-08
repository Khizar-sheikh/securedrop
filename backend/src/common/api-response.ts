import { ERROR_CODES, ERROR_MESSAGES, ErrorCode } from './error-codes';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const ok = <T>(data: T): ApiSuccess<T> => ({ success: true, data });

export const fail = (code: ErrorCode, message?: string): ApiFailure => ({
  success: false,
  error: {
    code,
    message: message ?? ERROR_MESSAGES[code] ?? ERROR_CODES.INTERNAL_ERROR,
  },
});
