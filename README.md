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

## MediaPipe / Holistic worker setup

The live sign-detection endpoint depends on the Python bridge in `sayana-backend/python/holistic_bridge.py`. Before starting the backend, create a virtual environment (or use your preferred interpreter), install the required wheel files, and point `SIGN_PYTHON_BIN` at that interpreter:

```powershell
cd e:\AGILIZ\SAYANA-JP\sayana-backend
python -m venv venv
./venv/Scripts/Activate.ps1
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r python/requirements.txt

# copy .env.example → .env if you have not already
Copy-Item .env.example .env
# ensure the bridge uses this interpreter
(Get-Content .env) -replace '^SIGN_PYTHON_BIN=.*$', 'SIGN_PYTHON_BIN=.\\venv\\Scripts\\python.exe' | Set-Content .env
```

If the MediaPipe modules are missing or the interpreter differs from the one configured in `.env`, `/api/ai/sign-detect` will now return a `503` with a descriptive error so you can spot the misconfiguration immediately.

Notes:

- AI endpoints require `GOOGLE_API_KEY` or will error; for local dev you can mock responses.
- This project has a seed script that inserts a sample user.
- News + chatbot endpoints can now run fully on the free Hugging Face Inference API. Set `HF_API_KEY`, `HF_CHAT_MODEL`, and `HF_NEWS_MODEL` inside `sayana-backend/.env` to enable the new flow (defaults use the open `mistralai/Mistral-7B-Instruct-v0.3` model). If you omit the key, the endpoints fall back to basic placeholders. You can also tune `NEWS_SIGN_LIMIT` to control how many sign-language stories appear at the top of the News tab.
