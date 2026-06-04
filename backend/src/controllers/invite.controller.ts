import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const createInvite = async (req: Request, res: Response) => {
    try {
        const { role } = req.body;
        const actorId = (req as any).user?.id;
        const orgId = (req as any).user?.orgId;

        if (!['ADMIN', 'MANAGER', 'MEMBER'].includes(role)) {
            res.status(400).json({ error: 'Invalid role specified' });
            return;
        }

        const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // E.g., A1B2C3D4
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days

        const invite = await prisma.invite.create({
            data: {
                code,
                orgId,
                role,
                createdById: actorId,
                expiresAt,
            }
        });

        res.status(201).json({ message: 'Invite created', data: invite });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create invite' });
    }
};

export const getInvites = async (req: Request, res: Response) => {
    try {
        const orgId = (req as any).user?.orgId;

        const invites = await prisma.invite.findMany({
            where: { orgId, usedAt: null },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(invites);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch invites' });
    }
};
