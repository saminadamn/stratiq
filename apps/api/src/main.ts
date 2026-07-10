import { createServer } from './composition-root.js';

const { app, prisma, env, logger } = await createServer();

const server = app.listen(env.API_PORT, () => {
  logger.info('StratIQ API listening', { port: env.API_PORT, env: env.NODE_ENV });
});

// Docker/orchestrators send SIGTERM before killing a container; closing the
// HTTP server and Prisma's connection pool here avoids dropped in-flight
// requests and leaked DB connections.
async function shutdown(): Promise<void> {
  logger.info('Shutting down');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
