import { createServer } from './composition-root.js';

const { app, prisma, env } = createServer();

const server = app.listen(env.API_PORT, () => {
  console.log(`StratIQ API listening on port ${env.API_PORT} (${env.NODE_ENV})`);
});

// Docker/orchestrators send SIGTERM before killing a container; closing the
// HTTP server and Prisma's connection pool here avoids dropped in-flight
// requests and leaked DB connections.
async function shutdown(): Promise<void> {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
