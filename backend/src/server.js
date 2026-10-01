import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

const server = app.listen(env.port, () =>
  console.log(`🚀 TableTime API [${env.nodeEnv}] → http://localhost:${env.port}`));

const shutdown = async (sig) => {
  console.log(`\n${sig} received, shutting down...`);
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
};
['SIGTERM', 'SIGINT'].forEach((s) => process.on(s, () => shutdown(s)));
