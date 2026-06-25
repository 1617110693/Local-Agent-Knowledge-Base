import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useKBStore, type SortMode } from "../../stores/useKBStore";
import { useI18n } from "../../i18n";
import { Plus, Trash2, FolderOpen, BookOpen, FileText, Layers, Pin, PinOff, Grid3X3, AlignJustify, LayoutGrid, RefreshCw, Search, Database, Hash } from "lucide-react";
import { ConfirmDialog } from "../common/ConfirmDialog";
import type { KnowledgeBase } from "../../types";
import { GlobalSearchDialog } from "../search/GlobalSearchDialog";

function useSortOptions() {
  const { t } = useI18n();
  return [
    { value: "manual" as SortMode, label: t("kb.sortDefault") },
    { value: "name-asc" as SortMode, label: t("kb.sortNameAsc") },
    { value: "name-desc" as SortMode, label: t("kb.sortNameDesc") },
    { value: "date-asc" as SortMode, label: t("kb.sortDateAsc") },
    { value: "date-desc" as SortMode, label: t("kb.sortDateDesc") },
  ];
}

export function KBDashboard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { knowledgeBases, loadKBs, createKB, deleteKB, togglePinKB, viewMode, sortMode, setViewMode, setSortMode, getSortedKBs } = useKBStore();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  useEffect(() => { loadKBs(); }, []);

  const sortedKBs = useMemo(() => getSortedKBs(), [knowledgeBases, sortMode]);
  const sortOptions = useSortOptions();

  const totalDocs = knowledgeBases.reduce((s, kb) => s + kb.document_count, 0);
  const totalChunks = knowledgeBases.reduce((s, kb) => s + kb.chunk_count, 0);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createKB(name, description);
    setName(""); setDescription(""); setShowCreate(false);
  };

  const handleDelete = (kbId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(kbId);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteKB(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleRefresh = async () => { await loadKBs(); };

  const handlePin = async (kbId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePinKB(kbId);
  };

  const renderCardItem = (kb: KnowledgeBase) => (
    <div key={kb.id} onClick={() => navigate(`/kb/${kb.id}`)}
      className="group flex items-start gap-4 p-5 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md cursor-pointer transition-all duration-200">
      <div className="relative shrink-0 mt-0.5">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FolderOpen className="w-5 h-5 text-primary" />
        </div>
        {kb.pinned && <Pin className="w-3 h-3 text-amber-500 absolute -top-1 -right-1" />}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-sm truncate">{kb.name}</h3>
        {kb.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{kb.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{kb.document_count} {t("kb.docs")}</span>
          {kb.chunk_count > 0 && (
            <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{kb.chunk_count}</span>
          )}
          {kb.embedding_model && (
            <span className="bg-primary/5 text-primary/70 px-1.5 py-0.5 rounded text-[10px] font-medium">{kb.embedding_model}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => handlePin(kb.id, e)} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground" title={kb.pinned ? t("kb.unpin") : t("kb.pin")}>
          {kb.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
        <button onClick={(e) => handleDelete(kb.id, e)} className="p-1.5 hover:bg-red-50 rounded-md text-muted-foreground hover:text-red-500 transition-colors" title={t("docs.delete")}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  const renderGridItem = (kb: KnowledgeBase) => (
    <div key={kb.id} onClick={() => navigate(`/kb/${kb.id}`)}
      className="group flex flex-col items-center p-5 rounded-xl border bg-card hover:border-primary/40 hover:shadow-md cursor-pointer transition-all duration-200">
      <div className="relative mb-3">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
          <FolderOpen className="w-7 h-7 text-primary" />
        </div>
        {kb.pinned && <Pin className="w-3.5 h-3.5 text-amber-500 absolute -top-1 -right-1" />}
      </div>
      <h3 className="font-semibold text-sm text-center truncate w-full">{kb.name}</h3>
      {kb.description && (
        <p className="text-xs text-muted-foreground text-center mt-0.5 line-clamp-1 w-full">{kb.description}</p>
      )}
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-0.5"><FileText className="w-3 h-3" />{kb.document_count}</span>
        {kb.chunk_count > 0 && <span className="flex items-center gap-0.5"><Layers className="w-3 h-3" />{kb.chunk_count}</span>}
      </div>
      <div className="flex items-center gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => handlePin(kb.id, e)} className="p-1 hover:bg-muted rounded text-muted-foreground" title={kb.pinned ? t("kb.unpin") : t("kb.pin")}>
          {kb.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </button>
        <button onClick={(e) => handleDelete(kb.id, e)} className="p-1 hover:bg-red-50 rounded text-muted-foreground hover:text-red-500 transition-colors" title={t("docs.delete")}>
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  const renderCompactItem = (kb: KnowledgeBase) => (
    <div key={kb.id} onClick={() => navigate(`/kb/${kb.id}`)}
      className="flex items-center justify-between px-3 py-2 border rounded-md bg-card hover:border-primary/40 cursor-pointer transition-colors">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {kb.pinned ? <Pin className="w-3 h-3 text-amber-500 shrink-0" /> : <FolderOpen className="w-3.5 h-3.5 text-primary/70 shrink-0" />}
        <span className="font-medium text-sm truncate">{kb.name}</span>
        {kb.description && (
          <span className="text-xs text-muted-foreground truncate max-w-[12rem] hidden sm:inline">{kb.description}</span>
        )}
      </div>
      <div className="flex items-center gap-2 ml-2 shrink-0">
        <span className="text-[10px] text-muted-foreground/60">{kb.document_count} {t("kb.docs")}</span>
        <button onClick={(e) => handlePin(kb.id, e)} className="p-0.5 hover:bg-muted rounded text-muted-foreground" title={kb.pinned ? t("kb.unpin") : t("kb.pin")}>
          {kb.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </button>
        <button onClick={(e) => handleDelete(kb.id, e)} className="p-0.5 hover:bg-red-50 rounded-md text-muted-foreground hover:text-red-500 transition-colors" title={t("docs.delete")}>
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{t("kb.dashboard")}</h2>
          <p className="text-muted-foreground text-sm mt-1">{t("kb.desc")}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 shadow-sm">
          <Plus className="w-4 h-4" />{t("kb.new")}
        </button>
      </div>

      {/* Stats bar — sticky */}
      {knowledgeBases.length > 0 && (
        <div className="flex gap-3 mb-6 sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-6 px-6 py-3 -mt-3">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-card flex-1">
            <Database className="w-4 h-4 text-primary/60" />
            <div>
              <p className="text-2xl font-bold">{knowledgeBases.length}</p>
              <p className="text-xs text-muted-foreground">{t("nav.knowledgeBases")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-card flex-1">
            <FileText className="w-4 h-4 text-primary/60" />
            <div>
              <p className="text-2xl font-bold">{totalDocs}</p>
              <p className="text-xs text-muted-foreground">{t("kb.docs")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border bg-card flex-1">
            <Hash className="w-4 h-4 text-primary/60" />
            <div>
              <p className="text-2xl font-bold">{totalChunks}</p>
              <p className="text-xs text-muted-foreground">{t("kb.chunks")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 p-5 rounded-xl border bg-card shadow-sm">
          <h3 className="font-semibold mb-3">{t("kb.create")}</h3>
          <input type="text" placeholder={t("kb.name")} value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md mb-2 text-sm bg-background" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
          <input type="text" placeholder={t("kb.description")} value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border rounded-md mb-3 text-sm bg-background" />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm">{t("kb.createBtn")}</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 border rounded-md text-sm">{t("kb.cancel")}</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {knowledgeBases.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center border rounded-md overflow-hidden">
            <button onClick={() => setViewMode("card")}
              className={`p-1.5 transition-colors ${viewMode === "card" ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
              title={t("kb.viewCard")}>
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode("grid")}
              className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
              title={t("kb.viewGrid")}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode("compact")}
              className={`p-1.5 transition-colors ${viewMode === "compact" ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
              title={t("kb.viewCompact")}>
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
          </div>
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="text-xs border rounded-md px-2 py-1.5 bg-card text-muted-foreground cursor-pointer">
            {sortOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="flex-1" />
          <button onClick={handleRefresh} className="p-1.5 border rounded-md text-muted-foreground hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setGlobalSearchOpen(true)}
            className="p-1.5 border rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={t("search.searchAllTitle")}
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KB list */}
      {sortedKBs.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground text-lg font-medium">{t("kb.empty")}</p>
          <p className="text-muted-foreground text-sm mt-1">{t("kb.emptyHint")}</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
            <Plus className="w-4 h-4" />{t("kb.new")}
          </button>
        </div>
      ) : viewMode === "compact" ? (
        <div className="flex flex-col gap-0.5">
          {sortedKBs.map(kb => renderCompactItem(kb))}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedKBs.map(kb => renderGridItem(kb))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedKBs.map(kb => renderCardItem(kb))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("kb.deleteConfirm")}
        message={t("kb.deleteConfirm")}
        confirmLabel={t("docs.delete")}
        cancelLabel={t("kb.cancel")}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <GlobalSearchDialog open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
    </div>
  );
}
