const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const agentRoutes = require('./routes/agentRoutes');
const friendRoutes = require('./routes/friendRoutes');
const messageRoutes = require('./routes/messageRoutes');
const aiRoutes = require('./routes/aiRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

// fail fast if critical env missing
if (!process.env.MONGO_URI) {
	console.error('Missing MONGO_URI in environment');
}
if (!process.env.JWT_SECRET) {
	console.warn('Warning: JWT_SECRET is not set. Set it in production.');
}

connectDB();

const app = express();

app.use(helmet());
app.use(morgan('dev'));

// basic rate limiting
app.use(rateLimit({ windowMs: 60 * 1000, max: 200 }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
	const bodyPreview = req.body && Object.keys(req.body).length ? req.body : undefined;
	// reduce logging verbosity for production by keeping it simple
	console.log(`${new Date().toISOString()} -> ${req.method} ${req.url}`, bodyPreview || '');
	next();
});

app.use(cors());

app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (req, res) => res.send('Sayana API up'));

// Temporary debug endpoint to verify token / user mapping
const authMiddleware = require('./middleware/authMiddleware');
app.get('/api/debug/whoami', authMiddleware, (req, res) => {
	// return minimal user info to avoid leaking sensitive data
	const u = req.user;
	res.json({ id: u.id, name: u.name, email: u.email, role: u.role });
});

const PORT = process.env.PORT || 5000;

// debug route to help verify DB writes quickly
app.get('/debug/add-test-user', async (req, res) => {
	try {
		const User = require('./models/User');
		const user = await User.create({ name: `dbg-${Date.now()}`, email: `dbg${Date.now()}@local`, password: 'x' });
		res.json({ ok: true, id: user._id });
	} catch (err) {
		console.error('debug add user error:', err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

// Error handler (should be last middleware)
app.use(errorHandler);

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
