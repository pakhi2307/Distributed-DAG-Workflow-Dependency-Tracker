import { Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getPredictiveAnalytics = async (req: Request, res: Response) => {
    try {
        const orgId = req.params.orgId as string;

        // 1. Calculate Average Completion Time for all completed modules
        const completedModules = await prisma.module.findMany({
            where: {
                project: { orgId },
                status: 'COMPLETED',
                completedAt: { not: null }
            }
        });

        let totalDuration = 0;
        let averageDuration = 0;
        if (completedModules.length > 0) {
            completedModules.forEach(m => {
                const start = m.createdAt.getTime();
                const end = m.completedAt!.getTime();
                totalDuration += (end - start);
            });
            averageDuration = totalDuration / completedModules.length;
        }

        // Convert averageDuration to days (if valid, else default to 0)
        const avgDays = averageDuration > 0 ? averageDuration / (1000 * 60 * 60 * 24) : 0;

        // 2. Identify modules at risk
        const inProgressModules = await prisma.module.findMany({
            where: {
                project: { orgId },
                status: 'IN_PROGRESS',
            },
            include: {
                project: true,
                owner: true
            }
        });

        const atRiskModules = inProgressModules.filter((m: any) => {
            if (!m.expectedCompletionDate || avgDays === 0) return false; // Don't predict if no historical data
            
            const expectedMs = m.expectedCompletionDate.getTime();
            const startedMs = m.createdAt.getTime();
            const predictedEndMs = startedMs + (avgDays * 1000 * 60 * 60 * 24);
            
            // If the predicted end is after the expected deadline, it's at risk
            return predictedEndMs > expectedMs;
        }).map((m: any) => ({
            id: m.id,
            title: m.title,
            projectName: m.project.name,
            ownerName: m.owner.name,
            expectedCompletionDate: m.expectedCompletionDate,
            createdAt: m.createdAt,
            delayFactor: "Statistically likely to delay based on historical average."
        }));

        res.status(200).json({
            historicalAverageDays: Math.round(avgDays * 10) / 10,
            completedCount: completedModules.length,
            atRiskModules
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate analytics' });
    }
};
