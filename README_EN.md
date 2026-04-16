# Neo4j Ontology Tools

> **[한국어 버전 → README.md](./README.md)**

A Next.js 15 web app for visually exploring knowledge graphs (ontologies), entering relationships in natural language, and storing/querying data in Neo4j.  
Includes a built-in MCP (Model Context Protocol) server so AI clients like Claude Code can directly manipulate the graph.

---

## Features

### Phase 1 — Basic Visualization + MCP Read-only
- **Force-directed graph** (Cytoscape.js cose-bilkent) — physics simulation layout
- **Natural language input** — Claude LLM converts "React is a JavaScript framework" into ontology triples
- **Fallback manual mode** — direct node/relation input without LLM
- **Setup wizard** `/setup` — 3-step Neo4j connection, LLM API key, MCP config
- **MCP server** — 3 read-only tools: `get_ontology`, `search_nodes`, `get_node_relations`

### Phase 2a — 3 Graph Views + GDS Algorithms
- **Node-link Diagram** (dagre) — IS_A relations as top-down hierarchy, others as dashed lines
- **Network Graph** (cola) — community-colored clusters (Louvain algorithm)
- **GDS integration** — node size scaled by PageRank score, Louvain community detection
- **Auto-fallback when GDS not installed** — full functionality, informational banner shown
- **Node detail panel** — click any node to see name, type, description, PageRank, community ID
- **Relation type filter** — toggle IS_A / USES / PART_OF / HAS_PROPERTY / INSTANCE_OF
- **Zoom controls** — zoom in / zoom out / fit view buttons
- **PageRank 30-second auto-refresh** — updates automatically after ontology changes

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Graph | Cytoscape.js + cose-bilkent / dagre / cola |
| Database | Neo4j 5.x |
| GDS | Neo4j Graph Data Science (optional) |
| LLM | Anthropic Claude API (optional) |
| MCP | @modelcontextprotocol/sdk |
| Testing | Vitest + @testing-library/react |
| Package manager | pnpm workspace |

---

## Installation & Running

### Prerequisites

- Node.js 20+
- pnpm 9+
- Neo4j Desktop or Neo4j Aura (optional)

### 1. Clone the repository

```bash
git clone https://github.com/sodam-ai/neo4j_ontology_tools.git
cd neo4j_ontology_tools
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Neo4j (required if connecting)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# Anthropic (for natural language input)
ANTHROPIC_API_KEY=sk-ant-...

# MCP server (optional)
MCP_SERVER_PORT=3100
```

### 4. Start the dev server

```bash
pnpm dev
```

Open `http://localhost:3000` in your browser.

### 5. (Optional) Build the MCP server

```bash
pnpm --filter mcp-server build
```

Register the MCP server in Claude Code `settings.json`:

```json
{
  "mcpServers": {
    "ontology": {
      "command": "node",
      "args": ["D:/path/to/neo4j_ontology_tools/packages/mcp-server/dist/server.js"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "your_password"
      }
    }
  }
}
```

---

## GDS (Graph Data Science) — Optional Installation

Neo4j Desktop → your DB → **Plugins** → **Graph Data Science Library** → Install

- After restarting the app, PageRank + community detection activate automatically
- Without GDS: PageRank=0, communityId=0, app works normally (no degraded functionality)

---

## Project Structure

```
neo4j_ontology_tools/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main page (graph + input)
│   │   ├── setup/                # Setup wizard
│   │   ├── settings/             # Settings page
│   │   └── api/
│   │       ├── health/           # Neo4j connection status
│   │       ├── ontology/         # CRUD + PageRank merge
│   │       ├── llm/parse/        # Natural language → triples
│   │       └── mcp-events/       # SSE stream
│   ├── components/
│   │   ├── OntologyGraph/
│   │   │   ├── ForceDirectedGraph.tsx   # cose-bilkent
│   │   │   ├── NodeLinkDiagram.tsx      # dagre (IS_A hierarchy)
│   │   │   ├── NetworkGraph.tsx         # cola (community)
│   │   │   ├── GraphToolbar.tsx         # tabs · filter · zoom
│   │   │   ├── NodeDetailPanel.tsx      # node detail panel
│   │   │   └── GdsBanner.tsx            # GDS not-installed notice
│   │   └── OntologyInput/
│   │       └── NaturalLanguageInput.tsx
│   ├── lib/
│   │   ├── neo4j/
│   │   │   ├── connection.ts     # singleton driver
│   │   │   ├── init.ts           # constraints + GDS projection
│   │   │   ├── repos.ts          # CRUD
│   │   │   ├── cypher-builder.ts # query builder
│   │   │   └── gds.ts            # PageRank + Louvain
│   │   └── llm/
│   │       └── nl-to-cypher.ts   # natural language parser
│   └── types/
│       ├── ontology.ts           # core types
│       ├── cytoscape-dagre.d.ts
│       └── cytoscape-cola.d.ts
└── packages/
    └── mcp-server/               # MCP standalone package
        └── src/
            ├── server.ts
            ├── view-event.ts
            └── tools/
```

---

## Testing

```bash
pnpm test          # run all tests
pnpm typecheck     # TypeScript type check
pnpm build         # production build
```

Current test count: **28 passing**

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Done | Force-directed graph, MCP read-only, natural language input |
| Phase 2a | ✅ Done | Node-link / Network graphs, GDS PageRank + community |
| Phase 2b | Pending | Shortest Path, Claude Code skills, natural language search, IS_A cycle prevention |
| Phase 3 | Pending | JSON/CSV import·export (APOC) |

---

## License

MIT © 2026 SoDam AI Studio
