import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { env } from '../src/lib/env.js';
import { redis } from '../src/lib/redis.js';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;

async function main() {
	const email = process.argv[2];
	if (!email) {
		console.error('Usage: tsx scripts/resetPassword.ts <email>');
		process.exit(1);
	}

	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) {
		console.error(`No user found with email ${email}.`);
		process.exit(1);
	}

	const password = randomBytes(16).toString('hex');

	await prisma.$transaction([
		prisma.user.update({
			where: { id: user.id },
			data: { passwordHash: await bcrypt.hash(password, SALT_ROUNDS) },
		}),
	]);
	const keys = await redis.keys('session:*');
	if (keys.length) await redis.del(keys);

	const dim = '\x1b[2m';
	const bold = '\x1b[1m';
	const cyan = '\x1b[36m';
	const reset = '\x1b[0m';

	console.log(`
${dim}───────────────────────────────────────────────${reset}
  ${bold}PASSWORD RESET${reset} ${dim}(shown once)${reset}
${dim}───────────────────────────────────────────────${reset}

  email:    ${user.email}
  password: ${cyan}${password}${reset}

${dim}───────────────────────────────────────────────${reset}

  ${dim}All active sessions were invalidated.${reset}
  ${dim}API keys were NOT affected.${reset}
`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
