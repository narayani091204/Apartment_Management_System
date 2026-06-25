# Apartment Management System — Frontend

React + Vite + TypeScript client for the Apartment Management System
[backend](../backend). Role-based UI for **admins**, **residents**, and
**security guards**, talking to the REST API and receiving real-time
notifications over Socket.io.

## Stack

- **React 18 + Vite + TypeScript**
- **React Router v6** — routing + role-based route guards
- **TanStack Query** — server-state fetching/caching
- **Axios** — HTTP client with Bearer-token + auto-refresh interceptors
- **React Hook Form + Zod** — forms and validation (mirrors backend Zod schemas)
- **socket.io-client** — real-time `notification:new` events
- **Tailwind CSS + shadcn/ui** — styling and accessible components
- **lucide-react** — icons

## Getting started

```bash
cd frontend
cp .env.example .env     # defaults work with the dev proxy
npm install
npm run dev              # http://localhost:5173
```

The dev server proxies `/api` and `/socket.io` to the backend at
`http://localhost:5000`, so run the backend (`cd ../backend && npm run dev`)
alongside it. Log in with the seeded demo accounts (see the backend README).

## Scripts

| Command            | Description                          |
|--------------------|--------------------------------------|
| `npm run dev`      | Start the Vite dev server            |
| `npm run build`    | Type-check then build for production |
| `npm run preview`  | Preview the production build         |
| `npm run typecheck`| Type-check only                      |
| `npm run lint`     | Run ESLint                           |
| `npm run format`   | Format with Prettier                 |

## Project layout

```
src/
  auth/         AuthContext, useAuth hook, ProtectedRoute guard
  components/
    ui/         shadcn/ui base components (button, input, card, ...)
    layout/     AppLayout, Sidebar, Topbar, NotificationBell
  config/       nav.ts (role-filtered sidebar items)
  hooks/        useNotifications (query + socket live updates)
  lib/          api (axios + refresh), socket, tokenStore, queryClient, utils
  pages/        Login, Register, Dashboard, placeholders, 404/403
  types/        api.ts — types mirroring backend models/responses
  App.tsx       route tree
  main.tsx      providers (QueryClient, Router, Auth) + entry
```

## What's built

- ✅ Project scaffold, Tailwind + shadcn/ui, dev proxy
- ✅ API client with JWT Bearer + transparent refresh on 401
- ✅ Auth flow: login, resident self-register, session hydration, logout
- ✅ Role-based routing + app shell (sidebar/topbar) + dashboard
- ✅ Live notification bell over Socket.io

### Next: feature modules

The `/maintenance`, `/visitors`, `/notices`, and `/users` routes are
placeholders. Build each by adding query/mutation hooks against the
corresponding API endpoints and replacing `PlaceholderPage`.
