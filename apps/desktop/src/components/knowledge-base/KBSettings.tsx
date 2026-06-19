import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useKBStore } from "../../stores/useKBStore";
import { useI18n } from "../../i18n";
import { indexDocument } from "../../services/pythonClient";
import {
  FileText, Layers, Upload, Trash2, Loader2,
  CheckCircle, XCircle, Clock, Eye, FolderOpen,
  Search, Database, AlertTriangle,
} from "lucide-react";
import type { Document } from "../../types";
import { ConfirmDialog } from "../common/ConfirmDialog";

const STATUS_MAP: Record<string, { icon: React.ReactNode; labelKey: "parse.pending" | "parse.parsing" | "parse.done" | "parse.failed" }> = {
  pending: { icon: <Clock className="w-4 h-4 text-yellow-500" />, labelKey: "parse.pending" },
  parsing: { icon: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />, labelKey: "parse.parsing" },
  done: { icon: <CheckCircle className="w-4 h-4 text-green-500" />, labelKey: "parse.done" },
  failed: { icon: <XCircle className="w-4 h-4 text-red-500" />, labelKey: "parse.failed" },
};

/** Combined KB workspace: overview stats + document management + search entry */
export function KBSettings() {
  const { kbId } = useParams<{ kbId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { knowledgeBases, documents, loadKBs, loadDocuments, uploadDocument, deleteDocument, refreshDocument, setActiveKB } = useKBStore();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadingRef = useRef(false); // sync ref to eliminate flash between setState and re-render
  const [indexing, setIndexing] = useState<Record<string, boolean>>({});
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ docId: string; docName: string } | null>(null);

  useEffect(() => { loadKBs(); }, []);
  useEffect(() => {
    if (kbId) {
      setLoadingDocs(true);
      loadDocuments(kbId).finally(() => setLoadingDocs(false));
    }
  }, [kbId]);

  const kb = knowledgeBases.find((k) => k.id === kbId);
  useEffect(() => { if (kb) setActiveKB(kb); }, [kb]);

  // Track index attempts to avoid infinite retry on empty/no-content docs
  const indexedRef = useRef<Set<string>>(new Set());

  const doAutoIndex = useCallback(async (doc: Document) => {
    if (!kbId) return;
    indexedRef.current.add(doc.id);
    setIndexing((p) => ({ ...p, [doc.id]: true }));
    try {
      const { getDocumentContent, saveDocumentChunks } = await import("../../services/tauriBridge");
      const content = await getDocumentContent(kbId, doc.id);
      const result = await indexDocument({ kb_id: kbId, doc_id: doc.id, doc_name: doc.name, markdown_content: content.markdown });
      // Persist chunk count to disk so restart doesn't re-index
      await saveDocumentChunks(kbId, doc.id, result.chunk_count);
      // Update store
      useKBStore.setState((s) => ({
        documents: s.documents.map((d) => d.id === doc.id ? { ...d, chunk_count: result.chunk_count } : d),
      }));
    } catch (e) {
      console.error("Auto-index failed:", e);
      indexedRef.current.delete(doc.id);
    }
    setIndexing((p) => ({ ...p, [doc.id]: false }));
  }, [kbId]);

  // Poll parsing + auto-index
  useEffect(() => {
    if (!kbId) return;
    const interval = setInterval(() => {
      for (const doc of documents) {
        if (doc.parse_status === "parsing") {
          refreshDocument(kbId, doc.id);
        }
      }
      // Auto-index: done + not yet indexed/attempted
      for (const doc of documents) {
        if (
          doc.parse_status === "done" &&
          doc.chunk_count === 0 &&
          !indexedRef.current.has(doc.id)
        ) {
          doAutoIndex(doc);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [documents, kbId, refreshDocument, doAutoIndex]);

  // ── Upload ──

  const doUpload = useCallback(async (filePath: string) => {
    if (!kbId) return;
    uploadingRef.current = true;
    setUploading(true);
    try {
      await uploadDocument(kbId, filePath);
    } catch (e) { console.error(e); }
    setUploading(false);
    uploadingRef.current = false;
  }, [kbId, uploadDocument]);

  const handleUploadClick = useCallback(async () => {
    if (!kbId) return;
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: t("docs.uploadFilter"), extensions: ["pdf","doc","docx","ppt","pptx","xls","xlsx","png","jpg","jpeg","webp","gif","bmp","html","md","markdown","txt"] }],
      });
      if (selected) await doUpload(selected as string);
    } catch (e) { console.error(e); }
  }, [kbId, doUpload, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // Tauri drag-drop gives us file paths via dataTransfer
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // On Windows/Tauri, we may get the path from the file object
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        // @ts-expect-error Tauri adds `path` to File objects
        const path = f.path as string | undefined;
        if (path) {
          doUpload(path);
          break; // single file for now
        }
      }
    }
  }, [doUpload]);

  // ── Actions ──

  const handleDeleteConfirm = async () => {
    if (kbId && deleteTarget) {
      await deleteDocument(kbId, deleteTarget.docId);
      setDeleteTarget(null);
    }
  };

  // ── Render ──

  if (!kb) {
    return <div className="p-6 text-center text-muted-foreground">{t("overview.notFound")}</div>;
  }

  const doneCount = documents.filter((d) => d.parse_status === "done").length;
  const totalChunks = documents.reduce((sum, d) => sum + d.chunk_count, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-4 border-b bg-card/50 shrink-0">
        <div className="flex items-center gap-4">
          <FolderOpen className="w-10 h-10 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold truncate">{kb.name}</h2>
            {kb.description && <p className="text-muted-foreground text-sm truncate">{kb.description}</p>}
          </div>
          <button
            onClick={() => navigate(`/kb/${kbId}/search`)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Search className="w-4 h-4" />{t("nav.search")}
          </button>
        </div>

        {/* Stats pills */}
        <div className="flex gap-3 mt-4">
          {[
            { icon: FileText, label: t("overview.documents"), value: kb.document_count },
            { icon: CheckCircle, label: t("parse.done"), value: doneCount },
            { icon: Layers, label: t("overview.chunks"), value: totalChunks },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 text-sm">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{label}</span>
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Document area */}
      <div className="flex-1 overflow-auto p-6">
        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={handleUploadClick}
          className={`mb-4 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">{t("parse.parsing")}...</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">{t("docs.upload")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("docs.emptyHint")}</p>
            </>
          )}
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <div className="text-center py-12">
            {uploadingRef.current || loadingDocs ? (
              <>
                <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-sm font-medium text-muted-foreground">{t("docs.uploading")}</p>
                <p className="text-xs text-muted-foreground mt-1">{loadingDocs ? t("docs.loadingHint") : t("docs.parsingHint")}</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{t("docs.emptyHint")}</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {documents.map((doc) => {
              const status = STATUS_MAP[doc.parse_status] || STATUS_MAP.pending;
              const isParseFailed = doc.parse_status === "failed";
              return (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-3 rounded-lg border bg-card transition-colors ${
                    isParseFailed ? "border-red-200 bg-red-50/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">{status.icon}{t(status.labelKey)}</span>
                        {doc.chunk_count > 0 && (
                          <>
                            <span>·</span>
                            <span>{doc.chunk_count} {t("kb.chunks")}</span>
                          </>
                        )}
                        {isParseFailed && doc.parse_error && (
                          <>
                            <span>·</span>
                            <span className="text-red-500 truncate max-w-[200px]">{doc.parse_error}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    {/* Indexing in progress */}
                    {indexing[doc.id] && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {t("docs.indexing")}
                      </span>
                    )}
                    {/* Indexed */}
                    {!indexing[doc.id] && doc.chunk_count > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        <Database className="w-3 h-3" />
                        {doc.chunk_count} {t("kb.chunks")}
                      </span>
                    )}
                    {/* Done parsing but no content (empty doc or index error) */}
                    {!indexing[doc.id] && doc.parse_status === "done" && doc.chunk_count === 0 && (
                      <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                        {t("docs.empty")}
                      </span>
                    )}
                    <button
                      onClick={() => navigate(`/kb/${kbId}/documents/${doc.id}`)}
                      className="p-1.5 hover:bg-muted rounded-md"
                      title={t("docs.preview")}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ docId: doc.id, docName: doc.name })}
                      className="p-1.5 hover:bg-red-50 rounded-md text-muted-foreground hover:text-red-500"
                      title={t("docs.delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("docs.delete")}
        message={`${t("docs.delete")}: ${deleteTarget?.docName ?? ""}`}
        confirmLabel={t("docs.delete")}
        cancelLabel={t("kb.cancel")}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
