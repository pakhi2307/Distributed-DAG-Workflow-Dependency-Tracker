import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const calculateCriticalPath = async (projectId: string): Promise<Set<string>> => {
    const modules = await prisma.module.findMany({
        where: { projectId },
        include: { dependencies: true },
    });

    if (modules.length == 0) return new Set();

    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const durations = new Map<string, number>();

    modules.forEach((mod) => {
        graph.set(mod.id, []);
        inDegree.set(mod.id, 0);

        let durationDays = 1;
        if (mod.expectedCompletionDate && mod.createdAt) {
            durationDays = Math.max(1, Math.ceil((mod.expectedCompletionDate.getTime() - mod.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
        }
        durations.set(mod.id, durationDays);
    });

    modules.forEach((mod) => {
        mod.dependencies.forEach((dep) => {
            graph.get(dep.dependsOnId)?.push(mod.id);
            inDegree.set(mod.id, (inDegree.get(mod.id) || 0) + 1);
        });
    });

    const queue: string[] = [];
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string | null>();
    
    for (const [nodeId, degree] of inDegree.entries()) {
        if (degree == 0) {
            queue.push(nodeId);
            distances.set(nodeId, durations.get(nodeId) || 1);
            predecessors.set(nodeId, null);
        } else {
            distances.set(nodeId, 0);
        }
    }

    while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbours = graph.get(current) || [];
        for (const neighbour of neighbours) {
            const newDistance = distances.get(current)! + (durations.get(neighbour) || 1);
            if (newDistance > (distances.get(neighbour) || 0)) {
                distances.set(neighbour, newDistance);
                predecessors.set(neighbour, current);
            }
            inDegree.set(neighbour, inDegree.get(neighbour)! - 1);
            if (inDegree.get(neighbour) === 0) {
                queue.push(neighbour);
            }
        }
    }

    let maxDistance = 0;
    let endNode: string | null = null;
    for (const [nodeId, distance] of distances.entries()) {
        if (distance > maxDistance) {
            maxDistance = distance;
            endNode = nodeId;
        }
    }

    const CriticalPathIds = new Set<string>();
    let current: string | null = endNode;

    while (current !== null) {
        CriticalPathIds.add(current);
        current = predecessors.get(current) || null;  
    }
    return CriticalPathIds;
};  