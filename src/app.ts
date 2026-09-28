import cors from 'cors';
import express, {
	type NextFunction,
	type Request,
	type Response,
} from 'express';
import session from 'express-session';
import { ZodError } from 'zod';
import { corsOptions } from './lib/cors.js';
import { env } from './lib/env.js';
import { sessionConfig } from './lib/session.js';
import v1 from './routes/apiRoutes.js';

const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(session(sessionConfig));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api', v1);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
	if (err instanceof ZodError) {
		const fields: Record<string, string[]> = {};
		for (const issue of err.issues) {
			const key = issue.path.join('.') || '_root';
			(fields[key] ??= []).push(issue.message);
		}
		return res.status(400).json({ error: 'Invalid input', fields });
	}

	if (res.headersSent) {
		return _next(err as Error);
	}

	console.error(err);
	res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.PORT, () => {
	console.log(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});
