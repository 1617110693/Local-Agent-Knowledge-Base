// Executes tool calls from the LLM by dispatching to the appropriate
// backend API (Python REST or Tauri IPC).
import type { SearchResult, ToolCall } from "../types";
import { searchAll } from "./pythonClient";
import { getDocumentContent } from "./tauriBridge";

export interface ToolExecutionResult {
  tool_call_id: string;
  role: "tool";
  content: string;
}

interface KbInfo {
  id: string;
  name: string;
  document_count: number;
  chunk_count: number;
}

export interface ToolLimits {
  maxSearchResultChars: number;
  maxDocumentChars: number;
  maxChunkChars: number;
}

export async function executeToolCall(
  toolCall: ToolCall,
  kbList: KbInfo[],
  limits?: ToolLimits,
  allowedKbIds?: string[],
): Promise<{ result: ToolExecutionResult; newSources: SearchResult[] }> {
  const { name, arguments: argsJson } = toolCall.function;
  let parsedArgs: Record<string, unknown>;
  try {
    parsedArgs = JSON.parse(argsJson);
  } catch {
    parsedArgs = {};
  }

  // Helper to enforce KB access restrictions
  const checkKbAccess = (kbId: string): string | null => {
    if (allowedKbIds && allowedKbIds.length > 0 && !allowedKbIds.includes(kbId)) {
      return `Access denied: knowledge base "${kbId}" is not selected. Only these KBs are available: ${allowedKbIds.join(", ")}`;
    }
    return null;
  };

  switch (name) {
    // ── search_knowledge_base ──
    case "search_knowledge_base": {
      const query = String(parsedArgs.query || "");
      let kbIds: string[] | undefined = Array.isArray(parsedArgs.kb_ids) && parsedArgs.kb_ids.length > 0
        ? (parsedArgs.kb_ids as string[])
        : undefined;
      // If user has selected KBs, restrict search to only those
      if (allowedKbIds && allowedKbIds.length > 0) {
        kbIds = kbIds ? kbIds.filter((id) => allowedKbIds.includes(id)) : allowedKbIds;
        if (kbIds.length === 0) {
          return { result: { tool_call_id: toolCall.id, role: "tool", content: JSON.stringify({ error: "None of the requested KBs are selected. Please select KBs in the chat header." }) }, newSources: [] };
        }
      }
      const topK = Math.min(Number(parsedArgs.top_k) || 10, 50);
      const searchType = (parsedArgs.search_type as string) || "hybrid";
      const rerank = parsedArgs.rerank !== false;

      const res = await searchAll({
        kb_ids: kbIds,
        query,
        search_type: searchType as "hybrid" | "vector" | "fts",
        top_k: topK,
        rerank,
      });

      return {
        result: {
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify({
            total: res.results.length,
            results: res.results.map((r, i) => ({
              index: i + 1, // 1-based for LLM citation
              doc_id: r.doc_id,
              doc_name: r.doc_name,
              score: Math.round(r.score * 100) / 100,
              content: r.content.slice(0, limits?.maxSearchResultChars ?? 2000),
              page: r.metadata?.page,
            })),
          }),
        },
        newSources: res.results,
      };
    }

    // ── get_document ──
    case "get_document": {
      const kbId = String(parsedArgs.kb_id);
      const docId = String(parsedArgs.doc_id);
      const accessErr = checkKbAccess(kbId);
      if (accessErr) return { result: { tool_call_id: toolCall.id, role: "tool", content: JSON.stringify({ error: accessErr }) }, newSources: [] };
      const doc = await getDocumentContent(kbId, docId);

      return {
        result: {
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify({
            doc_id: doc.id,
            name: doc.name,
            markdown: doc.markdown.slice(0, limits?.maxDocumentChars ?? 30000),
          }),
        },
        newSources: [],
      };
    }

    // ── get_document_chunks ──
    case "get_document_chunks": {
      const kbId = String(parsedArgs.kb_id);
      const accessErr2 = checkKbAccess(kbId);
      if (accessErr2) return { result: { tool_call_id: toolCall.id, role: "tool", content: JSON.stringify({ error: accessErr2 }) }, newSources: [] };
      const docId = String(parsedArgs.doc_id);
      // Use FTS search with a broad query to find all chunks for this doc
      const res = await searchAll({
        kb_ids: [kbId],
        query: " ",
        search_type: "fts",
        top_k: 500,
        rerank: false,
      });
      const docChunks = res.results.filter((r) => r.doc_id === docId);

      return {
        result: {
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify({
            doc_id: docId,
            chunk_count: docChunks.length,
            chunks: docChunks.map((c, i) => ({
              index: i,
              content: c.content.slice(0, limits?.maxChunkChars ?? 800),
              page: c.metadata?.page,
            })),
          }),
        },
        newSources: [],
      };
    }

    // ── list_documents ──
    case "list_documents": {
      const kbId = String(parsedArgs.kb_id);
      const accessErr3 = checkKbAccess(kbId);
      if (accessErr3) return { result: { tool_call_id: toolCall.id, role: "tool", content: JSON.stringify({ error: accessErr3 }) }, newSources: [] };
      const { listDocuments } = await import("./tauriBridge");
      const docs = await listDocuments(kbId);

      return {
        result: {
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify({
            kb_id: kbId,
            total_documents: docs.length,
            documents: docs.map((d) => ({
              doc_id: d.id,
              name: d.name,
              file_type: d.file_type,
              file_size: d.file_size,
              chunk_count: d.chunk_count,
              parse_status: d.parse_status,
              path: d.path,
              created_at: d.created_at,
              updated_at: d.updated_at,
            })),
          }),
        },
        newSources: [],
      };
    }

    // ── list_knowledge_bases ──
    case "list_knowledge_bases": {
      const filtered = allowedKbIds && allowedKbIds.length > 0
        ? kbList.filter((kb) => allowedKbIds.includes(kb.id))
        : kbList;
      return {
        result: {
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify({
            knowledge_bases: filtered.map((kb) => ({
              id: kb.id,
              name: kb.name,
              document_count: kb.document_count,
              chunk_count: kb.chunk_count,
            })),
          }),
        },
        newSources: [],
      };
    }

    default: {
      return {
        result: {
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify({ error: `Unknown tool: ${name}` }),
        },
        newSources: [],
      };
    }
  }
}
