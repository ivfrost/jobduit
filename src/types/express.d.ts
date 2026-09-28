import type { AuthUser } from '../middleware/requireAuth.js';

declare global {
	namespace Express {
		interface Request {
			user: AuthUser;
			authMethod: 'apiKey' | 'session';
		}
	}
}

export {};
