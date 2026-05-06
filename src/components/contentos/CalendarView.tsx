import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Copy, Flame, CalendarIcon, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildMonthGrid,
  isSameDay,
  MONTHS_PT,
  toIso,
  WEEKDAYS_SHORT,
  startOfWeekSunday,
  fromIso,
} from "@/lib/date";
import type { ContentItem } from "@/types/content";
import { STATUS_META, TIME_SLOTS } from "@/types/content";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";

interface CalendarViewProps {
  items: ContentItem[];
  onPickDay: (iso: string) => void;
  onCopyMonth: (fromIso: string, toIso: string) => number;
  onMoveItem?: (id: string, newIso: string) => void;
  readOnly?: boolean;
}

export function CalendarView({ items, onPickDay, onCopyMonth, onMoveItem, readOnly = false }: CalendarViewProps) {
  const today = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [dragOverIso, setDragOverIso] = useState<string | null>(null);
  const [rescheduleItem, setRescheduleItem] = useState<ContentItem | null>(null);
  const navTimerRef = useRef<number | null>(null);

  const armNavOnDrag = (dir: "prev" | "next") => {
    if (navTimerRef.current) return;
    navTimerRef.current = window.setTimeout(() => {
      setCursor((c) => new Date(c.getFullYear(), c.getMonth() + (dir === "next" ? 1 : -1), 1));
      navTimerRef.current = null;
    }, 600);
  };
  const cancelNavOnDrag = () => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
  };

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const byDate = useMemo(() => {
    const m = new Map<string, ContentItem[]>();
    items.forEach((it) => {
      const arr = m.get(it.date) ?? [];
      arr.push(it);
      m.set(it.date, arr);
    });
    return m;
  }, [items]);

  const monthCount = useMemo(
    () =>
      items.filter((it) => {
        const d = new Date(it.date + "T00:00:00");
        return d.getFullYear() === year && d.getMonth() === month;
      }).length,
    [items, year, month],
  );

  const goPrev = () => setCursor(new Date(year, month - 1, 1));
  const goNext = () => setCursor(new Date(year, month + 1, 1));
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1));

  const handleCopyThisMonthToNext = () => {
    const start = new Date(year, month, 1);
    const next = new Date(year, month + 1, 1);
    const created = onCopyMonth(toIso(start), toIso(next));
    toast.success(
      created > 0
        ? `${created} conteúdo${created > 1 ? "s" : ""} duplicado${created > 1 ? "s" : ""} para o próximo mês`
        : "Nenhum conteúdo neste mês para duplicar",
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl border border-border bg-surface">
          <Button
            variant="ghost"
            size="icon"
            onClick={goPrev}
            onDragEnter={() => armNavOnDrag("prev")}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={cancelNavOnDrag}
            onDrop={cancelNavOnDrag}
            className="h-8 w-8 hover:bg-surface-elevated hover:text-primary"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button
            onClick={goToday}
            className="px-3 h-8 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            Hoje
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goNext}
            onDragEnter={() => armNavOnDrag("next")}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={cancelNavOnDrag}
            onDrop={cancelNavOnDrag}
            className="h-8 w-8 hover:bg-surface-elevated hover:text-primary"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div>
          <h2 className="font-display text-2xl font-semibold leading-none">
            {MONTHS_PT[month]}{" "}
            <span className="text-muted-foreground font-normal">{year}</span>
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
            {monthCount} conteúdo{monthCount === 1 ? "" : "s"} planejado{monthCount === 1 ? "" : "s"}
          </p>
        </div>

        {!readOnly && <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyThisMonthToNext}
            className="h-9 gap-2 border-border hover:border-primary/50 hover:text-primary"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicar mês atual
          </Button>
          <Button
            size="sm"
            onClick={() => onPickDay(toIso(today))}
            className="h-9 gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow-soft"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo conteúdo
          </Button>
        </div>}
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS_SHORT.map((w, i) => (
          <div
            key={w}
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-2 py-1",
              (i === 0 || i === 6) && "text-primary/70",
            )}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2">
        {grid.map((d) => {
          const iso = toIso(d);
          const isOther = d.getMonth() !== month;
          const isToday = isSameDay(d, today);
          const list = byDate.get(iso) ?? [];
          const hasSales = false;
          const postedCount = list.filter((it) => it.status === "posted").length;
          const TOTAL_NETWORKS = 9;
          const allNetworksMarked =
            list.length > 0 &&
            list.every((it) => (it.networks?.length ?? 0) >= TOTAL_NETWORKS);
          const isComplete = allNetworksMarked;

          // intensity bar reflects how many blocks are fully posted
          const intensity = list.length > 0 ? postedCount / list.length : 0;

          return (
            <div
              key={iso}
              onClick={() => onPickDay(iso)}
              onDragOver={(e) => {
                if (readOnly || !onMoveItem) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverIso !== iso) setDragOverIso(iso);
              }}
              onDragLeave={() => {
                if (dragOverIso === iso) setDragOverIso(null);
              }}
              onDrop={(e) => {
                if (readOnly || !onMoveItem) return;
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                setDragOverIso(null);
                if (id) onMoveItem(id, iso);
              }}
              className={cn(
                "day-card text-left cursor-pointer",
                isOther && "is-other-month",
                isToday && "is-today",
                hasSales && "is-focus-sales",
                isComplete && "is-complete",
                dragOverIso === iso && "ring-2 ring-primary/70",
              )}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "font-display text-base font-semibold",
                      isToday && "text-primary",
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {hasSales && (
                    <Flame className="w-3 h-3 text-primary" strokeWidth={2.5} />
                  )}
                </div>
                {list.length > 0 && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {list.length}
                  </span>
                )}
              </div>

              {/* intensity bar */}
              <div className="h-1 rounded-full bg-border/50 overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-primary transition-all duration-500"
                  style={{ width: `${intensity * 100}%` }}
                />
              </div>

              <div className="space-y-1">
                {list.map((it) => {
                  const meta = STATUS_META[it.status];
                  const draggable = !readOnly && !!onMoveItem;
                  return (
                    <div
                      key={it.id}
                      draggable={draggable}
                      onDragStart={(e) => {
                        if (!draggable) return;
                        e.stopPropagation();
                        e.dataTransfer.setData("text/plain", it.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPickDay(iso);
                      }}
                      title={it.title || it.type}
                      className={cn(
                        "flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[11px] truncate",
                        meta.bg,
                        draggable && "cursor-grab active:cursor-grabbing",
                      )}
                    >
                      <span className={cn("status-dot shrink-0", meta.dot)} />
                      <span className="truncate text-foreground/90">{it.title || it.type}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
