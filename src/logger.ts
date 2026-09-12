import pino from 'pino';
import fs from 'node:fs';
import { config } from './config.js';

// Ensure the logs directory exists.
try {
  fs.mkdirSync(config.paths.logs, { recursive: true });
} catch {
  /* ignore */
}

/**
 * Logger writes to:
 *  - stdout (captured by Docker; rotation handled by the json-file driver)
 *  - logs/app.log with size/daily rotation via pino-roll
 *
 * Secrets (API keys, tokens) must NEVER be passed to the logger.
 */
const baseOptions: pino.LoggerOptions = {
  level: config.logLevel,
  base: undefined, // drop pid/hostname noise
  timestamp: pino.stdTimeFunctions.isoTime,
};

const targets: pino.TransportTargetOptions[] = [
  {
    target: 'pino/file',
    level: config.logLevel,
    options: { destination: 1 }, // stdout
  },
  {
    target: 'pino-roll',
    level: config.logLevel,
    options: {
      file: `${config.paths.logs}/app.log`,
      frequency: 'daily',
      size: '10m',
      limit: { count: 14 },
      mkdir: true,
      dateFormat: 'yyyy-MM-dd',
    },
  },
];

function buildLogger(): pino.Logger {
  try {
    return pino(baseOptions, pino.transport({ targets }));
  } catch (err) {
    // Fall back to plain stdout logging if the file-rotation transport fails.
    // (stdout is still captured by Docker with json-file rotation.)
    const l = pino(baseOptions);
    l.warn('[LOGGER] file rotation transport unavailable, using stdout only: %s', (err as Error).message);
    return l;
  }
}

export const logger = buildLogger();

export type Logger = typeof logger;
