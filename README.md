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
- News + chatbot endpoints can now run fully on the free Hugging Face Inference API. Set `HF_API_KEY`, `HF_CHAT_MODEL`, and `HF_NEWS_MODEL` inside `sayana-backend/.env` to enable the new flow (defaults use the open `mistralai/Mistral-7B-Instruct-v0.3` model). If you omit the key, the endpoints fall back to basic placeholders. You can also tune `NEWS_SIGN_LIMIT` to control how many sign-language stories appear at the top of the News tab.
