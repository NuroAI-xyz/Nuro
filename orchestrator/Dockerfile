# Build context = REPO ROOT (this Dockerfile lives in orchestrator/ but expects
# to be built from the monorepo root so it can see the pnpm workspace).
# On Railway: Root Directory = repo root, Dockerfile Path = orchestrator/Dockerfile.

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

# --- install deps (all workspace manifests must be present for --frozen-lockfile) ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY data/package.json ./data/
COPY website/package.json ./website/
COPY docs/package.json ./docs/
COPY nuro_client/package.json ./nuro_client/
COPY orchestrator/package.json ./orchestrator/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @nuro/orchestrator...

# --- build ---
FROM deps AS build
COPY orchestrator ./orchestrator
RUN pnpm --config.verify-deps-before-run=false --filter @nuro/orchestrator build

# --- production deps only ---
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY data/package.json ./data/
COPY website/package.json ./website/
COPY docs/package.json ./docs/
COPY nuro_client/package.json ./nuro_client/
COPY orchestrator/package.json ./orchestrator/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter @nuro/orchestrator...

# --- runtime ---
FROM base
ENV NODE_ENV=production
COPY --from=prod-deps /app ./
COPY --from=build /app/orchestrator/dist ./orchestrator/dist
WORKDIR /app/orchestrator
EXPOSE 8787
CMD ["node", "dist/index.js"]
