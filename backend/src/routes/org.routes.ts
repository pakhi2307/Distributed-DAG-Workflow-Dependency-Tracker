import { Router } from 'express';
import { createOrganization, getOrganizations, getOrganizationById } from '../controllers/org.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', createOrganization); // Registration-like, no auth required
router.get('/', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'MEMBER']), getOrganizations);
router.get('/:id', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'MEMBER']), getOrganizationById);

export default router;