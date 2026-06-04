import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Run every hour
export const startSlaJob = () => {
    cron.schedule('0 * * * *', async () => {
        console.log('[SLA Job] Running check for delayed handshakes...');
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // Find all pending handshakes older than 24 hours
            const delayedHandshakes = await prisma.handshake.findMany({
                where: {
                    status: 'PENDING',
                    createdAt: {
                        lt: twentyFourHoursAgo
                    }
                }
            });

            for (const handshake of delayedHandshakes) {
                // Escalate
                await prisma.handshake.update({
                    where: { id: handshake.id },
                    data: { status: 'ESCALATED' }
                });

                // Create an audit log
                await prisma.auditLog.create({
                    data: {
                        entityType: 'Handshake',
                        entityId: handshake.id,
                        action: 'ESCALATED_SLA_BREACH',
                        actorId: handshake.initiatedById, // Or a system user ID
                    }
                });

                console.log(`[SLA Job] Escalated Handshake ${handshake.id}`);
            }

            if (delayedHandshakes.length === 0) {
                console.log('[SLA Job] No delayed handshakes found.');
            } else {
                console.log(`[SLA Job] Escalated ${delayedHandshakes.length} handshakes.`);
            }
        } catch (error) {
            console.error('[SLA Job] Error running job:', error);
        }
    });
    
    console.log('[SLA Job] Scheduled to run every hour.');
};
