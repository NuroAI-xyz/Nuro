FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS development-dependencies-env
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY data/package.json ./data/
COPY website/package.json ./website/
RUN pnpm install --frozen-lockfile --filter nuro-website...

FROM base AS production-dependencies-env
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY data/package.json ./data/
COPY website/package.json ./website/
RUN pnpm install --frozen-lockfile --prod --filter nuro-website...

FROM base AS build-env
COPY . .
COPY --from=development-dependencies-env /app/node_modules ./node_modules
COPY --from=development-dependencies-env /app/website/node_modules ./website/node_modules
WORKDIR /app/website
RUN pnpm run build

FROM base
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY data/package.json ./data/
COPY website/package.json ./website/
COPY --from=production-dependencies-env /app/node_modules ./node_modules
COPY --from=production-dependencies-env /app/website/node_modules ./website/node_modules
COPY --from=build-env /app/website/build ./website/build
WORKDIR /app/website
CMD ["pnpm", "run", "start"]
