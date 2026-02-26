# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build TypeScript
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runner
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy compiled JS
COPY --from=build /app/dist ./dist

# Copy schema.sql (read at runtime by db/index.js)
COPY src/db/schema.sql ./dist/db/schema.sql

EXPOSE 3001
ENV PORT=3001
CMD ["node", "dist/index.js"]
