import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/notifications', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'MEMBER']), getAuditLogs);

export default router;
