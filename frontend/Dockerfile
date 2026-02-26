# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Vite inlines VITE_* env vars at build time — must use ENV after ARG
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

ARG VITE_RPC_URL
ENV VITE_RPC_URL=$VITE_RPC_URL

ARG VITE_NETWORK
ENV VITE_NETWORK=$VITE_NETWORK

ARG VITE_MULTISENDER_CONTRACT
ENV VITE_MULTISENDER_CONTRACT=$VITE_MULTISENDER_CONTRACT

RUN npm run build

# Stage 3: Serve with nginx
FROM nginx:alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html

# SPA fallback: route all paths to index.html
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
