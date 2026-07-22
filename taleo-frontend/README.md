# Taleo Frontend

React + TypeScript landing page for Taleo's pre-launch interest campaign.

## Run locally

The existing Taleo backend must be running on `http://localhost:4000`.

```powershell
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`).

The frontend calls these existing backend endpoints:

- `GET /languages`
- `GET /dropdown-options?lang=<language code>`
- `GET /registration-count`
- `POST /register`

Admin routes are intentionally not linked from the public landing page:

- `/login` — admin email/password login
- `/admin/interested-people` — protected registrations dashboard

The admin dashboard stores the returned JWT in local storage and sends it as `Authorization: Bearer <token>` to protected API requests.

## API URL

Local development defaults to `http://localhost:4000`. To use another API, copy `.env.example` to `.env` and set:

```text
VITE_API_URL=https://your-api.example.com
```

## Checks

```powershell
npm run lint
npm run build
```
