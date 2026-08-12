# Mini ERP + CRM Operations Portal

This repository contains a full-stack **Mini ERP + CRM Operations Portal** built for a wholesale/distribution company. It implements customer management (CRM), catalog/inventory tracking (Warehouse), and transaction logging via sales challans (Sales & Accounts).

---

## 🔑 Pre-seeded Demo Credentials

Use these credentials to log in and test the role-specific permissions and interfaces:

| Role Name | Login Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@erp.com` | `admin123` | Full CRUD operations, override status changes, audit logs. |
| **Sales** | `sales@erp.com` | `sales123` | Create/edit customers, log follow-up notes, issue draft/confirmed challans. |
| **Warehouse** | `warehouse@erp.com` | `warehouse123` | View catalog, manually adjust stock (IN/OUT) with reason logs. (No CRM/Sales access). |
| **Accounts** | `accounts@erp.com` | `accounts123` | Read-only CRM & Catalog access, audit/cancel/confirm pending sales challans. |

---

## 🛠️ Required Tech Stack

- **Backend**: Node.js, TypeScript, Express.js, Prisma ORM, SQLite Database (easily swappable to PostgreSQL/Neon/Supabase by altering schema provider connection string).
- **Frontend**: React (Vite-based scaffolding), TypeScript, Custom Premium CSS variables styling (no Tailwind CSS dependency, custom slate-glassmorphism theme).
- **Orchestration**: Docker & Docker Compose configs for fast spin up.
- **Verification**: Fully custom Postman collection file.

---

## 🚀 How to Run the Project

### Option A: Running with Docker Compose (Recommended - Quickest)

Ensure you have Docker and Docker Compose installed.

1. Clone or open the folder in your terminal.
2. Run the following command in the root folder:
   ```bash
   docker-compose up --build
   ```
3. Docker will automatically build the images, spin up both services, apply database migrations, seed the initial database, and start:
   - **Frontend Dashboard**: `http://localhost:5173`
   - **Backend API**: `http://localhost:5000`

---

### Option B: Running Locally

Ensure you have **Node.js (v18 or v20)** installed.

#### 1. Start the Backend API
1. Navigate to the `backend/` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment configuration:
   - Verify `.env` exists with the following configuration:
     ```env
     PORT=5000
     JWT_SECRET=super-secret-erp-key
     DATABASE_URL="file:./dev.db"
     ```
4. Push database schema and compile client:
   ```bash
   npx prisma db push
   ```
5. Seed database tables:
   ```bash
   npm run prisma:seed
   ```
6. Start the API server in development hot-reload mode:
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:5000`.

#### 2. Start the Frontend Dashboard
1. Open a new terminal and navigate to the `frontend/` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   The frontend user interface will be accessible at `http://localhost:5173`.

---

## 📂 Project Architecture

```text
├── backend/
│   ├── prisma/
│   │   ├── dev.db             <-- Local SQLite database (auto-generated)
│   │   ├── schema.prisma      <-- Database schema definitions
│   │   └── seed.ts            <-- Seeder script (Populates demo users & products)
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.ts        <-- JWT authentication & role authorization gate
│   │   ├── routes/
│   │   │   ├── auth.ts        <-- POST /login & GET /me
│   │   │   ├── customers.ts   <-- CRUD & follow-up logs for CRM
│   │   │   ├── products.ts    <-- Inventory list, metadata editing, manual adjustment logs
│   │   │   └── challans.ts    <-- Sales challan confirmation, cancel state logic
│   │   ├── prisma.ts          <-- Shared Prisma Client instance
│   │   └── server.ts          <-- App entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx     <-- Header displaying user identity and role badge
│   │   │   └── Sidebar.tsx    <-- Navigation sidebar filtered by role access rules
│   │   ├── pages/
│   │   │   ├── Login.tsx      <-- Login page with quick autofill links for demo
│   │   │   ├── Dashboard.tsx  <-- KPI widget blocks displaying current business stats
│   │   │   ├── CRM.tsx        <-- Customer list, detail, and follow-up logging modal
│   │   │   ├── Products.tsx   <-- Stock catalogue list, alert filters, and manual stock log history
│   │   │   └── Challans.tsx   <-- Draft/Confirm challan transaction form and audit tools
│   │   ├── App.tsx            <-- Authentication state controller and router shell
│   │   ├── index.css          <-- Custom styles and color tokens
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml         <-- Orchestration configuration file
├── Postman_Collection.json    <-- Exported endpoints collection for Postman API testing
└── README.md                  <-- Setup guide
```

Here is your **exact same content with the correct ending**. Copy-paste this into your `README.md`:


# 🏗️ System Architecture

## Architecture Overview

The Mini ERP + CRM Operations Portal follows a **full-stack client-server architecture**.

The application consists of a React-based frontend, a Node.js and Express.js backend, JWT-based authentication with role-based access control, Prisma ORM for database access, and a relational database layer.

The frontend communicates with the backend through REST APIs. The backend validates authentication and user roles before processing requests through the appropriate API route.


## Architecture Diagram

<pre>
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT / FRONTEND                           │
│                                                                     │
│                         React + TypeScript                          │
│                                                                     │
│  ┌───────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   │
│  │  Login    │   │ Dashboard  │   │    CRM     │   │ Products & │   │
│  │   Page    │   │            │   │ Customers  │   │ Inventory  │   │
│  └───────────┘   └────────────┘   └────────────┘   └────────────┘   │
│                                                                     │
│                         ┌──────────────┐                            │
│                         │   Challans   │                            │
│                         │   Module     │                            │
│                         └──────────────┘                            │
│                                                                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                │ REST API Requests
                                │ + JWT Token
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND SERVER                              │
│                                                                     │
│                         Node.js + Express                           │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Authentication Layer                       │  │
│  │                                                               │  │
│  │                       JWT Authentication                      │  │
│  └───────────────────────────────┬───────────────────────────────┘  │
│                                  │                                  │
│                                  ▼                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    RBAC Middleware                            │  │
│  │                                                               │  │
│  │   Admin  │  Sales  │  Warehouse  │  Accounts                  │  │
│  └───────────────────────────────┬───────────────────────────────┘  │
│                                  │                                  │
│                                  ▼                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                         API Routes                            │  │
│  │                                                               │  │
│  │  ┌──────────┐  ┌────────────┐  ┌───────────┐  ┌────────────┐  │  │
│  │  │ Auth API │  │ Customer   │  │ Product / │  │  Challan   │  │  │
│  │  │          │  │ API        │  │ Inventory │  │  API       │  │  │
│  │  │          │  │            │  │ API       │  │            │  │  │
│  │  └──────────┘  └────────────┘  └───────────┘  └────────────┘  │  │
│  └───────────────────────────────┬───────────────────────────────┘  │
│                                  │                                  │
│                                  │ Database Operations              │
│                                  ▼                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                         Prisma ORM                            │  │
│  │                                                               │  │
│  │                 Database Access / Data Layer                  │  │
│  └───────────────────────────────┬───────────────────────────────┘  │
│                                  │                                  │
└──────────────────────────────────┼──────────────────────────────────┘
                                   │
                                   ▼
              ┌─────────────────────────────────────┐
              │              DATABASE               │
              │                                     │
              │       ┌──────────────────────┐      │
              │       │ SQLite               │      │
              │       │ Local Development    │      │
              │       └──────────────────────┘      │
              │                  │                  │
              │                  │ Production       │
              │                  ▼                  │
              │       ┌──────────────────────┐      │
              │       │ PostgreSQL           │      │
              │       │ Production Database  │      │
              │       └──────────────────────┘      │
              └─────────────────────────────────────┘
</pre>

---

### 2. Backend API (Render or Railway)
1. Push your code to a GitHub repository.
2. Sign in to **Render.com** and create a new **Web Service** linked to your repo.
3. Configure the settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx prisma db push && npm start`
4. Add the following **Environment Variables**:
   - `PORT` = `5000`
   - `JWT_SECRET` = `your-secure-random-key`
   - `DATABASE_URL` = *(Your PostgreSQL connection string)*

### 3. Frontend UI (Vercel or Netlify)
1. Sign in to **Vercel.com** and create a new project linked to your repo.
2. Configure the settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add the following **Environment Variable**:
   - `VITE_API_URL` = *(URL of your deployed backend service)*
4. Click **Deploy**.

---

## ⚠️ Known Limitations

1. **Local SQLite Database (Dev)**: By default, the application runs on SQLite. SQLite is a file-based database, meaning changes will reset if the Docker container is destroyed without persistent volume mounts. In production, PostgreSQL must be used.
2. **Local Session Authentication**: JWT tokens are stored in the client state and LocalStorage for demo ease. For high-security commercial applications, secure `HttpOnly` cookies are preferred.
3. **No Dynamic User Creation UI**: New users cannot be registered directly from the UI. User accounts must be created by database seeds or admin SQL scripts.
4. **Mocked Image Attachments**: AWS S3 image uploads are omitted to avoid setup friction/fees during grading.

