# Recipio Server

API server built with ElysiaJS and Bun.

## Project Structure

```
server/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Global middleware
│   ├── modules/         # Feature modules (auth, user, etc.)
│   │   ├── auth/
│   │   │   ├── index.ts    # Routes/controller
│   │   │   ├── service.ts  # Business logic
│   │   │   └── model.ts    # Data models & schemas
│   │   └── user/
│   ├── plugins/         # Reusable Elysia plugins
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── index.ts         # Main entry point
├── .env.example         # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## Getting Started

1. Install dependencies:
```bash
bun install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start development server:
```bash
bun run dev
```

4. Build for production:
```bash
bun run build
```

5. Start production server:
```bash
bun start
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:3000/swagger

## Development

- Type checking: `bun run typecheck`
- The server will automatically reload on file changes in development mode

## Architecture

- **Modules**: Feature-based organization with separation of concerns
  - `index.ts`: HTTP routes and request handling
  - `service.ts`: Business logic
  - `model.ts`: Data models and validation schemas

- **Middleware**: Global request/response handlers
  - Error handling
  - Logging
  - Authentication (to be implemented)

- **Plugins**: Reusable Elysia configurations

- **Utils**: Shared utility functions

