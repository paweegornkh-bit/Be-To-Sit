import { prisma } from '../config/prisma.js';

export async function writeAudit({ userId, action, entity, entityId, ip }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId, ipAddress: ip }
    });
  } catch (e) { console.error('audit failed:', e.message); }
}
