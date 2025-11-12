# SAYANA Frontend (local dev)

This folder contains a small Vite + React + Tailwind scaffold with the provided homepage `App.jsx` component.

Quick start (PowerShell):

```powershell
cd .\sayana-frontend
npm install
npm run dev
```

The dev server will start (default port 5173). Open the URL shown in the console.

Notes:

- Tailwind is used for styling. If you don't want Tailwind, you can replace `src/index.css`.
- The chat assistant in `App.jsx` includes a placeholder for a Gemini API key; the code expects the environment or other server-side code to provide a key if you wire it up.
