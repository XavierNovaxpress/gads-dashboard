FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

# Build frontend + server
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server source (we run with tsx in prod for simplicity, or use compiled)
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist-server ./dist-server

# Copy data folder
COPY data/ ./data/

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist-server/index.js"]
