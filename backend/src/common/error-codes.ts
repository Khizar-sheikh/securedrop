export const ERROR_CODES = {
  // generic
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // auth
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_INVALID: 'SESSION_INVALID',

  // files
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_TYPE_NOT_ALLOWED: 'FILE_TYPE_NOT_ALLOWED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  STORAGE_ERROR: 'STORAGE_ERROR',

  // shares
  SHARE_INVALID: 'SHARE_INVALID',
  SHARE_EXPIRED: 'SHARE_EXPIRED',
  SHARE_REVOKED: 'SHARE_REVOKED',
  SHARE_ACCESS_LIMIT_REACHED: 'SHARE_ACCESS_LIMIT_REACHED',
  SHARE_PASSWORD_REQUIRED: 'SHARE_PASSWORD_REQUIRED',
  SHARE_PASSWORD_INVALID: 'SHARE_PASSWORD_INVALID',
  SHARE_CONSUMED: 'SHARE_CONSUMED',

  // recipient sessions
  RECIPIENT_SESSION_INVALID: 'RECIPIENT_SESSION_INVALID',
  RECIPIENT_SESSION_EXPIRED: 'RECIPIENT_SESSION_EXPIRED',
  REAUTHENTICATION_REQUIRED: 'REAUTHENTICATION_REQUIRED',

  // permissions
  NOT_OWNER: 'NOT_OWNER',
  DOWNLOAD_NOT_ALLOWED: 'DOWNLOAD_NOT_ALLOWED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Human-readable, user-safe messages. Never expose internal security logic. */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  BAD_REQUEST: 'The request could not be processed.',
  VALIDATION_FAILED: 'Some of the provided values are not valid.',
  UNAUTHORIZED: 'Please sign in to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  CONFLICT: 'The request conflicts with the current state.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable.',

  EMAIL_TAKEN: 'An account with this email already exists.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  ACCOUNT_DISABLED: 'This account is currently disabled.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  SESSION_INVALID: 'Your session is no longer valid. Please sign in again.',

  FILE_TOO_LARGE: 'This file is too large to upload.',
  FILE_TYPE_NOT_ALLOWED: 'This file type is not supported.',
  UPLOAD_FAILED: 'The upload failed. Please try again.',
  STORAGE_ERROR: 'File storage is unavailable. Please try again.',

  SHARE_INVALID: 'This secure link is not valid.',
  SHARE_EXPIRED: 'This secure link has expired.',
  SHARE_REVOKED: 'This secure link has been revoked by the owner.',
  SHARE_ACCESS_LIMIT_REACHED: 'This secure link has reached its access limit.',
  SHARE_PASSWORD_REQUIRED: 'This secure link requires a password.',
  SHARE_PASSWORD_INVALID: 'Incorrect password for this secure link.',
  SHARE_CONSUMED: 'This secure link has already been used.',

  RECIPIENT_SESSION_INVALID: 'This share session is no longer authorized. Please open the original secure link again.',
  RECIPIENT_SESSION_EXPIRED: 'This share session has expired. Please open the original secure link again.',
  REAUTHENTICATION_REQUIRED: 'We noticed a change in the access environment. For your security, please verify access again.',

  NOT_OWNER: 'You do not have permission to access this resource.',
  DOWNLOAD_NOT_ALLOWED: 'The owner has disabled downloads for this file.',
};
