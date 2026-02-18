# Environment Setup Template

## backend/.env.example

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@ep-xxx.us-east-2.aws.neon.tech/todo_db?sslmode=require

# Authentication (must match frontend BETTER_AUTH_SECRET)
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

## frontend/.env.local.example

```env
# Database (used by Better Auth for user/session storage)
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/todo_db?sslmode=require

# Authentication (must match backend BETTER_AUTH_SECRET)
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:3000

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Key Points

### Shared Secret
`BETTER_AUTH_SECRET` **must be identical** in both `.env` files:
- Frontend uses it to **sign** JWT tokens (via Better Auth)
- Backend uses it to **verify** JWT tokens (via PyJWT)
- Mismatch = all API requests get 401

### Database URL Differences
- **Frontend**: `postgresql://` (standard, used by Better Auth / node-postgres)
- **Backend**: `postgresql+asyncpg://` (SQLAlchemy async driver prefix)
- Both point to the **same Neon database**, just different driver prefixes

### Generating a Secret
```bash
# Generate a secure 32+ character secret
openssl rand -base64 32
# Example output: K7x9mP2qR5vW8yB1dF4gH6jL0nT3uA=
```

### Production Checklist
- [ ] `BETTER_AUTH_SECRET` is at least 32 characters
- [ ] Same secret in both frontend and backend
- [ ] `ALLOWED_ORIGINS` updated to production frontend URL
- [ ] `BETTER_AUTH_URL` updated to production frontend URL
- [ ] `NEXT_PUBLIC_API_URL` updated to production backend URL
- [ ] Database URLs point to production Neon instance
- [ ] `.env` files are in `.gitignore` (only `.env.example` committed)
