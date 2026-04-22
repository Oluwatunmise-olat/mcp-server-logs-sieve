#!/usr/bin/env node

const currentNodeMajor = Number(process.versions.node.split(".")[0]);

if (currentNodeMajor < 20) {
  console.error(
    `mcp-server-logs-sieve requires Node.js 20+ (found ${process.versions.node}).`,
  );
  process.exit(1);
}

import("../dist/http.js");
