FROM node:22

WORKDIR /usr/src/app
RUN npm install -g pnpm@10.5.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/aggregator/package.json apps/aggregator/tsconfig.json ./apps/aggregator/
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY tsconfig.base.json ./
RUN pnpm install --filter aggregator...

COPY packages/shared/src ./packages/shared/src
RUN pnpm --filter shared build
COPY apps/aggregator/src ./apps/aggregator/src

CMD ["pnpm", "--filter", "aggregator", "dev"]