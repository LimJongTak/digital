#!/usr/bin/env node
// MCP server that lets Claude control this project's Next.js dev server as tools.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const MAX_LOG_LINES = 500;

/** @type {{ proc: import("node:child_process").ChildProcess, logs: string[], startedAt: Date } | null} */
let devServer = null;

function appendLog(line) {
  if (!devServer) return;
  devServer.logs.push(line);
  if (devServer.logs.length > MAX_LOG_LINES) {
    devServer.logs.splice(0, devServer.logs.length - MAX_LOG_LINES);
  }
}

function startDevServer(port) {
  if (devServer) {
    throw new Error("Dev server is already running. Stop it first.");
  }
  const env = { ...process.env };
  if (port) env.PORT = String(port);

  const proc = spawn(npmCmd, ["run", "dev"], {
    cwd: projectRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  devServer = { proc, logs: [], startedAt: new Date() };

  proc.stdout.on("data", (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) appendLog(line);
    }
  });
  proc.stderr.on("data", (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) appendLog(`[stderr] ${line}`);
    }
  });
  proc.on("exit", (code, signal) => {
    appendLog(`[process exited] code=${code} signal=${signal}`);
  });

  return proc.pid;
}

function stopDevServer() {
  if (!devServer) {
    throw new Error("Dev server is not running.");
  }
  const { proc } = devServer;
  devServer = null;
  proc.kill();
  return true;
}

const server = new McpServer({
  name: "digital-dev-server",
  version: "1.0.0",
});

server.registerTool(
  "start_dev_server",
  {
    title: "Start Next.js dev server",
    description: "Starts `npm run dev` for the digital (jndx clone) project.",
    inputSchema: { port: z.number().int().optional().describe("Optional port, defaults to 3000") },
  },
  async ({ port }) => {
    try {
      const pid = startDevServer(port);
      return { content: [{ type: "text", text: `Dev server started (pid ${pid}).` }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  }
);

server.registerTool(
  "stop_dev_server",
  {
    title: "Stop Next.js dev server",
    description: "Stops the currently running dev server started by start_dev_server.",
    inputSchema: {},
  },
  async () => {
    try {
      stopDevServer();
      return { content: [{ type: "text", text: "Dev server stopped." }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  }
);

server.registerTool(
  "dev_server_status",
  {
    title: "Dev server status",
    description: "Reports whether the dev server is running and for how long.",
    inputSchema: {},
  },
  async () => {
    if (!devServer) {
      return { content: [{ type: "text", text: "Dev server is not running." }] };
    }
    const uptimeSec = Math.round((Date.now() - devServer.startedAt.getTime()) / 1000);
    return {
      content: [
        {
          type: "text",
          text: `Dev server running (pid ${devServer.proc.pid}, uptime ${uptimeSec}s).`,
        },
      ],
    };
  }
);

server.registerTool(
  "dev_server_logs",
  {
    title: "Dev server logs",
    description: "Returns the most recent stdout/stderr lines from the dev server.",
    inputSchema: { lines: z.number().int().positive().optional().describe("How many recent lines, default 50") },
  },
  async ({ lines }) => {
    if (!devServer) {
      return { content: [{ type: "text", text: "Dev server is not running." }] };
    }
    const n = lines ?? 50;
    const text = devServer.logs.slice(-n).join("\n") || "(no output yet)";
    return { content: [{ type: "text", text }] };
  }
);

server.registerTool(
  "run_build",
  {
    title: "Run production build",
    description: "Runs `npm run build` to completion and returns its output.",
    inputSchema: {},
  },
  async () => {
    const output = await new Promise((resolve) => {
      const proc = spawn(npmCmd, ["run", "build"], { cwd: projectRoot, stdio: ["ignore", "pipe", "pipe"] });
      let out = "";
      proc.stdout.on("data", (c) => (out += c.toString()));
      proc.stderr.on("data", (c) => (out += c.toString()));
      proc.on("close", (code) => resolve(`(exit code ${code})\n${out}`));
    });
    return { content: [{ type: "text", text: output.slice(-8000) }] };
  }
);

process.on("exit", () => {
  if (devServer) devServer.proc.kill();
});

const transport = new StdioServerTransport();
await server.connect(transport);
