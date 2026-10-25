/**
 * SportsOS TV-OS Spatial Client
 * Handles:
 *  - Spatial Channel Navigation (Home Deck, Staff, Teams, Venues, Custom Objects, Object Studio, Users RBAC, MCP Hub)
 *  - Lifecycle State Machine transitions & relational lookup jumping
 *  - No-Code Custom Object Builder & 1-Click Blueprint Activator
 *  - Keyboard / TV Remote Navigation (Arrow keys, Enter, [ / ], Cmd+K)
 */

const state = {
  activeChannel: "home", // 'home' | object.apiName | 'studio' | 'users' | 'mcp'
  activeCategory: "all", // 'all' | 'sporting' | 'facilities' | 'corporate' | 'intelligence'
  stageFilter: null,
  activeUserId: "usr_elena",
  pulse: null,
  objects: [],
  blueprints: [],
  users: [],
  roles: [],
  recordsByObject: {},
  mcp: { tools: [], resources: [], prompts: [] },
  selectedRecord: null, // { apiName, id }
  spatialIndex: 0
};

async function apiFetch(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "X-SportsOS-User": state.activeUserId,
    ...(options.headers || {})
  };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function showToast(msg) {
  const toast = document.getElementById("tvToast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add("hidden"), 3400);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getObjectAppMeta(apiName) {
  const metaMap = {
    staff: {
      label: "Staff",
      category: "sporting",
      gradientClass: "app-grad-staff",
      icon: "🪪",
      sublabel: "Personnel"
    },
    team: {
      label: "Teams",
      category: "sporting",
      gradientClass: "app-grad-team",
      icon: "🛡️",
      sublabel: "Squads"
    },
    venue: {
      label: "Venues",
      category: "facilities",
      gradientClass: "app-grad-venue",
      icon: "🏟️",
      sublabel: "Facilities"
    },
    player__c: {
      label: "Players",
      category: "sporting",
      gradientClass: "app-grad-players",
      icon: "⚽",
      sublabel: "Roster"
    },
    medical_case__c: {
      label: "Medical",
      category: "sporting",
      gradientClass: "app-grad-medical",
      icon: "🩺",
      sublabel: "RTP Cases"
    },
    schedule__c: {
      label: "Schedules",
      category: "facilities",
      gradientClass: "app-grad-schedules",
      icon: "⏱️",
      sublabel: "Pitch Slots"
    },
    event__c: {
      label: "Events",
      category: "facilities",
      gradientClass: "app-grad-venue",
      icon: "📅",
      sublabel: "Matchday Ops"
    },
    asset__c: {
      label: "Assets",
      category: "facilities",
      gradientClass: "app-grad-assets",
      icon: "📡",
      sublabel: "Equipment"
    },
    contract__c: {
      label: "Contracts",
      category: "corporate",
      gradientClass: "app-grad-contracts",
      icon: "📜",
      sublabel: "Registrations"
    },
    customer__c: {
      label: "Fans / Accs",
      category: "corporate",
      gradientClass: "app-grad-fans",
      icon: "🎟️",
      sublabel: "Ticketing"
    },
    partner__c: {
      label: "Partners",
      category: "corporate",
      gradientClass: "app-grad-partners",
      icon: "🤝",
      sublabel: "Commercial"
    },
    department__c: {
      label: "Depts",
      category: "corporate",
      gradientClass: "app-grad-users",
      icon: "🏛️",
      sublabel: "Org Structure"
    },
    project__c: {
      label: "Projects",
      category: "corporate",
      gradientClass: "app-grad-studio",
      icon: "🚀",
      sublabel: "Initiatives"
    },
    scouting_target__c: {
      label: "Scouting",
      category: "sporting",
      gradientClass: "app-grad-scouting",
      icon: "🔭",
      sublabel: "Recruitment"
    },
    accreditation__c: {
      label: "Security",
      category: "facilities",
      gradientClass: "app-grad-users",
      icon: "🔐",
      sublabel: "Accreditations"
    }
  };
  return metaMap[apiName] || {
    label: apiName.replace(/__c$/, "").replace(/_/g, " "),
    category: "facilities",
    gradientClass: "app-grad-home",
    icon: "📦",
    sublabel: "Custom Object"
  };
}

function renderAppTileHtml({ channel, label, icon, gradientClass, badge, isActive, isAction, actionType }) {
  const dataAttr = isAction
    ? `data-action="${escapeHtml(actionType)}"`
    : `data-channel="${escapeHtml(channel)}"`;

  return `
    <button class="tv-app-tile ${isActive ? "active" : ""}" ${dataAttr} tabindex="0" title="Launch ${escapeHtml(label)} App">
      <div class="tv-app-squircle ${gradientClass}">
        <div class="tv-app-gloss"></div>
        <span class="tv-app-icon">${escapeHtml(icon)}</span>
        ${badge !== undefined && badge !== null ? `<span class="tv-app-badge">${escapeHtml(String(badge))}</span>` : ""}
      </div>
      <span class="tv-app-label">${escapeHtml(label)}</span>
      <span class="tv-app-active-dot"></span>
    </button>
  `;
}

async function loadBootstrap() {
  const data = await apiFetch("/api/bootstrap");
  state.pulse = data.pulse;
  state.objects = data.objects;
  state.blueprints = data.blueprints;
  state.users = data.users;
  state.roles = data.roles;
  state.recordsByObject = data.recordsByObject;
  state.mcp = data.mcp;

  renderHeader();
  renderChannelDock();
  renderViewport();
}

function renderHeader() {
  const org = state.pulse?.organization || {};
  document.getElementById("clubShortCode").textContent = org.shortCode || "SOS";
  document.getElementById("clubNameTitle").textContent = org.name || "SportsOS Club";

  if (org.nextMatch) {
    document.getElementById("nextMatchBanner").innerHTML =
      `Season ${escapeHtml(org.season)} • Next Match: <strong>vs ${escapeHtml(org.nextMatch.opponent)}</strong> (${escapeHtml(org.nextMatch.competition)}) in <strong>${org.nextMatch.kickoffInHours}h</strong>`;
  }

  document.getElementById("mcpToolCountBadge").textContent = `${state.mcp.tools.length} Tools`;
  document.getElementById("footerConnectorsCount").textContent =
    `${state.pulse?.connectors?.length || 6} Connected Systems`;

  // Populate User RBAC Switcher
  const userSelect = document.getElementById("activeUserSelect");
  userSelect.innerHTML = state.users
    .map(
      (u) =>
        `<option value="${escapeHtml(u.id)}" ${u.id === state.activeUserId ? "selected" : ""}>${escapeHtml(u.name)} (${escapeHtml(u.roleLabel)})</option>`
    )
    .join("");
}

function renderChannelDock() {
  const dock = document.getElementById("channelDock");
  const unactivated = state.blueprints.filter((b) => !b.isActivated);

  // Top Category Filter Tabs (Matching TV OS screenshot: Sports, Gaming, Music, Home Hub...)
  const categories = [
    { id: "all", label: "⚡ All Objects & Apps" },
    { id: "sporting", label: "⚽ Sporting Operations" },
    { id: "facilities", label: "🏟️ Facilities & Venues" },
    { id: "corporate", label: "💼 Club Administration" },
    { id: "intelligence", label: "🤖 AI & MCP Remote" }
  ];

  const categoryPillsHtml = categories
    .map(
      (cat) => `
      <button class="category-tab-btn ${state.activeCategory === cat.id ? "active" : ""}" data-category="${cat.id}">
        ${cat.label}
      </button>
    `
    )
    .join("");

  // Filter objects based on activeCategory
  const filteredObjects = state.objects.filter((obj) => {
    if (state.activeCategory === "all") return true;
    const meta = getObjectAppMeta(obj.apiName);
    return meta.category === state.activeCategory;
  });

  const objectAppTilesHtml = filteredObjects
    .map((obj) => {
      const meta = getObjectAppMeta(obj.apiName);
      const count = (state.recordsByObject[obj.apiName] || []).length;
      return renderAppTileHtml({
        channel: obj.apiName,
        label: obj.pluralLabel || meta.label,
        icon: obj.icon || meta.icon,
        gradientClass: meta.gradientClass,
        badge: count,
        isActive: state.activeChannel === obj.apiName
      });
    })
    .join("");

  // App Store tile (like LG APPS tile)
  const storeAppTileHtml =
    state.activeCategory === "all" || state.activeCategory === "intelligence"
      ? renderAppTileHtml({
          channel: "studio",
          label: "App Store",
          icon: "❖",
          gradientClass: "app-grad-store",
          badge: `+${unactivated.length}`,
          isActive: state.activeChannel === "studio"
        })
      : "";

  // Live Home Deck tile
  const homeAppTileHtml =
    state.activeCategory === "all"
      ? renderAppTileHtml({
          channel: "home",
          label: "Live Home",
          icon: "📺",
          gradientClass: "app-grad-home",
          badge: "Deck",
          isActive: state.activeChannel === "home"
        })
      : "";

  // System apps
  const studioAppTileHtml =
    state.activeCategory === "all" || state.activeCategory === "intelligence"
      ? renderAppTileHtml({
          channel: "studio",
          label: "Studio",
          icon: "✨",
          gradientClass: "app-grad-studio",
          badge: "Builder",
          isActive: state.activeChannel === "studio"
        })
      : "";

  const usersAppTileHtml =
    state.activeCategory === "all" || state.activeCategory === "corporate"
      ? renderAppTileHtml({
          channel: "users",
          label: "Operators",
          icon: "👥",
          gradientClass: "app-grad-users",
          badge: state.users.length,
          isActive: state.activeChannel === "users"
        })
      : "";

  const mcpAppTileHtml =
    state.activeCategory === "all" || state.activeCategory === "intelligence"
      ? renderAppTileHtml({
          channel: "mcp",
          label: "MCP Remote",
          icon: "🤖",
          gradientClass: "app-grad-mcp",
          badge: `${state.mcp.tools.length} Tools`,
          isActive: state.activeChannel === "mcp"
        })
      : "";

  const addAppTileHtml = `
    <button class="tv-app-tile" data-action="open-store" tabindex="0" title="Install New Object App (+12 Blueprints Ready)">
      <div class="tv-app-squircle app-grad-add">
        <span class="tv-app-icon" style="font-size:1.6rem; color:#94a3b8;">➕</span>
        <span class="tv-app-badge" style="background:#1e293b; color:#93c5fd;">+12</span>
      </div>
      <span class="tv-app-label">Install App</span>
      <span class="tv-app-active-dot"></span>
    </button>
  `;

  dock.innerHTML = `
    <div class="tv-category-bar">
      ${categoryPillsHtml}
    </div>
    <div class="tv-apps-shelf" id="topAppsShelf" role="region" aria-label="Smart TV OS Installed Apps">
      ${storeAppTileHtml}
      ${homeAppTileHtml}
      ${objectAppTilesHtml}
      ${studioAppTileHtml}
      ${usersAppTileHtml}
      ${mcpAppTileHtml}
      ${addAppTileHtml}
    </div>
  `;

  // Event delegation on channel dock
  dock.onclick = (e) => {
    const catBtn = e.target.closest(".category-tab-btn");
    if (catBtn) {
      state.activeCategory = catBtn.dataset.category;
      renderChannelDock();
      return;
    }
    const appTile = e.target.closest(".tv-app-tile");
    if (appTile) {
      if (appTile.dataset.action === "open-store") {
        state.activeChannel = "studio";
      } else if (appTile.dataset.channel) {
        state.activeChannel = appTile.dataset.channel;
      }
      state.stageFilter = null;
      state.spatialIndex = 0;
      renderChannelDock();
      renderViewport();
    }
  };
}

function getStageColor(objDef, stageId) {
  const found = (objDef?.lifecycle || []).find((s) => s.id === stageId);
  return found ? found.color : "#3b82f6";
}

function renderCardHtml(objDef, rec) {
  const color = getStageColor(objDef, rec.stage);
  const lookups = rec._resolvedLookups || {};
  const chipHtml = [];

  for (const f of (objDef.fields || []).slice(0, 3)) {
    const val = rec.fields?.[f.name];
    if (!val) continue;
    if (f.type === "lookup" && lookups[f.name]) {
      chipHtml.push(
        `<span class="meta-chip">🔗 ${escapeHtml(lookups[f.name].name)}</span>`
      );
    } else {
      chipHtml.push(
        `<span class="meta-chip">${escapeHtml(f.label)}: ${escapeHtml(val)}</span>`
      );
    }
  }

  // Determine next lifecycle stage for 1-click advance
  const stages = objDef.lifecycle || [];
  const currentIdx = stages.findIndex((s) => s.id === rec.stage);
  const nextStage =
    currentIdx >= 0 && currentIdx + 1 < stages.length ? stages[currentIdx + 1] : null;

  return `
    <article class="tv-card" tabindex="0" data-object="${escapeHtml(objDef.apiName)}" data-record-id="${escapeHtml(rec.id)}">
      <div>
        <div class="card-top-row">
          <div class="card-icon-badge">${escapeHtml(objDef.icon)}</div>
          <span class="stage-pill" style="background:${color}22; color:${color}; border-color:${color}66;">
            ● ${escapeHtml(rec.stage)}
          </span>
        </div>
        <div class="card-title">${escapeHtml(rec.name)}</div>
        <div class="card-subtitle">${escapeHtml(rec.subtitle || "")}</div>
        <div class="card-meta-chips">${chipHtml.join("")}</div>
      </div>
      <div class="card-quick-footer">
        <span>ID: ${escapeHtml(rec.id)}</span>
        ${
          nextStage
            ? `<button class="quick-step-btn" data-quick-advance="${escapeHtml(nextStage.id)}" data-object="${escapeHtml(objDef.apiName)}" data-record-id="${escapeHtml(rec.id)}" title="Advance lifecycle stage">
                → ${escapeHtml(nextStage.id)}
              </button>`
            : `<span>✓ Final Stage</span>`
        }
      </div>
    </article>
  `;
}

function renderHomeDeck() {
  const m = state.pulse?.metrics || {};
  const unactivated = state.blueprints.filter((b) => !b.isActivated);

  // Home Deck TV OS Apps Shelf (Directly inspired by LG webOS & Apple TV OS apps row)
  const homeAppTilesHtml = [
    renderAppTileHtml({
      channel: "studio",
      label: "App Store",
      icon: "❖",
      gradientClass: "app-grad-store",
      badge: `+${unactivated.length}`,
      isActive: false
    }),
    ...state.objects.map((obj) => {
      const meta = getObjectAppMeta(obj.apiName);
      const count = (state.recordsByObject[obj.apiName] || []).length;
      return renderAppTileHtml({
        channel: obj.apiName,
        label: obj.pluralLabel || meta.label,
        icon: obj.icon || meta.icon,
        gradientClass: meta.gradientClass,
        badge: count,
        isActive: false
      });
    }),
    renderAppTileHtml({
      channel: "studio",
      label: "Object Studio",
      icon: "✨",
      gradientClass: "app-grad-studio",
      badge: "Builder",
      isActive: false
    }),
    renderAppTileHtml({
      channel: "users",
      label: "Operators",
      icon: "👥",
      gradientClass: "app-grad-users",
      badge: state.users.length,
      isActive: false
    }),
    renderAppTileHtml({
      channel: "mcp",
      label: "MCP AI Hub",
      icon: "🤖",
      gradientClass: "app-grad-mcp",
      badge: `${state.mcp.tools.length} Tools`,
      isActive: false
    }),
    `
    <button class="tv-app-tile" data-action="open-store" tabindex="0" title="Install New Object App (+12 Blueprints Ready)">
      <div class="tv-app-squircle app-grad-add">
        <span class="tv-app-icon" style="font-size:1.6rem; color:#94a3b8;">➕</span>
        <span class="tv-app-badge" style="background:#1e293b; color:#93c5fd;">+12</span>
      </div>
      <span class="tv-app-label">Install App</span>
      <span class="tv-app-active-dot"></span>
    </button>
    `
  ].join("");

  const homeAppsShelfSection = `
    <section class="home-apps-showcase">
      <div class="home-apps-header">
        <div class="home-apps-header-left">
          <span style="font-size:1.4rem;">📺</span>
          <div>
            <h3>Your Installed Apps & Objects</h3>
            <p>Select any object app to launch its lifecycle workspace or install new sporting blueprints</p>
          </div>
        </div>
        <button class="tv-btn" data-jump-channel="studio">Browse App Store (+${unactivated.length} Blueprints) →</button>
      </div>
      <div class="tv-apps-shelf" style="padding-left:0; padding-right:0;">
        ${homeAppTilesHtml}
      </div>
    </section>
  `;

  const railsHtml = state.objects
    .map((obj) => {
      const records = state.recordsByObject[obj.apiName] || [];
      return `
        <section class="tv-rail-section">
          <div class="rail-header">
            <div class="rail-title-group">
              <span>${escapeHtml(obj.icon)}</span>
              <h3>${escapeHtml(obj.pluralLabel)} Content Rail</h3>
              <span class="channel-count">${records.length} Active Records</span>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="tv-btn" data-open-create="${escapeHtml(obj.apiName)}">+ New ${escapeHtml(obj.label)}</button>
              <button class="tv-btn" data-jump-channel="${escapeHtml(obj.apiName)}">Open ${escapeHtml(obj.pluralLabel)} App →</button>
            </div>
          </div>
          <div class="tv-rail-track">
            ${records.map((r) => renderCardHtml(obj, r)).join("")}
          </div>
        </section>
      `;
    })
    .join("");

  const recentEventsHtml = (state.pulse?.recentEvents || [])
    .slice(0, 6)
    .map(
      (evt) => `
      <div class="blueprint-card" style="min-width:290px;">
        <div>
          <span class="eyebrow-tag" style="font-size:0.65rem;">${escapeHtml(evt.type)}</span>
          <div style="font-weight:700; font-size:0.9rem; margin:4px 0;">${escapeHtml(evt.summary)}</div>
          <div style="font-size:0.76rem; color:var(--text-muted);">
            Synced to: ${escapeHtml((evt.dispatchedTo || []).join(" • "))}
          </div>
        </div>
        <div style="font-size:0.72rem; color:var(--text-dim);">
          Operator: ${escapeHtml(evt.actor)} • ${new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    `
    )
    .join("");

  return `
    <section class="hero-spotlight">
      <div class="hero-left">
        <span class="eyebrow-tag">CENTRAL SPORTING & VENUE ORCHESTRATION LAYER</span>
        <h2>Matchday -28h Operational Command Deck</h2>
        <p>
          Navigate Staff, Teams, Venues, and Custom Objects like apps in a Smart TV OS. Every record follows a customizable Salesforce-style lifecycle state machine and is exposed live via the embedded Model Context Protocol (MCP).
        </p>
        <div class="hero-actions">
          <button class="tv-btn tv-btn-primary" id="heroCreateObjectBtn">✨ Create Custom Object</button>
          <button class="tv-btn tv-btn-purple" id="heroOpenMcpBtn">🤖 Open Embedded MCP Console</button>
        </div>
      </div>
      <div class="hero-metrics-grid">
        <div class="metric-tile">
          <div class="metric-value">${escapeHtml(m.activeStaffCount || "6/8")}</div>
          <div class="metric-label">Staff On-Duty</div>
        </div>
        <div class="metric-tile">
          <div class="metric-value">${escapeHtml(m.avgTeamReadiness || "93%")}</div>
          <div class="metric-label">Avg Squad Readiness</div>
        </div>
        <div class="metric-tile">
          <div class="metric-value">${escapeHtml(m.operationalVenues || "5/6")}</div>
          <div class="metric-label">Venues Operational</div>
        </div>
        <div class="metric-tile">
          <div class="metric-value">${escapeHtml(String(m.totalObjects || 3))}</div>
          <div class="metric-label">Active Lifecycle Objects</div>
        </div>
      </div>
    </section>

    ${homeAppsShelfSection}

    ${railsHtml}

    <section class="tv-rail-section">
      <div class="rail-header">
        <div class="rail-title-group">
          <span>⚡</span>
          <h3>Recent Input & Live Connector Bus</h3>
        </div>
      </div>
      <div class="tv-rail-track">
        ${recentEventsHtml}
      </div>
    </section>
  `;
}

function renderObjectChannel(apiName) {
  const objDef = state.objects.find((o) => o.apiName === apiName);
  if (!objDef) return `<div class="tv-panel">Object not found.</div>`;

  const meta = getObjectAppMeta(apiName);
  const allRecords = state.recordsByObject[apiName] || [];
  const filteredRecords = state.stageFilter
    ? allRecords.filter((r) => r.stage === state.stageFilter)
    : allRecords;

  // Lifecycle pipeline steps
  const pipelineHtml = objDef.lifecycle
    .map((st) => {
      const count = allRecords.filter((r) => r.stage === st.id).length;
      const isSelected = state.stageFilter === st.id;
      return `
        <div class="pipeline-step ${isSelected ? "active" : ""}" data-stage-filter="${escapeHtml(st.id)}">
          <div>
            <span class="stage-dot" style="background:${st.color}; margin-right:6px;"></span>
            <span class="pipeline-step-name">${escapeHtml(st.label)}</span>
          </div>
          <span class="pipeline-step-count">${count}</span>
        </div>
      `;
    })
    .join("");

  // Swimlanes by Lifecycle Stage
  const swimlanesHtml = objDef.lifecycle
    .filter((st) => !state.stageFilter || state.stageFilter === st.id)
    .map((st) => {
      const stageRecords = filteredRecords.filter((r) => r.stage === st.id);
      return `
        <section class="tv-rail-section">
          <div class="rail-header">
            <div class="rail-title-group">
              <span class="stage-dot" style="background:${st.color};"></span>
              <h3>${escapeHtml(st.label)}</h3>
              <span class="channel-count">${stageRecords.length}</span>
            </div>
          </div>
          <div class="tv-rail-track">
            ${
              stageRecords.length > 0
                ? stageRecords.map((r) => renderCardHtml(objDef, r)).join("")
                : `<div class="blueprint-card" style="min-width:300px; color:var(--text-dim);">No ${escapeHtml(objDef.pluralLabel)} currently in [${escapeHtml(st.label)}] stage.</div>`
            }
          </div>
        </section>
      `;
    })
    .join("");

  return `
    <section class="hero-spotlight">
      <div style="display:flex; align-items:center; gap:24px; flex-wrap:wrap;">
        <div class="tv-app-squircle ${meta.gradientClass}" style="width:92px; height:92px; border-radius:24px; flex-shrink:0;">
          <div class="tv-app-gloss"></div>
          <span class="tv-app-icon" style="font-size:2.4rem;">${escapeHtml(objDef.icon || meta.icon)}</span>
          <span class="tv-app-badge">${allRecords.length}</span>
        </div>
        <div class="hero-left">
          <span class="eyebrow-tag">${escapeHtml(objDef.category)} • API NAME: ${escapeHtml(objDef.apiName)}</span>
          <h2>${escapeHtml(objDef.pluralLabel)} App & Lifecycle Workspace</h2>
          <p>${escapeHtml(objDef.description)}</p>
          <div class="hero-actions">
            <button class="tv-btn tv-btn-primary" data-open-create="${escapeHtml(objDef.apiName)}">+ New ${escapeHtml(objDef.label)}</button>
            ${
              state.stageFilter
                ? `<button class="tv-btn" id="clearStageFilterBtn">Show All Lifecycle Stages (${allRecords.length})</button>`
                : ""
            }
          </div>
        </div>
      </div>
      <div style="min-width:240px;">
        <div class="metric-tile">
          <div class="metric-value">${allRecords.length}</div>
          <div class="metric-label">Active Records in ${escapeHtml(objDef.pluralLabel)}</div>
        </div>
      </div>
    </section>

    <div class="lifecycle-pipeline-bar">
      ${pipelineHtml}
    </div>

    ${swimlanesHtml}
  `;
}

function renderObjectStudio() {
  const blueprintCards = state.blueprints
    .map(
      (bp) => {
        const meta = getObjectAppMeta(bp.apiName);
        return `
        <div class="blueprint-card">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <div class="tv-app-squircle ${meta.gradientClass}" style="width:58px; height:58px; border-radius:16px;">
                <div class="tv-app-gloss"></div>
                <span class="tv-app-icon" style="font-size:1.6rem;">${escapeHtml(bp.icon || meta.icon)}</span>
              </div>
              <span class="platform-badge">${escapeHtml(bp.category)}</span>
            </div>
            <h4 style="font-size:1.02rem; margin-bottom:4px; color:#ffffff;">${escapeHtml(bp.pluralLabel)} <code style="font-size:0.75rem; color:#94a3b8;">(${escapeHtml(bp.apiName)})</code></h4>
            <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.4; margin-bottom:10px;">
              ${escapeHtml(bp.description)}
            </p>
            <div style="font-size:0.74rem; color:#cbd5e1;">
              <strong>Lifecycle:</strong> ${bp.lifecycle.map((s) => escapeHtml(s.id)).join(" → ")}
            </div>
          </div>
          <div style="margin-top:12px;">
            ${
              bp.isActivated
                ? `<button class="tv-btn tv-btn-blue" style="width:100%; justify-content:center;" data-jump-channel="${escapeHtml(bp.apiName)}">✓ Installed — Launch App →</button>`
                : `<button class="tv-btn tv-btn-primary" style="width:100%; justify-content:center;" data-activate-blueprint="${escapeHtml(bp.apiName)}">⚡ Install App (1-Click)</button>`
            }
          </div>
        </div>
      `;
      }
    )
    .join("");

  return `
    <div class="studio-grid">
      <div class="tv-panel">
        <span class="eyebrow-tag">NO-CODE METADATA ENGINE</span>
        <h3>Create Custom Lifecycle Object</h3>
        <p class="panel-sub">
          Everything in SportsOS works around Objects like Salesforce — but launches immediately as a TV channel and exposes MCP AI tools automatically.
        </p>
        <form id="customObjectForm">
          <div class="form-row-2">
            <div class="form-group">
              <label>Singular Label *</label>
              <input class="form-input" name="label" placeholder="e.g. Kit Inventory" required />
            </div>
            <div class="form-group">
              <label>Plural Channel Name *</label>
              <input class="form-input" name="pluralLabel" placeholder="e.g. Kit Inventories" required />
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label>Channel Icon (Emoji)</label>
              <input class="form-input" name="icon" value="👕" />
            </div>
            <div class="form-group">
              <label>Category</label>
              <input class="form-input" name="category" value="Custom Operations" />
            </div>
          </div>
          <div class="form-group">
            <label>Lifecycle State Machine (Comma-Separated Stages) *</label>
            <input class="form-input" name="lifecycle" value="Ordered, Warehouse Ready, Allocated to Squad, Match Ready, Laundry & Maintenance" required />
          </div>
          <div class="form-group">
            <label>Description</label>
            <input class="form-input" name="description" placeholder="Tracks matchday kits, training wear, and equipment trunks per squad." />
          </div>
          <div class="form-group">
            <label>Custom Fields (Name : Type, comma-separated)</label>
            <input class="form-input" name="customFieldsSpec" value="kitType:text, squadAllocation:lookup:team, storageVenue:lookup:venue, quantity:number" />
          </div>
          <button type="submit" class="tv-btn tv-btn-primary" style="width:100%; justify-content:center; margin-top:8px;">
            🚀 Provision Custom Object + TV Channel + MCP Tools
          </button>
        </form>
      </div>

      <div class="tv-panel">
        <span class="eyebrow-tag">SPORTS DOMAIN CATALOG (12 BLUEPRINTS)</span>
        <h3>1-Click Sports Organization Blueprints</h3>
        <p class="panel-sub">
          Activate pre-modeled SportsOS objects (Players, Departments, Projects, Events, Schedules, Customers, Partners, Assets, Contracts, Medical Cases, Scouting Targets, Accreditations).
        </p>
        <div class="blueprint-grid">
          ${blueprintCards}
        </div>
      </div>
    </div>
  `;
}

function renderUsersChannel() {
  const userRows = state.users
    .map(
      (u) => `
      <div class="blueprint-card">
        <div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span class="stage-pill" style="background:${u.avatarColor}25; color:${u.avatarColor}; border-color:${u.avatarColor}66;">
              ${escapeHtml(u.roleLabel)}
            </span>
            <span class="meta-chip">${escapeHtml(u.status)}</span>
          </div>
          <h4 style="font-size:1.05rem;">${escapeHtml(u.name)}</h4>
          <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:8px;">
            ${escapeHtml(u.title)} • ${escapeHtml(u.department)}
          </p>
          <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:8px;">
            📧 ${escapeHtml(u.email)}<br/>
            🔑 MCP Scope: <code>${escapeHtml(u.mcpKeyScope)}</code>
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <select class="form-select" data-user-role-change="${escapeHtml(u.id)}" style="padding:6px 10px; font-size:0.78rem;">
            ${state.roles
              .map(
                (r) =>
                  `<option value="${escapeHtml(r.id)}" ${r.id === u.role ? "selected" : ""}>${escapeHtml(r.label)}</option>`
              )
              .join("")}
          </select>
        </div>
      </div>
    `
    )
    .join("");

  return `
    <div class="studio-grid">
      <div class="tv-panel">
        <span class="eyebrow-tag">IDENTITY, RBAC & MCP SCOPES</span>
        <h3>Provision Club Operator</h3>
        <p class="panel-sub">
          Assign granular RBAC roles that govern both UI permissions (Custom Object Studio, Lifecycle overrides) and Embedded MCP token scopes.
        </p>
        <form id="createUserForm">
          <div class="form-group">
            <label>Full Name *</label>
            <input class="form-input" name="name" placeholder="e.g. Natalia Romero" required />
          </div>
          <div class="form-group">
            <label>Club Email *</label>
            <input class="form-input" type="email" name="email" placeholder="n.romero@metropolitanofc.org" required />
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label>Job Title</label>
              <input class="form-input" name="title" placeholder="Head of Commercial Partnerships" />
            </div>
            <div class="form-group">
              <label>Department</label>
              <input class="form-input" name="department" placeholder="Commercial & Sponsorships" />
            </div>
          </div>
          <div class="form-group">
            <label>RBAC Role *</label>
            <select class="form-select" name="role">
              ${state.roles
                .map((r) => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.label)} — ${escapeHtml(r.description)}</option>`)
                .join("")}
            </select>
          </div>
          <button type="submit" class="tv-btn tv-btn-primary" style="width:100%; justify-content:center;">
            + Provision Operator Account
          </button>
        </form>
      </div>

      <div class="tv-panel">
        <span class="eyebrow-tag">ACTIVE CLUB OPERATORS (${state.users.length})</span>
        <h3>Operator Directory & Role Matrix</h3>
        <p class="panel-sub">
          Tip: Use the top-right Operator Switcher to test how each role experiences SportsOS.
        </p>
        <div class="blueprint-grid">
          ${userRows}
        </div>
      </div>
    </div>
  `;
}

function renderMcpChannel() {
  const connectorsHtml = (state.pulse?.connectors || [])
    .map(
      (c) => `
      <div class="blueprint-card">
        <div>
          <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
            <span class="stage-pill" style="background:#10b98122; color:#34d399;">● ${escapeHtml(c.status)}</span>
            <span class="meta-chip">${escapeHtml(c.protocol)}</span>
          </div>
          <h4 style="font-size:0.98rem;">${escapeHtml(c.name)}</h4>
          <p style="font-size:0.78rem; color:var(--text-muted); margin:4px 0 8px;">
            Category: ${escapeHtml(c.category)} • Sync: ${escapeHtml(c.lastSync)}
          </p>
        </div>
        <div style="font-size:0.74rem; color:#94a3b8;">
          Objects: <code>${escapeHtml(c.syncedObjects.join(", "))}</code>
        </div>
      </div>
    `
    )
    .join("");

  const toolsListHtml = state.mcp.tools
    .map(
      (t) => `
      <div class="blueprint-card">
        <div>
          <code style="color:#a78bfa; font-weight:700; font-size:0.86rem;">${escapeHtml(t.name)}</code>
          <p style="font-size:0.78rem; color:var(--text-muted); margin-top:6px;">${escapeHtml(t.description)}</p>
        </div>
        <button class="tv-btn" style="font-size:0.75rem; padding:6px 10px;" data-test-mcp-tool="${escapeHtml(t.name)}">
          ▶ Test in Inspector
        </button>
      </div>
    `
    )
    .join("");

  return `
    <div class="studio-grid">
      <div class="tv-panel">
        <span class="eyebrow-tag">EMBEDDED MODEL CONTEXT PROTOCOL (MCP 2025-03-26)</span>
        <h3>Live MCP JSON-RPC 2.0 Inspector</h3>
        <p class="panel-sub">
          Every standard and custom object in SportsOS is automatically exposed over HTTP JSON-RPC (<code>POST /mcp</code>), SSE (<code>GET /mcp/sse</code>), and Stdio (<code>src/mcp/stdio-server.js</code>).
        </p>
        <div class="form-group">
          <label>Quick RPC Method Preset</label>
          <select id="mcpPresetSelect" class="form-select">
            <option value="tools/list">tools/list — Discover all dynamic SportsOS MCP tools</option>
            <option value="pulse">tools/call (sportsos_get_operational_pulse)</option>
            <option value="query_staff">tools/call (sportsos_query_records: staff)</option>
            <option value="query_teams">tools/call (sportsos_query_records: team)</option>
            <option value="query_venues">tools/call (sportsos_query_records: venue)</option>
            <option value="resources/list">resources/list — List live URI streams</option>
          </select>
        </div>
        <div class="form-group">
          <label>JSON-RPC 2.0 Request Payload (POST /mcp)</label>
          <textarea id="mcpRpcTextarea" class="form-textarea" rows="6"></textarea>
        </div>
        <button id="sendMcpRpcBtn" class="tv-btn tv-btn-purple" style="width:100%; justify-content:center;">
          ⚡ Send JSON-RPC 2.0 Request to /mcp
        </button>
        <div class="form-group" style="margin-top:14px;">
          <label>Live MCP Server Response</label>
          <pre id="mcpRpcOutput" class="code-block">Click "Send JSON-RPC 2.0 Request" to inspect live MCP server output...</pre>
        </div>

        <div class="form-group" style="margin-top:16px;">
          <label>Desktop / IDE Agent Config (Claude Desktop / Cursor / Gemini)</label>
          <pre class="code-block">{
  "mcpServers": {
    "sportsos": {
      "command": "node",
      "args": ["/Users/hcrubellati/Documents/Projects/SportsOS/src/mcp/stdio-server.js"]
    }
  }
}</pre>
        </div>
      </div>

      <div>
        <div class="tv-panel" style="margin-bottom:20px;">
          <span class="eyebrow-tag">AUTO-GENERATED MCP TOOL REGISTRY (${state.mcp.tools.length})</span>
          <h3>Registered MCP Tools</h3>
          <p class="panel-sub">Click any tool to pre-fill and execute it in the JSON-RPC inspector.</p>
          <div class="blueprint-grid">
            ${toolsListHtml}
          </div>
        </div>

        <div class="tv-panel">
          <span class="eyebrow-tag">CENTRAL ORCHESTRATION LAYER</span>
          <h3>Connected Point Solutions (${(state.pulse?.connectors || []).length})</h3>
          <p class="panel-sub">SportsOS orchestrates external sports tools rather than replacing them.</p>
          <div class="blueprint-grid">
            ${connectorsHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderViewport() {
  const viewport = document.getElementById("tvViewport");
  if (state.activeChannel === "home") {
    viewport.innerHTML = renderHomeDeck();
  } else if (state.activeChannel === "studio") {
    viewport.innerHTML = renderObjectStudio();
  } else if (state.activeChannel === "users") {
    viewport.innerHTML = renderUsersChannel();
  } else if (state.activeChannel === "mcp") {
    viewport.innerHTML = renderMcpChannel();
    setupMcpInspectorEvents();
  } else {
    viewport.innerHTML = renderObjectChannel(state.activeChannel);
  }

  bindViewportInteractions();
}

function bindViewportInteractions() {
  const viewport = document.getElementById("tvViewport");

  // TV OS App Tile clicks inside viewport (e.g. Home Deck apps showcase)
  viewport.querySelectorAll(".tv-app-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      if (tile.dataset.action === "open-store") {
        state.activeChannel = "studio";
      } else if (tile.dataset.channel) {
        state.activeChannel = tile.dataset.channel;
      }
      state.stageFilter = null;
      state.spatialIndex = 0;
      renderChannelDock();
      renderViewport();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // Card clicks -> open Record Lifecycle Remote Drawer
  viewport.querySelectorAll(".tv-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-quick-advance]")) return;
      openRecordDrawer(card.dataset.object, card.dataset.recordId);
    });
  });

  // 1-Click Quick Advance button on card
  viewport.querySelectorAll("[data-quick-advance]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const apiName = btn.dataset.object;
      const recordId = btn.dataset.recordId;
      const targetStage = btn.dataset.quickAdvance;
      try {
        await apiFetch(`/api/records/${apiName}/${recordId}/transition`, {
          method: "POST",
          body: JSON.stringify({
            targetStage,
            note: `Quick-stepped via TV Card Remote to ${targetStage}`
          })
        });
        showToast(`Transitioned to ${targetStage}`);
        await loadBootstrap();
      } catch (err) {
        showToast(`⚠️ ${err.message}`);
      }
    });
  });

  // Jump channel buttons
  viewport.querySelectorAll("[data-jump-channel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeChannel = btn.dataset.jumpChannel;
      state.stageFilter = null;
      renderChannelDock();
      renderViewport();
    });
  });

  // Open Create Record modal
  viewport.querySelectorAll("[data-open-create]").forEach((btn) => {
    btn.addEventListener("click", () => openCreateRecordModal(btn.dataset.openCreate));
  });

  // Stage filter pills
  viewport.querySelectorAll("[data-stage-filter]").forEach((step) => {
    step.addEventListener("click", () => {
      const clicked = step.dataset.stageFilter;
      state.stageFilter = state.stageFilter === clicked ? null : clicked;
      renderViewport();
    });
  });

  const clearBtn = document.getElementById("clearStageFilterBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      state.stageFilter = null;
      renderViewport();
    });
  }

  const heroCreateObj = document.getElementById("heroCreateObjectBtn");
  if (heroCreateObj) {
    heroCreateObj.addEventListener("click", () => {
      state.activeChannel = "studio";
      renderChannelDock();
      renderViewport();
    });
  }

  const heroOpenMcp = document.getElementById("heroOpenMcpBtn");
  if (heroOpenMcp) {
    heroOpenMcp.addEventListener("click", () => {
      state.activeChannel = "mcp";
      renderChannelDock();
      renderViewport();
    });
  }

  // Activate 1-Click Blueprint
  viewport.querySelectorAll("[data-activate-blueprint]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const apiName = btn.dataset.activateBlueprint;
        const created = await apiFetch("/api/blueprints/activate", {
          method: "POST",
          body: JSON.stringify({ apiName })
        });
        showToast(`⚡ Activated ${created.pluralLabel} Channel + MCP Tools!`);
        state.activeChannel = created.apiName;
        await loadBootstrap();
      } catch (err) {
        showToast(`⚠️ ${err.message}`);
      }
    });
  });

  // Custom Object Studio Form
  const customObjectForm = document.getElementById("customObjectForm");
  if (customObjectForm) {
    customObjectForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(customObjectForm);
      const rawSpec = String(fd.get("customFieldsSpec") || "");
      const fields = rawSpec
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((item) => {
          const [name, type = "text", targetObject] = item.split(":").map((p) => p.trim());
          return {
            name,
            label: name.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
            type,
            targetObject,
            required: false
          };
        });

      try {
        const created = await apiFetch("/api/objects", {
          method: "POST",
          body: JSON.stringify({
            label: fd.get("label"),
            pluralLabel: fd.get("pluralLabel"),
            icon: fd.get("icon"),
            category: fd.get("category"),
            description: fd.get("description"),
            lifecycle: fd.get("lifecycle"),
            fields,
            sampleRecords: [
              {
                name: `${fd.get("label")} #1 (Initial Sample)`,
                subtitle: `Provisioned via SportsOS No-Code Object Studio`
              }
            ]
          })
        });
        showToast(`🚀 Created Custom Object: ${created.pluralLabel} (${created.apiName})`);
        state.activeChannel = created.apiName;
        await loadBootstrap();
      } catch (err) {
        showToast(`⚠️ ${err.message}`);
      }
    });
  }

  // Create User Form
  const createUserForm = document.getElementById("createUserForm");
  if (createUserForm) {
    createUserForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(createUserForm);
      try {
        const created = await apiFetch("/api/users", {
          method: "POST",
          body: JSON.stringify(Object.fromEntries(fd.entries()))
        });
        showToast(`Provisioned user ${created.name} (${created.roleLabel})`);
        await loadBootstrap();
      } catch (err) {
        showToast(`⚠️ ${err.message}`);
      }
    });
  }

  // User Role Change Select
  viewport.querySelectorAll("[data-user-role-change]").forEach((sel) => {
    sel.addEventListener("change", async () => {
      try {
        const userId = sel.dataset.userRoleChange;
        const updated = await apiFetch(`/api/users/${userId}`, {
          method: "PATCH",
          body: JSON.stringify({ role: sel.value })
        });
        showToast(`Updated ${updated.name} role to ${updated.roleLabel}`);
        await loadBootstrap();
      } catch (err) {
        showToast(`⚠️ ${err.message}`);
        await loadBootstrap();
      }
    });
  });
}

// --- Record Inspector & Lifecycle Remote Drawer ---

function openRecordDrawer(apiName, recordId) {
  const objDef = state.objects.find((o) => o.apiName === apiName);
  const rec = (state.recordsByObject[apiName] || []).find((r) => r.id === recordId);
  if (!objDef || !rec) return;

  state.selectedRecord = { apiName, id: recordId };
  const backdrop = document.getElementById("recordDrawerBackdrop");
  const content = document.getElementById("recordDrawerContent");

  const stageButtons = objDef.lifecycle
    .map((st) => {
      const isCurrent = st.id === rec.stage;
      return `
        <button
          class="tv-btn ${isCurrent ? "tv-btn-primary" : ""}"
          style="width:100%; justify-content:space-between; margin-bottom:8px;"
          data-drawer-transition="${escapeHtml(st.id)}"
        >
          <span>● ${escapeHtml(st.label)}</span>
          <span>${isCurrent ? "CURRENT STAGE" : "Transition →"}</span>
        </button>
      `;
    })
    .join("");

  const fieldsHtml = (objDef.fields || [])
    .map((f) => {
      const val = rec.fields?.[f.name];
      const lookup = rec._resolvedLookups?.[f.name];
      if (f.type === "lookup" && lookup) {
        return `
          <div class="blueprint-card" style="padding:12px;">
            <span style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase;">${escapeHtml(f.label)} (Lookup)</span>
            <button class="tv-btn" style="margin-top:4px;" data-jump-lookup-object="${escapeHtml(lookup.objectApiName)}" data-jump-lookup-id="${escapeHtml(lookup.id)}">
              🔗 ${escapeHtml(lookup.name)} (${escapeHtml(lookup.stage)})
            </button>
          </div>
        `;
      }
      return `
        <div class="blueprint-card" style="padding:12px;">
          <span style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase;">${escapeHtml(f.label)}</span>
          <strong style="font-size:0.95rem; margin-top:4px;">${escapeHtml(val ?? "—")}</strong>
        </div>
      `;
    })
    .join("");

  const historyHtml = (rec.history || [])
    .map(
      (h) => `
      <div style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.07); font-size:0.8rem;">
        <div><strong>${escapeHtml(h.from)} → ${escapeHtml(h.to)}</strong> by ${escapeHtml(h.actor)}</div>
        <div style="color:var(--text-muted);">${escapeHtml(h.note || "")}</div>
        <div style="color:var(--text-dim); font-size:0.72rem;">${new Date(h.timestamp).toLocaleString()}</div>
      </div>
    `
    )
    .join("");

  content.innerHTML = `
    <div class="modal-header">
      <div>
        <span class="eyebrow-tag">${escapeHtml(objDef.icon)} ${escapeHtml(objDef.label)} • ${escapeHtml(rec.id)}</span>
        <h2 style="font-size:1.45rem;">${escapeHtml(rec.name)}</h2>
        <p style="color:var(--text-muted); font-size:0.88rem; margin-top:4px;">${escapeHtml(rec.subtitle || "")}</p>
      </div>
      <button class="tv-icon-btn" id="closeDrawerBtn">✕</button>
    </div>

    <div style="margin:20px 0;">
      <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">
        Lifecycle State Machine Remote
      </label>
      <input id="drawerTransitionNote" class="form-input" placeholder="Optional audit note for lifecycle transition..." style="margin-bottom:10px;" />
      ${stageButtons}
    </div>

    <div style="margin:20px 0;">
      <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">
        Object Fields & Relational Lookups
      </label>
      <div class="blueprint-grid" style="grid-template-columns:1fr 1fr;">
        ${fieldsHtml}
      </div>
    </div>

    <div style="margin:20px 0;">
      <label style="display:block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">
        Lifecycle & Orchestration Audit Trail
      </label>
      ${historyHtml || `<div style="color:var(--text-dim); font-size:0.82rem;">No transitions recorded yet.</div>`}
    </div>
  `;

  backdrop.classList.remove("hidden");

  document.getElementById("closeDrawerBtn").addEventListener("click", () => {
    backdrop.classList.add("hidden");
    state.selectedRecord = null;
  });

  content.querySelectorAll("[data-drawer-transition]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetStage = btn.dataset.drawerTransition;
      const note = document.getElementById("drawerTransitionNote").value;
      try {
        await apiFetch(`/api/records/${apiName}/${recordId}/transition`, {
          method: "POST",
          body: JSON.stringify({ targetStage, note })
        });
        showToast(`✅ ${rec.name} moved to [${targetStage}]`);
        await loadBootstrap();
        openRecordDrawer(apiName, recordId);
      } catch (err) {
        showToast(`⚠️ ${err.message}`);
      }
    });
  });

  content.querySelectorAll("[data-jump-lookup-object]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openRecordDrawer(btn.dataset.jumpLookupObject, btn.dataset.jumpLookupId);
    });
  });
}

// --- Create Record Modal ---

function openCreateRecordModal(apiName) {
  const objDef = state.objects.find((o) => o.apiName === apiName) || state.objects[0];
  if (!objDef) return;

  const backdrop = document.getElementById("createRecordModalBackdrop");
  const container = document.getElementById("createRecordModalContent");

  const dynamicFields = (objDef.fields || [])
    .map((f) => {
      if (f.type === "select" && Array.isArray(f.options)) {
        return `
          <div class="form-group">
            <label>${escapeHtml(f.label)}</label>
            <select class="form-select" name="field_${escapeHtml(f.name)}">
              ${f.options.map((opt) => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join("")}
            </select>
          </div>
        `;
      }
      if (f.type === "lookup" && f.targetObject) {
        const targetRecords = state.recordsByObject[f.targetObject] || [];
        return `
          <div class="form-group">
            <label>${escapeHtml(f.label)} (Lookup → ${escapeHtml(f.targetObject)})</label>
            <select class="form-select" name="field_${escapeHtml(f.name)}">
              <option value="">— None —</option>
              ${targetRecords.map((tr) => `<option value="${escapeHtml(tr.id)}">${escapeHtml(tr.name)} (${escapeHtml(tr.stage)})</option>`).join("")}
            </select>
          </div>
        `;
      }
      return `
        <div class="form-group">
          <label>${escapeHtml(f.label)}</label>
          <input class="form-input" type="${f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}" name="field_${escapeHtml(f.name)}" />
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="modal-header">
      <div>
        <span class="eyebrow-tag">NEW ${escapeHtml(objDef.label.toUpperCase())} RECORD</span>
        <h2>${escapeHtml(objDef.icon)} Create ${escapeHtml(objDef.label)}</h2>
      </div>
      <button class="tv-icon-btn" id="closeCreateRecordBtn">✕</button>
    </div>
    <form id="newRecordForm">
      <div class="form-row-2">
        <div class="form-group">
          <label>Record Name *</label>
          <input class="form-input" name="name" required placeholder="e.g. Mateo Gallardo" />
        </div>
        <div class="form-group">
          <label>Initial Lifecycle Stage *</label>
          <select class="form-select" name="stage">
            ${objDef.lifecycle.map((st) => `<option value="${escapeHtml(st.id)}">${escapeHtml(st.label)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>TV Card Subtitle</label>
        <input class="form-input" name="subtitle" placeholder="Concise operational headline shown on TV rail..." />
      </div>
      <div class="form-row-2">
        ${dynamicFields}
      </div>
      <button type="submit" class="tv-btn tv-btn-primary" style="width:100%; justify-content:center; margin-top:10px;">
        Create ${escapeHtml(objDef.label)} & Emit Orchestration Event
      </button>
    </form>
  `;

  backdrop.classList.remove("hidden");
  document.getElementById("closeCreateRecordBtn").addEventListener("click", () => {
    backdrop.classList.add("hidden");
  });

  document.getElementById("newRecordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const fields = {};
    for (const [k, v] of fd.entries()) {
      if (k.startsWith("field_") && v !== "") {
        fields[k.replace("field_", "")] = v;
      }
    }
    try {
      const created = await apiFetch(`/api/records/${objDef.apiName}`, {
        method: "POST",
        body: JSON.stringify({
          name: fd.get("name"),
          stage: fd.get("stage"),
          subtitle: fd.get("subtitle"),
          fields
        })
      });
      backdrop.classList.add("hidden");
      showToast(`Created ${created.name} in ${objDef.pluralLabel}`);
      await loadBootstrap();
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    }
  });
}

// --- MCP Inspector Events ---

function setupMcpInspectorEvents() {
  const presetSelect = document.getElementById("mcpPresetSelect");
  const textarea = document.getElementById("mcpRpcTextarea");
  const sendBtn = document.getElementById("sendMcpRpcBtn");
  const output = document.getElementById("mcpRpcOutput");

  if (!presetSelect || !textarea) return;

  const presets = {
    "tools/list": { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
    pulse: {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "sportsos_get_operational_pulse", arguments: {} }
    },
    query_staff: {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "sportsos_query_records", arguments: { objectApiName: "staff" } }
    },
    query_teams: {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "sportsos_query_records", arguments: { objectApiName: "team" } }
    },
    query_venues: {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "sportsos_query_records", arguments: { objectApiName: "venue" } }
    },
    "resources/list": { jsonrpc: "2.0", id: 6, method: "resources/list", params: {} }
  };

  textarea.value = JSON.stringify(presets["tools/list"], null, 2);

  presetSelect.addEventListener("change", () => {
    const chosen = presets[presetSelect.value] || presets["tools/list"];
    textarea.value = JSON.stringify(chosen, null, 2);
  });

  sendBtn.addEventListener("click", async () => {
    try {
      const payload = JSON.parse(textarea.value);
      const res = await apiFetch("/mcp", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      output.textContent = JSON.stringify(res, null, 2);
      await loadBootstrap();
    } catch (err) {
      output.textContent = `Error: ${err.message}`;
    }
  });

  document.querySelectorAll("[data-test-mcp-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const toolName = btn.dataset.testMcpTool;
      let sampleArgs = {};
      if (toolName === "sportsos_query_records") sampleArgs = { objectApiName: "staff" };
      if (toolName === "sportsos_transition_lifecycle") {
        sampleArgs = {
          objectApiName: "staff",
          recordId: "stf_javier",
          targetStage: "Active",
          note: "Verified via MCP Inspector"
        };
      }
      if (toolName === "sportsos_create_record") {
        sampleArgs = {
          objectApiName: "venue",
          name: "Indoor Recovery Pitch B",
          stage: "Available",
          fields: { facilityType: "Training Pitch", surface: "Hybrid Turf", capacity: 150 }
        };
      }
      if (toolName === "sportsos_activate_blueprint") {
        sampleArgs = { blueprintApiName: "player__c" };
      }
      textarea.value = JSON.stringify(
        {
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: { name: toolName, arguments: sampleArgs }
        },
        null,
        2
      );
      sendBtn.click();
    });
  });
}

// --- Global Event Listeners & Spatial Remote Navigation ---

document.addEventListener("DOMContentLoaded", () => {
  loadBootstrap();

  // Live Clock
  setInterval(() => {
    const now = new Date();
    document.getElementById("tvClock").textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }, 10000);

  // User RBAC Switcher
  document.getElementById("activeUserSelect").addEventListener("change", (e) => {
    state.activeUserId = e.target.value;
    const u = state.users.find((x) => x.id === state.activeUserId);
    if (u) showToast(`Switched operator to ${u.name} (${u.roleLabel})`);
    loadBootstrap();
  });

  // MCP Header Badge
  document.getElementById("mcpHeaderBadge").addEventListener("click", () => {
    state.activeChannel = "mcp";
    renderChannelDock();
    renderViewport();
  });

  // Copilot Modal (Cmd+K)
  const copilotBackdrop = document.getElementById("copilotModalBackdrop");
  const copilotInput = document.getElementById("copilotInput");
  const copilotResultBox = document.getElementById("copilotResultBox");

  function openCopilot() {
    copilotBackdrop.classList.remove("hidden");
    copilotInput.focus();
  }

  document.getElementById("openCopilotBtn").addEventListener("click", openCopilot);
  document.getElementById("closeCopilotBtn").addEventListener("click", () => {
    copilotBackdrop.classList.add("hidden");
  });

  document.querySelectorAll(".chip-btn").forEach((chip) => {
    chip.addEventListener("click", () => {
      copilotInput.value = chip.dataset.prompt;
      document.getElementById("copilotForm").requestSubmit();
    });
  });

  document.getElementById("copilotForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = copilotInput.value.trim();
    if (!prompt) return;
    try {
      const res = await apiFetch("/api/mcp/copilot", {
        method: "POST",
        body: JSON.stringify({ prompt })
      });
      copilotResultBox.classList.remove("hidden");
      copilotResultBox.innerHTML = `
        <div style="margin-bottom:8px;">
          <span class="platform-badge">MCP TOOL INVOKED: ${escapeHtml(res.invokedTool)}</span>
        </div>
        <div style="font-size:0.95rem; margin-bottom:8px;">${res.summary}</div>
        <pre class="code-block">${escapeHtml(JSON.stringify(res.data, null, 2).slice(0, 1200))}</pre>
      `;
      await loadBootstrap();
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    }
  });

  // Spatial Keyboard / TV Remote Shortcuts
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openCopilot();
      return;
    }
    if (e.key === "Escape") {
      document.getElementById("recordDrawerBackdrop").classList.add("hidden");
      document.getElementById("createRecordModalBackdrop").classList.add("hidden");
      copilotBackdrop.classList.add("hidden");
      return;
    }

    const activeTag = document.activeElement?.tagName;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) return;

    const activeEl = document.activeElement;
    const appTiles = Array.from(document.querySelectorAll("#topAppsShelf .tv-app-tile"));
    const cards = Array.from(document.querySelectorAll(".tv-card"));
    const isAppFocused = activeEl && activeEl.classList.contains("tv-app-tile");

    // If an app tile in the top dock or shelf is focused
    if (isAppFocused && appTiles.length) {
      const currentIdx = appTiles.indexOf(activeEl);
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const nextIdx = (currentIdx + 1) % appTiles.length;
        appTiles[nextIdx].focus();
        return;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const prevIdx = (currentIdx - 1 + appTiles.length) % appTiles.length;
        appTiles[prevIdx].focus();
        return;
      } else if (e.key === "ArrowDown" && cards.length) {
        e.preventDefault();
        cards[0].focus();
        cards[0].classList.add("spatial-focus");
        state.spatialIndex = 0;
        return;
      } else if (e.key === "Enter") {
        e.preventDefault();
        activeEl.click();
        return;
      }
    }

    if (cards.length) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        state.spatialIndex = (state.spatialIndex + 1) % cards.length;
        cards.forEach((c, i) => c.classList.toggle("spatial-focus", i === state.spatialIndex));
        cards[state.spatialIndex].focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        state.spatialIndex = (state.spatialIndex - 1 + cards.length) % cards.length;
        cards.forEach((c, i) => c.classList.toggle("spatial-focus", i === state.spatialIndex));
        cards[state.spatialIndex].focus();
      } else if (e.key === "ArrowUp" && appTiles.length) {
        e.preventDefault();
        cards.forEach((c) => c.classList.remove("spatial-focus"));
        appTiles[0].focus();
      } else if (e.key === "Enter" && activeEl?.classList?.contains("tv-card")) {
        openRecordDrawer(activeEl.dataset.object, activeEl.dataset.recordId);
      } else if (e.key.toLowerCase() === "n") {
        const targetObj = state.objects.find((o) => o.apiName === state.activeChannel)?.apiName || "staff";
        openCreateRecordModal(targetObj);
      }
    }
  });
});
