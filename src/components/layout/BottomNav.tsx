import { useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Flame,
  CheckSquare,
  UtensilsCrossed,
  Calendar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tab = {
  path: string;
  label: string;
  icon: LucideIcon;
};

const tabs: Tab[] = [
  { path: "/", label: "Inicio", icon: LayoutDashboard },
  { path: "/habits", label: "Hábitos", icon: Flame },
  { path: "/checklist", label: "Tareas", icon: CheckSquare },
  { path: "/food", label: "Comida", icon: UtensilsCrossed },
  { path: "/calendar", label: "Agenda", icon: Calendar },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-paper/80 backdrop-blur-xl border-t border-ink-15"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const active = pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-colors ${
                active
                  ? "text-signal"
                  : "text-ink-30 hover:text-ink-50"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
