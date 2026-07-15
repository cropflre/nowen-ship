FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat \
  && corepack enable \
  && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY apps/server apps/server

RUN pnpm --filter nowen-release-hub-server prisma:generate \
  && pnpm --filter nowen-release-hub-server build

WORKDIR /app/apps/server

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3001/api/health/live >/dev/null || exit 1

CMD ["sh", "-c", "pnpm prisma:migrate:deploy && pnpm start"]
