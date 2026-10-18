#!/usr/bin/env node
/**
 * SportsOS Standalone MCP Stdio Server
 * Connect Claude Desktop, Cursor, Windsurf, or any MCP Host directly to SportsOS:
 *   node src/mcp/stdio-server.js
 */

const readline = require("node:readline");
const { store } = require("../db/store");
const { SportsOSMCPEngine } = require("./engine");

const mcpEngine = new SportsOSMCPEngine(store);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const request = JSON.parse(trimmed);
    const response = await mcpEngine.handleRpcRequest(request, "MCP Stdio Host");
    if (request.id !== undefined) {
      process.stdout.write(JSON.stringify(response) + "\n");
    }
  } catch (err) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: " + err.message }
      }) + "\n"
    );
  }
});
