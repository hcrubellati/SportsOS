# SportsOS Architecture & System Design

## 1. Architectural Philosophy

SportsOS is designed around three foundational principles:

1. **Metadata-Driven Object Graph (Salesforce Paradigm, Simplified):**  
   Rather than hardcoding tables for every new sports workflow, SportsOS uses a unified **Metadata Engine** (`ObjectDefinition` + `FieldDefinition` + `LifecycleStateMachine`) paired with a **Polymorphic Record Store** (`ObjectRecord` + `LifecycleAuditLog`). Creating a custom object (`scouting_target__c` or `kit_inventory__c`) immediately provisions REST endpoints, TV-OS horizontal swimlanes, relational lookup resolvers, orchestration webhooks, and MCP agent tools.

2. **Orchestration Over Replacement (The Central Nervous System):**  
   Sports clubs already use specialized tools for biometrics (Catapult), video (Hudl), medical (Kitman Labs), and ticketing (Ticketmaster). SportsOS acts as the **Orchestration Hub**: each object record holds external system bindings (`externalRefs`) and emits structured lifecycle transition events (`sportsos.lifecycle.transitioned`) to connected webhooks and MCP agents.

3. **TV-OS Human Interface (10-Foot Spatial Ergonomics):**  
   Sports operations happen in high-tempo environments — locker rooms, stadium control rooms, coaching booths, and pitchside tablets. The UI eliminates dense spreadsheet grids in favor of:
   - **Channel Dock Navigation**: Top-level objects act as "channels."
   - **Lifecycle Swimlanes (Horizontal Rails)**: Records flow left-to-right across their lifecycle stages.
   - **Tactile Spatial Focus**: Full keyboard arrow (`←` `→` `↑` `↓`), `Enter`, and `Cmd+K` remote navigation.

---

## 2. Complete Sports Organization Object Taxonomy

Below is the complete object lifecycle map designed for SportsOS. **Staff**, **Teams**, **Venues**, and **Users** are pre-activated in the MVP, while all other objects can be activated via 1-click blueprints or custom-built in the **Object Studio**.

```
                      ┌───────────────────────────────────┐
                      │     ORGANIZATIONAL GOVERNANCE     │
                      │  Users (RBAC)  •  Departments     │
                      │  Compliance Filings • Projects    │
                      └─────────────────┬─────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
┌───────────────────┐         ┌───────────────────┐         ┌───────────────────┐
│  SPORTING ENGINE  │         │  OPERATIONS & HQ  │         │ COMMERCIAL & FANS │
│  • Teams (MVP)    │◄───────►│  • Venues (MVP)   │◄───────►│  • Customers      │
│  • Staff (MVP)    │         │  • Events         │         │  • Partners       │
│  • Players        │         │  • Schedules      │         │  • Accreditations │
│  • Medical Cases  │         │  • Assets         │         │  • Contracts      │
│  • Scouting       │         │  • Kit Inventory  │         │                   │
└───────────────────┘         └───────────────────┘         └───────────────────┘
        │                               │                               │
        └───────────────────────────────┼───────────────────────────────┘
                                        ▼
                      ┌───────────────────────────────────┐
                      │   ORCHESTRATION & EMBEDDED MCP    │
                      │  Catapult • Hudl • Kitman • Opta  │
                      │  Workday • Slack • AI Agents      │
                      └───────────────────────────────────┘
```

### Object Lifecycle State Machines

| Object | Lifecycle State Machine | Orchestration Triggers |
| :--- | :--- | :--- |
| **Staff** *(MVP)* | `Prospect` → `Onboarding` → `Active` → `On Leave` → `Offboarded` | Provisions IT/Venue badges on `Active`; revokes access on `Offboarded`. |
| **Teams** *(MVP)* | `Pre-Season` → `In-Season Active` → `Matchday Lock` → `Tournament Travel` → `Off-Season` | Locks roster & syncs travel manifest on `Matchday Lock` / `Tournament Travel`. |
| **Venues** *(MVP)* | `Available` → `Scheduled Session` → `Matchday Mode` → `Pitch Maintenance` → `Closed` | Triggers stadium IoT lighting, turf sensors, and security gates on `Matchday Mode`. |
| **Players** | `Trialist` → `Academy` → `Signed` → `Match Fit` → `Rehab / Medical` → `On Loan` → `Transferred` | Syncs GPS load from Catapult & injury status from Kitman Labs. |
| **Departments** | `Planning` → `Budget Approved` → `Operational` → `Season Review` → `Restructuring` | Syncs departmental cost centers with ERP/Finance. |
| **Projects** | `Ideation` → `Scoping` → `In Execution` → `Executive Review` → `Completed` | Cross-department initiatives (e.g., Stadium Roof Upgrade, Transfer Window). |
| **Events** | `Scheduled` → `Pre-Ops Check` → `Gates Open / Live` → `Post-Event Debrief` → `Archived` | Links `Team` + `Venue` + `Staff` + `Broadcast/Ticketing`. |
| **Schedules** | `Draft` → `Published` → `Conflict Detected` → `Locked` → `Completed` | Automated conflict detection across pitches, teams, and broadcast windows. |
| **Customers** | `Lead` → `Club Member` → `Season Ticket Holder` → `VIP Hospitality` → `Renewal Due` | Syncs ticketing & merchandise CRM tiers. |
| **Partners** | `Prospect` → `Contracting` → `Active Activation` → `Renewal Window` → `Completed` | Tracks sponsor deliverables, LED perimeter boards, and player appearances. |
| **Assets** | `Procured` → `Available` → `Assigned` → `In Maintenance` → `Retired` | Tracks GPS vests, cameras, medical machines, and fleet vehicles. |
| **Contracts** *(Proposed)* | `Drafting` → `Legal Review` → `Signed` → `League Registered` → `Expiring Soon` | Alerts Sporting Director 180 days before player/staff contract expiry. |
| **Medical Cases** *(Proposed)* | `Assessment` → `Acute Care` → `Gym Rehab` → `On-Pitch Rehab` → `Cleared to Play` | Automatically updates Player & Staff availability on Team sheets. |
| **Accreditations** *(Proposed)* | `Requested` → `Security Vetting` → `Approved` → `Printed` → `Checked-In` | Controls zone access across Stadium and Training Ground venues. |

---

## 3. Metadata & Custom Object Schema

Every object in SportsOS is governed by a declarative JSON schema stored in the metadata catalog:

```json
{
  "apiName": "venue",
  "label": "Venue",
  "pluralLabel": "Venues",
  "icon": "🏟️",
  "category": "Operations",
  "isCustom": false,
  "description": "Stadiums, training pitches, medical performance centers, and tactical facilities.",
  "lifecycle": [
    { "id": "Available", "label": "Available", "color": "#10b981" },
    { "id": "Scheduled Session", "label": "Scheduled Session", "color": "#3b82f6" },
    { "id": "Matchday Mode", "label": "Matchday Mode", "color": "#f59e0b" },
    { "id": "Pitch Maintenance", "label": "Pitch Maintenance", "color": "#a855f7" },
    { "id": "Closed", "label": "Closed", "color": "#ef4444" }
  ],
  "fields": [
    { "name": "facilityType", "label": "Facility Type", "type": "select", "options": ["Stadium", "Training Pitch", "Medical & Recovery", "Academy Complex", "Media Hub"], "required": true },
    { "name": "surface", "label": "Surface / Spec", "type": "text", "required": true },
    { "name": "capacity", "label": "Capacity", "type": "number", "required": false },
    { "name": "managerId", "label": "Venue Operations Lead", "type": "lookup", "targetObject": "staff" },
    { "name": "iotSystem", "label": "Connected Connector", "type": "text" }
  ]
}
```

---

## 4. Embedded MCP Architecture

SportsOS includes a native **Model Context Protocol (MCP)** implementation (`2025-03-26` / `2024-11-05` compatible) accessible via three interfaces:

1. **HTTP JSON-RPC 2.0 (`POST /mcp`)**: Standard stateless/session MCP endpoint for remote AI orchestrators and cloud agents.
2. **Server-Sent Events (`GET /mcp/sse`)**: Real-time streaming transport for browser and persistent MCP clients.
3. **Stdio Server (`src/mcp/stdio-server.js`)**: Direct local pipe for Claude Desktop, Cursor, Windsurf, or Gemini CLI.
4. **Embedded UI Copilot & MCP Inspector**: Built into the TV-OS interface so operations managers and admins can invoke MCP tools, inspect JSON-RPC payloads, and execute natural-language workflows directly from the screen.
