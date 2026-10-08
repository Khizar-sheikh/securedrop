import { env } from '../constants/env';

type LogArgs = unknown[];

const write = (level: 'log' | 'warn' | 'error', args: LogArgs): void => {
  if (!env.dev) return;
  console[level]('[SecureDrop]', ...args);
};

export const logger = {
  info: (...args: LogArgs) => write('log', args),
  warn: (...args: LogArgs) => write('warn', args),
  error: (...args: LogArgs) => write('error', args),
};
