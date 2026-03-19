# Teme Backend

Express + TypeScript backend for gallery data served from Supabase.

## Endpoints

Public endpoints:

- GET /api/health
- GET /api/gallery/projects

Admin endpoints (require Bearer token from Supabase Auth and allowlisted email):

- GET /api/admin/gallery/projects
- POST /api/admin/gallery/projects
- PATCH /api/admin/gallery/projects/:projectId
- DELETE /api/admin/gallery/projects/:projectId

## Image variants for lazy loading

When an admin uploads a thumbnail or project image, the backend generates three WebP variants:

- low (480px)
- mid (960px)
- high (1920px)

The database still stores the high variant path as canonical. The API response exposes low/mid/high URLs and storage paths for each image so the frontend can implement progressive/lazy loading without extra queries.

## Admin auth model

- Frontend logs in with Supabase Auth.
- Frontend sends Authorization: Bearer <access_token> to backend admin endpoints.
- Backend verifies token via Supabase and checks that email is in ADMIN_USER_EMAILS.

## Environment variables

- PORT
- FRONTEND_ORIGIN
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_GALLERY_BUCKET
- ADMIN_USER_EMAILS
- MAX_UPLOAD_MB

## Setup

1. Copy .env.example to .env.
2. Fill all Supabase and admin values.
3. Install dependencies.
4. Run backend.

## Commands

Install dependencies:

pnpm --dir backend install

Run in development:

pnpm --dir backend dev

Build:

pnpm --dir backend build

Run built server:

pnpm --dir backend start
