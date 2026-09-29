import { Router } from 'express';
import { loginSchema } from '../schemas/auth.js';
import authService from '../services/authService.js';

const router = Router();

router.post('/login', async (req, res) => {
	const { email, password } = loginSchema.parse(req.body);

	const user = await authService.findByEmail(email);
	if (
		!user ||
		!(await authService.verifyPassword(user.passwordHash, password))
	) {
		return res.status(401).json({ error: 'Invalid credentials' });
	}

	req.session.userId = user.id;
	return req.session.save((err) => {
		if (err) return res.status(500).json({ error: 'Session failed' });
		return res.status(200).json({ message: 'Authenticated user' });
	});
});

router.post('/logout', (req, res) => {
	return req.session.destroy((err) => {
		if (err) return res.status(500).json({ error: 'Logout failed' });
		res.clearCookie('sid');
		return res.status(204).end();
	});
});

router.get('/me', async (req, res) => {
	if (!req.session.userId) {
		return res.status(401).json({ error: 'Not authenticated' });
	}
	const user = await authService.findById(req.session.userId);
	if (!user) return res.status(401).json({ error: 'Not authenticated' });
	return res.json(user);
});

export default router;
