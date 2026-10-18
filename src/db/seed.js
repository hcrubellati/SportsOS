/**
 * SportsOS Default Seed Catalog
 * Includes:
 *  - Organization Profile & Orchestration Connectors
 *  - Users & RBAC Roles
 *  - Core MVP Objects: Staff, Teams, Venues
 *  - 12 Expandable Sports Domain Object Blueprints (Players, Departments, Projects, Events, Schedules, Customers, Partners, Assets, Contracts, Medical Cases, Scouting Targets, Accreditations)
 */

const INITIAL_SEED = {
  organization: {
    id: "org_amfc",
    name: process.env.CLUB_NAME || "Atlético Metropolitano FC",
    shortCode: process.env.CLUB_SHORT_CODE || "AMFC",
    season: "2026/27",
    nextMatch: {
      opponent: "Real Valencia CF",
      competition: "Premier Continental League",
      kickoffInHours: 28,
      venueId: "ven_stadium_main"
    }
  },

  roles: [
    {
      id: "admin",
      label: "System Admin / COO",
      description: "Full access to Custom Object Studio, User Management, Lifecycle Overrides, and MCP Orchestration.",
      canCreateObjects: true,
      canManageUsers: true,
      canTransitionAny: true,
      canWriteRecords: true
    },
    {
      id: "sporting_director",
      label: "Sporting Director",
      description: "Manages Teams, Staff, Scouting, Contracts, and Sporting Lifecycles.",
      canCreateObjects: true,
      canManageUsers: false,
      canTransitionAny: true,
      canWriteRecords: true
    },
    {
      id: "ops_manager",
      label: "Venue & Operations Lead",
      description: "Manages Venues, Events, Schedules, Accreditations, and Stadium IoT states.",
      canCreateObjects: false,
      canManageUsers: false,
      canTransitionAny: true,
      canWriteRecords: true
    },
    {
      id: "coach",
      label: "Technical Coaching Staff",
      description: "Manages assigned Team readiness, Training Sessions, and Player/Staff availability.",
      canCreateObjects: false,
      canManageUsers: false,
      canTransitionAny: false,
      canWriteRecords: true
    },
    {
      id: "viewer",
      label: "Compliance & Observer",
      description: "Read-only telemetry and audit trail inspection across channels.",
      canCreateObjects: false,
      canManageUsers: false,
      canTransitionAny: false,
      canWriteRecords: false
    }
  ],

  users: [
    {
      id: "usr_elena",
      name: "Elena Vance",
      email: "e.vance@metropolitanofc.org",
      role: "admin",
      title: "Chief Operating Officer",
      department: "Executive Operations",
      status: "Active",
      avatarColor: "#10b981",
      mcpKeyScope: "mcp_full_orchestrator"
    },
    {
      id: "usr_marco",
      name: "Marco Silva",
      email: "m.silva@metropolitanofc.org",
      role: "sporting_director",
      title: "Sporting Director",
      department: "Sporting Direction",
      status: "Active",
      avatarColor: "#3b82f6",
      mcpKeyScope: "mcp_sporting_rw"
    },
    {
      id: "usr_carlos",
      name: "Carlos Mendez",
      email: "c.mendez@metropolitanofc.org",
      role: "ops_manager",
      title: "Director of Venues & Matchday Ops",
      department: "Stadium & Facilities",
      status: "Active",
      avatarColor: "#f59e0b",
      mcpKeyScope: "mcp_venues_rw"
    },
    {
      id: "usr_diego",
      name: "Diego Morales",
      email: "d.morales@metropolitanofc.org",
      role: "coach",
      title: "Men's First Team Head Coach",
      department: "First Team Technical",
      status: "Active",
      avatarColor: "#8b5cf6",
      mcpKeyScope: "mcp_coaching_rw"
    },
    {
      id: "usr_priya",
      name: "Priya Nair",
      email: "p.nair@league-audit.org",
      role: "viewer",
      title: "League Compliance Officer",
      department: "Governance & FFP",
      status: "Active",
      avatarColor: "#64748b",
      mcpKeyScope: "mcp_readonly"
    }
  ],

  connectors: [
    {
      id: "conn_catapult",
      name: "Catapult Vector GPS",
      category: "Biometrics & Load",
      status: "Connected",
      syncedObjects: ["team", "staff", "player__c"],
      lastSync: "2m ago",
      protocol: "Webhook + REST"
    },
    {
      id: "conn_hudl",
      name: "Hudl Sportscode & Wyscout",
      category: "Video & Tactical",
      status: "Connected",
      syncedObjects: ["team", "scouting_target__c", "event__c"],
      lastSync: "5m ago",
      protocol: "MCP Bridge"
    },
    {
      id: "conn_kitman",
      name: "Kitman Labs EMR",
      category: "Medical & Performance",
      status: "Connected",
      syncedObjects: ["staff", "team", "medical_case__c"],
      lastSync: "1m ago",
      protocol: "HL7 / Webhook"
    },
    {
      id: "conn_turfsense",
      name: "TurfSense & Stadium BMS IoT",
      category: "Venue Telemetry",
      status: "Connected",
      syncedObjects: ["venue", "schedule__c"],
      lastSync: "Live Stream",
      protocol: "MQTT / MCP Resource"
    },
    {
      id: "conn_workday",
      name: "Workday HR & FIFA TMS",
      category: "HR & Registrations",
      status: "Connected",
      syncedObjects: ["staff", "contract__c", "department__c"],
      lastSync: "14m ago",
      protocol: "OAuth2 Webhook"
    },
    {
      id: "conn_ticketmaster",
      name: "Ticketmaster & Stripe CRM",
      category: "Commercial & Fans",
      status: "Connected",
      syncedObjects: ["venue", "customer__c", "partner__c", "event__c"],
      lastSync: "4m ago",
      protocol: "Event Webhook"
    }
  ],

  objects: [
    {
      apiName: "staff",
      label: "Staff Member",
      pluralLabel: "Staff",
      icon: "🪪",
      category: "Core MVP",
      isCustom: false,
      description: "Technical coaches, medical clinicians, performance analysts, groundskeepers, and club executives across their employment lifecycle.",
      lifecycle: [
        { id: "Prospect", label: "Prospect / Shortlist", color: "#64748b" },
        { id: "Onboarding", label: "Onboarding & Vetting", color: "#3b82f6" },
        { id: "Active", label: "Active On-Duty", color: "#10b981" },
        { id: "On Leave", label: "Medical / Travel Leave", color: "#f59e0b" },
        { id: "Offboarded", label: "Offboarded / Alumni", color: "#ef4444" }
      ],
      fields: [
        { name: "roleTitle", label: "Role Title", type: "text", required: true },
        { name: "department", label: "Department", type: "select", options: ["First Team Technical", "Sports Science & Medical", "Academy Coaching", "Stadium & Grounds", "Scouting & Analytics", "Commercial & Ops"], required: true },
        { name: "teamId", label: "Assigned Team", type: "lookup", targetObject: "team", required: false },
        { name: "venueId", label: "Primary Base Venue", type: "lookup", targetObject: "venue", required: false },
        { name: "licenseLevel", label: "Certification / License", type: "text", required: false },
        { name: "clearance", label: "Security & Pitch Access", type: "select", options: ["All-Access Zone 1", "Pitch & Locker Room", "Training Ground Only", "Stadium Ops & Broadcast", "Pending Clearance"], required: true },
        { name: "contractUntil", label: "Contract Expiry", type: "date", required: false },
        { name: "externalSystem", label: "External System Sync", type: "text", required: false }
      ]
    },
    {
      apiName: "team",
      label: "Team Squad",
      pluralLabel: "Teams",
      icon: "🛡️",
      category: "Core MVP",
      isCustom: false,
      description: "First team, second/reserve team, women's squad, and youth academy tiers with live seasonal operational states.",
      lifecycle: [
        { id: "Pre-Season", label: "Pre-Season Camp", color: "#3b82f6" },
        { id: "In-Season Active", label: "In-Season Active", color: "#10b981" },
        { id: "Matchday Lock", label: "Matchday Lock (-24h)", color: "#f59e0b" },
        { id: "Tournament Travel", label: "Away / Travel Mode", color: "#8b5cf6" },
        { id: "Off-Season", label: "Off-Season Recovery", color: "#64748b" }
      ],
      fields: [
        { name: "divisionTier", label: "Squad Tier", type: "select", options: ["First Team", "Second / Reserve Team", "Women's First Team", "U21 Elite Academy", "U18 Youth Academy", "U15 Foundation"], required: true },
        { name: "competition", label: "Primary Competition", type: "text", required: true },
        { name: "headCoachId", label: "Head Coach", type: "lookup", targetObject: "staff", required: false },
        { name: "homeVenueId", label: "Primary Venue / Pitch", type: "lookup", targetObject: "venue", required: false },
        { name: "squadSize", label: "Active Squad Count", type: "number", required: true },
        { name: "readinessScore", label: "Squad Readiness (%)", type: "number", required: true },
        { name: "nextFixture", label: "Next Scheduled Event", type: "text", required: false },
        { name: "externalSystem", label: "Connected Performance Stack", type: "text", required: false }
      ]
    },
    {
      apiName: "venue",
      label: "Venue & Facility",
      pluralLabel: "Venues",
      icon: "🏟️",
      category: "Core MVP",
      isCustom: false,
      description: "Stadiums, training pitches, recovery labs, and tactical auditoriums managed via live operational states.",
      lifecycle: [
        { id: "Available", label: "Available & Ready", color: "#10b981" },
        { id: "Scheduled Session", label: "In Session / Occupied", color: "#3b82f6" },
        { id: "Matchday Mode", label: "Matchday Lockdown", color: "#f59e0b" },
        { id: "Pitch Maintenance", label: "Turf / Facility Maintenance", color: "#a855f7" },
        { id: "Closed", label: "Closed / Offline", color: "#ef4444" }
      ],
      fields: [
        { name: "facilityType", label: "Facility Type", type: "select", options: ["Main Stadium", "Training Pitch", "Medical & Recovery Lab", "Academy Complex", "Tactical Media Center"], required: true },
        { name: "surface", label: "Surface & Tech Spec", type: "text", required: true },
        { name: "capacity", label: "Capacity (People)", type: "number", required: true },
        { name: "managerId", label: "Facility Lead", type: "lookup", targetObject: "staff", required: false },
        { name: "assignedTeamId", label: "Primary Resident Team", type: "lookup", targetObject: "team", required: false },
        { name: "turfIndex", label: "Surface Quality Index (%)", type: "number", required: false },
        { name: "externalSystem", label: "IoT & Access Integration", type: "text", required: false }
      ]
    }
  ],

  blueprints: [
    {
      apiName: "player__c",
      label: "Player",
      pluralLabel: "Players",
      icon: "⚽",
      category: "Sporting Blueprint",
      description: "First-team and academy athletes tracked from trialist recruitment through active squad status, medical rehab, and loans.",
      lifecycle: [
        { id: "Trialist", label: "Trialist / Academy Intake", color: "#64748b" },
        { id: "Signed", label: "Registered & Signed", color: "#3b82f6" },
        { id: "Match Fit", label: "Match Fit (Available)", color: "#10b981" },
        { id: "Rehab / Medical", label: "Medical / RTP Protocol", color: "#ef4444" },
        { id: "On Loan", label: "Out on Loan", color: "#8b5cf6" },
        { id: "Transferred", label: "Transferred / Alumni", color: "#475569" }
      ],
      fields: [
        { name: "squadNumber", label: "Squad Number", type: "number", required: true },
        { name: "position", label: "Tactical Position", type: "select", options: ["Goalkeeper", "Center Back", "Full Back", "Central Midfielder", "Attacking Midfielder", "Winger", "Striker"], required: true },
        { name: "teamId", label: "Squad Team", type: "lookup", targetObject: "team", required: true },
        { name: "acuteLoad", label: "Catapult Acute Load (AU)", type: "number", required: false },
        { name: "contractExpiry", label: "Contract Until", type: "date", required: false }
      ],
      sampleRecords: [
        {
          name: "Lucas Bergström (#8)",
          stage: "Match Fit",
          subtitle: "Central Midfielder • Men's First Team",
          fields: { squadNumber: 8, position: "Central Midfielder", teamId: "team_first_men", acuteLoad: 640, contractExpiry: "2029-06-30" }
        },
        {
          name: "Mateo Silva (#9)",
          stage: "Rehab / Medical",
          subtitle: "Striker • Grade 1 Hamstring RTP (Day 9/14)",
          fields: { squadNumber: 9, position: "Striker", teamId: "team_first_men", acuteLoad: 210, contractExpiry: "2028-06-30" }
        },
        {
          name: "Aitana Navarro (#10)",
          stage: "Match Fit",
          subtitle: "Attacking Midfielder • Women's First Team",
          fields: { squadNumber: 10, position: "Attacking Midfielder", teamId: "team_first_women", acuteLoad: 590, contractExpiry: "2028-06-30" }
        }
      ]
    },
    {
      apiName: "department__c",
      label: "Department",
      pluralLabel: "Departments",
      icon: "🏛️",
      category: "Governance Blueprint",
      description: "Operating divisions across sporting, medical, commercial, and stadium operations with budget and headcount lifecycles.",
      lifecycle: [
        { id: "Planning", label: "Season Planning", color: "#64748b" },
        { id: "Budget Approved", label: "Budget Approved", color: "#3b82f6" },
        { id: "Operational", label: "Active Operational", color: "#10b981" },
        { id: "Audit Review", label: "FFP / Audit Review", color: "#f59e0b" }
      ],
      fields: [
        { name: "headStaffId", label: "Department Head", type: "lookup", targetObject: "staff", required: false },
        { name: "annualBudget", label: "Annual Budget ($ USD)", type: "number", required: true },
        { name: "headcount", label: "Active Headcount", type: "number", required: true },
        { name: "primaryVenueId", label: "HQ Location", type: "lookup", targetObject: "venue", required: false }
      ],
      sampleRecords: [
        {
          name: "Sports Science & Medical Performance",
          stage: "Operational",
          subtitle: "24 Specialists • Hydro & Recovery Lab HQ",
          fields: { headStaffId: "stf_helena", annualBudget: 4200000, headcount: 24, primaryVenueId: "ven_recovery_lab" }
        },
        {
          name: "Global Scouting & Recruitment",
          stage: "Budget Approved",
          subtitle: "18 Scouts • Summer Window Prep",
          fields: { headStaffId: "stf_marco", annualBudget: 3100000, headcount: 18, primaryVenueId: "ven_media_hub" }
        }
      ]
    },
    {
      apiName: "project__c",
      label: "Project",
      pluralLabel: "Projects",
      icon: "🚀",
      category: "Operations Blueprint",
      description: "Cross-departmental club initiatives, capital upgrades, transfer window campaigns, and commercial launches.",
      lifecycle: [
        { id: "Ideation", label: "Ideation", color: "#64748b" },
        { id: "Scoping", label: "Scoping & Budget", color: "#3b82f6" },
        { id: "In Execution", label: "In Execution", color: "#10b981" },
        { id: "Executive Review", label: "Executive Review", color: "#f59e0b" },
        { id: "Completed", label: "Completed", color: "#8b5cf6" }
      ],
      fields: [
        { name: "ownerId", label: "Project Lead", type: "lookup", targetObject: "staff", required: false },
        { name: "venueId", label: "Target Venue", type: "lookup", targetObject: "venue", required: false },
        { name: "budget", label: "Budget ($ USD)", type: "number", required: false },
        { name: "targetDate", label: "Target Completion", type: "date", required: true }
      ],
      sampleRecords: [
        {
          name: "North Stand LED Ribbon & Wi-Fi 7 Upgrade",
          stage: "In Execution",
          subtitle: "Metropolitano Arena • Target: Nov 2026",
          fields: { ownerId: "stf_carlos", venueId: "ven_stadium_main", budget: 1850000, targetDate: "2026-11-15" }
        },
        {
          name: "Winter Transfer Window Midfield Shortlist",
          stage: "Scoping",
          subtitle: "Sporting Direction • 4 Priority Targets",
          fields: { ownerId: "stf_marco", venueId: "ven_media_hub", budget: 25000000, targetDate: "2027-01-31" }
        }
      ]
    },
    {
      apiName: "event__c",
      label: "Event",
      pluralLabel: "Events",
      icon: "📅",
      category: "Operations Blueprint",
      description: "Matchdays, open training sessions, press conferences, sponsor activations, and stadium concerts.",
      lifecycle: [
        { id: "Scheduled", label: "Scheduled", color: "#3b82f6" },
        { id: "Pre-Ops Check", label: "Pre-Ops Security & Tech Check", color: "#f59e0b" },
        { id: "Gates Open / Live", label: "Gates Open / Live", color: "#10b981" },
        { id: "Post-Event Debrief", label: "Post-Event Debrief", color: "#8b5cf6" },
        { id: "Archived", label: "Archived", color: "#64748b" }
      ],
      fields: [
        { name: "eventType", label: "Event Type", type: "select", options: ["Home Matchday", "Training Session", "Press Conference", "Sponsor Activation", "Academy Showcase"], required: true },
        { name: "teamId", label: "Participating Team", type: "lookup", targetObject: "team", required: false },
        { name: "venueId", label: "Assigned Venue", type: "lookup", targetObject: "venue", required: true },
        { name: "expectedAttendance", label: "Expected Attendance", type: "number", required: false },
        { name: "eventDate", label: "Event Date", type: "date", required: true }
      ],
      sampleRecords: [
        {
          name: "Matchday 11: AMFC vs Real Valencia CF",
          stage: "Pre-Ops Check",
          subtitle: "Home Matchday • 61,800 Expected • Broadcast Live",
          fields: { eventType: "Home Matchday", teamId: "team_first_men", venueId: "ven_stadium_main", expectedAttendance: 61800, eventDate: "2026-10-19" }
        }
      ]
    },
    {
      apiName: "schedule__c",
      label: "Schedule Slot",
      pluralLabel: "Schedules",
      icon: "⏱️",
      category: "Operations Blueprint",
      description: "Master pitch allocations, team travel itineraries, medical screening blocks, and broadcast windows.",
      lifecycle: [
        { id: "Draft", label: "Draft Slot", color: "#64748b" },
        { id: "Published", label: "Published to Squad", color: "#3b82f6" },
        { id: "Conflict Detected", label: "Conflict Detected", color: "#ef4444" },
        { id: "Locked", label: "Confirmed & Locked", color: "#10b981" },
        { id: "Completed", label: "Completed", color: "#8b5cf6" }
      ],
      fields: [
        { name: "timeWindow", label: "Time Window", type: "text", required: true },
        { name: "teamId", label: "Assigned Team", type: "lookup", targetObject: "team", required: true },
        { name: "venueId", label: "Allocated Venue", type: "lookup", targetObject: "venue", required: true },
        { name: "leadStaffId", label: "Session Lead", type: "lookup", targetObject: "staff", required: false }
      ],
      sampleRecords: [
        {
          name: "MD-1 Set-Piece & Tactical Walkthrough",
          stage: "Locked",
          subtitle: "10:30 - 12:00 • High-Performance Pitch 1",
          fields: { timeWindow: "2026-10-18 10:30 - 12:00", teamId: "team_first_men", venueId: "ven_pitch_1", leadStaffId: "stf_diego" }
        }
      ]
    },
    {
      apiName: "customer__c",
      label: "Customer / Fan Account",
      pluralLabel: "Customers",
      icon: "🎟️",
      category: "Commercial Blueprint",
      description: "Corporate hospitality box holders, season ticket members, and international fan club tiers.",
      lifecycle: [
        { id: "Lead", label: "Waitlist / Lead", color: "#64748b" },
        { id: "Club Member", label: "Official Club Member", color: "#3b82f6" },
        { id: "Season Ticket Holder", label: "Season Ticket Holder", color: "#10b981" },
        { id: "VIP Hospitality", label: "Executive Box / VIP", color: "#f59e0b" },
        { id: "Renewal Due", label: "Renewal Window Open", color: "#a855f7" }
      ],
      fields: [
        { name: "tier", label: "Membership Tier", type: "select", options: ["Executive Skybox", "Platinum Season Ticket", "General Season Ticket", "Global Digital Member"], required: true },
        { name: "seatZone", label: "Stadium Suite / Sector", type: "text", required: false },
        { name: "annualValue", label: "Annual Account Value ($)", type: "number", required: true }
      ],
      sampleRecords: [
        {
          name: "Meridian Aviation Group (Skybox #14)",
          stage: "VIP Hospitality",
          subtitle: "Executive Skybox • 18 Seats • West Stand Level 3",
          fields: { tier: "Executive Skybox", seatZone: "West Stand Suite 14", annualValue: 145000 }
        }
      ]
    },
    {
      apiName: "partner__c",
      label: "Commercial Partner",
      pluralLabel: "Partners",
      icon: "🤝",
      category: "Commercial Blueprint",
      description: "Shirt sponsors, kit suppliers, broadcast rights partners, and regional commercial sponsors.",
      lifecycle: [
        { id: "Prospect", label: "Pipeline Prospect", color: "#64748b" },
        { id: "Contracting", label: "Legal & Contracting", color: "#3b82f6" },
        { id: "Active Activation", label: "Active Campaign", color: "#10b981" },
        { id: "Renewal Window", label: "Renewal Negotiation", color: "#f59e0b" }
      ],
      fields: [
        { name: "partnerTier", label: "Sponsorship Tier", type: "select", options: ["Principal Front-of-Shirt", "Official Technical Kit Supplier", "Sleeve & Training Partner", "Official Innovation Partner"], required: true },
        { name: "contractValue", label: "Annual Rights Value ($)", type: "number", required: true },
        { name: "activationVenueId", label: "Primary Activation Venue", type: "lookup", targetObject: "venue", required: false }
      ],
      sampleRecords: [
        {
          name: "Aether HyperCloud (Front-of-Shirt Partner)",
          stage: "Active Activation",
          subtitle: "Principal Partner • $28M/yr • Global Digital & Stadium LED",
          fields: { partnerTier: "Principal Front-of-Shirt", contractValue: 28000000, activationVenueId: "ven_stadium_main" }
        }
      ]
    },
    {
      apiName: "asset__c",
      label: "Operational Asset",
      pluralLabel: "Assets",
      icon: "📡",
      category: "Operations Blueprint",
      description: "High-value club hardware, Catapult GPS pods, tactical drone cameras, cryo chambers, and team fleet vehicles.",
      lifecycle: [
        { id: "Procured", label: "Procured / Intake", color: "#64748b" },
        { id: "Available", label: "Calibrated & Available", color: "#10b981" },
        { id: "Assigned", label: "Deployed to Team/Venue", color: "#3b82f6" },
        { id: "In Maintenance", label: "Calibration / Repair", color: "#f59e0b" },
        { id: "Retired", label: "Decommissioned", color: "#ef4444" }
      ],
      fields: [
        { name: "assetCategory", label: "Asset Category", type: "select", options: ["Wearable Telemetry", "Tactical Camera Array", "Medical Diagnostics", "Turf Lighting Rig", "Team Transport"], required: true },
        { name: "venueId", label: "Current Venue Location", type: "lookup", targetObject: "venue", required: false },
        { name: "teamId", label: "Assigned Squad", type: "lookup", targetObject: "team", required: false },
        { name: "serialCode", label: "Asset Tag / Serial", type: "text", required: true }
      ],
      sampleRecords: [
        {
          name: "Catapult Vector S7 Pro Pod Fleet (35 Units)",
          stage: "Assigned",
          subtitle: "Wearable Telemetry • Assigned to Men's First Team",
          fields: { assetCategory: "Wearable Telemetry", venueId: "ven_pitch_1", teamId: "team_first_men", serialCode: "CAT-VEC7-001-035" }
        }
      ]
    },
    {
      apiName: "contract__c",
      label: "Contract & Registration",
      pluralLabel: "Contracts",
      icon: "📜",
      category: "Governance Blueprint",
      description: "Proposed Object: Employment contracts, FIFA TMS international transfer certificates, league squad registrations, and visa clearances.",
      lifecycle: [
        { id: "Drafting", label: "Term Sheet Drafting", color: "#64748b" },
        { id: "Legal Review", label: "Legal & Agent Review", color: "#3b82f6" },
        { id: "Signed", label: "Executed & Signed", color: "#8b5cf6" },
        { id: "League Registered", label: "League & FIFA Registered", color: "#10b981" },
        { id: "Expiring Soon", label: "Expiring (< 6 Months)", color: "#f59e0b" }
      ],
      fields: [
        { name: "staffId", label: "Linked Staff Member", type: "lookup", targetObject: "staff", required: false },
        { name: "teamId", label: "Squad Cost Center", type: "lookup", targetObject: "team", required: true },
        { name: "registrationCode", label: "League Registration ID", type: "text", required: true },
        { name: "expiryDate", label: "Expiration Date", type: "date", required: true }
      ],
      sampleRecords: [
        {
          name: "Diego Morales — Head Coach Extension (2029)",
          stage: "League Registered",
          subtitle: "First Team Technical • League Reg #LFP-2026-8841",
          fields: { staffId: "stf_diego", teamId: "team_first_men", registrationCode: "LFP-2026-8841", expiryDate: "2029-06-30" }
        }
      ]
    },
    {
      apiName: "medical_case__c",
      label: "Medical & RTP Case",
      pluralLabel: "Medical Cases",
      icon: "🩺",
      category: "Sporting Blueprint",
      description: "Proposed Object: Injury rehabilitation workflows, return-to-play (RTP) clearance gates, and daily biometric readiness flags.",
      lifecycle: [
        { id: "Assessment", label: "Imaging & Diagnosis", color: "#ef4444" },
        { id: "Acute Care", label: "Acute Treatment", color: "#f59e0b" },
        { id: "Gym Rehab", label: "Gym & Hydro Rehab", color: "#3b82f6" },
        { id: "On-Pitch Rehab", label: "On-Pitch Reintegration", color: "#8b5cf6" },
        { id: "Cleared to Play", label: "Full Medical Clearance", color: "#10b981" }
      ],
      fields: [
        { name: "clinicianId", label: "Lead Clinician", type: "lookup", targetObject: "staff", required: true },
        { name: "venueId", label: "Treatment Facility", type: "lookup", targetObject: "venue", required: true },
        { name: "injuryType", label: "Diagnosis / Protocol", type: "text", required: true },
        { name: "estimatedReturn", label: "Target RTP Date", type: "date", required: true }
      ],
      sampleRecords: [
        {
          name: "RTP Case #402 — Right Biceps Femoris Grade 1",
          stage: "On-Pitch Rehab",
          subtitle: "Dr. Helena Costa • High-Speed Running 88% Target",
          fields: { clinicianId: "stf_helena", venueId: "ven_recovery_lab", injuryType: "Grade 1 Hamstring Strain", estimatedReturn: "2026-10-24" }
        }
      ]
    },
    {
      apiName: "scouting_target__c",
      label: "Scouting Target",
      pluralLabel: "Scouting Targets",
      icon: "🔭",
      category: "Sporting Blueprint",
      description: "Proposed Object: Player & coaching recruitment pipeline from data discovery through video analysis, live scouting, and offer execution.",
      lifecycle: [
        { id: "Identified", label: "Data Model Flagged", color: "#64748b" },
        { id: "Video Scouted", label: "Video Analysis Complete", color: "#3b82f6" },
        { id: "Live Scouted", label: "Live Stadium Report", color: "#8b5cf6" },
        { id: "Financial Check", label: "FFP & Agent Valuation", color: "#f59e0b" },
        { id: "Offer Stage", label: "Transfer Offer Active", color: "#10b981" }
      ],
      fields: [
        { name: "targetClub", label: "Current Club", type: "text", required: true },
        { name: "targetRole", label: "Position / Role", type: "text", required: true },
        { name: "leadScoutId", label: "Lead Scout / Director", type: "lookup", targetObject: "staff", required: false },
        { name: "estimatedFee", label: "Estimated Valuation ($)", type: "number", required: false }
      ],
      sampleRecords: [
        {
          name: "Thiago Almada-Vega (21, Left-Footed CB)",
          stage: "Live Scouted",
          subtitle: "CA Vélez • 94th Percentile Progressive Passes",
          fields: { targetClub: "CA Vélez", targetRole: "Left Center Back", leadScoutId: "stf_marco", estimatedFee: 14000000 }
        }
      ]
    },
    {
      apiName: "accreditation__c",
      label: "Matchday Accreditation",
      pluralLabel: "Accreditations",
      icon: "🔐",
      category: "Operations Blueprint",
      description: "Proposed Object: Zone access passes for broadcast crews, visiting scouts, VIP guests, and matchday contractors.",
      lifecycle: [
        { id: "Requested", label: "Application Received", color: "#64748b" },
        { id: "Security Vetting", label: "Security Background Check", color: "#f59e0b" },
        { id: "Approved", label: "Zone Access Approved", color: "#3b82f6" },
        { id: "Printed", label: "NFC Pass Issued", color: "#8b5cf6" },
        { id: "Checked-In", label: "Active Inside Venue", color: "#10b981" }
      ],
      fields: [
        { name: "organization", label: "Media / External Org", type: "text", required: true },
        { name: "accessZones", label: "Authorized Zones", type: "select", options: ["Pitchside & Tunnel", "Broadcast Compound & Press Box", "VIP Hospitality Suites", "All-Venue Technical"], required: true },
        { name: "venueId", label: "Target Venue", type: "lookup", targetObject: "venue", required: true }
      ],
      sampleRecords: [
        {
          name: "Host Broadcast OB Van Crew (16 Passes)",
          stage: "Approved",
          subtitle: "Continental Sports Network • Broadcast Compound & Pitch",
          fields: { organization: "Continental Sports Network", accessZones: "Broadcast Compound & Press Box", venueId: "ven_stadium_main" }
        }
      ]
    }
  ],

  records: {
    staff: [
      {
        id: "stf_diego",
        name: "Diego Morales",
        stage: "Active",
        subtitle: "Men's First Team Head Coach • UEFA Pro License",
        updatedAt: "2026-10-17T21:10:00Z",
        fields: {
          roleTitle: "Men's First Team Head Coach",
          department: "First Team Technical",
          teamId: "team_first_men",
          venueId: "ven_pitch_1",
          licenseLevel: "UEFA Pro License",
          clearance: "All-Access Zone 1",
          contractUntil: "2029-06-30",
          externalSystem: "Workday HR • Hudl Tactical"
        },
        history: [
          { timestamp: "2026-10-15T09:00:00Z", from: "Onboarding", to: "Active", actor: "Elena Vance", note: "League technical area accreditation confirmed." }
        ]
      },
      {
        id: "stf_marco",
        name: "Marco Silva",
        stage: "Active",
        subtitle: "Sporting Director • Executive Football Operations",
        updatedAt: "2026-10-17T20:40:00Z",
        fields: {
          roleTitle: "Sporting Director",
          department: "Scouting & Analytics",
          teamId: "team_first_men",
          venueId: "ven_media_hub",
          licenseLevel: "UEFA A / FIFA Sporting Management",
          clearance: "All-Access Zone 1",
          contractUntil: "2028-06-30",
          externalSystem: "FIFA TMS • Wyscout Enterprise"
        },
        history: []
      },
      {
        id: "stf_helena",
        name: "Dr. Helena Costa",
        stage: "Active",
        subtitle: "Head of Sports Science & Medical • MD, PhD",
        updatedAt: "2026-10-17T22:15:00Z",
        fields: {
          roleTitle: "Head of Sports Science & Medical",
          department: "Sports Science & Medical",
          teamId: "team_first_men",
          venueId: "ven_recovery_lab",
          licenseLevel: "FIFA Diploma in Football Medicine",
          clearance: "All-Access Zone 1",
          contractUntil: "2028-06-30",
          externalSystem: "Kitman Labs EMR • Catapult Vector"
        },
        history: []
      },
      {
        id: "stf_carlos",
        name: "Carlos Mendez",
        stage: "Active",
        subtitle: "Director of Venues & Head Groundskeeper",
        updatedAt: "2026-10-17T22:50:00Z",
        fields: {
          roleTitle: "Director of Stadium & Grounds",
          department: "Stadium & Grounds",
          teamId: "team_first_men",
          venueId: "ven_stadium_main",
          licenseLevel: "GMA Master Turf Management",
          clearance: "All-Access Zone 1",
          contractUntil: "2027-06-30",
          externalSystem: "TurfSense IoT • Stadium BMS"
        },
        history: []
      },
      {
        id: "stf_sofia",
        name: "Sofía Lindqvist",
        stage: "Active",
        subtitle: "Women's First Team Head Coach • UEFA Pro License",
        updatedAt: "2026-10-17T19:30:00Z",
        fields: {
          roleTitle: "Women's First Team Head Coach",
          department: "First Team Technical",
          teamId: "team_first_women",
          venueId: "ven_academy_arena",
          licenseLevel: "UEFA Pro License",
          clearance: "All-Access Zone 1",
          contractUntil: "2028-06-30",
          externalSystem: "Workday HR • Catapult Vector"
        },
        history: []
      },
      {
        id: "stf_javier",
        name: "Javier Ortega",
        stage: "Onboarding",
        subtitle: "Lead Set-Piece & Opposition Analyst",
        updatedAt: "2026-10-17T18:00:00Z",
        fields: {
          roleTitle: "Lead Set-Piece Analyst",
          department: "First Team Technical",
          teamId: "team_first_men",
          venueId: "ven_media_hub",
          licenseLevel: "UEFA B + Hudl Sportscode Level 3",
          clearance: "Pitch & Locker Room",
          contractUntil: "2028-06-30",
          externalSystem: "Hudl Sportscode • Opta Pro"
        },
        history: [
          { timestamp: "2026-10-16T14:20:00Z", from: "Prospect", to: "Onboarding", actor: "Marco Silva", note: "Signed 2-year technical staff deal; provisioning Hudl & pitch pass." }
        ]
      },
      {
        id: "stf_kenji",
        name: "Kenji Takahashi",
        stage: "Prospect",
        subtitle: "Head of Biomechanics & Neuromuscular Rehab (Candidate)",
        updatedAt: "2026-10-17T15:10:00Z",
        fields: {
          roleTitle: "Head of Biomechanics",
          department: "Sports Science & Medical",
          teamId: "team_reserves",
          venueId: "ven_recovery_lab",
          licenseLevel: "PhD Sports Biomechanics",
          clearance: "Pending Clearance",
          contractUntil: "2029-06-30",
          externalSystem: "Workday Recruiting"
        },
        history: []
      },
      {
        id: "stf_liam",
        name: "Liam O'Connor",
        stage: "On Leave",
        subtitle: "U21 Elite Academy Head Coach • UEFA A",
        updatedAt: "2026-10-17T12:00:00Z",
        fields: {
          roleTitle: "U21 Academy Head Coach",
          department: "Academy Coaching",
          teamId: "team_u21",
          venueId: "ven_academy_arena",
          licenseLevel: "UEFA Pro Candidate",
          clearance: "Training Ground Only",
          contractUntil: "2027-06-30",
          externalSystem: "Workday HR"
        },
        history: [
          { timestamp: "2026-10-14T08:00:00Z", from: "Active", to: "On Leave", actor: "Marco Silva", note: "Attending 10-day UEFA Pro residential module in Nyon." }
        ]
      }
    ],

    team: [
      {
        id: "team_first_men",
        name: "Men's First Team",
        stage: "Matchday Lock",
        subtitle: "Premier Continental League • MD-1 Roster Locked (23/25 Fit)",
        updatedAt: "2026-10-17T23:00:00Z",
        fields: {
          divisionTier: "First Team",
          competition: "Premier Continental League & Champions Cup",
          headCoachId: "stf_diego",
          homeVenueId: "ven_stadium_main",
          squadSize: 25,
          readinessScore: 94,
          nextFixture: "vs Real Valencia CF (Home • Sun 20:00)",
          externalSystem: "Catapult Vector • Hudl • Kitman Labs"
        },
        history: [
          { timestamp: "2026-10-17T20:00:00Z", from: "In-Season Active", to: "Matchday Lock", actor: "Diego Morales", note: "23-man matchday squad submitted; hotel & stadium security protocol engaged." }
        ]
      },
      {
        id: "team_first_women",
        name: "Women's First Team",
        stage: "In-Season Active",
        subtitle: "Primera División Femenina • 2nd Place (W6-D1-L0)",
        updatedAt: "2026-10-17T19:45:00Z",
        fields: {
          divisionTier: "Women's First Team",
          competition: "Primera División & Women's Champions League",
          headCoachId: "stf_sofia",
          homeVenueId: "ven_academy_arena",
          squadSize: 23,
          readinessScore: 96,
          nextFixture: "at Sporting Lisboa WFC (Wed 18:45)",
          externalSystem: "Catapult Vector • Hudl • Kitman Labs"
        },
        history: []
      },
      {
        id: "team_reserves",
        name: "Atlético Metropolitano B (Second Team)",
        stage: "In-Season Active",
        subtitle: "Segunda Federación • High-Potential Bridge Squad",
        updatedAt: "2026-10-17T17:30:00Z",
        fields: {
          divisionTier: "Second / Reserve Team",
          competition: "National Division 2",
          headCoachId: "stf_marco",
          homeVenueId: "ven_academy_arena",
          squadSize: 24,
          readinessScore: 91,
          nextFixture: "vs Deportivo Norte B (Sat 16:00)",
          externalSystem: "Catapult Vector • Wyscout"
        },
        history: []
      },
      {
        id: "team_u21",
        name: "U21 Elite Academy",
        stage: "Tournament Travel",
        subtitle: "UEFA Youth League • Travelling to Munich",
        updatedAt: "2026-10-17T16:20:00Z",
        fields: {
          divisionTier: "U21 Elite Academy",
          competition: "Continental Youth Cup",
          headCoachId: "stf_liam",
          homeVenueId: "ven_pitch_1",
          squadSize: 22,
          readinessScore: 89,
          nextFixture: "at Bayern Campus U21 (Tue 14:00)",
          externalSystem: "Catapult One • TeamWorks Travel"
        },
        history: [
          { timestamp: "2026-10-17T14:00:00Z", from: "In-Season Active", to: "Tournament Travel", actor: "Elena Vance", note: "Charter manifest & passport clearances verified." }
        ]
      },
      {
        id: "team_u18",
        name: "U18 Youth Academy",
        stage: "Pre-Season",
        subtitle: "Academy Cup • Tactical Periodization Block 2",
        updatedAt: "2026-10-17T15:00:00Z",
        fields: {
          divisionTier: "U18 Youth Academy",
          competition: "National U18 Honour Division",
          headCoachId: "stf_javier",
          homeVenueId: "ven_academy_arena",
          squadSize: 26,
          readinessScore: 92,
          nextFixture: "Winter Showcase Tournament (Nov 2)",
          externalSystem: "Hudl Focus • Kitman Academy"
        },
        history: []
      }
    ],

    venue: [
      {
        id: "ven_stadium_main",
        name: "Estadio Metropolitano Arena",
        stage: "Matchday Mode",
        subtitle: "68,000 Capacity • Hybrid Desso GrassMaster • Gates Armed",
        updatedAt: "2026-10-17T22:30:00Z",
        fields: {
          facilityType: "Main Stadium",
          surface: "Desso GrassMaster Hybrid + SubAir Undersoil",
          capacity: 68000,
          managerId: "stf_carlos",
          assignedTeamId: "team_first_men",
          turfIndex: 98,
          externalSystem: "TurfSense IoT • Ticketmaster Access • Broadcast Fiber"
        },
        history: [
          { timestamp: "2026-10-17T21:00:00Z", from: "Available", to: "Matchday Mode", actor: "Carlos Mendez", note: "Pitch grow-lights retracted; Hawk-Eye & VAR calibration passed." }
        ]
      },
      {
        id: "ven_pitch_1",
        name: "High-Performance Training Pitch 1 (Tactical)",
        stage: "Scheduled Session",
        subtitle: "Heated Hybrid Turf • 8x Hudl Focus Auto-Tracking Cameras",
        updatedAt: "2026-10-17T21:45:00Z",
        fields: {
          facilityType: "Training Pitch",
          surface: "Stitch-Reinforced Natural Ryegrass (105m x 68m)",
          capacity: 500,
          managerId: "stf_carlos",
          assignedTeamId: "team_first_men",
          turfIndex: 96,
          externalSystem: "Catapult Local Positioning (LPS) • Hudl Focus"
        },
        history: []
      },
      {
        id: "ven_recovery_lab",
        name: "Indoor Hydro & Biomechanics Lab",
        stage: "Available",
        subtitle: "Cryotherapy, Dual Hydro-Pools, DEXA & Force Plates",
        updatedAt: "2026-10-17T20:15:00Z",
        fields: {
          facilityType: "Medical & Recovery Lab",
          surface: "Mondo Medical Shock-Absorbing Track & Hydrotherapy",
          capacity: 60,
          managerId: "stf_helena",
          assignedTeamId: "team_first_men",
          turfIndex: 100,
          externalSystem: "Kitman Labs • VALD ForceDecks"
        },
        history: []
      },
      {
        id: "ven_academy_arena",
        name: "Ciudad Deportiva Mini-Estadio",
        stage: "Available",
        subtitle: "4,500 Capacity • Women's First Team & Academy Show Pitch",
        updatedAt: "2026-10-17T19:00:00Z",
        fields: {
          facilityType: "Academy Complex",
          surface: "FIFA Quality Pro Hybrid Surface",
          capacity: 4500,
          managerId: "stf_carlos",
          assignedTeamId: "team_first_women",
          turfIndex: 94,
          externalSystem: "Spiideo AutoCam • Access Control"
        },
        history: []
      },
      {
        id: "ven_pitch_3",
        name: "Training Pitch 3 (Academy & Rehab)",
        stage: "Pitch Maintenance",
        subtitle: "Verti-Draining & Overseeding Cycle (Clears in 18h)",
        updatedAt: "2026-10-17T17:10:00Z",
        fields: {
          facilityType: "Training Pitch",
          surface: "Natural Bermuda/Rye Blend",
          capacity: 200,
          managerId: "stf_carlos",
          assignedTeamId: "team_u18",
          turfIndex: 82,
          externalSystem: "TurfSense Moisture & UV Rig"
        },
        history: [
          { timestamp: "2026-10-17T16:00:00Z", from: "Available", to: "Pitch Maintenance", actor: "Carlos Mendez", note: "Automated aeration and UV lighting cycle triggered." }
        ]
      },
      {
        id: "ven_media_hub",
        name: "Tactical Auditorium & Press Operations Center",
        stage: "Available",
        subtitle: "Dolby Atmos 8K Tactical Wall • 140 Seats",
        updatedAt: "2026-10-17T18:20:00Z",
        fields: {
          facilityType: "Tactical Media Center",
          surface: "Acoustic Tiered Seating + 8K LED Tactical Wall",
          capacity: 140,
          managerId: "stf_javier",
          assignedTeamId: "team_first_men",
          turfIndex: 100,
          externalSystem: "Hudl Studio • Broadcast Dante Matrix"
        },
        history: []
      }
    ]
  },

  orchestrationEvents: [
    {
      id: "evt_1004",
      timestamp: "2026-10-17T23:00:00Z",
      type: "sportsos.lifecycle.transitioned",
      objectApiName: "team",
      recordId: "team_first_men",
      recordName: "Men's First Team",
      summary: "Men's First Team transitioned from [In-Season Active] → [Matchday Lock]",
      dispatchedTo: ["Catapult Vector GPS", "Kitman Labs EMR", "Ticketmaster & Stripe CRM"],
      actor: "Diego Morales"
    },
    {
      id: "evt_1003",
      timestamp: "2026-10-17T21:00:00Z",
      type: "sportsos.lifecycle.transitioned",
      objectApiName: "venue",
      recordId: "ven_stadium_main",
      recordName: "Estadio Metropolitano Arena",
      summary: "Estadio Metropolitano Arena transitioned from [Available] → [Matchday Mode]",
      dispatchedTo: ["TurfSense & Stadium BMS IoT", "Ticketmaster & Stripe CRM"],
      actor: "Carlos Mendez"
    },
    {
      id: "evt_1002",
      timestamp: "2026-10-17T14:00:00Z",
      type: "sportsos.lifecycle.transitioned",
      objectApiName: "team",
      recordId: "team_u21",
      recordName: "U21 Elite Academy",
      summary: "U21 Elite Academy transitioned from [In-Season Active] → [Tournament Travel]",
      dispatchedTo: ["Workday HR & FIFA TMS", "Catapult Vector GPS"],
      actor: "Elena Vance"
    },
    {
      id: "evt_1001",
      timestamp: "2026-10-16T14:20:00Z",
      type: "sportsos.lifecycle.transitioned",
      objectApiName: "staff",
      recordId: "stf_javier",
      recordName: "Javier Ortega",
      summary: "Javier Ortega transitioned from [Prospect] → [Onboarding]",
      dispatchedTo: ["Workday HR & FIFA TMS", "Hudl Sportscode & Wyscout"],
      actor: "Marco Silva"
    }
  ]
};

module.exports = { INITIAL_SEED };
