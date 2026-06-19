import { useI18n } from "../../i18n";
import { Download } from "lucide-react";

export function ImportExport() {
  const { t } = useI18n();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{t("kb.dashboard")}</h2>
      <div className="space-y-6">
        <div className="p-6 border rounded-lg bg-card">
          <div className="flex items-center gap-3 mb-3">
            <Download className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold">Export</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Export your LanceDB indexes by copying the lancedb_data directory.
          </p>
        </div>
      </div>
    </div>
  );
}
