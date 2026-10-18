/**
 * SportsOS Embedded Model Context Protocol (MCP) Engine
 * Compliant with MCP JSON-RPC 2.0 (2025-03-26 / 2024-11-05)
 * Dynamically exposes all Standard + Custom Objects as MCP Tools, Resources, and Prompts.
 */

class SportsOSMCPEngine {
  constructor(store) {
    this.store = store;
    this.serverInfo = {
      name: process.env.MCP_SERVER_NAME || "sportsos-mcp-server",
      version: process.env.MCP_SERVER_VERSION || "1.0.0"
    };
  }

  getTools() {
    const objectNames = this.store.listObjects().map((o) => o.apiName);
    const objectEnumDesc = objectNames.join(", ");

    const coreTools = [
      {
        name: "sportsos_list_objects",
        description:
          "List all standard and custom object schemas in SportsOS, including their lifecycle stages, custom fields, and record counts.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "sportsos_query_records",
        description: `Query records across any SportsOS object (currently active: ${objectEnumDesc}) with optional lifecycle stage or text search filtering.`,
        inputSchema: {
          type: "object",
          properties: {
            objectApiName: {
              type: "string",
              description: `API name of the object (${objectEnumDesc})`
            },
            stage: {
              type: "string",
              description: "Optional lifecycle stage filter (e.g. 'Active', 'Matchday Mode', 'Matchday Lock')"
            },
            q: {
              type: "string",
              description: "Optional search keyword across record name, subtitle, and fields"
            }
          },
          required: ["objectApiName"]
        }
      },
      {
        name: "sportsos_create_record",
        description:
          "Create a new record inside any SportsOS standard or custom object and automatically dispatch orchestration webhooks.",
        inputSchema: {
          type: "object",
          properties: {
            objectApiName: {
              type: "string",
              description: `Target object API name (${objectEnumDesc})`
            },
            name: {
              type: "string",
              description: "Display name of the record"
            },
            stage: {
              type: "string",
              description: "Initial lifecycle stage (defaults to first stage in object lifecycle)"
            },
            subtitle: {
              type: "string",
              description: "Concise operational summary line shown on the TV-OS card"
            },
            fields: {
              type: "object",
              description: "Key-value map of object fields"
            }
          },
          required: ["objectApiName", "name"]
        }
      },
      {
        name: "sportsos_transition_lifecycle",
        description:
          "Transition a record (Staff, Team, Venue, or Custom Object) to a new lifecycle state and emit real-time orchestration events.",
        inputSchema: {
          type: "object",
          properties: {
            objectApiName: {
              type: "string",
              description: `Object API name (${objectEnumDesc})`
            },
            recordId: {
              type: "string",
              description: "Unique ID of the record (e.g. 'stf_javier', 'team_first_men', 'ven_stadium_main')"
            },
            targetStage: {
              type: "string",
              description: "Target lifecycle state ID"
            },
            note: {
              type: "string",
              description: "Audit log reason for the transition"
            }
          },
          required: ["objectApiName", "recordId", "targetStage"]
        }
      },
      {
        name: "sportsos_create_custom_object",
        description:
          "Create a new Salesforce-style Custom Object in SportsOS with custom lifecycle stages and typed fields.",
        inputSchema: {
          type: "object",
          properties: {
            label: { type: "string", description: "Singular label (e.g. 'Player', 'Sponsor')" },
            pluralLabel: { type: "string", description: "Plural channel title (e.g. 'Players', 'Sponsors')" },
            icon: { type: "string", description: "Emoji or icon glyph (e.g. '⚽', '🚁')" },
            description: { type: "string", description: "Operational purpose of this object" },
            lifecycle: {
              type: "array",
              items: { type: "string" },
              description: "Ordered list of lifecycle stages"
            },
            fields: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  label: { type: "string" },
                  type: { type: "string", enum: ["text", "number", "select", "lookup", "date"] },
                  targetObject: { type: "string" }
                }
              }
            }
          },
          required: ["label", "lifecycle"]
        }
      },
      {
        name: "sportsos_activate_blueprint",
        description:
          "Activate one of the 12 built-in SportsOS domain blueprints (player__c, department__c, project__c, event__c, schedule__c, customer__c, partner__c, asset__c, contract__c, medical_case__c, scouting_target__c, accreditation__c).",
        inputSchema: {
          type: "object",
          properties: {
            blueprintApiName: {
              type: "string",
              description: "Blueprint API name to activate"
            }
          },
          required: ["blueprintApiName"]
        }
      },
      {
        name: "sportsos_get_operational_pulse",
        description:
          "Retrieve real-time club operational telemetry, squad readiness, venue availability, connected external systems, and recent lifecycle events.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    ];

    return coreTools;
  }

  getResources() {
    const objects = this.store.listObjects();
    const resources = [
      {
        uri: "sportsos://pulse/live",
        name: "Live Club Operational Pulse & Matchday Readiness",
        mimeType: "application/json",
        description: "Real-time telemetry across Teams, Staff, Venues, and external connectors."
      },
      {
        uri: "sportsos://schema/catalog",
        name: "SportsOS Object & Lifecycle Schema Registry",
        mimeType: "application/json",
        description: "Complete metadata definition for all standard and custom objects."
      }
    ];

    for (const obj of objects) {
      resources.push({
        uri: `sportsos://objects/${obj.apiName}`,
        name: `${obj.pluralLabel} (${obj.apiName}) Live Records`,
        mimeType: "application/json",
        description: obj.description
      });
    }
    return resources;
  }

  getPrompts() {
    return [
      {
        name: "matchday-readiness-brief",
        description: "Generate an executive Matchday Readiness Brief across First Team, Stadium Venue, and On-Duty Staff.",
        arguments: []
      },
      {
        name: "venue-conflict-audit",
        description: "Audit all Venues and Teams to verify pitch maintenance and session allocations.",
        arguments: []
      }
    ];
  }

  async callTool(name, args = {}, actorName = "MCP Agent") {
    switch (name) {
      case "sportsos_list_objects": {
        return {
          objects: this.store.listObjects(),
          availableBlueprints: this.store.listBlueprints()
        };
      }
      case "sportsos_query_records": {
        const records = this.store.listRecords(args.objectApiName, {
          stage: args.stage,
          q: args.q
        });
        return {
          objectApiName: args.objectApiName,
          count: records.length,
          records
        };
      }
      case "sportsos_create_record": {
        const created = this.store.createRecord(
          args.objectApiName,
          {
            name: args.name,
            stage: args.stage,
            subtitle: args.subtitle,
            fields: args.fields || {}
          },
          actorName
        );
        return { status: "created", record: created };
      }
      case "sportsos_transition_lifecycle": {
        const updated = this.store.transitionLifecycle(
          args.objectApiName,
          args.recordId,
          args.targetStage,
          args.note || "Transitioned via MCP Tool call",
          actorName
        );
        return { status: "transitioned", record: updated };
      }
      case "sportsos_create_custom_object": {
        const obj = this.store.createCustomObject(args, actorName);
        return { status: "object_created", object: obj };
      }
      case "sportsos_activate_blueprint": {
        const obj = this.store.activateBlueprint(args.blueprintApiName, actorName);
        return { status: "blueprint_activated", object: obj };
      }
      case "sportsos_get_operational_pulse": {
        return this.store.getOperationalPulse();
      }
      default:
        throw new Error(`Unknown MCP tool: ${name}`);
    }
  }

  async handleRpcRequest(rpcPayload, actorName = "MCP Agent") {
    const { jsonrpc = "2.0", id, method, params = {} } = rpcPayload || {};

    try {
      let result;
      switch (method) {
        case "initialize":
          result = {
            protocolVersion: params.protocolVersion || "2025-03-26",
            serverInfo: this.serverInfo,
            capabilities: {
              tools: { listChanged: true },
              resources: { subscribe: false, listChanged: true },
              prompts: { listChanged: false }
            }
          };
          break;

        case "notifications/initialized":
        case "ping":
          result = {};
          break;

        case "tools/list":
          result = { tools: this.getTools() };
          break;

        case "tools/call": {
          const toolOutput = await this.callTool(
            params.name,
            params.arguments || {},
            actorName
          );
          result = {
            content: [
              {
                type: "text",
                text: JSON.stringify(toolOutput, null, 2)
              }
            ],
            structuredContent: toolOutput,
            isError: false
          };
          break;
        }

        case "resources/list":
          result = { resources: this.getResources() };
          break;

        case "resources/read": {
          const uri = params.uri || "";
          let data;
          if (uri === "sportsos://pulse/live") {
            data = this.store.getOperationalPulse();
          } else if (uri === "sportsos://schema/catalog") {
            data = this.store.listObjects();
          } else if (uri.startsWith("sportsos://objects/")) {
            const apiName = uri.replace("sportsos://objects/", "");
            data = this.store.listRecords(apiName);
          } else {
            throw new Error(`Resource URI not found: ${uri}`);
          }
          result = {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(data, null, 2)
              }
            ]
          };
          break;
        }

        case "prompts/list":
          result = { prompts: this.getPrompts() };
          break;

        case "prompts/get": {
          const pulse = this.store.getOperationalPulse();
          result = {
            description: `Operational context for ${params.name}`,
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Analyze current SportsOS state for ${pulse.organization.name}:\n${JSON.stringify(pulse, null, 2)}`
                }
              }
            ]
          };
          break;
        }

        default:
          return {
            jsonrpc,
            id,
            error: {
              code: -32601,
              message: `Method '${method}' not found on SportsOS MCP Server.`
            }
          };
      }

      return { jsonrpc, id, result };
    } catch (err) {
      return {
        jsonrpc,
        id,
        error: {
          code: -32000,
          message: err.message || "MCP execution error"
        }
      };
    }
  }

  /**
   * Built-in Natural Language -> MCP Tool Copilot Router for the Embedded TV-OS Command Bar
   */
  async executeCopilotCommand(commandText, actorName = "MCP Copilot") {
    const text = String(commandText || "").trim();
    const lower = text.toLowerCase();

    // 1. Check for blueprint activation intent
    const blueprints = this.store.listBlueprints();
    for (const bp of blueprints) {
      const bpKey = bp.apiName.replace("__c", "");
      if (
        (lower.includes("activate") || lower.includes("enable") || lower.includes("add") || lower.includes("create object")) &&
        (lower.includes(bpKey) || lower.includes(bp.pluralLabel.toLowerCase()) || lower.includes(bp.label.toLowerCase()))
      ) {
        const activated = this.store.activateBlueprint(bp.apiName, actorName);
        return {
          invokedTool: "sportsos_activate_blueprint",
          arguments: { blueprintApiName: bp.apiName },
          summary: `Activated the **${activated.pluralLabel} (${activated.apiName})** channel with ${activated.lifecycle.length} lifecycle stages and sample records.`,
          data: activated
        };
      }
    }

    // 2. Check for lifecycle transition intent (e.g. "move Javier Ortega to Active" or "set Pitch 3 to Available")
    if (lower.includes("move ") || lower.includes("transition ") || lower.includes("set ")) {
      for (const obj of this.store.listObjects()) {
        const records = this.store.listRecords(obj.apiName);
        for (const rec of records) {
          if (lower.includes(rec.name.toLowerCase()) || rec.name.toLowerCase().split(" ").some((part) => part.length > 4 && lower.includes(part.toLowerCase()))) {
            for (const st of obj.lifecycle) {
              if (lower.includes(st.id.toLowerCase()) || lower.includes(st.label.toLowerCase())) {
                const updated = this.store.transitionLifecycle(
                  obj.apiName,
                  rec.id,
                  st.id,
                  `Executed via Embedded MCP Copilot: "${text}"`,
                  actorName
                );
                return {
                  invokedTool: "sportsos_transition_lifecycle",
                  arguments: { objectApiName: obj.apiName, recordId: rec.id, targetStage: st.id },
                  summary: `Transitioned **${rec.name}** (${obj.label}) to **${st.id}** and notified ${this.store.getSyncedConnectorsForObject(obj.apiName).join(", ")}.`,
                  data: updated
                };
              }
            }
          }
        }
      }
    }

    // 3. Check for object queries (staff, teams, venues, custom objects)
    for (const obj of this.store.listObjects()) {
      if (lower.includes(obj.apiName.replace("__c", "")) || lower.includes(obj.pluralLabel.toLowerCase()) || lower.includes(obj.label.toLowerCase())) {
        const records = this.store.listRecords(obj.apiName);
        const byStage = {};
        for (const r of records) {
          byStage[r.stage] = (byStage[r.stage] || 0) + 1;
        }
        const breakdown = Object.entries(byStage)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" • ");
        return {
          invokedTool: "sportsos_query_records",
          arguments: { objectApiName: obj.apiName },
          summary: `Found **${records.length} ${obj.pluralLabel}** across lifecycle stages (${breakdown}).`,
          data: records
        };
      }
    }

    // Default: Operational Pulse & Matchday Readiness summary
    const pulse = this.store.getOperationalPulse();
    return {
      invokedTool: "sportsos_get_operational_pulse",
      arguments: {},
      summary: `**${pulse.organization.name}** Operational Pulse: ${pulse.metrics.activeStaffCount} Staff Active • ${pulse.metrics.avgTeamReadiness} Avg Squad Readiness • ${pulse.metrics.operationalVenues} Venues Online • Next Match vs ${pulse.organization.nextMatch.opponent} in ${pulse.organization.nextMatch.kickoffInHours}h.`,
      data: pulse
    };
  }
}

module.exports = { SportsOSMCPEngine };
