import { RedisStore } from 'connect-redis';
import type { SessionOptions } from 'express-session';
import { env } from './env.js';
import { redis } from './redis.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const sessionConfig: SessionOptions = {
	store: new RedisStore({
		client: redis,
		prefix: 'session:',
		ttl: ONE_DAY_MS / 1000,
	}),
	name: 'sid',
	secret: env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	cookie: {
		httpOnly: true,
		secure: env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: ONE_DAY_MS,
	},
};
