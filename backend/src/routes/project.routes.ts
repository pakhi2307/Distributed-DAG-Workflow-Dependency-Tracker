import { Router } from 'express';
import { CreateProject, getProjectsByOrg, getProjectById, getDashboardStats } from '../controllers/project.controller';
import { authMiddleware, requireRole } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project (Admin only)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created successfully
 */
router.post('/', authMiddleware, requireRole(['ADMIN']), CreateProject);

/**
 * @swagger
 * /api/projects/stats:
 *   get:
 *     summary: Get dashboard statistics for the organization
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization statistics
 */
router.get('/stats', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'MEMBER']), getDashboardStats);

/**
 * @swagger
 * /api/projects/org/{orgId}:
 *   get:
 *     summary: Get all projects for a specific organization
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: List of projects
 */
router.get('/org/:orgId', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'MEMBER']), getProjectsByOrg);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get detailed project information by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project details
 *       404:
 *         description: Project not found
 */
router.get('/:id', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'MEMBER']), getProjectById);

export default router;