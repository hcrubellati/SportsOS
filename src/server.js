const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const { store } = require("./db/store");
const { SportsOSMCPEngine } = require("./mcp/engine");

const mcpEngine = new SportsOSMCPEngine(store);
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || "0.0.0.0";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-SportsOS-User"
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("Invalid JSON payload"));
      }
    });
    req.on("error", reject);
  });
}

function getActorFromHeader(req) {
  const userId = req.headers["x-sportsos-user"] || "usr_elena";
  const users = store.listUsers();
  return users.find((u) => u.id === userId) || users[0];
}

const sseClients = new Set();

function broadcastSseEvent(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (_) {
      sseClients.delete(client);
    }
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-SportsOS-User"
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;
  const actor = getActorFromHeader(req);

  try {
    if (pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, {
        status: "ok",
        platform: "SportsOS",
        version: "1.0.0",
        mcpEndpoint: "/mcp",
        timestamp: new Date().toISOString()
      });
    }

    if (pathname === "/api/bootstrap" && req.method === "GET") {
      return sendJson(res, 200, {
        pulse: store.getOperationalPulse(),
        objects: store.listObjects(),
        blueprints: store.listBlueprints(),
        users: store.listUsers(),
        roles: store.listRoles(),
        recordsByObject: Object.fromEntries(
          store.listObjects().map((o) => [o.apiName, store.listRecords(o.apiName)])
        ),
        mcp: {
          serverInfo: mcpEngine.serverInfo,
          tools: mcpEngine.getTools(),
          resources: mcpEngine.getResources(),
          prompts: mcpEngine.getPrompts()
        }
      });
    }

    if (pathname === "/api/pulse" && req.method === "GET") {
      return sendJson(res, 200, store.getOperationalPulse());
    }

    if (pathname === "/api/objects" && req.method === "GET") {
      return sendJson(res, 200, {
        objects: store.listObjects(),
        blueprints: store.listBlueprints()
      });
    }

    if (pathname === "/api/objects" && req.method === "POST") {
      if (!actor.permissions?.canCreateObjects) {
        return sendJson(res, 403, {
          error: `Role '${actor.roleLabel}' does not have permission to create custom objects. Switch to Admin or Sporting Director.`
        });
      }
      const body = await parseBody(req);
      const created = store.createCustomObject(body, actor.name);
      broadcastSseEvent("schema_updated", created);
      return sendJson(res, 201, created);
    }

    if (pathname === "/api/blueprints/activate" && req.method === "POST") {
      if (!actor.permissions?.canCreateObjects) {
        return sendJson(res, 403, {
          error: `Role '${actor.roleLabel}' does not have permission to activate object blueprints.`
        });
      }
      const body = await parseBody(req);
      const created = store.activateBlueprint(body.apiName, actor.name);
      broadcastSseEvent("schema_updated", created);
      return sendJson(res, 201, created);
    }

    const recordsMatch = pathname.match(/^\/api\/records\/([a-zA-Z0-9_]+)$/);
    if (recordsMatch) {
      const apiName = recordsMatch[1];
      if (req.method === "GET") {
        const stage = parsedUrl.searchParams.get("stage") || undefined;
        const q = parsedUrl.searchParams.get("q") || undefined;
        return sendJson(res, 200, {
          object: store.getObjectDefinition(apiName),
          records: store.listRecords(apiName, { stage, q })
        });
      }
      if (req.method === "POST") {
        if (!actor.permissions?.canWriteRecords) {
          return sendJson(res, 403, {
            error: `Role '${actor.roleLabel}' is read-only.`
          });
        }
        const body = await parseBody(req);
        const created = store.createRecord(apiName, body, actor.name);
        broadcastSseEvent("record_updated", { apiName, record: created });
        return sendJson(res, 201, created);
      }
    }

    const transitionMatch = pathname.match(
      /^\/api\/records\/([a-zA-Z0-9_]+)\/([a-zA-Z0-9_-]+)\/transition$/
    );
    if (transitionMatch && req.method === "POST") {
      if (!actor.permissions?.canWriteRecords) {
        return sendJson(res, 403, {
          error: `Role '${actor.roleLabel}' is read-only and cannot transition lifecycles.`
        });
      }
      const [, apiName, recordId] = transitionMatch;
      const body = await parseBody(req);
      const updated = store.transitionLifecycle(
        apiName,
        recordId,
        body.targetStage,
        body.note,
        actor.name
      );
      broadcastSseEvent("record_updated", { apiName, record: updated });
      return sendJson(res, 200, updated);
    }

    const singleRecordMatch = pathname.match(
      /^\/api\/records\/([a-zA-Z0-9_]+)\/([a-zA-Z0-9_-]+)$/
    );
    if (singleRecordMatch) {
      const [, apiName, recordId] = singleRecordMatch;
      if (req.method === "GET") {
        const rec = store.getRecord(apiName, recordId);
        if (!rec) return sendJson(res, 404, { error: "Record not found" });
        return sendJson(res, 200, rec);
      }
      if (req.method === "PATCH" || req.method === "PUT") {
        if (!actor.permissions?.canWriteRecords) {
          return sendJson(res, 403, { error: "Read-only role" });
        }
        const body = await parseBody(req);
        const updated = store.updateRecord(apiName, recordId, body, actor.name);
        broadcastSseEvent("record_updated", { apiName, record: updated });
        return sendJson(res, 200, updated);
      }
    }

    if (pathname === "/api/users" && req.method === "GET") {
      return sendJson(res, 200, {
        users: store.listUsers(),
        roles: store.listRoles()
      });
    }

    if (pathname === "/api/users" && req.method === "POST") {
      if (!actor.permissions?.canManageUsers) {
        return sendJson(res, 403, {
          error: `Only System Admins can provision new users. Current role: ${actor.roleLabel}.`
        });
      }
      const body = await parseBody(req);
      const created = store.createUser(body, actor.name);
      return sendJson(res, 201, created);
    }

    const userUpdateMatch = pathname.match(/^\/api\/users\/([a-zA-Z0-9_-]+)$/);
    if (userUpdateMatch && req.method === "PATCH") {
      if (!actor.permissions?.canManageUsers) {
        return sendJson(res, 403, {
          error: `Only System Admins can modify user roles.`
        });
      }
      const body = await parseBody(req);
      const updated = store.updateUserRole(
        userUpdateMatch[1],
        body.role,
        body.status,
        actor.name
      );
      return sendJson(res, 200, updated);
    }

    if (pathname === "/mcp" && req.method === "GET") {
      return sendJson(res, 200, {
        protocol: "Model Context Protocol (MCP)",
        version: "2025-03-26",
        serverInfo: mcpEngine.serverInfo,
        endpoints: {
          jsonrpc: "POST /mcp",
          sse: "GET /mcp/sse",
          copilot: "POST /api/mcp/copilot"
        },
        tools: mcpEngine.getTools(),
        resources: mcpEngine.getResources(),
        prompts: mcpEngine.getPrompts()
      });
    }

    if (pathname === "/mcp" && req.method === "POST") {
      const rpcBody = await parseBody(req);
      const rpcResponse = await mcpEngine.handleRpcRequest(rpcBody, actor.name);
      return sendJson(res, 200, rpcResponse);
    }

    if (pathname === "/mcp/sse" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*"
      });
      res.write(
        `event: endpoint\ndata: ${JSON.stringify({
          uri: "/mcp",
          serverInfo: mcpEngine.serverInfo
        })}\n\n`
      );
      sseClients.add(res);
      req.on("close", () => sseClients.delete(res));
      return;
    }

    if (pathname === "/api/mcp/copilot" && req.method === "POST") {
      const body = await parseBody(req);
      const result = await mcpEngine.executeCopilotCommand(body.prompt, actor.name);
      return sendJson(res, 200, result);
    }

    if (pathname === "/api/reset" && req.method === "POST") {
      store.reset();
      return sendJson(res, 200, { status: "reset_complete" });
    }

    let filePath = pathname === "/" ? "/index.html" : pathname;
    const resolvedPath = path.normalize(path.join(PUBLIC_DIR, filePath));
    if (resolvedPath.startsWith(PUBLIC_DIR) && fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      const ext = path.extname(resolvedPath);
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
      });
      return fs.createReadStream(resolvedPath).pipe(res);
    }

    const indexHtml = path.join(PUBLIC_DIR, "index.html");
    if (fs.existsSync(indexHtml)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return fs.createReadStream(indexHtml).pipe(res);
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    sendJson(res, 400, { error: err.message || "Bad request" });
  }
});

if (process.argv.includes("--seed-only")) {
  store.reset();
  console.log("✅ SportsOS database seeded at", store.filePath);
  process.exit(0);
}

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`\n🏟️  SportsOS Operational Platform running at http://localhost:${PORT}`);
    console.log(`📺 TV-OS Spatial Interface:         http://localhost:${PORT}`);
    console.log(`🤖 Embedded MCP JSON-RPC Server:    http://localhost:${PORT}/mcp`);
    console.log(`📡 Embedded MCP SSE Stream:         http://localhost:${PORT}/mcp/sse\n`);
  });
}

module.exports = { server, store, mcpEngine };
