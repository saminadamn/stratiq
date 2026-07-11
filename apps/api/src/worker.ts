import { createWorker } from './composition-root.js';

const { worker, prisma, logger } = await createWorker();
logger.info('Report worker listening');

async function shutdown(): Promise<void> {
  logger.info('Shutting down worker');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
