# Nuro Website

Landing page and app for [nuroai.xyz](https://nuroai.xyz).

- Marketing and network overview
- OpenAI-compatible API entry point
- Browser worker and native worker flows

## Development

From the workspace root:

```bash
pnpm install
pnpm dev:website
```

Or from this directory:

```bash
pnpm dev
```

Available at `http://localhost:5173`.

## Build

```bash
pnpm run build
```

## Docker

From the `nuro/` workspace root:

```bash
docker build -f website/Dockerfile -t nuro-website .
docker run -p 3000:3000 nuro-website
```
