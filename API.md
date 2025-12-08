# Sayana API - Summary

Base URL: `/api`

Authentication: JWT Bearer token in `Authorization: Bearer <token>` header.

Endpoints (summary)

## Auth

- `POST /api/auth/register` - body: `{ name, email, password }` -> registers user
- `POST /api/auth/login` - body: `{ email, password }` -> returns `{ token, user }`
- `GET /api/auth/profile` - protected, returns current user

## Friends

- `GET /api/friends/users/search?query=...` - search users
- `POST /api/friends/send-request` - body: `{ to }` (user id)
- `GET /api/friends/requests` - list pending requests
- `POST /api/friends/reject-request` - body: `{ requestId }`
- `POST /api/friends/accept-request` - body: `{ requestId }`
- `GET /api/friends/list` - list friends

## Messages

- `POST /api/messages/send` - body: `{ to, message }` (protected)
- `GET /api/messages/:friendId` - get conversation with friend

## AI

- `GET /api/ai/news` - returns AI-generated news summary (protected)
- `POST /api/ai/chatbot` - body: `{ message }` -> AI reply (protected)

## Settings

- `GET /api/settings/profile` - get current profile
- `PUT /api/settings/username` - body: `{ name }`
- `PUT /api/settings/password` - body: `{ oldPassword, newPassword }`
- `DELETE /api/settings/account` - delete account

Notes

- Seed script: `sayana-backend/scripts/seedUser.js` (use env `DEV_SEED_PLAIN` to create a known dev password)
- Docker compose available at repo root for local development: `docker-compose.yml`

Postman Quick Test

- Import the collection: `sayana-backend/postman_collection.json` into Postman.
- Collection variables: set `baseUrl` to your backend address (e.g. `http://localhost:5000`).
- Login and set `token` variable after successful `POST /api/auth/login`.

Seeded dev user (default):

- Email: `sachin@example.com`
- Password: Use `DEV_SEED_PLAIN` when running the seed script to set a known password.

Run seed locally (example PowerShell):

```
cd sayana-backend; $env:DEV_SEED_PLAIN='Password123'; $env:MONGO_URI='mongodb://localhost:27017/sayana-db'; node scripts/seedUser.js
```

After that, use the Login request in Postman with `sachin@example.com` / `Password123`.

Example Postman flow:

- `POST /api/auth/login` -> copy `token` from response and set collection `token` variable
- `GET /api/auth/profile` (Authorization: Bearer {{token}})
- `GET /api/friends/list` (Authorization: Bearer {{token}})
- `POST /api/messages/send` (body: `{ to, message }`)
