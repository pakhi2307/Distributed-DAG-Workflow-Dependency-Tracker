import { Router } from 'express';
import { createInvite, getInvites } from '../controllers/invite.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authMiddleware, requireRole(['ADMIN', 'MANAGER']), createInvite);
router.get('/', authMiddleware, requireRole(['ADMIN', 'MANAGER']), getInvites);

export default router;
