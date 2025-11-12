const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

dotenv.config();
connectDB();

const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
	const bodyPreview = req.body && Object.keys(req.body).length ? req.body : undefined;
	console.log(`${new Date().toISOString()} -> ${req.method} ${req.url}`, bodyPreview || '');
	next();
});
app.use(cors());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => res.send('Sayana API up'));

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

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
