import { useMemo, useState } from "react";
import { AppSidebar, type AppView } from "@/components/contentos/AppSidebar";
import { CalendarView } from "@/components/contentos/CalendarView";
import { DayPanel } from "@/components/contentos/DayPanel";
import { Dashboard } from "@/components/contentos/Dashboard";
import { useContentStore } from "@/hooks/useContentStore";
import {
  CONTENT_TYPES,
  STATUS_META,
  STATUS_ORDER,
  type ContentStatus,
  type ContentType,
} from "@/types/content";
import { Filter, Search, LayoutDashboard, CalendarDays, Sparkles, Share2, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCalendarShares } from "@/hooks/useCalendarShares";
import { ShareDialog } from "@/components/contentos/ShareDialog";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [view, setView] = useState<AppView>("dashboard");
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);

  const { user } = useAuth();
  const { calendars } = useCalendarShares();
  const [activeOwnerId, setActiveOwnerId] = useState<string | undefined>(undefined);
  const currentOwnerId = activeOwnerId ?? user?.id;
  const activeCalendar = calendars.find((c) => c.ownerId === currentOwnerId);
  const isReadOnly = !!activeCalendar && activeCalendar.role === "viewer";

  const [filterStatus, setFilterStatus] = useState<"all" | ContentStatus>("all");
  const [filterType, setFilterType] = useState<"all" | ContentType>("all");
  const [search, setSearch] = useState("");

  const { items, upsert, remove, duplicate, copyWeek } = useContentStore(currentOwnerId);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (filterStatus !== "all" && it.status !== filterStatus) return false;
      if (filterType !== "all" && it.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = `${it.title} ${it.description} ${it.product} ${it.format}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterStatus, filterType, search]);

  const dayItems = useMemo(
    () => (pickedDay ? items.filter((it) => it.date === pickedDay) : []),
    [items, pickedDay],
  );

  const handlePickDay = (iso: string) => {
    setPickedDay(iso);
    setOpenPanel(true);
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <AppSidebar view={view} onChange={setView} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20 flex items-center px-4 md:px-8 gap-4">
          {/* Mobile brand */}
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary grid place-items-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display font-semibold">
              Content<span className="text-primary">OS</span>
            </span>
          </div>

          {/* Mobile view switch */}
          <div className="md:hidden flex items-center gap-1 p-1 rounded-lg border border-border bg-surface ml-auto">
            <button
              onClick={() => setView("dashboard")}
              className={cn(
                "p-1.5 rounded-md",
                view === "dashboard" ? "bg-primary/15 text-primary" : "text-muted-foreground",
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn(
                "p-1.5 rounded-md",
                view === "calendar" ? "bg-primary/15 text-primary" : "text-muted-foreground",
              )}
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>

          {view === "calendar" && (
            <div className="hidden md:flex items-center gap-3 flex-1">
              <div className="relative w-[280px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar título, produto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 bg-surface border-border focus-visible:ring-primary/40"
                />
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                  <SelectTrigger className="h-9 w-[140px] bg-surface border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {[...CONTENT_TYPES].sort((a, b) => a.localeCompare(b, "pt-BR")).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                  <SelectTrigger className="h-9 w-[150px] bg-surface border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Calendar selector + Share */}
          <div className="hidden md:flex items-center gap-2">
            {calendars.length > 1 && (
              <Select
                value={currentOwnerId ?? ""}
                onValueChange={(v) => setActiveOwnerId(v)}
              >
                <SelectTrigger className="h-9 w-[200px] bg-surface border-border text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((c) => (
                    <SelectItem key={c.ownerId} value={c.ownerId}>
                      {c.role === "owner" ? "Minha agenda" : c.email}
                      {c.role === "viewer" && " (leitor)"}
                      {c.role === "editor" && " (editor)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isReadOnly && (
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1 px-2">
                <Eye className="w-3 h-3" /> somente leitura
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="w-4 h-4 mr-1" /> Compartilhar
            </Button>
          </div>

          {view === "dashboard" && (
            <p className="hidden md:block ml-auto font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {items.length} conteúdo{items.length === 1 ? "" : "s"} no total
            </p>
          )}
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">
          {view === "dashboard" ? (
            <Dashboard items={items} onJumpCalendar={() => setView("calendar")} />
          ) : (
            <CalendarView
              items={filtered}
              onPickDay={handlePickDay}
              onCopyWeek={copyWeek}
            />
          )}
        </main>
      </div>

      <DayPanel
        open={openPanel}
        onOpenChange={setOpenPanel}
        iso={pickedDay}
        items={dayItems}
        upsert={upsert}
        remove={remove}
        duplicate={duplicate}
        onChangeIso={(iso) => setPickedDay(iso)}
      />

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
};

export default Index;
