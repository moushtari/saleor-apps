FROM node:18-alpine AS base

FROM base AS builder
WORKDIR /app
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

COPY . .

RUN yarn global add pnpm
RUN pnpm i --frozen-lockfile
RUN cd apps/slack && pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/slack/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/slack/public ./apps/slack/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/slack/.next/static ./apps/slack/.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "apps/slack/server.js"]
