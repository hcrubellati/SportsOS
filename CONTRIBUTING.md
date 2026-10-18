# Contributing to SportsOS

Thank you for helping build the open-source operational system for sports organizations!

## Getting Started

1. Fork and clone the repository.
2. Start the platform locally:
   ```bash
   # Using Docker (one line)
   docker compose up --build

   # Or directly with Node.js (v18+)
   npm start
   ```
3. Open `http://localhost:4000` to access the TV-OS interface and `http://localhost:4000/mcp` for the embedded Model Context Protocol endpoint.

## Adding New Object Blueprints

Object blueprints live in `src/db/seed.js` under `OBJECT_BLUEPRINTS`. Each blueprint defines:
- `apiName`, `label`, `pluralLabel`, `icon`, `category`
- `lifecycle`: Ordered array of lifecycle states (`id`, `label`, `color`)
- `fields`: Array of typed field definitions (`text`, `number`, `select`, `lookup`, `date`, `currency`)

## Adding Orchestration Connectors

External connectors (Catapult, Hudl, Kitman Labs, Opta, Workday, Ticketmaster) are registered in `src/db/seed.js` and triggered automatically whenever a record is created, updated, or transitions lifecycle states.

## Submitting Pull Requests

- Ensure `npm test` (health & schema verification) passes before opening a PR.
- Keep the zero-dependency core fast and portable so any club or developer can boot SportsOS in a single command.
