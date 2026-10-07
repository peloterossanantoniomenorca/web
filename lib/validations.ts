import { z } from 'zod';
export const paymentSchema=z.object({playerId:z.string().min(1),paymentDate:z.coerce.date()});
export const playerSchema=z.object({firstName:z.string().min(1).max(80),lastName:z.string().min(1).max(80),jerseyNumber:z.coerce.number().int().min(0).max(99),position:z.string().min(1).max(50),photoUrl:z.string().url().optional().or(z.literal(''))});
export const loginSchema=z.object({email:z.string().email(),password:z.string().min(8)});
