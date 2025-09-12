FROM node:22

WORKDIR /usr/src/app
RUN npm install -g pnpm@10.5.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
COPY tsconfig.base.json ./
RUN pnpm install --filter api...

COPY apps/api/src ./apps/api/src

CMD ["pnpm", "--filter", "api", "dev"]
