FROM node:20-alpine AS base

FROM base AS deps

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

RUN npm install -g pnpm

COPY . .

RUN pnpm i --frozen-lockfile

FROM base AS builder
WORKDIR /app

RUN apk add --no-cache openssl

RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build

FROM base AS runner

WORKDIR /app

RUN apk add --no-cache openssl

RUN npm install -g pnpm

ENV NODE_ENV=production
ENV IS_DOCKER=true

RUN pnpm add npm-run-all dotenv prisma@5.17.0 @prisma/client@5.17.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

COPY scripts/check-db.js /app/scripts/check-db.js

RUN mkdir -p /app/data

EXPOSE 3000

ENV HOSTNAME=0.0.0.0
ENV PORT=3000

CMD ["pnpm", "start-docker"]
