import { build as esb } from "esbuild";

// AgentCore Runtime は ESM 実行だが、一部 CommonJS 依存が require を参照する。
await esb({
  entryPoints: ["amplify/bedrock-agentcore/runtime/src/server.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  outfile: "amplify/bedrock-agentcore/runtime/asset/server.js",
});
