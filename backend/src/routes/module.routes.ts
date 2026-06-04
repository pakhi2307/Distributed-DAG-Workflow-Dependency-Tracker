import { Router } from 'express';
import { createModule, getProjectGraph, getModulesByProject, getModuleById, updateModule, deleteModule } from '../controllers/module.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authMiddleware, requireRole(['ADMIN', 'MANAGER']), createModule);
router.get('/graph/:projectId', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'MEMBER']), getProjectGraph);
router.get('/project/:projectId', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'MEMBER']), getModulesByProject);
router.get('/:id', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'MEMBER']), getModuleById);
router.put('/:id', authMiddleware, requireRole(['ADMIN', 'MANAGER']), updateModule);
router.delete('/:id', authMiddleware, requireRole(['ADMIN', 'MANAGER']), deleteModule);

export default router;