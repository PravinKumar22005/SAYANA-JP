# SAYANA - Sign-Language Translator (Capstone)

This repository contains the frontend and backend for Sayana — a sign-language translating app (capstone project).

Quick start (local)

1. Copy `.env.example` to `sayana-backend/.env` and set `MONGO_URI` and `JWT_SECRET`.

2. Seed a dev user (optional known password):

```powershell
cd e:\AGILIZ\SAYANA-JP\sayana-backend
# set DEV_SEED_PLAIN for a known dev password (optional)
$env:DEV_SEED_PLAIN='Password123!'; npm install; npm run seed; Remove-Item Env:DEV_SEED_PLAIN
```

3. Start backend and frontend locally (or use Docker Compose):

```powershell
# backend
cd e:\AGILIZ\SAYANA-JP\sayana-backend
npm run dev

# frontend
cd e:\AGILIZ\SAYANA-JP\sayana-frontend
npm install
npm run dev

# OR using docker-compose (from repo root)
cd e:\AGILIZ\SAYANA-JP
docker-compose up --build
```

4. API docs: `API.md` (root)

Notes:

- AI endpoints require `GOOGLE_API_KEY` or will error; for local dev you can mock responses.
- This project has a seed script that inserts a sample user.
