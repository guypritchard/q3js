# --- Build Stage ---
FROM node:22.11.0 AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# --- Production Stage ---
FROM node:22.11.0

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN NODE_OPTIONS=--dns-result-order=ipv4first \
    npm i -g pm2

# Copy only the necessary build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["pm2-runtime", "server.js", "--name", "q3js-website", "-i", "max"]
