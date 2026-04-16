# Neo4j Ontology Tools

> Type natural language and a Neo4j knowledge graph is automatically created.
> AI tools like Claude Code can reference this graph via MCP for more accurate assistance.

## What This Tool Does

1. **Natural language input**: Type "React uses JavaScript"
2. **Automatic relationship creation**: AI analyzes and creates nodes and relationships
3. **Graph visualization**: Force-directed graph shows everything at a glance
4. **AI reference**: Claude Code queries the ontology via MCP automatically

No coding knowledge required.

---

## Key Features

| Feature | Description |
|---------|-------------|
| Natural Language Input | Enter concepts and relationships in everyday sentences |
| AI Auto-Conversion | Automatically converts sentences to nodes + relationships |
| Force-directed Graph | Physics-simulation based visualization (Cytoscape.js) |
| MCP Server | Query ontology from Claude Code/Cursor (read-only) |
| Real-time Sync | Graph reacts automatically when MCP tools are invoked |
| Setup Wizard | Step-by-step guide for first-time setup |
| Fallback Mode | Works without AI key using manual dropdown selection |

---

## Installation

### Prerequisites

1. **Node.js 20+**: https://nodejs.org/
2. **pnpm**: `npm install -g pnpm`
3. **Neo4j Desktop**: https://neo4j.com/download/

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment template
# Rename .env.local.example to .env.local and fill in your Neo4j password
```

### Environment Variables (.env.local)

```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here
LLM_API_KEY=sk-ant-api03-...    # Optional (manual mode without it)
LLM_MODEL=claude-sonnet-4-6
WEB_APP_URL=http://localhost:3000
```

### Run

```bash
pnpm dev    # Start on port 3000
```

Visit http://localhost:3000 — the setup wizard will guide you.

---

## MCP Server Setup

```bash
cd packages/mcp-server
pnpm build
```

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "neo4j-ontology": {
      "command": "node",
      "args": ["<project-path>/packages/mcp-server/dist/server.js"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "${NEO4J_PASSWORD}",
        "WEB_APP_URL": "http://localhost:3000"
      }
    }
  }
}
```

### MCP Tools (Read-only)

| Tool | Description |
|------|-------------|
| `query_ontology` | Query nodes/relationships by conditions (max depth 3) |
| `search_ontology` | Fulltext keyword search (max 50 results) |
| `get_context` | Get surrounding context of a node (1-2 hops, 50 nodes/100 rels cap) |

---

## Tech Stack

- **Next.js 15** (App Router) + **TypeScript 5.x**
- **Tailwind CSS 4**
- **Neo4j Desktop 5.x** + **neo4j-driver 5.x**
- **Cytoscape.js 3.x** + cose-bilkent
- **Anthropic SDK** (Claude, prompt caching)
- **@modelcontextprotocol/sdk** (MCP server)
- **Zod** (LLM response validation)
- **Vitest** (testing)

---

## Security Notes

- Never commit `.env.local` to git (included in .gitignore)
- Never prefix `LLM_API_KEY` with `NEXT_PUBLIC_` (browser exposure risk)
- Use system environment variables for MCP config passwords
- MCP server is **read-only** (no write tools)

---

## Testing

```bash
pnpm test        # Run all 19 tests
pnpm typecheck   # TypeScript type check
```

---

## License

MIT License - Copyright (c) 2026 SoDam AI Studio

[한국어 README](./README.md)
