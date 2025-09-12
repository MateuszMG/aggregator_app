FROM node:22

WORKDIR /usr/src/app
RUN npm install -g pnpm@10.5.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/aggregator/package.json apps/aggregator/tsconfig.json ./apps/aggregator/
COPY tsconfig.base.json ./
RUN pnpm install --filter aggregator...

COPY apps/aggregator/src ./apps/aggregator/src

CMD ["pnpm", "--filter", "aggregator", "dev"]
