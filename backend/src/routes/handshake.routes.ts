import { Router } from "express";
import { initiateHandshake, acceptHandshake, rejectHandshake } from "../controllers/handshake.controller";
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authMiddleware, requireRole(['ADMIN', 'MANAGER']), initiateHandshake);
router.patch('/:id/accept', authMiddleware, requireRole(['ADMIN', 'MANAGER']), acceptHandshake); 
router.patch('/:id/reject', authMiddleware, requireRole(['ADMIN', 'MANAGER']), rejectHandshake);

export default router;