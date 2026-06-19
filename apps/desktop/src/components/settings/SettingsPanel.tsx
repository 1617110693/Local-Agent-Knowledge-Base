import { useEffect, useState } from "react";
import { useSettingsStore } from "../../stores/useSettingsStore";
import { useI18n } from "../../i18n";
import type { AppSettings } from "../../types";
import { Save, CheckCircle, Loader2 } from "lucide-react";

export function SettingsPanel() {
  const { t } = useI18n();
  const { settings, loadSettings, saveSettings, pythonRunning, startPython } = useSettingsStore();
  const [form, setForm] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => { setForm(settings); }, [settings]);

  const handleSave = async () => {
    await saveSettings(form);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const update = (field: keyof AppSettings, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("settings.title")}</h2>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? t("settings.saved") : t("settings.save")}
        </button>
      </div>

      {/* MinerU */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">{t("settings.mineru")}</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">{t("settings.mineruToken")}</label>
          <input type="password" value={form.mineru_token}
            onChange={(e) => update("mineru_token", e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
        </div>
        <p className="text-xs text-muted-foreground -mt-3 mb-4">
          {t("settings.mineruHint")}:{" "}
          <a href="https://mineru.net/apiManage/docs" target="_blank" className="text-primary underline">MinerU API</a>
        </p>
      </section>

      {/* Embedding */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">{t("settings.embedding")}</h3>
        {[{ l: t("settings.apiBase"), k: "embedding_api_base", ph: "https://api.openai.com" },
          { l: t("settings.apiKey"), k: "embedding_api_key", ph: "" },
          { l: t("settings.model"), k: "embedding_model", ph: "text-embedding-3-small" }].map(({ l, k, ph }) => (
          <div key={k} className="mb-4">
            <label className="block text-sm font-medium mb-1">{l}</label>
            <input type={k.includes("key") ? "password" : "text"} value={(form as any)[k]}
              onChange={(e) => update(k as keyof AppSettings, e.target.value)} placeholder={ph}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
          </div>
        ))}
      </section>

      {/* Rerank */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">{t("settings.rerank")}</h3>
        {[{ l: t("settings.apiBase"), k: "rerank_api_base", ph: "https://api.jina.ai" },
          { l: t("settings.apiKey"), k: "rerank_api_key", ph: "" },
          { l: t("settings.model"), k: "rerank_model", ph: "jina-reranker-v2-base-multilingual" }].map(({ l, k, ph }) => (
          <div key={k} className="mb-4">
            <label className="block text-sm font-medium mb-1">{l}</label>
            <input type={k.includes("key") ? "password" : "text"} value={(form as any)[k]}
              onChange={(e) => update(k as keyof AppSettings, e.target.value)} placeholder={ph}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
          </div>
        ))}
      </section>

      {/* Chunking */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">{t("settings.chunking")}</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">{t("settings.strategy")}</label>
          <select value={form.chunk_strategy} onChange={(e) => update("chunk_strategy", e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background">
            <option value="recursive">{t("settings.recursive")}</option>
            <option value="semantic">{t("settings.semantic")}</option>
            <option value="fixed">{t("settings.fixed")}</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">{t("settings.chunkSize")}</label>
          <input type="number" value={form.chunk_size}
            onChange={(e) => update("chunk_size", parseInt(e.target.value) || 512)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">{t("settings.chunkOverlap")}</label>
          <input type="number" value={form.chunk_overlap}
            onChange={(e) => update("chunk_overlap", parseInt(e.target.value) || 50)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
        </div>
      </section>

      {/* Python Backend */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">{t("settings.python")}</h3>
        <div className="flex items-center gap-3 mb-4">
          <span className={`w-2 h-2 rounded-full ${pythonRunning ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-sm">{pythonRunning ? t("settings.running") : t("settings.stopped")}</span>
          {!pythonRunning && (
            <button onClick={startPython} className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs">
              {t("settings.startBackend")}
            </button>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">{t("settings.port")}</label>
          <input type="number" value={form.python_port}
            onChange={(e) => update("python_port", parseInt(e.target.value) || 17390)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
        </div>
      </section>
    </div>
  );
}
