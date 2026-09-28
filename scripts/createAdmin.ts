import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { generateApiKey } from '../src/lib/apiKey.js';
import { prisma } from '../src/lib/prisma.js';

const SALT_ROUNDS = 12;

async function main() {
	const email = process.argv[2] ?? 'admin@jobdu.it';

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) {
		console.error(`User ${email} already exists. Nothing to do.`);
		process.exit(1);
	}

	const password = randomBytes(16).toString('hex');
	const { raw, prefix, keyHash } = generateApiKey();

	const admin = await prisma.user.create({
		data: {
			email,
			passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
			role: 'ADMIN',
			apiKeys: {
				create: { name: 'First API Key', prefix, keyHash },
			},
		},
	});

	const dim = '\x1b[2m';
	const bold = '\x1b[1m';
	const cyan = '\x1b[36m';
	const reset = '\x1b[0m';

	console.log(`
${dim}───────────────────────────────────────────────${reset}
  ${bold}ADMIN CREDENTIALS${reset} ${dim}(shown once)${reset}
${dim}───────────────────────────────────────────────${reset}

  email:    ${admin.email}
  password: ${cyan}${password}${reset}

${dim}───────────────────────────────────────────────${reset}
  ${bold}API KEY${reset} ${dim}(shown once)${reset}

  ${cyan}${raw}${reset}
${dim}───────────────────────────────────────────────${reset}

  ${dim}Log in and change your password immediately.${reset}
`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
