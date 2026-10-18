/**
 * Automated Verification Suite for SportsOS MVP
 * Verifies:
 *  1. Core MVP Objects (Staff, Teams, Venues) and Lifecycle State Machines
 *  2. User Management & Role-Based Access Control (RBAC)
 *  3. Custom Object Engine & 1-Click Blueprint Activation
 *  4. Embedded Model Context Protocol (MCP) JSON-RPC 2.0 Server
 */

const assert = require("node:assert");
const { SportsOSStore } = require("./db/store");
const { SportsOSMCPEngine } = require("./mcp/engine");
const path = require("node:path");
const fs = require("node:fs");

async function runVerification() {
  const testDbPath = path.join(__dirname, "../data/test-verify-db.json");
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const testStore = new SportsOSStore(testDbPath);
  const mcp = new SportsOSMCPEngine(testStore);

  console.log("🔍 1. Verifying Core MVP Objects (Staff, Teams, Venues)...");
  const objects = testStore.listObjects();
  const apiNames = objects.map((o) => o.apiName);
  assert(apiNames.includes("staff"), "Missing 'staff' MVP object");
  assert(apiNames.includes("team"), "Missing 'team' MVP object");
  assert(apiNames.includes("venue"), "Missing 'venue' MVP object");

  const staffRecords = testStore.listRecords("staff");
  const teamRecords = testStore.listRecords("team");
  const venueRecords = testStore.listRecords("venue");
  assert(staffRecords.length >= 6, "Expected pre-seeded staff records");
  assert(teamRecords.length >= 4, "Expected pre-seeded team records");
  assert(venueRecords.length >= 5, "Expected pre-seeded venue records");
  assert(
    staffRecords[0]._resolvedLookups.teamId,
    "Expected relational lookup resolution from Staff -> Team"
  );

  console.log("🔄 2. Verifying Lifecycle State Machine Transitions...");
  const transitioned = testStore.transitionLifecycle(
    "staff",
    "stf_javier",
    "Active",
    "Completed onboarding verification",
    "Elena Vance"
  );
  assert.strictEqual(transitioned.stage, "Active");
  assert.strictEqual(transitioned.history[0].to, "Active");

  console.log("✨ 3. Verifying Custom Object Creation & Blueprint Activation...");
  const customObj = testStore.createCustomObject({
    label: "Sponsor Activation",
    pluralLabel: "Sponsor Activations",
    icon: "🎯",
    lifecycle: ["Planned", "Live Matchday", "Verified"],
    fields: [{ name: "brand", label: "Brand Partner", type: "text" }]
  });
  assert.strictEqual(customObj.apiName, "sponsor_activation__c");

  const playerObj = testStore.activateBlueprint("player__c");
  assert.strictEqual(playerObj.apiName, "player__c");
  const playerRecords = testStore.listRecords("player__c");
  assert(playerRecords.length >= 3, "Expected sample records from Players blueprint");

  console.log("👥 4. Verifying User Management & RBAC...");
  const newUser = testStore.createUser({
    name: "Lucas Ferreira",
    email: "l.ferreira@metropolitanofc.org",
    role: "ops_manager",
    title: "Stadium Operations Coordinator"
  });
  assert.strictEqual(newUser.role, "ops_manager");

  console.log("🤖 5. Verifying Embedded MCP JSON-RPC 2.0 Server...");
  const initRes = await mcp.handleRpcRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-03-26" }
  });
  assert.strictEqual(initRes.result.serverInfo.name, "sportsos-mcp-server");

  const toolsRes = await mcp.handleRpcRequest({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list"
  });
  assert(toolsRes.result.tools.length >= 7, "Expected at least 7 MCP tools");

  const callRes = await mcp.handleRpcRequest({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "sportsos_query_records",
      arguments: { objectApiName: "venue", stage: "Matchday Mode" }
    }
  });
  assert.strictEqual(callRes.result.isError, false);
  assert.strictEqual(callRes.result.structuredContent.count, 1);

  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  console.log("✅ All SportsOS MVP & Embedded MCP checks passed!");
}

runVerification().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
