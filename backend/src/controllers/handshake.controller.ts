import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { glassboardQueue } from '../services/queue.service';
import { io } from '../index';

const prisma = new PrismaClient();

export const initiateHandshake = async (req: Request, res: Response) => {
  try {
    const { fromModuleId, toModuleId, proofUrl } = req.body;
    const initiatedById = (req as any).user?.id;
    const newHandshake = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const handshake = await tx.handshake.create({
        data: { fromModuleId, toModuleId, initiatedById, proofUrl, status: 'PENDING' }
      });
      await tx.module.update({
        where: { id: fromModuleId },
        data: { status: 'PENDING_HANDSHAKE' }
      });
      await tx.auditLog.create({
        data: {
          entityType: 'HANDSHAKE',
          entityId: handshake.id,
          action: 'INITIATED',
          actorId: initiatedById
        }
      });
      return handshake;
    });

    // Fetch project info to determine which room to notify
    const fromModule = await prisma.module.findUnique({ where: { id: fromModuleId } });
    if (fromModule) {
      io.to(fromModule.projectId).emit('GRAPH_UPDATED', {
        type: 'HANDSHAKE_INITIATED',
        projectId: fromModule.projectId,
      });
    }

    res.status(201).json({ message: 'Handshake initiated successfully!', data: newHandshake });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to initiate handshake' });
  }
};

export const acceptHandshake = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const actorId = (req as any).user?.id;

    const updatedHandshake = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const handshake = await tx.handshake.findUnique({ where: { id } });
      if (!handshake) throw new Error('Handshake not found');

      const accepted = await tx.handshake.update({
        where: { id },
        data: { status: 'ACCEPTED', resolvedAt: new Date() }
      });
      await tx.module.update({
        where: { id: handshake.fromModuleId },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });
      await tx.auditLog.create({
        data: {
          entityType: 'HANDSHAKE',
          entityId: handshake.id,
          action: 'ACCEPTED',
          actorId: actorId
        }
      });
      return accepted;
    });

    // Fetch module info for the event payload
    const fromModule = await prisma.module.findUnique({ where: { id: updatedHandshake.fromModuleId } });
    const toModule = await prisma.module.findUnique({ where: { id: updatedHandshake.toModuleId } });
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });

    // 1. Publish event to BullMQ (fires the webhook asynchronously)
    await glassboardQueue.add('HANDSHAKE_APPROVED', {
      handshakeId: updatedHandshake.id,
      fromModuleTitle: fromModule?.title || 'Unknown',
      toModuleTitle: toModule?.title || 'Unknown',
      projectId: fromModule?.projectId,
      actorName: actor?.name || 'Someone',
    });

    // 2. Emit real-time WebSocket event to all clients in the project room
    if (fromModule) {
      io.to(fromModule.projectId).emit('GRAPH_UPDATED', {
        type: 'HANDSHAKE_ACCEPTED',
        projectId: fromModule.projectId,
        handshakeId: id,
      });
    }

    res.status(200).json({ message: 'Handshake accepted!', data: updatedHandshake });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to accept handshake' });
  }
};

export const rejectHandshake = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const actorId = (req as any).user?.id;

    const updatedHandshake = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const handshake = await tx.handshake.findUnique({ where: { id } });
      if (!handshake) throw new Error('Handshake not found');

      const rejected = await tx.handshake.update({
        where: { id },
        data: { status: 'REJECTED', resolvedAt: new Date() }
      });
      await tx.module.update({
        where: { id: handshake.fromModuleId },
        data: { status: 'IN_PROGRESS' }
      });
      await tx.auditLog.create({
        data: {
          entityType: 'HANDSHAKE',
          entityId: handshake.id,
          action: 'REJECTED',
          actorId: actorId
        }
      });
      return rejected;
    });

    // Fetch module info for the event payload
    const fromModule = await prisma.module.findUnique({ where: { id: updatedHandshake.fromModuleId } });
    const toModule = await prisma.module.findUnique({ where: { id: updatedHandshake.toModuleId } });
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });

    // 1. Publish rejection event to BullMQ
    await glassboardQueue.add('HANDSHAKE_REJECTED', {
      handshakeId: updatedHandshake.id,
      fromModuleTitle: fromModule?.title || 'Unknown',
      toModuleTitle: toModule?.title || 'Unknown',
      projectId: fromModule?.projectId,
      actorName: actor?.name || 'Someone',
    });

    // 2. Emit real-time WebSocket event
    if (fromModule) {
      io.to(fromModule.projectId).emit('GRAPH_UPDATED', {
        type: 'HANDSHAKE_REJECTED',
        projectId: fromModule.projectId,
        handshakeId: id,
      });
    }

    res.status(200).json({ message: 'Handshake rejected!', data: updatedHandshake });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject handshake' });
  }
};