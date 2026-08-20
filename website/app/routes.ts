import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("assistant", "routes/assistant.tsx"),
  route("earn", "routes/earn.tsx"),
  route("playground", "routes/playground.tsx"),
  route("staking", "routes/staking.tsx"),
  route("treasury", "routes/treasury.tsx"),
  route("profile", "routes/profile.tsx"),

  // Server-only resource routes (no UI): the assistant proxy + billing.
  route("api/chat", "routes/api.chat.ts"),
  route("api/entitlements", "routes/api.entitlements.ts"),
  route("api/credits", "routes/api.credits.ts"),
  // Same-origin passthrough to the orchestrator (kills CORS, hides the host).
  route("api/orch/*", "routes/api.orch.$.ts"),
] satisfies RouteConfig;
