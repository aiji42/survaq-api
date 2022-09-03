FROM node:18-bullseye-slim as base

WORKDIR /app

FROM base as installer

COPY ./package.json ./yarn.lock ./
RUN yarn install

FROM installer as builder

COPY ./libs ./libs
COPY ./src ./src
COPY ./tsup.config.ts ./
RUN yarn build:server

FROM base as runner

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify
USER fastify

COPY --from=installer /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

CMD node dist/index.js
