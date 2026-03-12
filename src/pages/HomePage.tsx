import { Settings, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router";
import { AiChat } from "@/components/home/AiChat";
import { useAiChat } from "@/lib/ai/useAiChat";

export function HomePage() {
  const navigate = useNavigate();
  const { clearChat, initializeChat } = useAiChat();

  const todayStr = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const handleNewChat = () => {
    clearChat();
    setTimeout(() => initializeChat(), 50);
  };

  return (
    <div
      className="flex flex-col max-w-lg mx-auto overflow-hidden"
      style={{ height: "calc(100dvh - env(safe-area-inset-top, 0px))" }}
    >
      {/* ── Header ── */}
      <div className="shrink-0 flex items-start justify-between px-4 pt-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-brutalist">Michi</h1>
          <p className="text-sm text-ink-50 mt-0.5">{todayStr}</p>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleNewChat}
            className="p-2 rounded-full hover:bg-ink-08 text-ink-30"
            title="Nuevo chat"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="p-2 rounded-full hover:bg-ink-08 text-ink-50"
            title="Ajustes"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* ── Chat (includes dashboard + quick actions + messages) ── */}
      <AiChat />
    </div>
  );
}
