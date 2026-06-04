import { Router } from 'express';
import { getPredictiveAnalytics } from '../controllers/analytics.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/org/:orgId', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'MEMBER']), getPredictiveAnalytics);

export default router;
