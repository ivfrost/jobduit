import { createHash, randomBytes } from 'node:crypto';

export const generateApiKey = () => {
	const raw = `jd_live_${randomBytes(32).toString('hex')}`;
	const prefix = raw.slice(0, 12);
	const keyHash = createHash('sha256').update(raw).digest('hex');
	return { raw, prefix, keyHash };
};
