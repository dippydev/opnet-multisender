# Stage 1: Install dependencies
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build TypeScript
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runner
FROM node:22-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy compiled JS
COPY --from=build /app/dist ./dist

# Copy schema.sql (read at runtime by db/index.js)
COPY src/db/schema.sql ./dist/db/schema.sql

EXPOSE 3001
ENV PORT=3001
CMD ["node", "dist/index.js"]
