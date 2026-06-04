# Architecture & Technical Specification: Glassboard

**System Overview:** Enterprise Workflow & Dependency Tracking System  
**Core Technologies:** Next.js, Node.js, PostgreSQL, Redis, Socket.io, BullMQ, Yjs (CRDTs)  
**Document Purpose:** System architecture, design decisions, and algorithmic implementations.

---

## 1. System Architecture and High-Level Design

Glassboard is engineered as a robust, real-time distributed application. It utilizes a monolithic backend architecture, carefully modularized to support future microservice extraction. 

The application is structured across three primary tiers, augmented by real-time synchronization and asynchronous event processing layers:

*   **Client Tier (Next.js):** A React-based frontend utilizing React Flow for directed acyclic graph (DAG) visualization, Recharts for analytics, and Yjs/TipTap for real-time collaborative document editing.
*   **Application Tier (Node.js/Express):** The core API server managing business logic, RBAC authentication, graph traversal algorithms, and real-time WebSocket state management.
*   **Persistence Tier (PostgreSQL):** A relational database managed via Prisma ORM, ensuring ACID compliance across complex entity relationships.
*   **Asynchronous Processing (Redis + BullMQ):** A message broker layer handling decoupled tasks, such as firing external webhooks upon handshake completion.

### 1.1 Architectural Decisions

**Relational Over Graph Database**  
Despite the core dependency mapping feature relying on a DAG structure, PostgreSQL was chosen over a dedicated graph database (like Neo4j). In practice, enterprise project dependency graphs are typically shallow (under 100 nodes per project). PostgreSQL handles these relations efficiently via junction tables, while providing superior performance for the highly relational administrative data (Users, Organizations, Audit Logs). Graph algorithms are executed in-memory within the Node.js application layer.

**Event-Driven Decoupling**  
To ensure high availability, synchronous API endpoints do not execute long-running or unreliable external tasks. For example, when a module handshake is approved, the API updates the database atomically and immediately pushes a `HANDSHAKE_APPROVED` event to the Redis queue. A detached BullMQ worker consumes this event and manages the external webhook delivery (e.g., to Slack), implementing exponential backoff on failure without blocking the client response.

---

## 2. Core Algorithmic Implementations

### 2.1 Cycle Detection in Directed Acyclic Graphs (DFS)
To maintain the integrity of the dependency graph, circular dependencies must be strictly prevented. When a user attempts to create a dependency (e.g., Module A depends on Module B), the system executes a Depth-First Search (DFS) starting from the target node. 

The algorithm explores all outbound edges to verify if a path exists back to the source node. If the DFS encounters the source node, a cycle is detected, and the transaction is aborted. A `visited` set optimizes traversal by ignoring previously evaluated nodes.

### 2.2 Critical Path Computation (Kahn's Algorithm & DP)
Identifying the longest sequence of dependent tasks determines the minimum baseline duration of the entire project. This is computed using a two-pass approach:
1.  **Topological Sort:** Kahn's Algorithm (BFS-based) maps the execution order based on in-degrees.
2.  **Longest Path Relaxation:** A dynamic programming pass calculates the maximum cumulative duration to reach each node. Backtracking from the node with the highest cumulative duration yields the exact Critical Path.

### 2.3 Real-Time Collaborative Editing via CRDTs
Module specifications often require simultaneous input from multiple stakeholders. To prevent document collision, Glassboard implements Conflict-free Replicated Data Types (CRDTs) using the `Yjs` framework. 
The Node.js server hosts a specialized `y-websocket` instance that synchronizes document state arrays across all connected clients in real time, resolving concurrent edits deterministically without centralized locking.

---

## 3. Data Integrity & State Management

### 3.1 The Digital Handshake State Machine
Inter-team task transfers utilize a strict state machine to enforce accountability. A module transitions through states: `IN_PROGRESS` $\rightarrow$ `PENDING_HANDSHAKE` $\rightarrow$ `ACCEPTED` or `REJECTED`. 

To prevent race conditions or data corruption during state transitions, Prisma database transactions are utilized. When a handshake is accepted, the handshake status, the module status, and an immutable `AuditLog` entry are written atomically. If any write fails, the entire transition rolls back.

### 3.2 SLA Escalation and Background Jobs
Handshakes idling in a pending state become bottlenecks. A `node-cron` background worker polls the database hourly. Handshakes exceeding the 24-hour Service Level Agreement (SLA) threshold are automatically escalated, triggering visual alerts on the frontend and emitting escalation events to the message broker.

---

## 4. Security, CI/CD, and DevOps

**Security Hardening**
*   **Authentication:** Stateless JWTs eliminate server-side session management overhead. Passwords are salted and hashed via `bcrypt`.
*   **RBAC Authorization:** JWT payloads contain user roles. Middlewares strictly enforce endpoint access based on granular permissions.
*   **Header & Traffic Management:** The Express application is protected by `helmet` to secure HTTP headers and `express-rate-limit` to mitigate brute-force and DDoS vectors.

**Continuous Integration and Deployment**
A comprehensive GitHub Actions pipeline ensures code quality and deployment reliability. Upon pushing to the primary branch, the CI/CD pipeline provisions an Ubuntu runner to install dependencies, execute linting checks, compile TypeScript, and finally build and push optimized Docker images to the container registry.

**API Documentation**
The backend integrates `swagger-ui-express` and `swagger-jsdoc` to automatically parse wildcard route annotations (`*.routes.ts`) into a live, interactive OpenAPI 3.0 specification interface, enabling seamless frontend-backend contract validation.
