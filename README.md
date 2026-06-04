<div align="center">

# Glassboard

**Enterprise Workflow & Dependency Tracking System**

A full-stack distributed application designed to manage complex inter-team dependencies, enforce cryptographic handoffs, and compute critical project paths in real time.

[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?style=for-the-badge&logo=redis)](https://redis.io)

</div>

---

## Overview

In large engineering organizations, schedule slips are rarely caused by individual tasks, but rather by invisible inter-team dependencies. Glassboard exposes these bottlenecks by modeling project workflows as Directed Acyclic Graphs (DAGs). 

It enforces a strict "Digital Handshake" protocol between teams, dynamically calculates the critical path to completion, enables real-time collaborative documentation, and utilizes predictive analytics to forecast delays before they cascade.

## Technical Stack

*   **Frontend:** Next.js (React), Tailwind CSS, React Flow (DAG visualization), TipTap/Yjs (Collaborative Editing)
*   **Backend API:** Node.js, Express, TypeScript, Socket.io, y-websocket
*   **Database:** PostgreSQL with Prisma ORM
*   **Asynchronous Queue:** Redis + BullMQ
*   **Security & DevOps:** JWT, Helmet, Swagger, Docker, GitHub Actions (CI/CD)

---

## Core System Features

### 1. Directed Acyclic Graph (DAG) Engine
*   **Interactive Visualization:** Projects are rendered via `reactflow` with automatic node positioning powered by Dagre.
*   **Cycle Detection:** A Depth-First Search (DFS) algorithm actively prevents circular dependencies (e.g., A $\rightarrow$ B $\rightarrow$ C $\rightarrow$ A) during graph construction.
*   **Critical Path Computation:** Implements Kahn's Algorithm and dynamic programming to calculate and highlight the sequence of tasks determining the project's absolute minimum duration.

### 2. Digital Handshake Protocol & Audit Logging
*   Enforces a strict cryptographic state machine for task transfers (`IN_PROGRESS` $\rightarrow$ `PENDING` $\rightarrow$ `ACCEPTED`/`REJECTED`).
*   Atomic database transactions guarantee that state transitions and immutable audit logs are written simultaneously.
*   SLA background workers automatically escalate handshakes left pending beyond 24 hours.

### 3. Real-Time Distributed Architecture
*   **Socket.io Rooms:** Clients establish WebSocket connections isolated to specific project rooms, guaranteeing that UI updates (handshake approvals, new dependencies) propagate instantly without page reloads.
*   **Event-Driven Webhooks:** Heavy asynchronous tasks, such as firing Slack/Discord notifications upon task completion, are offloaded to a Redis-backed BullMQ message broker to preserve API response times.
*   **Collaborative Editing (CRDTs):** Module specifications feature Google Docs-style multiplayer editing, synchronized via `y-websocket` and Conflict-free Replicated Data Types (CRDTs).

### 4. Security & API Documentation
*   Fully integrated Role-Based Access Control (RBAC) via stateless JSON Web Tokens.
*   Production-grade security middlewares (`helmet` and `express-rate-limit`) protect against common attack vectors.
*   Live OpenAPI 3.0 documentation generated dynamically via Swagger UI.

---

## Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   PostgreSQL
*   Docker (for Redis container)

### Local Development Setup

**1. Clone and Boot Infrastructure**
```bash
git clone https://github.com/your-username/glassboard.git
cd glassboard
docker compose up -d  # Starts Redis
```

**2. Configure the Backend**
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/glassboard"
JWT_SECRET="super-secret-jwt-key"
REDIS_HOST=localhost
REDIS_PORT=6379
FRONTEND_URL=http://localhost:3000
WEBHOOK_URL=  # Optional: for testing BullMQ webhooks
```

**3. Database Provisioning & Seeding**
Push the schema to PostgreSQL and populate it with realistic mock data:
```bash
npx prisma db push
npx prisma db seed
```
*(The seed script provisions test accounts, notably `admin@acme.com` with password `password123`)*

**4. Start the Application Servers**
```bash
# In the backend directory:
npm run dev

# In a new terminal, navigate to the frontend directory:
cd frontend
npm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api" > .env.local
npm run dev
```

**5. Verification**
*   **Application:** Navigate to `http://localhost:3000`
*   **API Documentation:** Navigate to `http://localhost:5000/api-docs`

---

## License
MIT License. See `LICENSE` for more information.
