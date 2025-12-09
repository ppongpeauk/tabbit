# Tabbit Web App

Next.js web application for Tabbit.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Set up environment variables:
   Create a `.env.local` file with:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Run the development server:

```bash
bun run dev
```

The app will be available at `http://localhost:3000`.

## Google OAuth Setup

To enable Google OAuth login:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - Development: `http://localhost:3001/api/auth/callback/google` (server URL)
   - Production: `{your-server-url}/api/auth/callback/google`
6. Set environment variables on the server:
   - `GOOGLE_CLIENT_ID` - Your Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` - Your Google OAuth client secret
   - `GOOGLE_REDIRECT_URI` - Should be `{server-url}/api/auth/callback/google` (e.g., `http://localhost:3001/api/auth/callback/google`)
   - `BETTER_AUTH_BASE_URL` - Your server base URL (e.g., `http://localhost:3001`) - Better Auth runs on the server

## Authentication

The web app uses Better Auth for authentication. Users can:

- Sign up with email/password
- Sign in with email/password
- Sign in with Google OAuth

Sessions are managed via HTTP-only cookies set by the server.

## API Communication

The web app communicates with the backend server at the URL specified in `NEXT_PUBLIC_API_URL`. All authenticated requests include the session cookie automatically.
