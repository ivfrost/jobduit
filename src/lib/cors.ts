import type cors from 'cors';
import { env } from './env.js';

const IS_DEV = env.NODE_ENV === 'development';

const allowedOrigins = env.CHROME_EXTENSION_ID
	? [`chrome-extension://${env.CHROME_EXTENSION_ID}`]
	: [];

const baseCorsOptions: cors.CorsOptions = {
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'X-API-Key'],
	optionsSuccessStatus: 204,
};

const devCorsOptions: cors.CorsOptions = {
	...baseCorsOptions,
	origin: true, // reflect any origin
};

const prodCorsOptions: cors.CorsOptions = {
	...baseCorsOptions,
	maxAge: 86400,
	origin: (origin, callback) => {
		if (!origin) return callback(null, true); // curl / Postman
		const allowed = allowedOrigins.includes(origin);
		callback(
			allowed ? null : new Error(`Origin ${origin} not allowed`),
			allowed,
		);
	},
};

export const corsOptions: cors.CorsOptions = IS_DEV
	? devCorsOptions
	: prodCorsOptions;
