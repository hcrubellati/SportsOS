.PHONY: up down logs start test mcp

# One-line Docker deployment
up:
	docker compose up -d --build
	@echo "🏟️  SportsOS is live at http://localhost:4000"
	@echo "🤖 Embedded MCP HTTP endpoint at http://localhost:4000/mcp"

down:
	docker compose down

logs:
	docker compose logs -f

# Local zero-dependency run
start:
	npm start

test:
	npm test

mcp:
	npm run mcp:stdio
