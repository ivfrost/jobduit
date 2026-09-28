import app from './app.js';
import { env } from './lib/env.js';

app.listen(env.PORT, () => {
	console.log(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});
