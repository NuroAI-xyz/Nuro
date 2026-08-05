FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS development-dependencies-env
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY data/package.json ./data/
COPY website/package.json ./website/
RUN pnpm install --frozen-lockfile --filter nuro-data...

FROM base AS production-dependencies-env
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY data/package.json ./data/
COPY website/package.json ./website/
RUN pnpm install --frozen-lockfile --prod --filter nuro-data...

FROM base AS build-env
COPY . .
COPY --from=development-dependencies-env /app/node_modules ./node_modules
COPY --from=development-dependencies-env /app/data/node_modules ./data/node_modules
WORKDIR /app/data
RUN pnpm run build

FROM base
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY data/package.json ./data/
COPY website/package.json ./website/
COPY --from=production-dependencies-env /app/node_modules ./node_modules
COPY --from=production-dependencies-env /app/data/node_modules ./data/node_modules
COPY --from=build-env /app/data/build ./data/build
WORKDIR /app/data
CMD ["pnpm", "run", "start"]
