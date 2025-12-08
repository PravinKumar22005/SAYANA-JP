const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const User = require('../models/User');

async function run() {
  const mongo = process.env.MONGO_URI || 'mongodb://localhost:27017/sayana-db';
  console.log('Connecting to', mongo);
  await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected');

  const seeded = {
    _id: new mongoose.Types.ObjectId('69131f2a6c11954bc7f07ec6'),
    name: 'Sachin',
    email: 'sachin@example.com',
    password: '$2b$10$BJkpY76SeNBsfqElpUby6ev2SR7uSVfzhYh2TBm3QZ6xUTANfkXbS',
    createdAt: new Date('2025-11-11T11:34:02.827Z'),
    updatedAt: new Date('2025-11-11T11:34:02.827Z'),
    __v: 0
  };

  try {
    // If DEV_SEED_PLAIN env var is set, create a dev user with that plaintext password (hashed here)
    if (process.env.DEV_SEED_PLAIN) {
      const bcrypt = require('bcryptjs');
      const plain = process.env.DEV_SEED_PLAIN;
      const hashed = await bcrypt.hash(plain, 10);
      seeded.password = hashed;
    }
    const res = await User.updateOne({ _id: seeded._id }, { $set: seeded }, { upsert: true });
    console.log('Seed result:', res);
  } catch (err) {
    console.error('Seed error', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
    process.exit(0);
  }
}

run();
