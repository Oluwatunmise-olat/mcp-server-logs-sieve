#!/usr/bin/env node

const CLI_COMMANDS = ["query", "summarize", "trace", "sources"];

const firstArg = process.argv[2];

if (firstArg && CLI_COMMANDS.includes(firstArg)) {
  import("../dist/cli.js");
} else {
  import("../dist/index.js");
}