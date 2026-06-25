import { useState } from "react";
import { X, BookOpen, Zap, Search, Database, MessageSquare, Terminal, Settings } from "lucide-react";
import { useI18n } from "../../i18n";

interface Props { onClose: () => void; }

const SECTIONS = [
  { id: "intro", icon: BookOpen, key: "guide.introTitle" },
  { id: "quickstart", icon: Zap, key: "guide.quickstart" },
  { id: "kb", icon: Database, key: "guide.kbTitle" },
  { id: "search", icon: Search, key: "guide.searchTitle" },
  { id: "chat", icon: MessageSquare, key: "guide.chatTitle" },
  { id: "mcp", icon: Terminal, key: "guide.mcpTitle" },
  { id: "settings", icon: Settings, key: "guide.settingsTitle" },
];

export function UserGuideDialog({ onClose }: Props) {
  const { t } = useI18n();
  const g = (key: string) => t(key as any);
  const [active, setActive] = useState("intro");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card border rounded-xl shadow-xl w-[780px] max-h-[88vh] flex m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOC Sidebar */}
        <aside className="w-44 shrink-0 border-r p-4 flex flex-col bg-muted/30 rounded-l-xl">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {g("guide.title")}
          </h3>
          <nav className="flex flex-col gap-0.5 flex-1">
            {SECTIONS.map(({ id, icon: Icon, key }) => (
              <button
                key={id}
                onClick={() => { setActive(id); document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: "smooth" }); }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors ${
                  active === id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{g(key)}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between p-5 border-b shrink-0">
            <h2 className="text-lg font-bold">{g("guide.title")}</h2>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-md"><X className="w-5 h-5" /></button>
          </div>
          <div
            className="overflow-y-auto p-6 space-y-8 text-sm leading-relaxed"
            onScroll={(e) => {
              const el = e.currentTarget;
              for (let i = SECTIONS.length - 1; i >= 0; i--) {
                const sec = document.getElementById(`guide-${SECTIONS[i].id}`);
                if (sec) {
                  const rect = sec.getBoundingClientRect();
                  const containerRect = el.getBoundingClientRect();
                  if (rect.top <= containerRect.top + 60) { setActive(SECTIONS[i].id); break; }
                }
              }
            }}
          >
            <section id="guide-intro">
              <h3 className="font-bold text-base mb-2">{g("guide.introTitle")}</h3>
              <p className="text-muted-foreground">{g("guide.introText")}</p>
            </section>

            <section id="guide-quickstart">
              <h3 className="font-bold text-base mb-3">{g("guide.quickstart")}</h3>
              <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                <li>{g("guide.qs1")}</li>
                <li>{g("guide.qs2")}</li>
                <li>{g("guide.qs3")}</li>
                <li>{g("guide.qs4")}</li>
              </ol>
            </section>

            <section id="guide-kb">
              <h3 className="font-bold text-base mb-3">{g("guide.kbTitle")}</h3>
              <p className="text-muted-foreground mb-2">{g("guide.kbDesc")}</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>{g("guide.kbCreate")}</li>
                <li>{g("guide.kbUpload")}</li>
                <li>{g("guide.kbFolders")}</li>
                <li>{g("guide.kbEdit")}</li>
                <li>{g("guide.kbExport")}</li>
              </ul>
            </section>

            <section id="guide-search">
              <h3 className="font-bold text-base mb-3">{g("guide.searchTitle")}</h3>
              <p className="text-muted-foreground mb-2">{g("guide.searchDesc")}</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>{g("guide.searchModes")}</li>
                <li>{g("guide.searchGlobal")}</li>
                <li>{g("guide.searchChunk")}</li>
              </ul>
            </section>

            <section id="guide-chat">
              <h3 className="font-bold text-base mb-3">{g("guide.chatTitle")}</h3>
              <p className="text-muted-foreground mb-2">{g("guide.chatDesc")}</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>{g("guide.chatKb")}</li>
                <li>{g("guide.chatTools")}</li>
                <li>{g("guide.chatCitations")}</li>
                <li>{g("guide.chatHistory")}</li>
              </ul>
            </section>

            <section id="guide-mcp">
              <h3 className="font-bold text-base mb-3">{g("guide.mcpTitle")}</h3>
              <p className="text-muted-foreground mb-2">{g("guide.mcpDesc")}</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>{g("guide.mcpAuto")}</li>
                <li>{g("guide.mcpTools")}</li>
                <li>{g("guide.mcpTray")}</li>
              </ul>
            </section>

            <section id="guide-settings">
              <h3 className="font-bold text-base mb-3">{g("guide.settingsTitle")}</h3>
              <p className="text-muted-foreground mb-2">{g("guide.settingsDesc")}</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>{g("guide.setGeneral")}</li>
                <li>{g("guide.setModels")}</li>
                <li>{g("guide.setChat")}</li>
                <li>{g("guide.setData")}</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
