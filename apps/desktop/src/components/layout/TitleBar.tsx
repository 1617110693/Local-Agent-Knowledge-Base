import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Globe } from "lucide-react";
import { useI18n } from "../../i18n";

export function TitleBar() {
  const win = getCurrentWindow();
  const { t, lang, setLang } = useI18n();

  const toggleLang = () => setLang(lang === "en" ? "zh-CN" : "en");

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-9 bg-card border-b shrink-0 select-none"
    >
      <div className="flex items-center gap-2 pl-3">
        <span className="text-xs font-medium text-muted-foreground">
          {t("app.title")}
        </span>
      </div>

      <div className="flex h-full">
        <button
          onClick={toggleLang}
          className="w-10 h-full flex items-center justify-center hover:bg-muted transition-colors text-xs font-medium text-muted-foreground"
          title={lang === "en" ? "切换到中文" : "Switch to English"}
        >
          <Globe className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => win.minimize()}
          className="w-10 h-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Minus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={() => win.toggleMaximize()}
          className="w-10 h-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Square className="w-3 h-3 text-muted-foreground" />
        </button>
        <button
          onClick={() => win.close()}
          className="w-10 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
