# SportsOS 🏟️📺

> **The Open-Source Operational System for Modern Sports Organizations.**  
> *Salesforce-grade object & lifecycle architecture meets the intuitive, tactile experience of a Smart TV OS — with native Model Context Protocol (MCP) embedded at the core.*

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Docker Ready](https://img.shields.io/badge/Docker-One--Line%20Deploy-blue)](docker-compose.yml)
[![MCP Native](https://img.shields.io/badge/MCP-2025--03--26%20Embedded-purple)](ARCHITECTURE.md#4-embedded-mcp-architecture)

---

## 🎯 Vision

Sports organizations (football clubs, franchises, federations, academies, and multi-sport groups) run on dozens of disconnected point solutions: GPS wearables (Catapult/STATSports), video analysis (Hudl/Wyscout), medical EMRs (Kitman Labs/Smartabase), ticketing (Ticketmaster), ERP/HR (Workday), and spreadsheets.

**SportsOS does not replace specialized point tools — it is the central orchestration layer and operational system of record.**

1. **Everything is a Lifecycle Object (Like Salesforce, 10x Easier):** Staff, Teams, Venues, Players, Departments, Projects, Events, Schedules, Customers, Partners, Assets, Medical Cases, Contracts, and Accreditations all follow explicit, auditable **Lifecycle State Machines** with relational lookups, custom fields, and webhook/connector triggers.
2. **Intuitive TV-OS Interface (10-Foot & Spatial UX):** Designed like Apple tvOS / PlayStation 5 rather than a cluttered 1990s enterprise ERP. Navigate channels horizontally, move across swimlanes with keyboard/D-pad arrows (`←` `→` `↑` `↓`), trigger instant transitions, and summon the universal **AI & Remote Command Bar (`Cmd/Ctrl + K`)**.
3. **No-Code Custom Object Studio:** Admin users can create new Custom Objects (with custom fields, relational lookups, and custom lifecycle stages) in seconds or activate pre-built Sports Blueprints with one click.
4. **Embedded Model Context Protocol (MCP):** Every standard and custom object automatically exposes MCP **Tools**, **Resources**, and **Prompts** over both **HTTP/SSE (`/mcp`)** and **Stdio (`src/mcp/stdio-server.js`)**, plus an embedded **MCP Inspector & Copilot Drawer** right inside the UI.

---

## ⚡ One-Line Quick Start

### Option A: One-Line Docker Deployment (Recommended)

```bash
docker compose up -d --build && open http://localhost:4000
```

### Option B: Zero-Dependency Local Node.js Run

SportsOS is engineered with a zero-dependency Node.js core (`>= 18+`) so it boots instantly on any machine without external build steps:

```bash
npm start
# Server & Embedded MCP endpoint live at http://localhost:4000
```

---

## 🧩 Core Domain Objects & Lifecycles

### Included in MVP (Active Out-of-the-Box)

| Object | API Name | Default Lifecycle Stages | Key Fields & Relationships |
| :--- | :--- | :--- | :--- |
| **Staff** | `staff` | `Prospect` → `Onboarding` → `Active` → `On Leave` → `Offboarded` | Role, Department, Assigned Team (`team`), Primary Venue (`venue`), Coaching License / Clearance, Contract Expiry, External HR Sync |
| **Teams** | `team` | `Pre-Season` → `In-Season Active` → `Matchday Lock` → `Tournament Travel` → `Off-Season` | Squad Tier (First Team, Second Team, Women's First, Academy U21/U18), Head Coach (`staff`), Home Venue (`venue`), Squad Size, Readiness % |
| **Venues** | `venue` | `Available` → `Scheduled Session` → `Matchday Mode` → `Pitch Maintenance` → `Closed` | Type (Stadium, Training Pitch, Medical Lab), Surface, Capacity, Turf Condition, Managing Lead (`staff`), IoT/Access Control Sync |
| **Users & RBAC** | `users` | `Invited` → `Active` → `Suspended` | Role (`admin`, `sporting_director`, `ops_manager`, `coach`, `viewer`), Department, Scoped Permissions, MCP API Key |

### Expandable Blueprint Catalog & Custom Objects

Admins can create unlimited **Custom Objects** (`*__c`) or activate 1-click blueprints from the **Object Studio**:
- **Players (`player__c`)**: `Trialist` → `Academy` → `Signed` → `Match Fit` → `Rehab / Medical` → `On Loan` → `Transferred`
- **Departments (`department__c`)**: `Planning` → `Budget Approved` → `Operational` → `Restructuring`
- **Projects (`project__c`)**: `Ideation` → `Scoping` → `In Execution` → `Review` → `Completed`
- **Events (`event__c`)**: `Scheduled` → `Pre-Ops Check` → `Gates Open / Live` → `Post-Event Debrief` → `Archived`
- **Schedules (`schedule__c`)**: `Draft` → `Published` → `Conflict Detected` → `Locked` → `Completed`
- **Customers (`customer__c`)**: `Lead` → `Member` → `Season Ticket Holder` → `VIP Hospitality` → `Renewal Due`
- **Partners (`partner__c`)**: `Prospect` → `Contracting` → `Active Activation` → `Renewal Negotiation` → `Churned`
- **Assets (`asset__c`)**: `Procured` → `Available` → `Assigned` → `In Maintenance` → `Retired`
- **Contracts & Registrations (`contract__c`)**: `Drafting` → `Legal Review` → `Signed` → `League Registered` → `Expiring Soon`
- **Medical & Load Cases (`medical_case__c`)**: `Assessment` → `Acute Care` → `Gym Rehab` → `On-Pitch Rehab` → `Cleared to Play`
- **Scouting Targets (`scouting_target__c`)**: `Identified` → `Video Scouted` → `Live Scouted` → `Financial Check` → `Offer Stage`
- **Matchday Accreditations (`accreditation__c`)**: `Requested` → `Security Vetting` → `Approved` → `Printed` → `Checked-In`

---

## 🤖 Embedded MCP (Model Context Protocol)

SportsOS treats AI agents as first-class operators alongside human staff. Whenever an Admin creates a new Custom Object in the UI, SportsOS **dynamically updates its MCP Tool & Resource definitions in real time**.

### Built-in MCP Endpoints

- **HTTP JSON-RPC 2.0 Endpoint:** `POST http://localhost:4000/mcp`
- **SSE Stream Endpoint:** `GET http://localhost:4000/mcp/sse`
- **Stdio Transport (Claude Desktop / Cursor / CLI):**
  ```json
  {
    "mcpServers": {
      "sportsos": {
        "command": "node",
        "args": ["/absolute/path/to/SportsOS/src/mcp/stdio-server.js"]
      }
    }
  }
  ```

### Exposed MCP Tools

- `sportsos_list_objects`: List all standard and custom object schemas, fields, and lifecycle state machines.
- `sportsos_query_records`: Query records for any object (`staff`, `team`, `venue`, or custom `*__c`) with lifecycle and field filtering.
- `sportsos_create_record`: Create a new record in any object with validation and orchestration webhook emission.
- `sportsos_transition_lifecycle`: Advance or move a record across its lifecycle state machine with an audit note.
- `sportsos_create_custom_object`: Dynamically define a new custom object, fields, and lifecycle stages via AI agent.
- `sportsos_get_operational_pulse`: Retrieve cross-organization readiness, active venue bottlenecks, and external connector health.

---

## 🗂️ Repository Structure

```text
SportsOS/
├── Dockerfile                  # Production container image (Node 22 Alpine)
├── docker-compose.yml          # One-line deployment stack with persistent volume
├── Makefile                    # Developer & deployment shortcuts
├── package.json                # Project manifest & scripts
├── .env.example                # Environment configuration template
├── ARCHITECTURE.md             # Deep-dive system, data model & MCP specification
├── CONTRIBUTING.md             # Open-source contribution guide
├── LICENSE                     # MIT License
└── src/
    ├── server.js               # Main HTTP + REST API + Embedded MCP Server
    ├── db/
    │   ├── store.js            # Transactional Metadata & Record Persistence Engine
    │   └── seed.js             # Pre-loaded Sports Club MVP Data & Blueprints
    ├── mcp/
    │   ├── engine.js           # Dynamic MCP Tool, Resource & Prompt Handler
    │   └── stdio-server.js     # Standalone MCP Stdio Transport for Desktop Agents
    └── public/
        ├── index.html          # TV-OS Spatial Interface Shell
        ├── styles.css          # Glassmorphic 10-Foot UI & Swimlane Design System
        └── app.js              # Spatial Navigation, Object Studio, RBAC & MCP Console
```

---

## 🛡️ License

Released under the [MIT License](LICENSE). Built for the global sports technology community.
