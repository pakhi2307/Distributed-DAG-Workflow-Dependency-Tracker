import {Response, Request } from 'express';
import { PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
const prisma= new PrismaClient();

export const register= async (req:Request, res:Response)=>{
    try{
        const{orgId, name,email, password, role}=req.body;

        const existingUser= await prisma.user.findUnique({where: {email}});
        if(existingUser){
            res.status(400).json({error:'User with this email already exists'});
            return;
        }
        const salt=await bcrypt.genSalt(10);
        const hashedPassword= await bcrypt.hash(password,salt);

        const newUser= await prisma.user.create({
            data:{
                orgId,
                name,
                email,
                password: hashedPassword,
                role: role || 'MEMBER',
            },
        });
        res.status(201).json({message:'User registered successfully'});
    }catch(error){
        console.error(error);
        res.status(500).json({error:'Failed to register user'});
    }
};

export const login= async (req: Request, res: Response)=>   {
    try{
        const{email,password}=req.body;
        const JWT_SECRET=process.env.JWT_SECRET || 'secret';

        const user= await prisma.user.findUnique({where: {email}});
        if(!user){
            res.status(400).json({error:'Invalid credentials' });
            return;
        }

        const isMatch= await bcrypt.compare(password, user.password);
        if(!isMatch){
            res.status(400).json({error: 'Invalid credentials'});
            return;
        }
        const token= jwt.sign({id:user.id, orgId: user.orgId, role:user.role}, JWT_SECRET,{expiresIn: '24h'});
        res.status(200).json({message:'Login successful', token,user:{id: user.id, name:user.name, role: user.role, orgId: user.orgId}});

    }catch(error){
        console.error(error);
        res.status(500).json({error: 'Failed to login'});
    }
};

export const join = async (req: Request, res: Response) => {
    try {
        const { name, email, password, inviteCode } = req.body;
        
        const invite = await prisma.invite.findUnique({ where: { code: inviteCode } });
        if (!invite) {
            res.status(400).json({ error: 'Invalid invite code' });
            return;
        }
        if (invite.usedAt || invite.expiresAt < new Date()) {
            res.status(400).json({ error: 'Invite code has expired or already been used' });
            return;
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: 'User with this email already exists' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    orgId: invite.orgId,
                    name,
                    email,
                    password: hashedPassword,
                    role: invite.role,
                }
            });

            await tx.invite.update({
                where: { id: invite.id },
                data: { usedAt: new Date(), usedById: user.id }
            });

            return user;
        });
        
        const JWT_SECRET = process.env.JWT_SECRET || 'secret';
        const token = jwt.sign({ id: newUser.id, orgId: newUser.orgId, role: newUser.role }, JWT_SECRET, { expiresIn: '24h' });
        
        res.status(201).json({
            message: 'Joined successfully',
            token,
            user: { id: newUser.id, name: newUser.name, role: newUser.role, orgId: newUser.orgId }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to join organization' });
    }
};