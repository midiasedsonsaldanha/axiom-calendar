import { useMemo } from "react";
import {
  CalendarCheck2,
  Flame,
  Layers,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  CONTENT_FORMATS,
  CONTENT_TYPES,
  STATUS_META,
  type ContentItem,
} from "@/types/content";
import { MONTHS_PT } from "@/lib/date";
import { cn } from "@/lib/utils";

interface DashboardProps {
  items: ContentItem[];
  onJumpCalendar: () => void;
}

export function Dashboard({ items, onJumpCalendar }: DashboardProps) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const monthItems = useMemo(
    () =>
      items.filter((it) => {
        const d = new Date(it.date + "T00:00:00");
        return d.getFullYear() === year && d.getMonth() === month;
      }),
    [items, year, month],
  );

  const total = monthItems.length;
  const sales = monthItems.filter((i) => i.format === "Venda").length;
  const posted = monthItems.filter((i) => i.status === "posted").length;

  const byType = useMemo(() => {
    const m: Record<string, number> = {};
    CONTENT_TYPES.forEach((t) => (m[t] = 0));
    monthItems.forEach((i) => (m[i.type] = (m[i.type] ?? 0) + 1));
    return m;
  }, [monthItems]);

  const byFormat = useMemo(() => {
    const m: Record<string, number> = {};
    CONTENT_FORMATS.forEach((t) => (m[t] = 0));
    monthItems.forEach((i) => (m[i.format] = (m[i.format] ?? 0) + 1));
    return m;
  }, [monthItems]);

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    monthItems.forEach((i) => m.set(i.date, (m.get(i.date) ?? 0) + 1));
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [monthItems]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const distinctDays = new Set(monthItems.map((i) => i.date)).size;
  const consistency = Math.round((distinctDays / daysInMonth) * 100);

  const maxType = Math.max(1, ...Object.values(byType));
  const maxFormat = Math.max(1, ...Object.values(byFormat));
  const totalForFormat = Math.max(1, monthItems.length);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero / KPIs */}
      <div className="relative rounded-2xl border border-border bg-gradient-surface overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

        <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-primary mb-2 flex items-center gap-2">
              <span className="status-dot bg-primary animate-pulse-glow" />
              Visão geral · {MONTHS_PT[month]} {year}
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight">
              Seu mês em <span className="gradient-text">controle total</span>.
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Acompanhe consistência, distribuição de formatos e dias de pico do seu calendário editorial.
            </p>
          </div>
          <button
            onClick={onJumpCalendar}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-gradient-primary text-primary-foreground font-medium shadow-glow-soft hover:opacity-90 transition-all"
          >
            Abrir calendário
            <CalendarCheck2 className="w-4 h-4" />
          </button>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 border-t border-border">
          <KpiCell icon={Layers} label="Total no mês" value={total.toString()} />
          <KpiCell icon={Flame} label="Foco em vendas" value={sales.toString()} accent />
          <KpiCell icon={Zap} label="Postados" value={posted.toString()} />
          <KpiCell
            icon={TrendingUp}
            label="Consistência"
            value={`${consistency}%`}
            sub={`${distinctDays}/${daysInMonth} dias`}
          />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Types */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-lg font-semibold">Por tipo de conteúdo</h3>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                Distribuição mensal
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {CONTENT_TYPES.map((t) => {
              const v = byType[t] ?? 0;
              const pct = (v / maxType) * 100;
              return (
                <div key={t} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">{t}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-border/40 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        v > 0 ? "bg-gradient-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]" : "bg-border",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-sm">{v}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Format donut-like */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold">Por objetivo</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5 mb-5">
            Formato dominante
          </p>
          <div className="space-y-3">
            {CONTENT_FORMATS.map((f) => {
              const v = byFormat[f] ?? 0;
              const pct = Math.round((v / totalForFormat) * 100);
              const isSale = f === "Venda";
              return (
                <div key={f}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={cn("flex items-center gap-1.5", isSale && "text-primary")}>
                      {isSale && <Flame className="w-3 h-3" />}
                      {f}
                    </span>
                    <span className="font-mono text-muted-foreground">{v} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        isSale ? "bg-gradient-primary" : "bg-foreground/60",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top days */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold">Dias mais carregados</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5 mb-4">
            Top 5 do mês
          </p>
          {byDay.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              Adicione conteúdos para ver o ranking.
            </p>
          )}
          <div className="space-y-2">
            {byDay.map(([iso, count], i) => {
              const d = new Date(iso + "T00:00:00");
              return (
                <div
                  key={iso}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-elevated border border-border hover:border-primary/40 transition-colors"
                >
                  <span className="font-display text-2xl font-semibold text-primary w-8">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {count} conteúdo{count > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: Math.min(count, 5) }).map((_, k) => (
                      <span key={k} className="w-1 h-6 rounded-full bg-gradient-primary" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold">Pipeline de status</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5 mb-4">
            Onde está cada conteúdo
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map((s) => {
              const meta = STATUS_META[s];
              const v = monthItems.filter((i) => i.status === s).length;
              const pct = total ? Math.round((v / total) * 100) : 0;
              return (
                <div
                  key={s}
                  className="p-4 rounded-xl border border-border bg-surface-elevated"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn("status-dot", meta.dot)} />
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                  <p className="font-display text-3xl font-semibold">{v}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{meta.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCell({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Layers;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="p-5 md:p-6 border-r border-border last:border-r-0 relative">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={cn(
            "w-8 h-8 rounded-lg grid place-items-center border",
            accent
              ? "bg-primary/15 border-primary/40 text-primary shadow-glow-soft"
              : "bg-surface-elevated border-border text-muted-foreground",
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={cn("font-display text-3xl md:text-4xl font-semibold", accent && "gradient-text")}>
        {value}
      </p>
      {sub && (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">
          {sub}
        </p>
      )}
    </div>
  );
}
