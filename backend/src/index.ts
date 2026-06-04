import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import orgRoutes from './routes/org.routes';
import projectRoutes from './routes/project.routes';
import moduleRoutes from './routes/module.routes';
import handshakeRoutes from './routes/handshake.routes';
import authRoutes from './routes/auth.routes';
import dependencyRoutes from './routes/dependency.routes';
import auditRoutes from './routes/audit.routes';
import analyticsRoutes from './routes/analytics.routes';
import inviteRoutes from './routes/invite.routes';
import { startSlaJob } from './services/slaJob';
import './services/queue.service'; // Boot queue and worker
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { setupSwagger } from './swaggerConfig';
import { WebSocketServer } from 'ws';
const { setupWSConnection } = require('y-websocket/bin/utils');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Set up rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Wrap Express in an HTTP server so Socket.io can attach to it
const httpServer = createServer(app);

// Initialize Socket.io with CORS
export const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Socket.io Room Management
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Client joins a "room" for a specific project to receive targeted updates
  socket.on('join-project', (projectId: string) => {
    socket.join(projectId);
    console.log(`📦 Socket ${socket.id} joined project room: ${projectId}`);
  });

  socket.on('leave-project', (projectId: string) => {
    socket.leave(projectId);
    console.log(`📦 Socket ${socket.id} left project room: ${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Start background jobs
startSlaJob();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limiter);

// Setup Swagger
setupSwagger(app);

// --- ROUTES ---
app.use('/api/organizations', orgRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/handshakes', handshakeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dependencies', dependencyRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/invites', inviteRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'Glassboard API is running smoothly! 🚀' });
});

// Use httpServer instead of app.listen so Socket.io works
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`⚡ Socket.io listening for real-time connections`);
});

// Yjs WebSocket Server attached to the same http server
const wss = new WebSocketServer({ server: httpServer, path: '/yjs' });
wss.on('connection', (ws, req) => {
  console.log('🔗 Yjs WebSocket connection established');
  setupWSConnection(ws, req);
});