# Nkabom

Unified full-stack repository containing both the frontend (`index.html`, `app.js`, `styles.css`, `admin.html`, `admin.js`) and the Node.js/Express backend (`server.js`, `server/`).

## Project Structure

- `index.html`, `app.js`, `styles.css` — Customer & worker web application
- `admin.html`, `admin.js` — Admin moderation & billing console (`/admin`)
- `server.js`, `server/` — Express API server, authentication, SQLite database (`data/`), image processing (`uploads/`), and Paystack billing

## Authentication & Security

- User accounts: sign up, log in, log out, forgot/reset password, and in-account password change (`/api/auth/*`, `/api/me/*`) using salted `scrypt` password hashing and HTTP-only session cookies.
- Admin access: passcode login & first-run bootstrap (`/api/admin/*`) backed by `ADMIN_PASSCODE`.
- Privacy & uploads: automatic EXIF/GPS metadata stripping, CSRF header checks, rate limiting, and full self-serve data export & deletion.

## Running & Deploying Together

Requires **Node.js 22.5+** (uses built-in `node:sqlite`).

```bash
npm install
npm start
```

When deploying to a persistent Node host (such as Railway, Render, Fly.io, or a VPS):

1. Configure environment variables using `.env.example`.
2. Mount persistent disk storage for `data/` and `uploads/`.
3. Start the single unified server with `npm start` (`node server.js`).