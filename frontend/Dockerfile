FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Provide a placeholder API URL for the build step
# (the real value is injected at runtime via environment variables)
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# Build Next.js — skip lint & type-check (handled in the test-and-lint CI job)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Expose port and start
EXPOSE 3000
CMD ["npm", "start"]
