# ==========================================
# Stage 1: Builder
# Purpose: Install dependencies and build the TypeScript code
# ==========================================

# start build stage from Node Alpine base layer
FROM node:20-alpine3.17 AS builder

# Set default working directory for next instructions
WORKDIR /app

# Copy package files, adds package manifests into image layer. 
# This allows Docker to cache npm install step, so it only runs again if package.json or package-lock.json changes.
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for building)
# installs expact lockfile dependencies into node_modules, ensuring consistent builds
RUN npm ci

# Copy source code into image
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript to JavaScript
# produces static dist/ bundle via Vite
RUN npm run build

# ==========================================
# Stage 2: Production
# Purpose: Create minimal production image
# ==========================================

# creates a new minimal runtime stage with Nginx
FROM node:20-alpine3.17 AS production

# Install system dependencies for Playwright and Prisma
# Alpine 3.17 has OpenSSL 1.1 which Prisma needs
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    openssl

# Tell Playwright to use the system Chromium
# FIX THIS ERROR (using playwright, need to modify env vars)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ONLY production dependencies (no devDependencies)
# --omit=dev skips devDependencies, making image smaller
RUN npm ci --omit=dev

# Generate Prisma Client in production
RUN npx prisma generate

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security
# Running as root in containers is a security risk
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (documentation only, doesn't actually publish the port)
EXPOSE 3001

# Health check: Docker will ping /health every 30s
# If it fails 3 times, container is marked unhealthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
# Use node directly (not npm) for better signal handling
CMD ["node", "dist/index.js"]
