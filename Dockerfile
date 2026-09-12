# =====================================================================
# Abjad Agi — WhatsApp AI Agent
# Single-stage image. Runs as the non-root `node` user.
# =====================================================================
FROM node:20-bookworm-slim

# Build tools for native modules (better-sqlite3). Kept minimal.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching).
# We keep dev deps too: the app is run with `tsx` (TypeScript at runtime),
# which lives in devDependencies.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# App source.
COPY tsconfig.json ./
COPY src ./src
COPY prompts ./prompts

# Persistent data dirs — created and owned by `node` so that named
# volumes mounted here inherit the correct (non-root) ownership.
RUN mkdir -p /app/data /app/logs /app/whatsapp-auth \
    && chown -R node:node /app

# Set production AFTER install so devDependencies (tsx) are not skipped above.
ENV NODE_ENV=production

USER node

# Health check hits the internal health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const p=process.env.PORT||47850;require('http').get('http://127.0.0.1:'+p+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["npm", "run", "start"]
