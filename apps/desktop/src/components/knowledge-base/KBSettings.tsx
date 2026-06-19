import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useKBStore } from "../../stores/useKBStore";
import { useI18n } from "../../i18n";
import { FileText, Layers, Search, FolderOpen } from "lucide-react";

export function KBSettings() {
  const { kbId } = useParams<{ kbId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { knowledgeBases, loadKBs, setActiveKB } = useKBStore();

  useEffect(() => { loadKBs(); }, []);
  const kb = knowledgeBases.find((k) => k.id === kbId);
  useEffect(() => { if (kb) setActiveKB(kb); }, [kb]);

  if (!kb) {
    return <div className="p-6 text-center text-muted-foreground">{t("overview.notFound")}</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <FolderOpen className="w-10 h-10 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">{kb.name}</h2>
          {kb.description && <p className="text-muted-foreground">{kb.description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 border rounded-lg bg-card text-center">
          <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{kb.document_count}</p>
          <p className="text-sm text-muted-foreground">{t("overview.documents")}</p>
        </div>
        <div className="p-4 border rounded-lg bg-card text-center">
          <Layers className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{kb.chunk_count}</p>
          <p className="text-sm text-muted-foreground">{t("overview.chunks")}</p>
        </div>
        <div className="p-4 border rounded-lg bg-card text-center">
          <p className="text-sm text-muted-foreground mt-1">{t("overview.created")}: {new Date(kb.created_at).toLocaleDateString()}</p>
          <p className="text-sm text-muted-foreground">{t("overview.updated")}: {new Date(kb.updated_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { to: `documents`, icon: FileText, label: t("overview.manageDocs"), desc: t("overview.manageDocsDesc") },
          { to: `search`, icon: Search, label: t("overview.search"), desc: t("overview.searchDesc") },
        ].map(({ to, icon: Icon, label, desc }) => (
          <button key={to} onClick={() => navigate(`/kb/${kbId}/${to}`)}
            className="flex items-center gap-3 p-4 border rounded-lg hover:border-primary/50 transition-colors text-left">
            <Icon className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold">{label}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
