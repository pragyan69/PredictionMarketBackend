# Backend Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Development image
FROM base AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=development
EXPOSE 8081

CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mimiq

# Copy built files
COPY --from=builder --chown=mimiq:nodejs /app/dist ./dist
COPY --from=builder --chown=mimiq:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=mimiq:nodejs /app/package.json ./package.json

USER mimiq

EXPOSE 8081

ENV PORT=8081

CMD ["node", "dist/index.js"]
