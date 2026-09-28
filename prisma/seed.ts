import { randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { generateApiKey } from '../src/lib/apiKey.js';
import { env } from '../src/lib/env.js';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;

const now = new Date();
const daysAgo = (n: number) =>
	new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

async function main() {
	if (env.NODE_ENV === 'production') {
		console.error(
			'Refusing to run seed in production. Use admin:create instead.',
		);
		process.exit(1);
	}

	// Clear existing data (children first)
	await prisma.applicationNote.deleteMany();
	await prisma.application.deleteMany();
	await prisma.jobPosting.deleteMany();
	await prisma.company.deleteMany();
	await prisma.apiKey.deleteMany();
	await prisma.invite.deleteMany();
	await prisma.user.deleteMany();
	await prisma.jobTag.deleteMany();

	// Generate a real API key
	const { raw, prefix, keyHash } = generateApiKey();
	const password = randomBytes(16).toString('hex');

	// Admin user with hashed password + API key
	const admin = await prisma.user.create({
		data: {
			email: 'admin@jobdu.it',
			passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
			role: 'ADMIN',
			apiKeys: {
				create: { name: 'First API Key', prefix, keyHash },
			},
		},
	});

	// Tags
	const tagTs = await prisma.jobTag.create({ data: { name: 'typescript' } });
	const tagRemote = await prisma.jobTag.create({ data: { name: 'remote' } });
	const tagBackend = await prisma.jobTag.create({ data: { name: 'backend' } });

	// Companies
	const acme = await prisma.company.create({
		data: {
			name: 'Acme Corp',
			city: 'Berlin',
			country: 'DE',
			userId: admin.id,
		},
	});

	const globex = await prisma.company.create({
		data: {
			name: 'Globex',
			city: 'Madrid',
			country: 'ES',
			userId: admin.id,
		},
	});

	// Job postings
	const acmePosting = await prisma.jobPosting.create({
		data: {
			userId: admin.id,
			companyId: acme.id,
			sourceUrl: 'https://example.com/jobs/acme-senior-ts',
			title: 'Senior TypeScript Engineer',
			body: 'Build things with TypeScript. Remote-friendly.',
			source: 'LinkedIn',
			status: 'OPEN',
			workMode: 'REMOTE',
			city: 'Berlin',
			country: 'DE',
			applicantCount: 42,
			postedAt: daysAgo(7),
			summary: 'Senior TS role, fully remote, backend focus.',
			category: 'engineering',
			minYearsExperience: 5,
			analyzedAt: daysAgo(6),
			lastCheckedAt: daysAgo(0),
			tags: {
				connect: [
					{ id: tagTs.id },
					{ id: tagRemote.id },
					{ id: tagBackend.id },
				],
			},
		},
	});

	await prisma.jobPosting.create({
		data: {
			userId: admin.id,
			companyId: globex.id,
			sourceUrl: 'https://example.com/jobs/globex-fullstack',
			title: 'Fullstack Developer',
			source: 'InfoJobs',
			status: 'OPEN',
			workMode: 'HYBRID',
			city: 'Madrid',
			country: 'ES',
			postedAt: daysAgo(3),
			lastCheckedAt: daysAgo(1),
			tags: { connect: [{ id: tagTs.id }] },
		},
	});

	await prisma.jobPosting.create({
		data: {
			userId: admin.id,
			companyId: globex.id,
			sourceUrl: 'https://example.com/jobs/globex-old',
			title: 'Junior Developer',
			source: 'InfoJobs',
			status: 'CLOSED',
			workMode: 'ONSITE',
			city: 'Madrid',
			country: 'ES',
			postedAt: daysAgo(30),
			lastCheckedAt: daysAgo(20),
			tags: { connect: [{ id: tagBackend.id }] },
		},
	});

	// Application with notes
	await prisma.application.create({
		data: {
			userId: admin.id,
			postingId: acmePosting.id,
			status: 'INTERVIEWING',
			appliedAt: daysAgo(5),
			notes: {
				create: [
					{
						title: 'Recruiter call',
						body: 'Spoke with Ana. Team of 6, mostly backend. Next step: tech screen.',
						createdAt: daysAgo(4),
						updatedAt: daysAgo(4),
					},
					{
						title: 'Tech screen prep',
						body: 'Review system design topics. They mentioned Kafka.',
						createdAt: daysAgo(2),
						updatedAt: daysAgo(2),
					},
				],
			},
		},
	});

	const dim = '\x1b[2m';
	const bold = '\x1b[1m';
	const cyan = '\x1b[36m';
	const reset = '\x1b[0m';

	console.log(`
${dim}───────────────────────────────────────────────${reset}
  ${bold}ADMIN CREDENTIALS${reset}
${dim}───────────────────────────────────────────────${reset}

  email:    admin@jobdu.it
  password: ${cyan}${password}${reset}

${dim}───────────────────────────────────────────────${reset}
  ${bold}API KEY${reset} ${dim}(shown once — copy it now)${reset}

  ${cyan}${raw}${reset}
${dim}───────────────────────────────────────────────${reset}
`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
