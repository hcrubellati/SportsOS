const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { INITIAL_SEED } = require("./seed");

const DATA_FILE = path.resolve(
  process.cwd(),
  process.env.DATA_FILE || "./data/sportsos-db.json"
);

const PALETTE = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#ef4444",
  "#64748b"
];

class SportsOSStore {
  constructor(filePath = DATA_FILE) {
    this.filePath = filePath;
    this.state = null;
    this.init();
  }

  init() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      this.state = structuredClone(INITIAL_SEED);
      this.save();
    } else {
      try {
        const raw = fs.readFileSync(this.filePath, "utf8");
        this.state = JSON.parse(raw);
      } catch (err) {
        this.state = structuredClone(INITIAL_SEED);
        this.save();
      }
    }
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), "utf8");
  }

  reset() {
    this.state = structuredClone(INITIAL_SEED);
    this.save();
    return this.state;
  }

  // --- Metadata & Custom Object Engine ---

  listObjects() {
    return this.state.objects.map((obj) => ({
      ...obj,
      recordCount: (this.state.records[obj.apiName] || []).length
    }));
  }

  getObjectDefinition(apiName) {
    return this.state.objects.find((o) => o.apiName === apiName) || null;
  }

  listBlueprints() {
    const activeSet = new Set(this.state.objects.map((o) => o.apiName));
    return this.state.blueprints.map((bp) => ({
      ...bp,
      isActivated: activeSet.has(bp.apiName)
    }));
  }

  createCustomObject(payload, actorName = "Elena Vance") {
    const rawName = (payload.apiName || payload.label || "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!rawName) {
      throw new Error("Object label or apiName is required.");
    }

    const apiName = rawName.endsWith("__c") || ["staff", "team", "venue"].includes(rawName)
      ? rawName
      : `${rawName}__c`;

    if (this.getObjectDefinition(apiName)) {
      throw new Error(`Object '${apiName}' already exists.`);
    }

    const stagesInput = Array.isArray(payload.lifecycle)
      ? payload.lifecycle
      : String(payload.lifecycle || "Draft, Active, Review, Completed")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    const lifecycle = stagesInput.map((item, idx) => {
      if (typeof item === "object" && item.id) {
        return {
          id: item.id,
          label: item.label || item.id,
          color: item.color || PALETTE[idx % PALETTE.length]
        };
      }
      return {
        id: String(item),
        label: String(item),
        color: PALETTE[idx % PALETTE.length]
      };
    });

    const fields = Array.isArray(payload.fields) && payload.fields.length > 0
      ? payload.fields
      : [
          { name: "owner", label: "Owner / Lead", type: "text", required: true },
          { name: "teamId", label: "Linked Team", type: "lookup", targetObject: "team", required: false },
          { name: "venueId", label: "Linked Venue", type: "lookup", targetObject: "venue", required: false },
          { name: "notes", label: "Operational Notes", type: "text", required: false }
        ];

    const newObj = {
      apiName,
      label: payload.label || rawName,
      pluralLabel: payload.pluralLabel || `${payload.label || rawName}s`,
      icon: payload.icon || "🧩",
      category: payload.category || "Custom Object",
      isCustom: true,
      description: payload.description || `Custom lifecycle object created in SportsOS Object Studio.`,
      lifecycle,
      fields
    };

    this.state.objects.push(newObj);
    if (!this.state.records[apiName]) {
      this.state.records[apiName] = [];
    }

    // Seed sample records if provided
    if (Array.isArray(payload.sampleRecords)) {
      for (const sample of payload.sampleRecords) {
        this.createRecord(apiName, sample, actorName, false);
      }
    }

    this.emitOrchestrationEvent({
      type: "sportsos.schema.object_created",
      objectApiName: apiName,
      recordId: apiName,
      recordName: newObj.pluralLabel,
      summary: `Custom Object [${newObj.pluralLabel} (${apiName})] provisioned with ${lifecycle.length} lifecycle stages & MCP tools.`,
      dispatchedTo: ["SportsOS MCP Server", "GraphQL/REST Schema Registry"],
      actor: actorName
    });

    this.save();
    return newObj;
  }

  activateBlueprint(apiName, actorName = "Elena Vance") {
    const existing = this.getObjectDefinition(apiName);
    if (existing) {
      return existing;
    }
    const bp = this.state.blueprints.find((b) => b.apiName === apiName);
    if (!bp) {
      throw new Error(`Blueprint '${apiName}' not found.`);
    }
    return this.createCustomObject(bp, actorName);
  }

  // --- Record CRUD & Relational Resolution ---

  resolveLookupsForRecord(objDef, record) {
    const resolved = {};
    if (!objDef || !record || !record.fields) return resolved;

    for (const field of objDef.fields) {
      if (field.type === "lookup" && field.targetObject) {
        const targetId = record.fields[field.name];
        if (targetId) {
          const targetList = this.state.records[field.targetObject] || [];
          const found = targetList.find((r) => r.id === targetId);
          if (found) {
            resolved[field.name] = {
              id: found.id,
              name: found.name,
              stage: found.stage,
              objectApiName: field.targetObject
            };
          }
        }
      }
    }
    return resolved;
  }

  listRecords(apiName, filters = {}) {
    const objDef = this.getObjectDefinition(apiName);
    if (!objDef) {
      throw new Error(`Object '${apiName}' is not registered.`);
    }
    let list = this.state.records[apiName] || [];

    if (filters.stage) {
      list = list.filter((r) => r.stage.toLowerCase() === String(filters.stage).toLowerCase());
    }
    if (filters.q) {
      const q = String(filters.q).toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.subtitle && r.subtitle.toLowerCase().includes(q)) ||
          JSON.stringify(r.fields || {}).toLowerCase().includes(q)
      );
    }

    return list.map((rec) => ({
      ...rec,
      _resolvedLookups: this.resolveLookupsForRecord(objDef, rec)
    }));
  }

  getRecord(apiName, recordId) {
    const objDef = this.getObjectDefinition(apiName);
    if (!objDef) {
      throw new Error(`Object '${apiName}' is not registered.`);
    }
    const list = this.state.records[apiName] || [];
    const rec = list.find((r) => r.id === recordId);
    if (!rec) return null;
    return {
      ...rec,
      _resolvedLookups: this.resolveLookupsForRecord(objDef, rec)
    };
  }

  createRecord(apiName, payload, actorName = "Elena Vance", persist = true) {
    const objDef = this.getObjectDefinition(apiName);
    if (!objDef) {
      throw new Error(`Object '${apiName}' is not registered.`);
    }
    if (!payload.name) {
      throw new Error("Record 'name' is required.");
    }

    const defaultStage = objDef.lifecycle[0] ? objDef.lifecycle[0].id : "Active";
    const stage = payload.stage || defaultStage;
    const prefix = apiName.replace("__c", "").slice(0, 3);
    const id = payload.id || `${prefix}_${crypto.randomBytes(3).toString("hex")}`;

    const fields = { ...(payload.fields || {}) };
    // Allow top-level field pass-through for convenience
    for (const f of objDef.fields) {
      if (payload[f.name] !== undefined && fields[f.name] === undefined) {
        fields[f.name] = payload[f.name];
      }
    }

    // Build automatic subtitle if omitted
    let subtitle = payload.subtitle;
    if (!subtitle) {
      const summaryParts = [];
      for (const f of objDef.fields.slice(0, 2)) {
        if (fields[f.name]) summaryParts.push(String(fields[f.name]));
      }
      subtitle = summaryParts.join(" • ") || `${objDef.label} Record`;
    }

    const newRecord = {
      id,
      name: payload.name,
      stage,
      subtitle,
      updatedAt: new Date().toISOString(),
      fields,
      history: [
        {
          timestamp: new Date().toISOString(),
          from: "Created",
          to: stage,
          actor: actorName,
          note: payload.note || `Created in [${stage}] stage.`
        }
      ]
    };

    if (!this.state.records[apiName]) {
      this.state.records[apiName] = [];
    }
    this.state.records[apiName].unshift(newRecord);

    if (persist) {
      this.emitOrchestrationEvent({
        type: "sportsos.record.created",
        objectApiName: apiName,
        recordId: id,
        recordName: newRecord.name,
        summary: `New ${objDef.label} [${newRecord.name}] created in stage [${stage}]`,
        dispatchedTo: this.getSyncedConnectorsForObject(apiName),
        actor: actorName
      });
      this.save();
    }

    return {
      ...newRecord,
      _resolvedLookups: this.resolveLookupsForRecord(objDef, newRecord)
    };
  }

  updateRecord(apiName, recordId, payload, actorName = "Elena Vance") {
    const objDef = this.getObjectDefinition(apiName);
    if (!objDef) {
      throw new Error(`Object '${apiName}' is not registered.`);
    }
    const list = this.state.records[apiName] || [];
    const rec = list.find((r) => r.id === recordId);
    if (!rec) {
      throw new Error(`Record '${recordId}' not found in '${apiName}'.`);
    }

    if (payload.name) rec.name = payload.name;
    if (payload.subtitle) rec.subtitle = payload.subtitle;
    if (payload.fields && typeof payload.fields === "object") {
      rec.fields = { ...rec.fields, ...payload.fields };
    }
    if (payload.stage && payload.stage !== rec.stage) {
      return this.transitionLifecycle(apiName, recordId, payload.stage, payload.note || "Stage updated", actorName);
    }

    rec.updatedAt = new Date().toISOString();
    this.save();
    return {
      ...rec,
      _resolvedLookups: this.resolveLookupsForRecord(objDef, rec)
    };
  }

  transitionLifecycle(apiName, recordId, targetStage, note = "", actorName = "Elena Vance") {
    const objDef = this.getObjectDefinition(apiName);
    if (!objDef) {
      throw new Error(`Object '${apiName}' is not registered.`);
    }
    const list = this.state.records[apiName] || [];
    const rec = list.find((r) => r.id === recordId);
    if (!rec) {
      throw new Error(`Record '${recordId}' not found in '${apiName}'.`);
    }

    const validStage = objDef.lifecycle.find(
      (s) => s.id.toLowerCase() === String(targetStage).toLowerCase()
    );
    if (!validStage) {
      const allowed = objDef.lifecycle.map((s) => s.id).join(", ");
      throw new Error(`Invalid stage '${targetStage}' for ${apiName}. Allowed: ${allowed}`);
    }

    const previousStage = rec.stage;
    rec.stage = validStage.id;
    rec.updatedAt = new Date().toISOString();
    if (!Array.isArray(rec.history)) rec.history = [];
    rec.history.unshift({
      timestamp: rec.updatedAt,
      from: previousStage,
      to: validStage.id,
      actor: actorName,
      note: note || `Transitioned via SportsOS Lifecycle Engine`
    });

    this.emitOrchestrationEvent({
      type: "sportsos.lifecycle.transitioned",
      objectApiName: apiName,
      recordId: rec.id,
      recordName: rec.name,
      summary: `${rec.name} (${objDef.label}) transitioned from [${previousStage}] → [${validStage.id}]`,
      dispatchedTo: this.getSyncedConnectorsForObject(apiName),
      actor: actorName
    });

    this.save();
    return {
      ...rec,
      _resolvedLookups: this.resolveLookupsForRecord(objDef, rec)
    };
  }

  // --- Users & Role Management ---

  listUsers() {
    return this.state.users.map((u) => {
      const roleDef = this.state.roles.find((r) => r.id === u.role);
      return {
        ...u,
        roleLabel: roleDef ? roleDef.label : u.role,
        permissions: roleDef || {}
      };
    });
  }

  listRoles() {
    return this.state.roles;
  }

  createUser(payload, actorName = "Elena Vance") {
    if (!payload.name || !payload.email) {
      throw new Error("User name and email are required.");
    }
    const role = payload.role || "ops_manager";
    const id = `usr_${crypto.randomBytes(3).toString("hex")}`;
    const newUser = {
      id,
      name: payload.name,
      email: payload.email,
      role,
      title: payload.title || "Operations Specialist",
      department: payload.department || "Club Operations",
      status: payload.status || "Active",
      avatarColor: PALETTE[this.state.users.length % PALETTE.length],
      mcpKeyScope: role === "admin" ? "mcp_full_orchestrator" : `mcp_${role}_rw`
    };
    this.state.users.push(newUser);
    this.emitOrchestrationEvent({
      type: "sportsos.user.provisioned",
      objectApiName: "users",
      recordId: id,
      recordName: newUser.name,
      summary: `User [${newUser.name}] provisioned with role [${role}] & MCP scope [${newUser.mcpKeyScope}]`,
      dispatchedTo: ["Workday HR & FIFA TMS", "SportsOS RBAC Engine"],
      actor: actorName
    });
    this.save();
    return this.listUsers().find((u) => u.id === id);
  }

  updateUserRole(userId, newRole, status, actorName = "Elena Vance") {
    const user = this.state.users.find((u) => u.id === userId);
    if (!user) throw new Error(`User '${userId}' not found.`);
    if (newRole) user.role = newRole;
    if (status) user.status = status;
    this.save();
    return this.listUsers().find((u) => u.id === userId);
  }

  // --- Orchestration & Operational Telemetry ---

  getSyncedConnectorsForObject(apiName) {
    const matched = this.state.connectors
      .filter((c) => c.syncedObjects.includes(apiName))
      .map((c) => c.name);
    return matched.length > 0 ? matched : ["SportsOS Event Bus"];
  }

  emitOrchestrationEvent(evt) {
    const eventRecord = {
      id: `evt_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`,
      timestamp: new Date().toISOString(),
      ...evt
    };
    this.state.orchestrationEvents.unshift(eventRecord);
    if (this.state.orchestrationEvents.length > 40) {
      this.state.orchestrationEvents = this.state.orchestrationEvents.slice(0, 40);
    }
    return eventRecord;
  }

  getOperationalPulse() {
    const staffList = this.state.records.staff || [];
    const teamList = this.state.records.team || [];
    const venueList = this.state.records.venue || [];

    const activeStaff = staffList.filter((s) => s.stage === "Active").length;
    const avgTeamReadiness = teamList.length
      ? Math.round(
          teamList.reduce((acc, t) => acc + Number(t.fields?.readinessScore || 90), 0) /
            teamList.length
        )
      : 100;
    const operationalVenues = venueList.filter((v) => v.stage !== "Closed").length;
    const totalRecords = Object.values(this.state.records).reduce(
      (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
      0
    );

    return {
      organization: this.state.organization,
      metrics: {
        totalObjects: this.state.objects.length,
        customObjects: this.state.objects.filter((o) => o.isCustom).length,
        availableBlueprints: this.state.blueprints.length,
        totalRecords,
        activeStaffCount: `${activeStaff}/${staffList.length}`,
        avgTeamReadiness: `${avgTeamReadiness}%`,
        operationalVenues: `${operationalVenues}/${venueList.length}`,
        connectedSystems: this.state.connectors.length,
        activeUsers: this.state.users.filter((u) => u.status === "Active").length
      },
      connectors: this.state.connectors,
      recentEvents: this.state.orchestrationEvents.slice(0, 12)
    };
  }
}

const store = new SportsOSStore();

module.exports = { SportsOSStore, store };
