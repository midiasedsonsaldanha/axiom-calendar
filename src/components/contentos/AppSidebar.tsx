import { LayoutDashboard, CalendarDays, Sparkles, LogOut, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AppView = "dashboard" | "calendar" | "insights";

interface AppSidebarProps {
  view: AppView;
  onChange: (v: AppView) => void;
}

const items: { id: AppView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Visão geral", icon: LayoutDashboard },
  { id: "calendar", label: "Calendário", icon: CalendarDays },
  { id: "insights", label: "Insights", icon: BarChart3 },
];

export function AppSidebar({ view, onChange }: AppSidebarProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast("Sessão encerrada");
  };

  const initial = (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r border-border bg-sidebar/60 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
        <div className="relative w-9 h-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow-soft">
          <Sparkles className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          <span className="absolute -inset-px rounded-xl border border-primary/40 animate-pulse-glow pointer-events-none" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-[15px] font-semibold tracking-tight">
            Content<span className="text-primary">OS</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            v1.0 · editorial
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 mb-2">
          Workspace
        </p>
        {items.map((it) => {
          const active = view === it.id;
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative",
                active
                  ? "bg-primary/10 text-foreground border border-primary/30 shadow-glow-soft"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-colors",
                  active ? "text-primary" : "group-hover:text-primary",
                )}
              />
              {it.label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 m-3 rounded-xl border border-border bg-gradient-orange-soft">
        <div className="flex items-center gap-2 mb-1">
          <span className="status-dot bg-primary animate-pulse-glow" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            Pro tip
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Use os <span className="text-foreground font-medium">templates por dia</span> para acelerar seu fluxo editorial.
        </p>
      </div>

      {/* User card */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface transition-colors">
          <div className="w-9 h-9 rounded-lg bg-gradient-primary grid place-items-center text-primary-foreground font-semibold text-sm shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.email ?? "—"}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Conectado
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
