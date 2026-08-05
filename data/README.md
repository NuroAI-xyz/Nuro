# Nuro Data

Public network data dashboard for [data.nuroai.xyz](https://data.nuroai.xyz).

- Inference volume and token metering
- Contributor activity
- Settlement and treasury metrics

No prompt or response content is shown - only aggregate network data.

## Development

From the workspace root:

```bash
pnpm install
pnpm dev:data
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
docker build -f data/Dockerfile -t nuro-data .
docker run -p 3000:3000 nuro-data
```
