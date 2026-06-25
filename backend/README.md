# Apartment Management System — Backend

Full-stack Apartment Management System backend with role-based access for
**Admins**, **Residents**, and **Security Guards**. Covers resident management,
maintenance request tracking, visitor management, and community notices — over a
RESTful API with JWT authentication, MongoDB storage, and real-time
notifications via Socket.io.

> Frontend (React + Vite + TypeScript) is planned as a second pass. This package
> is the API + realtime layer only.

## Stack

- **Node.js + Express** (TypeScript, ESM)
- **MongoDB + Mongoose** (use MongoDB Atlas or any external `MONGO_URI`)
- **JWT** access/refresh authentication, **bcrypt** password hashing
- **Socket.io** for real-time notifications
- **Zod** request validation, **Helmet** + rate limiting for hardening

## Getting started

```bash
cd backend
cp .env.example .env        # then set MONGO_URI + JWT secrets
npm install
npm run seed                # creates a bootstrap admin + demo users (optional)
npm run dev                 # http://localhost:5000/api
```

Build & run production:

```bash
npm run build && npm start
```

## Roles & permissions

| Capability                      | Admin | Resident | Security |
|---------------------------------|:-----:|:--------:|:--------:|
| Manage users (CRUD, roles)      |  ✅   |    —     |    —     |
| File maintenance request        |   —   |    ✅    |    —     |
| Update maintenance status       |  ✅   |    —     |    ✅    |
| Comment on maintenance          |  ✅   |  own     |    ✅    |
| Pre-register a visitor          |   —   |    ✅    |    —     |
| Log walk-in / check-in / out    |  ✅   |    —     |    ✅    |
| Post / edit / delete notices    |  ✅   |    —     |    —     |
| View notices (by audience)      |  ✅   |    ✅    |    ✅    |
| Receive real-time notifications |  ✅   |    ✅    |    ✅    |

## API overview

Base path: `/api`

### Auth — `/auth`
| Method | Path        | Access | Description                       |
|--------|-------------|--------|-----------------------------------|
| POST   | `/register` | public | Self-register as a resident       |
| POST   | `/login`    | public | Returns access + refresh tokens   |
| POST   | `/refresh`  | public | Exchange refresh for access token |
| GET    | `/me`       | auth   | Current user profile              |

### Users — `/users` (admin only)
`GET /` (filter `?role=&search=&page=&limit=`), `POST /`, `GET /:id`,
`PATCH /:id`, `DELETE /:id` (deactivate).

### Maintenance — `/maintenance`
`GET /` (scoped: residents see own), `POST /` (resident),
`GET /:id`, `PATCH /:id/status` (admin/security), `POST /:id/comments`.

### Visitors — `/visitors`
`GET /` (scoped), `POST /` (resident pre-register / security walk-in),
`GET /:id`, `PATCH /:id/status` (security/admin).

### Notices — `/notices`
`GET /` (audience-filtered), `POST /` `PATCH /:id` `DELETE /:id` (admin),
`GET /:id`.

### Notifications — `/notifications`
`GET /` (`?unread=true`), `PATCH /:id/read`, `PATCH /read-all`.

## Authentication

Send the access token on every protected request:

```
Authorization: Bearer <accessToken>
```

## Real-time (Socket.io)

Connect with the JWT in the handshake auth payload:

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000', { auth: { token: accessToken } });
socket.on('notification:new', (n) => console.log('New notification', n));
```

On connect, each socket auto-joins a `user:<id>` room and a `role:<role>` room.
The server emits `notification:new` to the relevant rooms when:

- a resident files a maintenance request → all **admins**
- a maintenance status/comment changes → the **resident** (or admins)
- a visitor checks in / is denied → the **resident**
- an admin posts a notice → the targeted **audience**

## Demo credentials (after `npm run seed`)

| Role     | Email                      | Password       |
|----------|----------------------------|----------------|
| Admin    | admin@apartment.local      | Admin@12345    |
| Resident | resident@apartment.local   | Resident@123   |
| Security | security@apartment.local   | Security@123   |

## Project layout

```
src/
  config/        env loading + Mongo connection
  models/        Mongoose schemas (User, Maintenance, Visitor, Notice, Notification)
  middleware/    auth, authorize (RBAC), validate (zod), error handling
  validators/    zod request schemas
  controllers/   request handlers
  routes/        Express routers (mounted in routes/index.ts)
  services/      notification service (persist + emit)
  realtime/      Socket.io setup + room helpers
  scripts/       seed.ts
  app.ts         Express app factory
  server.ts      HTTP + Socket.io bootstrap
```
