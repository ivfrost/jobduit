import { execSync } from 'node:child_process';
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
	RedisContainer,
	type StartedRedisContainer,
} from '@testcontainers/redis';

let postgres: StartedPostgreSqlContainer;
let redis: StartedRedisContainer;

export async function setup(project: any) {
	// Start Postgres
	postgres = await new PostgreSqlContainer('postgres:17-alpine')
		.withDatabase('jobduit_test')
		.withUsername('test')
		.withPassword('test')
		.withReuse()
		.start();

	// Start Redis
	redis = await new RedisContainer('redis:8-alpine').withReuse().start();

	const databaseUrl = postgres.getConnectionUri();
	const redisUrl = redis.getConnectionUrl();

	// Apply Prisma migrations to the fresh Postgres container.
	// This must happen after the container is up and before tests run.
	try {
		execSync('npx prisma migrate deploy', {
			env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'test' },
			cwd: process.cwd(),
		});
	} catch (e: any) {
		console.error('--- prisma migrate deploy failed ---');
		console.error('exit code:', e.status);
		console.error('DATABASE_URL passed:', databaseUrl);
		console.error('stdout:', e.stdout?.toString());
		console.error('stderr:', e.stderr?.toString());
		throw e;
	}

	// Provide the URLs to the test processes
	project.provide('databaseUrl', databaseUrl);
	project.provide('redisUrl', redisUrl);
}

export async function teardown() {
	await postgres?.stop();
	await redis?.stop();
}
