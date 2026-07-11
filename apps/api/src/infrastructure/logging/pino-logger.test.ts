import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { PinoLogger } from './pino-logger.js';

function captureLogger(): { logger: pino.Logger; lines: () => unknown[] } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  const logger = pino({ level: 'info' }, stream);
  return { logger, lines: () => chunks.map((line) => JSON.parse(line)) };
}

describe('PinoLogger', () => {
  it('child() returns a Logger whose log lines carry the bound fields', () => {
    const { logger: rawLogger, lines } = captureLogger();
    const base = new PinoLogger(rawLogger, true);

    const child = base.child({ requestId: 'req-123' });
    child.info('hello');

    const [line] = lines();
    expect(line).toMatchObject({ requestId: 'req-123', msg: 'hello' });
  });
});
