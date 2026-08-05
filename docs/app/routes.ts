import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/introduction.tsx"),
  route("how-it-works", "routes/how-it-works.tsx"),
  route("quickstart", "routes/quickstart.tsx"),
  route("sharded-inference", "routes/sharded-inference.tsx"),
  route("sealed-wire", "routes/sealed-wire.tsx"),
  route("correctness", "routes/correctness.tsx"),
  route("adversary", "routes/adversary.tsx"),
  route("privacy-receipts", "routes/privacy-receipts.tsx"),
  route("proof-gates", "routes/proof-gates.tsx"),
  route("swarm", "routes/swarm.tsx"),
  route("workers", "routes/workers.tsx"),
  route("token", "routes/token.tsx"),
  route("economics", "routes/economics.tsx"),
  route("roadmap", "routes/roadmap.tsx"),
  route("glossary", "routes/glossary.tsx"),
] satisfies RouteConfig;
