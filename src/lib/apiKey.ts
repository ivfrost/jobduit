import { createHash, randomBytes } from 'node:crypto';

export const generateApiKeyHash = (raw: string) => {
	return createHash('sha256').update(raw).digest('hex');
};

export const generateApiKey = () => {
	const raw = `jd_live_${randomBytes(32).toString('hex')}`;
	const prefix = raw.slice(0, 12);
	const keyHash = generateApiKeyHash(raw);
	return { raw, prefix, keyHash };
};
