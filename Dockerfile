FROM node:22-alpine

WORKDIR /app

# Copy package manifest and source files
COPY package.json ./
COPY .env.example ./.env
COPY src ./src

# Create persistent data directory for transactional object store
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

CMD ["node", "src/server.js"]
