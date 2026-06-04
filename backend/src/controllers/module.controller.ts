import { Request, Response } from 'express';
import { PrismaClient, Module, ModuleDependency } from '@prisma/client';
import { calculateCriticalPath } from '../services/graph.services';
import { io } from '../index';
const prisma = new PrismaClient();
export const createModule= async (req: Request, res: Response) => {
    try{
        const{ projectId, ownerId, title, expectedCompletionDate, status} = req.body;
        const NewModule= await prisma.module.create({
            data:{
                projectId: projectId,
                ownerId: ownerId,
                title: title,
                expectedCompletionDate: expectedCompletionDate,
                status: status
            },
        });
        res.status(201).json({ message: 'Module created successfully!', data: NewModule });
    }catch(error){
        console.error(error);
        res.status(500).json({ error: 'Failed to create module' });
    }
};

export const getModulesByProject = async (req: Request, res: Response) => {
    try {
        const projectId = req.params.projectId as string;
        const modules = await prisma.module.findMany({
            where: { projectId },
            include: { owner: { select: { id: true, name: true } } }
        });
        res.status(200).json(modules);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch modules' });
    }
};

export const getModuleById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const moduleData = await prisma.module.findUnique({
            where: { id },
            include: {
                owner: { select: { id: true, name: true, email: true } },
                incomingHandshakes: {
                    include: { initiatedBy: { select: { name: true } }, fromModule: { select: { title: true } } }
                },
                outgoingHandshakes: {
                    include: { initiatedBy: { select: { name: true } }, toModule: { select: { title: true } } }
                }
            }
        });
        if (!moduleData) {
            res.status(404).json({ error: 'Module not found' });
            return;
        }
        res.status(200).json(moduleData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch module' });
    }
};

type ModuleWithDependencies = Module & {
  dependencies: ModuleDependency[];
  outgoingHandshakes: any[];
  incomingHandshakes: any[];
};
export const getProjectGraph= async(req: Request, res:Response)=>{
    try{
         const projectId = req.params.projectId as string;

        const modules= await prisma.module.findMany({
            where:{projectId: projectId},
            include:{
                dependencies: true,
                outgoingHandshakes: true,
                incomingHandshakes: true
            },
        }) as ModuleWithDependencies[];

        const criticalPathIds = await calculateCriticalPath(projectId);
        const nodes = modules.map((mod: ModuleWithDependencies, index: number) => {
             const isCritical = criticalPathIds.has(mod.id);
             let borderColor = '#94a3b8';
      let borderWidth = '2px';
      
      if (isCritical) {
        borderColor = '#ef4444'; // Red!
        borderWidth = '4px';     // Thicker!
      } else if (mod.status === 'ACCEPTED') {
        borderColor = '#22c55e';
      } else if (mod.status === 'IN_PROGRESS') {
        borderColor = '#3b82f6';
      }

      return {
        id: mod.id,
        position: { x: 0, y: 0 }, // Dagre will overwrite this anyway
        data: { label: mod.title },
        style: {
          border: `${borderWidth} solid ${borderColor}`,
          borderRadius: '8px',
          padding: '10px',
          backgroundColor: isCritical ? '#fef2f2' : 'white', // Light red background if critical
          fontWeight: isCritical ? 'bold' : 'normal'
        },
      };
    });
        
        

        const edges: any[] = [];
        const drawnHandshakes = new Set<string>();
        
        modules.forEach((mod: ModuleWithDependencies) => {
             // Render planned dependencies (dep.dependsOnId -> mod.id)
             mod.dependencies.forEach((dep) => {
                // Check if a handshake exists for this dependency (flow is from dep.dependsOnId to mod.id)
                // So we need an incoming handshake to mod from dep.dependsOnId
                const handshake = mod.incomingHandshakes?.find(h => h.fromModuleId === dep.dependsOnId);
                const isCriticalEdge = criticalPathIds.has(mod.id) && criticalPathIds.has(dep.dependsOnId);
                
                let strokeColor = isCriticalEdge ? '#ef4444' : '#94a3b8'; // Red if critical, Grey if planned
                let animated = isCriticalEdge;

                // Override styles if handshake exists
                if (handshake) {
                    drawnHandshakes.add(handshake.id);
                    if (handshake.status === 'ACCEPTED') {
                        strokeColor = '#22c55e'; // Green
                        animated = isCriticalEdge;
                    } else if (handshake.status === 'PENDING') {
                        strokeColor = '#eab308'; // Yellow
                        animated = true;
                    } else if (handshake.status === 'REJECTED') {
                        strokeColor = '#ef4444'; // Red
                        animated = isCriticalEdge;
                    }
                }

                edges.push({
                    id: `e-${mod.id}-${dep.dependsOnId}`,
                    source: dep.dependsOnId,
                    target: mod.id,
                    animated: animated,
                    markerEnd: { type: 'arrowclosed', color: strokeColor },
                    style: { 
                        stroke: strokeColor, 
                        strokeWidth: isCriticalEdge ? 4 : 2 
                    },
                });
            });

            // Render handshakes that were initiated BY this module but don't have a formal dependency planned
            mod.outgoingHandshakes?.forEach(handshake => {
                if (!drawnHandshakes.has(handshake.id)) {
                    let strokeColor = '#eab308'; // Default pending yellow
                    if (handshake.status === 'ACCEPTED') strokeColor = '#22c55e';
                    if (handshake.status === 'REJECTED') strokeColor = '#ef4444';

                    edges.push({
                        id: `h-${handshake.id}`,
                        source: handshake.fromModuleId,
                        target: handshake.toModuleId,
                        animated: handshake.status === 'PENDING',
                        markerEnd: { type: 'arrowclosed', color: strokeColor },
                        style: { stroke: strokeColor, strokeWidth: 2 },
                    });
                }
            });
        });
    res.status(200).json({ nodes, edges });
    }catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch graph data' });
    }
};

export const updateModule = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { title, expectedCompletionDate, ownerId, status } = req.body;
        
        const existingModule = await prisma.module.findUnique({ where: { id } });
        if (!existingModule) {
            res.status(404).json({ error: 'Module not found' });
            return;
        }

        const updatedModule = await prisma.module.update({
            where: { id },
            data: {
                title: title !== undefined ? title : existingModule.title,
                expectedCompletionDate: expectedCompletionDate !== undefined ? (expectedCompletionDate ? new Date(expectedCompletionDate) : null) : existingModule.expectedCompletionDate,
                ownerId: ownerId !== undefined ? ownerId : existingModule.ownerId,
                status: status !== undefined ? status : existingModule.status
            }
        });

        io.to(updatedModule.projectId).emit('GRAPH_UPDATED', {
            type: 'MODULE_UPDATED',
            projectId: updatedModule.projectId,
            moduleId: id
        });

        res.status(200).json({ message: 'Module updated successfully!', data: updatedModule });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update module: ' + error.message });
    }
};

export const deleteModule = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const existingModule = await prisma.module.findUnique({ where: { id } });
        if (!existingModule) {
            res.status(404).json({ error: 'Module not found' });
            return;
        }

        await prisma.$transaction([
            prisma.moduleDependency.deleteMany({
                where: {
                    OR: [
                        { moduleId: id },
                        { dependsOnId: id }
                    ]
                }
            }),
            prisma.handshake.deleteMany({
                where: {
                    OR: [
                        { fromModuleId: id },
                        { toModuleId: id }
                    ]
                }
            }),
            prisma.module.delete({
                where: { id }
            })
        ]);

        io.to(existingModule.projectId).emit('GRAPH_UPDATED', {
            type: 'MODULE_DELETED',
            projectId: existingModule.projectId,
            moduleId: id
        });

        res.status(200).json({ message: 'Module deleted successfully!' });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete module: ' + error.message });
    }
};