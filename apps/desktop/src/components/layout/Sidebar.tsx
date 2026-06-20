import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useKBStore } from "../../stores/useKBStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useI18n } from "../../i18n";
import { BookOpen, Settings, FolderOpen, AlertCircle, X, Layers, Pin } from "lucide-react";

export function Sidebar() {
  const location = useLocation();
  const { kbId } = useParams();
  const { knowledgeBases, loadKBs, getSortedKBs, sortMode } = useKBStore();
  const { pythonRunning, pythonError } = useSettingsStore();
  const { t } = useI18n();
  const [showError, setShowError] = useState(false);

  useEffect(() => { loadKBs(); }, []);
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");
  const sortedKBs = useMemo(() => getSortedKBs(), [knowledgeBases, sortMode]);

  return (
    <>
      <aside className="w-56 bg-card border-r flex flex-col h-full shrink-0">
        {/* App title + status */}
        <div className="p-4 border-b shrink-0">
          <h1 className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            {t("app.title")}
          </h1>
          <div className="flex items-center gap-1 mt-1">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                pythonRunning ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {pythonRunning ? t("app.backendReady") : t("app.backendOffline")}
            </span>
          </div>
          {pythonError && (
            <button
              onClick={() => setShowError(true)}
              className="flex items-center gap-1 mt-1 text-xs text-amber-600 hover:text-amber-700 cursor-pointer"
            >
              <AlertCircle className="w-3 h-3" />
              {t("app.viewError")}
            </button>
          )}
        </div>

        {/* Knowledge Bases — scrollable */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {/* Dashboard link */}
          <Link
            to="/"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              isActive("/") && !kbId ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            {t("nav.knowledgeBases")}
          </Link>

          {/* KB list — indented under "知识库" */}
          {sortedKBs.length > 0 && (
            <div className="ml-4 border-l border-border/50 pl-2 space-y-0.5 mt-0.5">
              {sortedKBs.map((kb) => (
                <Link
                  key={kb.id}
                  to={`/kb/${kb.id}`}
                  title={kb.description || undefined}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    kbId === kb.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {kb.pinned ? <Pin className="w-2.5 h-2.5 text-amber-500 shrink-0" /> : <Layers className="w-3 h-3 shrink-0" />}
                  <span className="truncate">{kb.name}</span>
                  <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">{kb.document_count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Settings — fixed to bottom */}
        <div className="p-2 border-t shrink-0">
          <Link
            to="/settings"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              isActive("/settings") ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            <Settings className="w-4 h-4" />
            {t("nav.settings")}
          </Link>
        </div>
      </aside>

      {/* Error Dialog */}
      {showError && pythonError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowError(false)}>
          <div className="bg-card border rounded-xl shadow-xl max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                {t("app.backendError")}
              </h3>
              <button onClick={() => setShowError(false)} className="hover:bg-muted rounded-md p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-80 whitespace-pre-wrap break-all">{pythonError}</pre>
          </div>
        </div>
      )}
    </>
  );
}
