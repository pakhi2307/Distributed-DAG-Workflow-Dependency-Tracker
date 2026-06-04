import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { hash } from 'node:crypto';

const prisma = new PrismaClient();

export const createOrganization = async (req: Request, res: Response) => {
  try {
    const { name, adminName, adminEmail, adminPassword } = req.body;

    const salt= await bcrypt.genSalt(10);
    const hashedPassword= await bcrypt.hash(adminPassword || 'defaultpass000', salt);

    // Prisma Magic: Create the Org AND the User in one single database transaction!
    const newOrg = await prisma.organization.create({
      data: {
        name: name,
        users: {
          create: {
            name: adminName,
            email: adminEmail,
            password: hashedPassword,
            role: 'ADMIN', // The first person to make the org becomes the Admin
          },
        },
      },
      include: {
        users: true, // Tell Prisma to return the newly created user in the response
      },
    });

    res.status(201).json({
      message: 'Organization and Admin created successfully!',
      data: newOrg,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
};

export const getOrganizations = async (req: Request, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany();
    res.status(200).json(orgs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
};

export const getOrganizationById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        projects: true,
        users: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }
    res.status(200).json(org);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
};