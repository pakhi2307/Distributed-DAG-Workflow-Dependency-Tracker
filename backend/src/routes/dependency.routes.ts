import { Router } from 'express';
import { addDependency, getCriticalPath } from '../controllers/dependency.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authMiddleware, requireRole(['ADMIN', 'MANAGER']), addDependency);
router.get('/projects/:projectId/critical-path', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'MEMBER']), getCriticalPath);

export default router;