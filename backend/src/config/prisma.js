import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

export const prisma = new PrismaClient({
  log: env.isProd ? ['error'] : ['query', 'warn', 'error']
});
