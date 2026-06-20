# Local Agent Knowledge Base

A local-first desktop knowledge base application designed for AI agent integration. Built with **Tauri v2 + React + Python**, supports **OpenAI-compatible embedding & rerank models**, **MinerU document parsing**, and ships with an **MCP server** for Claude Code and other AI agents.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-v2-orange)](https://tauri.app/)
[![Python](https://img.shields.io/badge/Python-3.11+-green)](https://python.org)
[![MCP](https://img.shields.io/badge/MCP-stdio-purple)](https://modelcontextprotocol.io/)
[![README](https://img.shields.io/badge/README-English-blue)](README.md) [![README](https://img.shields.io/badge/README-中文-red)](README.zh-CN.md)

## Features

### 📄 Document Management
- **Multi-format support**: PDF, DOCX, PPTX, XLSX, images (PNG/JPG/WebP), HTML, Markdown (.md), plain text (.txt)
- **Drag & drop upload** with multi-file selection
- **Auto-parse + auto-index pipeline**: upload → parse → index is fully automatic
- **Markdown & plain text** files are indexed instantly without MinerU
- **Large PDF auto-split**: PDFs exceeding 200 pages or 200MB are automatically split into parts before parsing
- **MinerU integration** for high-quality document parsing:
  - 🎯 **Precise mode**: Token auth, ≤200MB, ≤200 pages, tables/formulas. Auto model selection (vlm for PDF/images, pipeline for Office docs, MinerU-HTML for HTML)
  - ⚡ **Agent mode**: No token needed, ≤10MB, ≤20 pages, native Office parsing — primary for small files
- **Markdown preview** with LaTeX math rendering (KaTeX)
- **Real-time status indicators**: pending → parsing → done/failed

### 🔍 Knowledge Management
- **Multiple knowledge bases** with independent indexes
- **KB operations**: create, rename, edit description, copy (with LanceDB data), delete
- **Display modes**: Card, Grid, or Compact list view — toggle in the toolbar
- **Sorting**: by name (asc/desc), date (asc/desc), or default (registry order)
- **Pin** frequently used KBs to the top — pinned KBs always appear first
- **KB-level embedding model binding** — ensures index consistency; warns on mismatch
- **One-click re-index** for individual documents or entire KB (with backup)
- **Per-document re-index** button for model migration
- **Intelligent chunking** strategies: Recursive (recommended), Semantic, Fixed-size
- **Hybrid search**: Dense vector + BM25 keyword (FTS)
- **Reranking** with model name display

### 🤖 AI Model Integration (OpenAI-compatible)
- **Embedding**: OpenAI, ZhipuAI/BigModel, Ollama, vLLM, LiteLLM, or any `/v1/embeddings` endpoint
- **Rerank**: Jina AI, Cohere, DashScope (Qwen3-rerank), or any compatible endpoint
- **Test Connection** buttons for both embedding and rerank
- **100% provider-agnostic** — you control the models

### 🔌 MCP Server (Model Context Protocol)
- **8 tools** for AI agents:
  - `search_knowledge_base` — Hybrid search with reranking
  - `list_knowledge_bases` — List all KBs with stats, detect orphans
  - `get_document` — Full document retrieval with optional chunk details
  - `create_knowledge_base` — Create new KB via agent
  - `delete_knowledge_base` — Delete KB and all data
  - `rename_knowledge_base` — Rename a KB and update its description
  - `add_document` — Import text content or parse local files (PDF/DOCX/PPTX/XLSX/images/HTML) via MinerU
  - `delete_document` — Remove a document and its chunks from a KB
- **stdio transport** — runs as a subprocess
- **Reads `settings.json`** for API keys (no duplicate config needed)
- **No dependency** on the desktop app — reads/writes LanceDB directly
- **Auto-syncs** with the desktop app's document registry (`metadata.json`, `knowledge_bases.json`)
- Designed for **Claude Code**, works with any MCP client

### 🎨 Desktop UI
- **Custom frameless window** with integrated title bar
- **Dark/light/system theme** toggle (☀️/🌙/🖥️)
- **English/Chinese** localization
- **Sidebar** with KB list (scrollable) + Settings fixed at bottom
- **KB workspace** with stats, document management, grid/list views, and search
- **Document preview** with LaTeX math support and clickable long descriptions
- **Search interface** with hybrid/vector/keyword modes and rerank model display
- **Settings panel** with connection testing, MCP config generator, **export/import ZIP**, and **clear all**

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Desktop App (Tauri)               │
│  ┌──────────┐   ┌──────────┐   ┌────────────────┐   │
│  │  React   │◄──│  Rust    │──►│  MinerU API    │   │
│  │  Frontend│   │  Backend │   │  (doc parsing) │   │
│  └────┬─────┘   └────┬─────┘   └────────────────┘   │
│       │              │                              │
│       │        spawns|                              │
│       ▼              ▼                              │
│  ┌─────────────────────────┐   ┌────────────────┐   │
│  │   Python Backend        │   │   MCP Server   │   │
│  │   (FastAPI)             │   │   (FastMCP)    │   │
│  │   • Chunk + Embed       │   │   • Search     │   │
│  │   • Vector Search       │   │   • KB Mgmt    │   │
│  │   • Index Mgmt          │   │   • Documents  │   │
│  └───────────┬─────────────┘   └───────┬────────┘   │
│              │                         │            │
│              └─────────┬───────────────┘            │
│                        ▼                            │
│              ┌─────────────────┐                    │
│              │    LanceDB      │                    │
│              │  (Embedded DB)  │                    │
│              └─────────────────┘                    │
└─────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | [Tauri v2](https://tauri.app/) (Rust) |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| State | Zustand |
| Backend | FastAPI + uvicorn (Python) |
| Vector DB | [LanceDB](https://lancedb.com/) (embedded) |
| MCP Server | [FastMCP](https://github.com/jlowin/fastmcp) (Python) |
| PDF Utils | [pypdf](https://pypi.org/project/pypdf/) |
| Toolchain | npm, uv, cargo |

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 8
- **Rust** ≥ 1.75 (with `cargo`)
- **Python** ≥ 3.11
- **uv** (Python package manager) — [install guide](https://docs.astral.sh/uv/getting-started/installation/)

### Installation

```bash
# Clone the repository
git clone https://github.com/1617110693/Local-Agent-Knowledge-Base.git
cd local-knowledge-base

# Install frontend dependencies
npm install

# Install Python dependencies
cd services/python-backend && uv sync && cd ../..
cd apps/mcp-server && uv sync && cd ../..

# Launch the desktop app
npm run tauri dev
```

### First Launch

1. The app auto-launches the Python backend on port 17390
2. Go to **Settings** and configure:
   - **Embedding API**: provider URL, key, and model name
   - **Rerank API** (optional): for better search results
   - **MinerU Token** (recommended): for PDF/DOC parsing
3. Create a **Knowledge Base**
4. **Upload documents** — drag & drop, multi-select supported
5. **Search** or connect **Claude Code** via the MCP server

---

## Configuration

### Settings Reference

| Setting | Description | Default |
|---------|-------------|---------|
| `data_dir` | Custom data storage path | `~/.local-knowledge-base` |
| `mineru_token` | MinerU API token for parsing | (empty) |
| `embedding_api_base` | Embedding API base URL | `https://api.openai.com/v1` |
| `embedding_api_key` | Embedding API key | (empty) |
| `embedding_model` | Embedding model name | `text-embedding-3-small` |
| `rerank_api_base` | Rerank API base URL | `https://api.jina.ai/v1` |
| `rerank_api_key` | Rerank API key | (empty) |
| `rerank_model` | Rerank model name | `jina-reranker-v2-base-multilingual` |
| `chunk_strategy` | Chunking method | `recursive` |
| `chunk_size` | Characters per chunk | `512` |
| `chunk_overlap` | Overlap between chunks | `50` |
| `theme` | UI theme | `system` |

### OpenAI-compatible Providers

Common configurations:

**OpenAI**
```
Embedding: https://api.openai.com/v1  |  text-embedding-3-small
```

**Ollama (local)**
```
Embedding: http://localhost:11434/api  |  nomic-embed-text
```

**ZhipuAI / BigModel**
```
Embedding: https://open.bigmodel.cn/api/paas/v4  |  embedding-3
```

**Jina AI (rerank)**
```
Rerank: https://api.jina.ai/v1  |  jina-reranker-v2-base-multilingual
```

**Cohere (rerank)**
```
Rerank: https://api.cohere.com/v1  |  rerank-english-v3.0
```

**DashScope (rerank)**
```
Rerank: https://dashscope.aliyuncs.com/compatible-mode/v1  |  qwen3-rerank
```

### MinerU API Setup

1. Go to [MinerU API Management](https://mineru.net/apiManage/docs)
2. Create a token
3. Paste the token in Settings → MinerU Token

**Without a token**: Falls back to Agent mode (free, rate-limited, ≤10MB, ≤20 pages).
**With a token**: Full precise parsing — tables, formulas, ≤200MB, ≤200 pages. Large PDFs auto-split.

---

## MCP Server Usage

The MCP server enables AI agents (especially **Claude Code**) to search and query your knowledge bases.

### Setup

Open the desktop app → Settings → click **"Configure Claude Code MCP"** to auto-generate the config.

Or use **"Copy MCP Config"** to copy the JSON to clipboard. The config auto-detects whether you're in dev mode or using a packaged build.

**Dev mode** (auto-detected):
```json
{
  "mcpServers": {
    "local-knowledge-base": {
      "command": "uv",
      "args": ["run", "--directory", "/path/to/apps/mcp-server", "local-kb-mcp"],
      "env": { "KNOWLEDGE_BASE_DATA_DIR": "~/.local-knowledge-base" }
    }
  }
}
```

**Production** (auto-detected):
```json
{
  "mcpServers": {
    "local-knowledge-base": {
      "command": "C:\\Program Files\\Local Knowledge Base\\local-kb-mcp.exe",
      "env": { "KNOWLEDGE_BASE_DATA_DIR": "C:\\Users\\...\\.local-knowledge-base" }
    }
  }
}
```

> 💡 API keys are read from `settings.json` — no need to duplicate them in MCP config.

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_knowledge_base` | Hybrid search (vector + BM25) with optional reranking |
| `list_knowledge_bases` | List all KBs, detect orphaned data |
| `get_document` | Full document text with optional chunk details |
| `create_knowledge_base` | Create a new knowledge base |
| `delete_knowledge_base` | Delete a KB and all its data |
| `rename_knowledge_base` | Rename a KB and optionally update its description |
| `add_document` | Import text or parse files (PDF/DOCX/PPTX/XLSX/images/HTML) via MinerU |
| `delete_document` | Delete a document and all its chunks |

---

## Development

### Project Structure

```
local-knowledge-base/
├── apps/
│   ├── desktop/                    # Tauri v2 + React app
│   │   ├── src-tauri/              # Rust backend
│   │   │   └── src/
│   │   │       ├── commands/       # IPC handlers
│   │   │       ├── mineru/         # MinerU API client
│   │   │       ├── storage/        # File management
│   │   │       └── models/         # Data models
│   │   └── src/                    # React frontend
│   └── mcp-server/                 # Python MCP server
├── services/
│   └── python-backend/             # Python FastAPI service
└── scripts/                        # Build & release scripts
```

### Commands

```bash
# Desktop app (full Tauri)
npm run tauri dev

# Python backend only
cd services/python-backend && uv run knowledge-backend

# MCP server only
cd apps/mcp-server && uv run local-kb-mcp

# TypeScript check
npx tsc --noEmit --project apps/desktop/tsconfig.json
```

### Building for Release

```powershell
.\scripts\release.ps1 1.0.0
```

This builds standalone executables (PyInstaller) for both the Python backend and MCP server, then packages everything into a single Tauri installer.

---

## Data Storage

All data is stored locally under `~/.local-knowledge-base/` by default (configurable in Settings).

```
~/.local-knowledge-base/
├── settings.json              # App configuration
├── knowledge_bases.json       # KB metadata registry
├── kb_{uuid}/                 # Knowledge base
│   └── docs/
│       └── {doc-id}/           # Document (metadata.json + full.md)
└── lancedb_data/              # Vector indexes
```

---

## FAQ

### Can I use local models (Ollama)?

Yes. Set embedding API to `http://localhost:11434/api` with model `nomic-embed-text`.

### What if I change embedding models?

Use the **Re-index All** button — it creates a backup of the LanceDB table before re-indexing with the new model.

### Do I need a MinerU token?

No. Agent mode works without a token (≤10MB, ≤20 pages). For larger files, get a free token.

### Can the MCP server run without the desktop app?

Yes. The MCP server accesses LanceDB directly. Just set `KNOWLEDGE_BASE_DATA_DIR`. It can also import documents via `add_document` with `file_path` — all MinerU formats are supported (PDF, DOCX, PPTX, XLSX, images, HTML).

---

## License

MIT © 2026 Local Knowledge Base Contributors

## Acknowledgments

- [MinerU](https://mineru.net/) — Document parsing API
- [Tauri](https://tauri.app/) — Desktop app framework
- [LanceDB](https://lancedb.com/) — Embedded vector database
- [FastMCP](https://github.com/jlowin/fastmcp) — MCP server framework
- [FastAPI](https://fastapi.tiangolo.com/) — Python web framework
