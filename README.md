# OrgMind — Institutional Memory & Decision Intelligence

> A system that captures an organisation's decisions, meetings, and knowledge into a living knowledge graph — queryable by anyone in natural language.

---

## What Problem Does This Solve?

Imagine a company that has been running for 5 years. In those 5 years:

- Hundreds of meetings happened
- Thousands of decisions were made
- Some strategies failed and were reversed
- Key people left and took their knowledge with them
- The same mistakes got repeated because nobody remembered

There is no system that captures all of this in a structured, intelligent, queryable way. Emails get buried. Meeting notes sit in random folders. Slack threads disappear.

**OrgMind fixes this.** Feed it raw organisational data — and it becomes the company's living memory.

---

## How It Works

When a user asks a question like *"What decisions did we reverse last quarter?"*, here is what happens under the hood:

```
User types a question
        ↓
Node.js API receives the request
        ↓
Check Redis cache — has this been asked before?
        ↓
YES → return cached answer instantly (~50ms)
        ↓
NO → send to Python microservice
        ↓
Python converts question into a graph query
        ↓
Neo4j traverses the knowledge graph and returns results
        ↓
Results sent to local Llama 3.2
LLM turns raw graph data into a clean, readable answer
        ↓
Answer saved to Redis cache for next time
        ↓
Clean answer returned to user on the dashboard
```

Every technology has a clear, necessary role. Nothing is there for show.

---

## The Knowledge Graph

The heart of the system is the graph. Here is a real example of what gets built from a meeting transcript.

**Raw input:**
```
Meeting 12th October. Sarah and James decided to pause the Berlin expansion 
due to budget concerns. This reverses the decision made in July. Tom flagged 
the same concern in August but was overruled.
```

**What OrgMind extracts and stores:**
```
[Sarah] ──MADE──> [Decision: Pause Berlin Expansion]
[James] ──MADE──> [Decision: Pause Berlin Expansion]
[Decision: Pause Berlin Expansion] ──REVERSES──> [Decision: Berlin Expansion July]
[Decision: Pause Berlin Expansion] ──REASON──> [Budget Concerns]
[Tom] ──FLAGGED──> [Budget Concerns] ──ON──> [August]
[Tom's concern] ──OVERRULED_BY──> [Decision: Berlin Expansion July]
```

Now when someone asks *"Who flagged the Berlin budget issue first?"* — the system traverses the graph and finds Tom immediately. That answer would be impossible to find reliably with standard RAG.

---

## Architecture

| Component | Technology | Role |
|---|---|---|
| Backend API | Node.js + Express | Coordinator — receives requests, routes to the right service |
| Knowledge Graph | Neo4j | Stores all entities and relationships; the core memory |
| Intelligence Layer | Python microservice | Extracts entities and relationships from raw text; converts questions to graph queries |
| Cache | Redis | Serves repeated queries instantly; session management |
| LLM | Llama 3.2 (local) | Turns raw graph results into clean, readable answers |
| Dashboard | React + D3.js | Graph visualisation, query interface, data upload |

---

## Project Structure

```
OrgMind/
├── config/
│   └── db.js              # Neo4j and Redis connection setup
├── src/
│   └── index.js           # Express server and API routes
├── package.json
└── README.md
```

*(Structure grows as phases are completed)*

---

## Build Phases

- [x] **Phase 1 — Foundation:** Node.js, Neo4j, Redis installed, connected, and verified
- [x] **Phase 2 — Intelligence Layer:** Python microservice for entity extraction and graph population
- [ ] **Phase 3 — Query Engine:** Natural language → graph query → LLM answer pipeline
- [ ] **Phase 4 — Dashboard:** React frontend with graph visualisation and query interface
- [ ] **Phase 5 — Polish and Launch:** Demo data, demo video, public launch

---

## Running Locally

### Prerequisites
- Node.js v18+
- Neo4j (running on `localhost:7687`)
- Redis (running on `localhost:6379`)
- Python 3.9+
- Llama 3.2 running locally

### Start the services
```bash
brew services start neo4j
brew services start redis
```

### Install dependencies
```bash
npm install
```

### Start the server
```bash
node src/index.js
```

### Verify everything is connected
```
GET http://localhost:3000/health
```

Expected response:
```json
{
  "redis": "✅ connected",
  "neo4j": "✅ connected"
}
```

---

## Tech Stack

`Node.js` `Express` `Neo4j` `GraphRAG` `Redis` `Python` `spaCy` `Llama 3.2` `React` `D3.js`

---

## Background

Built as a summer project between finishing a BSc in Artificial Intelligence and Computer Science at the University of Birmingham and starting an MSc at the University of Edinburgh.

Inspired by the problem of institutional memory loss in organisations — and directly aligned with the emerging field of enterprise knowledge graph systems.