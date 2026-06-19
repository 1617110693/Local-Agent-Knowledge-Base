import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useKBStore } from "../../stores/useKBStore";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useI18n } from "../../i18n";
import {
  BookOpen,
  Search,
  Settings,
  FolderOpen,
  Upload,
} from "lucide-react";

export function Sidebar() {
  const location = useLocation();
  const { kbId } = useParams();
  const { knowledgeBases, loadKBs } = useKBStore();
  const { pythonRunning, pythonError } = useSettingsStore();
  const { t } = useI18n();

  useEffect(() => {
    loadKBs();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-56 bg-card border-r flex flex-col h-full shrink-0">
      {/* App title */}
      <div className="p-4 border-b">
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
          <p className="text-xs text-red-500 mt-1 line-clamp-2" title={pythonError}>
            {pythonError}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-auto py-2 px-2 space-y-0.5">
        <Link
          to="/"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
            isActive("/")
              ? "bg-primary/10 text-primary font-medium"
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          {t("nav.knowledgeBases")}
        </Link>

        {kbId && (
          <>
            <div className="mt-3 mb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("nav.currentKB")}
            </div>
            <Link
              to={`/kb/${kbId}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive(`/kb/${kbId}`)
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              {t("nav.overview")}
            </Link>
            <Link
              to={`/kb/${kbId}/documents`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive(`/kb/${kbId}/documents`)
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <Upload className="w-4 h-4" />
              {t("nav.documents")}
            </Link>
            <Link
              to={`/kb/${kbId}/search`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive(`/kb/${kbId}/search`)
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <Search className="w-4 h-4" />
              {t("nav.search")}
            </Link>
          </>
        )}

        <div className="mt-3 mb-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("nav.system")}
        </div>
        <Link
          to="/settings"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
            isActive("/settings")
              ? "bg-primary/10 text-primary font-medium"
              : "hover:bg-muted text-muted-foreground"
          }`}
        >
          <Settings className="w-4 h-4" />
          {t("nav.settings")}
        </Link>
      </nav>

      {/* KB list */}
      <div className="p-2 border-t">
        <p className="text-xs text-muted-foreground px-2 mb-1">
          {t("nav.knowledgeBaseCount", { count: knowledgeBases.length })}
        </p>
      </div>
    </aside>
  );
}
