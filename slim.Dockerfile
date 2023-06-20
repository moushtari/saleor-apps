FROM node:18-alpine
WORKDIR /app

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

COPY apps/slack/public ./public
COPY apps/slack/.next/standalone ./
COPY apps/slack/.next/static ./.next/static

CMD [ "node", "apps/slack/server.js" ]
