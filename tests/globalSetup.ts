import { execSync } from 'node:child_process';
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
	RedisContainer,
	type StartedRedisContainer,
} from '@testcontainers/redis';
import type { TestProject } from 'vitest/node';

let postgres: StartedPostgreSqlContainer;
let redis: StartedRedisContainer;

export async function setup(project: TestProject) {
	// Start Postgres
	postgres = await new PostgreSqlContainer('postgres:17-alpine')
		.withDatabase('jobduit_test')
		.withUsername('test')
		.withPassword('test')
		.start();

	// Start Redis
	redis = await new RedisContainer('redis:8-alpine').start();

	const databaseUrl = postgres.getConnectionUri();
	const redisUrl = redis.getConnectionUrl().replace('localhost', '127.0.0.1');

	// Apply Prisma migrations to the fresh Postgres container.
	// This must happen after the container is up and before tests run.
	try {
		execSync('npx prisma migrate deploy', {
			env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'test' },
			cwd: process.cwd(),
		});
	} catch (e) {
		const err = e as { status?: number; stdout?: Buffer; stderr?: Buffer };
		console.error('--- prisma migrate deploy failed ---');
		console.error('exit code:', err.status);
		console.error('DATABASE_URL passed:', databaseUrl);
		console.error('stdout:', err.stdout?.toString());
		console.error('stderr:', err.stderr?.toString());
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
