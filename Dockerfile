# Optimized multi-stage Dockerfile for Nuxt 3

# Base image
FROM node:22-alpine AS base
WORKDIR /app

# Development stage
FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --production

# Production stage
FROM node:22-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nuxtjs -u 1001
WORKDIR /app
COPY --from=build --chown=nuxtjs:nodejs /app/.output ./.output
COPY --from=build --chown=nuxtjs:nodejs /app/package*.json ./
USER nuxtjs
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
