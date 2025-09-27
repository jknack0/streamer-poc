FROM node:20-alpine AS base
WORKDIR /app
ARG VITE_API_URL=http://localhost:3000
ARG VITE_SOCKET_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# Install dependencies for root, client, and api
COPY package*.json ./
COPY client/package*.json client/
COPY api/package*.json api/
RUN npm run install:all

# Copy source and build client
COPY . .
RUN npm run build

# Remove dev dependencies to slim final image
RUN npm prune --omit=dev
ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "run", "start:production", "--prefix", "api"]
