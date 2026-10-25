import { spawn } from "node:child_process";
import process from "node:process";

// 1. Start tsc in watch mode
const tsc = spawn("npx", ["tsc", "--watch", "--preserveWatchOutput"], {
  stdio: "inherit",
  shell: true,
});

// 2. Start node in watch mode running dist/main.js
const server = spawn("node", ["--watch", "dist/main.js"], {
  stdio: "inherit",
  shell: true,
});

const cleanup = (code = 0) => {
  try {
    tsc.kill("SIGTERM");
  } catch {}
  try {
    server.kill("SIGTERM");
  } catch {}
  process.exit(code);
};

process.on("SIGINT", () => cleanup(0));
process.on("SIGTERM", () => cleanup(0));

tsc.on("exit", (code) => {
  if (code && code !== 0) cleanup(code);
});

server.on("exit", (code) => {
  if (code && code !== 0) cleanup(code);
});
