import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const orgId = (req as any).user?.orgId;
    if (!orgId) {
      res.status(401).json({ error: 'Unauthorized: missing orgId in token' });
      return;
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        actor: {
          orgId: orgId
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
      include: {
        actor: {
          select: { name: true }
        }
      }
    });

    const formattedLogs = logs.map(log => {
      let type = 'INFO';
      if (log.action === 'ACCEPTED') type = 'SUCCESS';
      if (log.action === 'REJECTED') type = 'ERROR';
      if (log.action === 'INITIATED') type = 'PENDING';
      
      return {
        id: log.id,
        type: type,
        message: `${log.actor.name} ${log.action.toLowerCase()} a ${log.entityType.toLowerCase()}`,
        date: log.timestamp
      };
    });

    res.status(200).json(formattedLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};
