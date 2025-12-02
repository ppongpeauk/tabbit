FROM oven/bun:1 AS base
WORKDIR /server

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code and config files
COPY tsconfig.json ./
COPY src ./src

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Start the server
CMD ["bun", "run", "start"]

