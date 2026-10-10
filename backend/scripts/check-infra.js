/* Standalone connectivity checks for local infrastructure.
 * Run from the repository root:  node backend/scripts/check-infra.js
 * Reads the root .env file (never prints secrets).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');

const loadEnv = () => {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
};

/**
 * Docker publishes on 127.0.0.1 (IPv4) only, but Node may resolve
 * `localhost` to ::1 first and get ECONNREFUSED. Force the IPv4 loopback.
 */
const preferIpv4 = (value) => {
  try {
    const url = new URL(value);
    if (url.hostname === 'localhost' || url.hostname === '::1') url.hostname = '127.0.0.1';
    return url.toString();
  } catch {
    return value;
  }
};

const checkRedis = async () => {
  const Redis = require('ioredis');
  const redis = new Redis(preferIpv4(process.env.REDIS_URL), {
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    retryStrategy: () => null,
  });
  try {
    const pong = await redis.ping();
    return { name: 'redis', ok: pong === 'PONG', detail: pong };
  } finally {
    redis.disconnect();
  }
};

const checkStorage = async () => {
  const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    endpoint: preferIpv4(process.env.STORAGE_ENDPOINT),
    region: process.env.STORAGE_REGION,
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE !== 'false',
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY,
      secretAccessKey: process.env.STORAGE_SECRET_KEY,
    },
  });
  await client.send(new HeadBucketCommand({ Bucket: process.env.STORAGE_BUCKET }));
  return { name: 'storage', ok: true, detail: `bucket "${process.env.STORAGE_BUCKET}" exists` };
};

const main = async () => {
  loadEnv();
  const checks = [checkRedis, checkStorage];
  let failed = 0;

  for (const check of checks) {
    try {
      const result = await check();
      console.log(`OK   ${result.name}: ${result.detail}`);
    } catch (error) {
      failed += 1;
      console.log(`FAIL ${check.name}: ${error.message}`);
    }
  }

  process.exit(failed === 0 ? 0 : 1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
