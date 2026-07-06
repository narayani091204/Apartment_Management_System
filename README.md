# 🏢 Apartment Management System

A full-stack **Apartment Management System** built with **React, TypeScript, Node.js, Express, MongoDB, and Socket.io**. The application provides role-based access for **Admins, Residents, and Security Guards** to manage apartment operations efficiently.

## 🚀 Features

- JWT Authentication with Access & Refresh Tokens
- Role-Based Access Control (Admin, Resident, Security)
- User Management
- Maintenance Request Management
- Visitor Management
- Community Notice Board
- Real-Time Notifications using Socket.io
- Responsive UI with Tailwind CSS & shadcn/ui

---

## 🛠️ Tech Stack

### Frontend
- React 18
- Vite
- TypeScript
- React Router
- TanStack Query
- Axios
- React Hook Form
- Zod
- Tailwind CSS
- shadcn/ui
- Socket.io Client

### Backend
- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose
- JWT Authentication
- Socket.io
- Zod
- Helmet
- Express Rate Limit

---

## 📂 Project Structure

```
Apartment_Management_System/
├── frontend/
├── backend/
└── README.md
```

---

## ⚙️ Installation

### Clone the Repository

```bash
git clone <repository-url>
cd Apartment_Management_System
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

---

## 👥 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@apartment.local | Admin@12345 |
| Resident | resident@apartment.local | Resident@123 |
| Security | security@apartment.local | Security@123 |

---

## 📌 Main Modules

- Authentication
- User Management
- Maintenance Requests
- Visitor Management
- Notice Board
- Notifications

