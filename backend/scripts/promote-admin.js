/* Promotes (or demotes) a user's role. Local/dev administration only.
 * Run from the repository root:
 *   node backend/scripts/promote-admin.js user@example.com [ADMIN|USER]
 * Reads the root .env file; never prints secrets.
 */
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const root = path.resolve(__dirname, '..', '..');

const loadEnv = () => {
  const fs = require('fs');
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
};

const main = async () => {
  loadEnv();
  const email = (process.argv[2] ?? '').trim().toLowerCase();
  const role = (process.argv[3] ?? 'ADMIN').trim().toUpperCase();

  if (!email || !email.includes('@')) {
    console.error('Usage: node backend/scripts/promote-admin.js <email> [ADMIN|USER]');
    process.exit(1);
  }
  if (role !== 'ADMIN' && role !== 'USER') {
    console.error('Role must be ADMIN or USER.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`No user found for ${email}. Register first, then re-run.`);
      process.exit(1);
    }
    const updated = await prisma.user.update({ where: { id: user.id }, data: { role } });
    console.log(`${updated.email} -> role ${updated.role}`);
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error) => {
  console.error(`Failed: ${error.message}`);
  process.exit(1);
});
