# Neo4j Ontology Tools

> **[한국어 버전 → README.md](./README.md)**

"I want to draw a picture of the relationships between the things I know" — this app does exactly that.  
Even without coding knowledge, just type a sentence and AI will build a knowledge graph for you.  
Data is stored in Neo4j, and you can explore it with 3 types of visual graphs.

---

## Table of Contents

1. [What can you do with this app?](#what-can-you-do-with-this-app)
2. [Getting Started (No Coding Experience Required)](#getting-started-no-coding-experience-required)
3. [Developer Installation Guide](#developer-installation-guide)
4. [Environment Variables](#environment-variables)
5. [Deployment](#deployment)
6. [GDS Optional Installation](#gds-graph-data-science-optional-installation)
7. [Project Structure](#project-structure)
8. [Operations & Warnings](#operations--warnings)
9. [Testing](#testing)
10. [Roadmap](#roadmap)
11. [License](#license)

---

## What can you do with this app?

| Feature | Description |
|---------|-------------|
| Natural language input | Type "React is a JavaScript framework" and AI extracts the relationship automatically |
| 3 graph views | Explore with Force-directed (physics), Node-link (hierarchy), Network (community) |
| Node detail panel | Click any item in the graph to see details (importance score, group, etc.) |
| Relation filter | Show or hide specific types of relationships |
| AI client integration | Claude Code and other AI tools can query/modify the graph directly (MCP) |
| Auto importance scoring | If Neo4j GDS is installed, PageRank (importance) and community (grouping) are computed automatically |

---

## Getting Started (No Coding Experience Required)

> You don't need any coding experience. Just follow these steps.

### Step 1 — Download the required programs

Install these three free programs:

**① Node.js** (the engine that runs the app)
- Search "Node.js download" on Google → download and install the **LTS version**

**② pnpm** (library manager — run after installing Node.js)
- Open **PowerShell** or **Command Prompt** from the Windows search bar and type:
```
npm install -g pnpm
```

**③ Neo4j Desktop** (database program — optional)
- Search "Neo4j Desktop download" on Google → install for free
- After installing: create a new project → new database → remember your password

---

### Step 2 — Download this app

1. Click the green **Code** button at the top of this page → select **Download ZIP**
2. Extract the ZIP file to a folder of your choice
3. Inside the folder, click the address bar → type `cmd` → press Enter

---

### Step 3 — Install libraries

In the Command Prompt, type and press Enter:
```
pnpm install
```
(Wait a moment while it downloads automatically — internet connection required)

---

### Step 4 — Create a settings file

1. Find the `.env.local.example` file in the app folder
2. Copy it and rename the copy to `.env.local`
3. Open `.env.local` in Notepad and fill in these fields:

```
NEO4J_URI=bolt://localhost:7687        ← Neo4j Desktop default (leave as is)
NEO4J_USER=neo4j                       ← Neo4j default username (leave as is)
NEO4J_PASSWORD=enter_your_password     ← The password you set in Neo4j Desktop
ANTHROPIC_API_KEY=sk-ant-...           ← (Optional) Get from Anthropic website
```

> You can use the app without Neo4j. Without it, data won't be saved but the screen will open.

---

### Step 5 — Run the app

In Command Prompt:
```
pnpm dev
```
Then open your browser (Chrome, Edge, etc.) and go to:
```
http://localhost:3000
```

The app is now open! Try typing "A is a type of B" in the input box at the top.

---

### FAQ

**Q. Is Neo4j Desktop required?**  
No. The app runs without it. However, data won't be saved between sessions.

**Q. What happens without an Anthropic API key?**  
The natural language input feature is disabled. You can still use the manual input mode to add nodes and relations directly.

**Q. Will my data be lost when I close the app?**  
If Neo4j Desktop is connected, data is stored permanently. Without Neo4j, data is lost when the app closes.

---

## Developer Installation Guide

### Prerequisites

- Node.js 20+
- pnpm 9+
- Neo4j 5.x (optional)

### Install

```bash
git clone https://github.com/sodam-ai/neo4j_ontology_tools.git
cd neo4j_ontology_tools
pnpm install
cp .env.local.example .env.local
# edit .env.local, then:
pnpm dev
```

### (Optional) Build the MCP server

```bash
pnpm --filter mcp-server build
```

Register in Claude Code `settings.json`:

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

## Environment Variables

Set these in your `.env.local` file. **Never upload this file to GitHub.**

| Variable | Required | Description |
|----------|----------|-------------|
| `NEO4J_URI` | If using Neo4j | Connection address. Local: `bolt://localhost:7687` |
| `NEO4J_USER` | If using Neo4j | Username. Default: `neo4j` |
| `NEO4J_PASSWORD` | If using Neo4j | Your Neo4j password |
| `ANTHROPIC_API_KEY` | For NL input | Issued from Anthropic console. Starts with `sk-ant-` |
| `MCP_SERVER_PORT` | Optional | MCP server port. Default: `3100` |

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

ANTHROPIC_API_KEY=sk-ant-...

MCP_SERVER_PORT=3100
```

> **Note:** `.env.local` is listed in `.gitignore` and will never be uploaded to GitHub accidentally.

---

## Deployment

### Vercel (easiest method)

1. Sign up at [vercel.com](https://vercel.com) and connect your GitHub repository
2. In the Vercel dashboard → Project Settings → **Environment Variables** → add your `.env.local` values
3. Click Deploy → automatic build and deployment

> **Note:** When deploying to Vercel, Neo4j must be accessible from the internet (e.g., Neo4j Aura). `localhost` will not work.

### Self-hosted (Node.js server)

```bash
pnpm build          # production build
pnpm start          # start server (default port 3000)
```

Inject environment variables via `.env.local` or server-level environment settings.

### Neo4j Aura (cloud database)

To use a cloud DB instead of local Neo4j Desktop:
1. Create a free instance at [neo4j.com/aura](https://neo4j.com/aura)
2. Enter the connection info into `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` in `.env.local`

---

## GDS (Graph Data Science) Optional Installation

To enable PageRank (importance scoring) and community (grouping) features, add the GDS plugin to Neo4j Desktop.

**How to install:**
Neo4j Desktop → select your DB → **Plugins** tab on the right → **Graph Data Science Library** → **Install**

- After restarting the app, PageRank + community detection activate automatically
- **Without GDS:** The app works normally — these features are simply disabled (an info banner is shown)

---

## Project Structure

```
neo4j_ontology_tools/
├── .env.local.example        ← environment variable template (copy this to .env.local)
├── .env.local                ← actual environment variables (never upload to GitHub!)
├── README.md                 ← Korean documentation
├── README_EN.md              ← this file
├── LICENSE                   ← license
├── src/
│   ├── app/
│   │   ├── page.tsx              # main screen
│   │   ├── setup/                # setup wizard
│   │   ├── settings/             # settings page
│   │   └── api/                  # server APIs
│   ├── components/
│   │   ├── OntologyGraph/        # graph visualization components
│   │   └── OntologyInput/        # natural language input component
│   ├── lib/
│   │   ├── neo4j/                # Neo4j connection, queries, GDS
│   │   └── llm/                  # AI natural language processing
│   └── types/                    # type definitions
└── packages/
    └── mcp-server/               # AI client integration server
```

---

## Operations & Warnings

### Security
- Never share your `.env.local` file via GitHub, chat, or email. It contains your API keys and DB password.
- Use a strong, hard-to-guess password for Neo4j.
- Do not expose your Neo4j URI publicly in production deployments.

### Data
- Deleting a database in Neo4j Desktop permanently removes all graph data. Export important data beforehand.
- The app runs without Neo4j, but data will not persist between sessions.

### Performance
- When node count exceeds 200, the layout automatically switches to grid mode.
- When node count exceeds 1,000, a performance warning banner is shown.
- PageRank auto-refreshes every 30 seconds. Brief slowness during refresh is normal.

### API Costs
- If an Anthropic API key is set, each natural language input call incurs API costs.
- It is recommended to set a usage limit in the Anthropic console to manage costs.

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

## Testing

```bash
pnpm test          # run all tests
pnpm typecheck     # TypeScript type check
pnpm build         # production build test
```

Current test count: **28 passing**

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Done | Force-directed graph, MCP read-only, natural language input |
| Phase 2a | ✅ Done | Node-link / Network graphs, GDS PageRank + community |
| Phase 2b | Pending | Shortest path, natural language search, IS_A cycle prevention |
| Phase 3 | Pending | JSON/CSV import·export (APOC) |

---

## License

MIT License — see the [LICENSE](./LICENSE) file for details

Copyright © 2026 SoDam AI Studio
