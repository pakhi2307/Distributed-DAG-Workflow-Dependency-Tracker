import {Response, Request }from 'express';
import { PrismaClient } from '@prisma/client';
import { io } from '../index';
const prisma= new PrismaClient();

const wouldCreateCycle= async(startModuleId: string, targetDependencyId: string): Promise<boolean>=>{
    if(startModuleId==targetDependencyId) return true;
    const visited = new Set<string>();
    const checkDependencies= async(currentModuleId:string):Promise<boolean>=>{
        if(currentModuleId==startModuleId) return true;
        if(visited.has(currentModuleId)) return false;
        visited.add(currentModuleId);
        const dependencies=await prisma.moduleDependency.findMany({
            where:{moduleId: currentModuleId},
        });
        for(const dep of dependencies){
            const hasCycle=await checkDependencies(dep.dependsOnId);
            if(hasCycle) return true;
        }
        return false;
    };
    return await checkDependencies(targetDependencyId);
};

export const addDependency= async (req: Request, res: Response)=>{
    try{
        const{moduleId, dependsOnId}=req.body;
        const hasCycle=await wouldCreateCycle(moduleId, dependsOnId);
        if(hasCycle){ res.status(400).json({error:'Cannot add dependency: it would create a circular loop'});
    return;
}
const newDependency= await prisma.moduleDependency.create({
    data:{moduleId, dependsOnId}
});

// Find the project so we can broadcast to the right room
const module = await prisma.module.findUnique({ where: { id: moduleId } });
if (module) {
    io.to(module.projectId).emit('GRAPH_UPDATED', {
        type: 'DEPENDENCY_ADDED',
        projectId: module.projectId,
    });
}

res.status(201).json({message:'Dependency added successfully! DAG updated',
    data: newDependency
});
    }catch(error){
        console.error(error);
        res.status(500).json({error:'Failed to add dependency'});
    }
};

export const getCriticalPath = async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId as string;
        const modules = await prisma.module.findMany({
            where: { projectId },
            include: { dependencies: true }
        });

        const moduleMap = new Map();
        modules.forEach(m => {
            let durationDays = 1;
            if (m.expectedCompletionDate && m.createdAt) {
                durationDays = Math.max(1, Math.ceil((m.expectedCompletionDate.getTime() - m.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
            }
            moduleMap.set(m.id, {
                ...m,
                duration: durationDays,
                longestPathToHere: 0,
                previousModuleInPath: null
            });
        });

        // Topological sort (simple version using in-degree since it's a DAG)
        const inDegree = new Map();
        const adjList = new Map();
        
        modules.forEach(m => {
            if (!inDegree.has(m.id)) inDegree.set(m.id, 0);
            if (!adjList.has(m.id)) adjList.set(m.id, []);

            m.dependencies.forEach((dep: any) => {
                // dep.dependsOnId is the module this module depends on.
                // So execution flows from dependsOnId -> m.id
                const from = dep.dependsOnId;
                const to = m.id;
                
                if (!inDegree.has(from)) inDegree.set(from, 0);
                if (!adjList.has(from)) adjList.set(from, []);
                
                adjList.get(from).push(to);
                inDegree.set(to, (inDegree.get(to) || 0) + 1);
            });
        });

        const queue: string[] = [];
        for (const [id, degree] of inDegree.entries()) {
            if (degree === 0) {
                queue.push(id);
                const mod = moduleMap.get(id);
                if (mod) mod.longestPathToHere = mod.duration;
            }
        }

        const sorted = [];
        while (queue.length > 0) {
            const curr = queue.shift()!;
            sorted.push(curr);

            const currMod = moduleMap.get(curr);
            const neighbors = adjList.get(curr) || [];
            
            for (const neighbor of neighbors) {
                const neighborMod = moduleMap.get(neighbor);
                if (currMod && neighborMod) {
                    const candidateDist = currMod.longestPathToHere + neighborMod.duration;
                    if (candidateDist > neighborMod.longestPathToHere) {
                        neighborMod.longestPathToHere = candidateDist;
                        neighborMod.previousModuleInPath = curr;
                    }
                }
                
                inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }

        // Find the node with the maximum longestPathToHere
        let maxNodeId = null;
        let maxDist = -1;
        for (const [id, mod] of moduleMap.entries()) {
            if (mod.longestPathToHere > maxDist) {
                maxDist = mod.longestPathToHere;
                maxNodeId = id;
            }
        }

        // Backtrack to get the critical path
        const criticalPathIds = [];
        let currNode = maxNodeId;
        while (currNode) {
            criticalPathIds.push(currNode);
            const mod = moduleMap.get(currNode);
            currNode = mod?.previousModuleInPath || null;
        }
        criticalPathIds.reverse();

        res.status(200).json({ criticalPathIds, maxDuration: maxDist });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to calculate critical path' });
    }
};