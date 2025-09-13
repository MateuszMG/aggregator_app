FROM node:22

WORKDIR /usr/src/app
RUN npm install -g pnpm@10.5.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY tsconfig.base.json ./
RUN pnpm install --filter api...

COPY packages/shared/src ./packages/shared/src
RUN pnpm --filter shared build
COPY apps/api/src ./apps/api/src

CMD ["pnpm", "--filter", "api", "dev"]