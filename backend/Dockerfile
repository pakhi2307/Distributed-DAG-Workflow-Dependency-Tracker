FROM node:20-alpine

WORKDIR /app

# Install OpenSSL — required by Prisma's native query engine on Alpine Linux
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and prisma schema
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port and start
EXPOSE 5000
CMD ["npx", "ts-node", "src/index.ts"]
