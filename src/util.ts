/** Sleep helper. */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Race a promise against a timeout. */
export async function withTimeout<T>(p: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Retry with exponential backoff + jitter. */
export async function retry<T>(
  fn: () => Promise<T>,
  opts: { retries: number; baseMs?: number; maxMs?: number; onRetry?: (attempt: number, err: Error) => void },
): Promise<T> {
  const baseMs = opts.baseMs ?? 800;
  const maxMs = opts.maxMs ?? 8000;
  let lastErr: Error | undefined;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err as Error;
      if (attempt === opts.retries) break;
      const delay = Math.min(baseMs * 2 ** attempt + Math.random() * 300, maxMs);
      opts.onRetry?.(attempt + 1, lastErr);
      await sleep(delay);
    }
  }
  throw lastErr ?? new Error('retry failed');
}

/** Simple global concurrency limiter (semaphore). */
export class Semaphore {
  private queue: (() => void)[] = [];
  private active = 0;
  constructor(private readonly max: number) {}

  async acquire(): Promise<() => void> {
    if (this.active < this.max) {
      this.active++;
      return () => this.release();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve(() => this.release());
      });
    });
  }

  private release() {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}
