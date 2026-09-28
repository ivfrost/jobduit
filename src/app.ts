import express from 'express';
import { env } from './env.js';

const app = express();

app.get('/hello', (_req, res) => {
	res.send('Hello, World!');
});

app.listen(env.PORT, () => console.log(`Server running on port ${env.PORT}`));
