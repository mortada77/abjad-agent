import pino from 'pino';
import { Writable } from 'node:stream';
import fs from 'node:fs';
import { config } from './config.js';

try {
  fs.mkdirSync(config.paths.logs, { recursive: true });
} catch {
  /* ignore */
}

// In-memory ring buffer of recent log lines (reliable source for the dashboard,
// independent of file transports which can fail silently in containers).
const RING_MAX = 600;
const ring: string[] = [];
const memStream = new Writable({
  write(chunk, _enc, cb) {
    const s = chunk.toString();
    for (const line of s.split('\n')) if (line.trim()) ring.push(line);
    while (ring.length > RING_MAX) ring.shift();
    cb();
  },
});

export function recentLogs(n = 400): string {
  return ring.slice(-n).join('\n') || '(no logs yet)';
}

/**
 * Logger writes to stdout (captured by Docker json-file with rotation) and to
 * the in-memory ring above. Secrets must never be passed to the logger.
 */
export const logger = pino(
  {
    level: config.logLevel,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream([
    { stream: process.stdout, level: config.logLevel },
    { stream: memStream, level: config.logLevel },
  ]),
);

export type Logger = typeof logger;
