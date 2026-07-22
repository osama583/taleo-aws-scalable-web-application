# Taleo Backend

Express API for the Taleo public registration flow and protected admin workspace.

## Run locally

Create `.env` using `.env.example`, then provide the PostgreSQL settings and a long random JWT secret:

```text
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taleo
DB_USER=taleo_app
DB_PASSWORD=your_database_password
PORT=4000
CORS_ORIGINS=http://localhost:5173
TRUST_PROXY_HOPS=0
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=8h
```

Install dependencies and start the API:

```powershell
npm install
npm start
```

Check `http://localhost:4000/health` for database connectivity.

## Public endpoints

- `GET /health`
- `GET /languages`
- `GET /dropdown-options?lang=<code>`
- `GET /registration-count`
- `POST /register`

## Admin authentication

`POST /login` accepts:

```json
{
  "email": "admin@example.com",
  "password": "the password entered by the admin"
}
```

The backend finds the user by email and calls `bcrypt.compare(plainPassword, password_hash)`. A successful ADMIN login returns a signed JWT. Password hashes are never returned.

Use HTTPS in production so the plain password is encrypted in transit.

Send the returned token to protected endpoints:

```text
Authorization: Bearer <token>
```

Protected endpoints:

- `GET /admin/registrations` — returns all interested people with their submitted dropdown answers.

## Create or reset the admin account

Create the first admin account, or safely update an existing admin password, with:

```powershell
npm.cmd run admin:reset-password
```

The command asks for the admin email and masks the new password while typing. It stores only a bcrypt hash and never writes the plain password to the database.
