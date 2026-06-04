import { Request, Response} from 'express';
import {PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const CreateProject = async (req: Request, res: Response) => {
    try{
        const{ name, status } = req.body;
        const orgId = (req as any).user?.orgId;
        
        console.log("CreateProject payload:", req.body, "User orgId:", orgId);
        
        if (!orgId) {
            res.status(401).json({ error: 'Unauthorized: missing orgId in token' });
            return;
        }
        
        if (!name) {
            res.status(400).json({ error: 'Project name is required' });
            return;
        }

        const newProject = await prisma.project.create({
            data: {
                orgId: orgId,
                name: name,
                status: status || 'ACTIVE'
            },
        });
        res.status(201).json({ message: 'Project created successfully!', data: newProject });
    } catch(error: any){
        console.error("CreateProject Error:", error);
        res.status(500).json({error: 'Failed to create project: ' + (error.message || 'Unknown error')});
    }
};

export const getProjectsByOrg = async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user?.orgId;
        if (!orgId) {
            res.status(401).json({ error: 'Unauthorized: missing orgId in token' });
            return;
        }
        console.log("Fetching projects for orgId:", orgId);
        
        const projects = await prisma.project.findMany({
            where: { orgId }
        });
        res.status(200).json(projects);
    } catch(error) {
        console.error("getProjectsByOrg Error:", error);
        res.status(500).json({error: 'Failed to fetch projects'});
    }
};

export const getProjectById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const project = await prisma.project.findUnique({
            where: { id },
            include: { modules: true }
        });
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.status(200).json(project);
    } catch(error) {
        console.error(error);
        res.status(500).json({error: 'Failed to fetch project'});
    }
};

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user?.orgId;
        if (!orgId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const [activeProjects, pendingHandshakes, completedModules] = await Promise.all([
            prisma.project.count({
                where: { orgId, status: 'ACTIVE' }
            }),
            prisma.handshake.count({
                where: {
                    status: 'PENDING',
                    fromModule: { project: { orgId } }
                }
            }),
            prisma.module.count({
                where: {
                    status: 'COMPLETED',
                    project: { orgId }
                }
            }),
        ]);

        res.status(200).json({ activeProjects, pendingHandshakes, completedModules });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};