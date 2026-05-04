import { useMemo, useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTENT_FORMATS,
  CONTENT_TYPES,
  NETWORKS,
  STATUS_META,
  STATUS_ORDER,
  TIME_SLOTS,
  WEEKDAY_TEMPLATES,
  type ContentItem,
  type ContentStatus,
} from "@/types/content";
import { fromIso, WEEKDAYS_FULL } from "@/lib/date";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Flame,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DayPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  iso: string | null;
  items: ContentItem[];
  upsert: (item: ContentItem) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  onChangeIso?: (iso: string) => void;
}

const empty = (iso: string, slot: string): ContentItem => ({
  id: crypto.randomUUID(),
  date: iso,
  time: slot === "Extra" ? "" : slot,
  slot,
  type: "Frase",
  format: "Reels",
  product: "",
  plan: "",
  title: "",
  description: "",
  script: "",
  status: "none",
  networks: [],
  createdAt: Date.now(),
});

function shiftIso(iso: string, days: number): string {
  const d = fromIso(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DayPanel({
  open,
  onOpenChange,
  iso,
  items,
  upsert,
  remove,
  duplicate,
  onChangeIso,
}: DayPanelProps) {
  const date = iso ? fromIso(iso) : null;
  const weekday = date ? date.getDay() : 0;
  const template = WEEKDAY_TEMPLATES[weekday];

  // local drafts: one per slot — keyed by slot
  const [drafts, setDrafts] = useState<Record<string, ContentItem>>({});
  // remembers the status before "auto-postado" was applied via "todas redes marcadas"
  const [prevStatus, setPrevStatus] = useState<Record<string, ContentStatus>>({});
  // expanded row for full editor (script/description)
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  // controla se o slot "Extra" está visível (só aparece via botão ou se já tem conteúdo)
  const [extraVisible, setExtraVisible] = useState(false);

  // build draft map from items + empty rows for unused slots
  useEffect(() => {
    if (!iso) return;
    const map: Record<string, ContentItem> = {};
    TIME_SLOTS.forEach((slot) => {
      const existing = items.find((it) => it.slot === slot);
      map[slot] = existing ?? empty(iso, slot);
    });
    setDrafts(map);
    setExpandedSlot(null);
    // mostrar "Extra" automaticamente se já houver conteúdo nele
    const extra = items.find((it) => it.slot === "Extra");
    setExtraVisible(!!(extra && (extra.title || extra.description || extra.plan || extra.networks.length > 0)));
  }, [iso, items]);

  if (!iso || !date) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[980px] bg-background border-l border-border"
        />
      </Sheet>
    );
  }

  const updateDraft = (slot: string, patch: Partial<ContentItem>) => {
    setDrafts((prev) => ({ ...prev, [slot]: { ...prev[slot], ...patch } }));
  };

  const isFilled = (it: ContentItem) =>
    !!(it.title || it.description || it.plan || it.networks.length > 0);

  const persist = (slot: string) => {
    const it = drafts[slot];
    if (!it) return;
    const exists = items.some((x) => x.id === it.id);
    if (!exists && !isFilled(it)) return; // skip empty new rows
    upsert(it);
  };

  const handleSaveAll = () => {
    Object.keys(drafts).forEach(persist);
    toast.success("Dia salvo", {
      description: `${WEEKDAYS_FULL[weekday]} · ${date.toLocaleDateString("pt-BR")}`,
    });
  };

  const handleClearSlot = (slot: string) => {
    const it = drafts[slot];
    if (!it) return;
    const exists = items.some((x) => x.id === it.id);
    if (exists) {
      remove(it.id);
      toast("Bloco removido");
    }
    setDrafts((prev) => ({ ...prev, [slot]: empty(iso, slot) }));
  };

  const handleDuplicate = (slot: string) => {
    const it = drafts[slot];
    if (!it || !items.some((x) => x.id === it.id)) {
      toast.error("Salve o bloco antes de duplicar");
      return;
    }
    duplicate(it.id);
    toast.success("Bloco duplicado");
  };

  const handleApplyTemplate = () => {
    if (!template) return;
    setDrafts((prev) => {
      const next = { ...prev };
      // apply to first empty slot or the 18:00 prime slot
      const target =
        TIME_SLOTS.find((s) => !isFilled(next[s])) ?? "18:00";
      next[target] = {
        ...next[target],
        type: template.type,
        format: template.format,
        title: next[target].title || template.label,
        description: next[target].description || template.suggestion,
      };
      return next;
    });
    toast.success(`Template "${template.label}" aplicado`);
  };

  const dayCount = items.length;
  const hasSales = false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[980px] p-0 bg-background border-l border-border overflow-y-auto"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-20 backdrop-blur-xl bg-background/90 border-b border-border">
          <div className="px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1 p-1 rounded-xl border border-border bg-surface">
              <button
                onClick={() => onChangeIso?.(shiftIso(iso, -1))}
                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-surface-elevated transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onChangeIso?.(shiftIso(iso, 1))}
                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-surface-elevated transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-0.5 flex items-center gap-2">
                {WEEKDAYS_FULL[weekday]}
                {hasSales && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Flame className="w-3 h-3" />
                    foco em vendas
                  </span>
                )}
              </p>
              <h2 className="font-display text-2xl font-semibold leading-none">
                {date.getDate().toString().padStart(2, "0")}{" "}
                <span className="text-muted-foreground font-normal">
                  {date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </span>
              </h2>
            </div>

            {template && (
              <button
                onClick={handleApplyTemplate}
                className="hidden md:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-primary/30 bg-primary/5 text-xs text-primary hover:bg-primary/10 transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Template: {template.label}
              </button>
            )}

            <Button
              size="sm"
              onClick={handleSaveAll}
              className="h-9 px-4 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow-soft"
            >
              Salvar dia
            </Button>
          </div>

          {/* Day strip mini header — like a banner */}
          <div className="px-6 pb-4">
            <div
              className={cn(
                "rounded-xl border px-4 py-3 flex items-center gap-4",
                hasSales
                  ? "border-primary/40 bg-gradient-orange-soft"
                  : "border-border bg-surface",
              )}
            >
              <div className="font-display text-lg uppercase tracking-[0.2em] text-foreground/80">
                {WEEKDAYS_FULL[weekday].split("-")[0]}
              </div>
              <div className="h-5 w-px bg-border" />
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {dayCount} bloco{dayCount === 1 ? "" : "s"} preenchido{dayCount === 1 ? "" : "s"} · {TIME_SLOTS.length} slots disponíveis
              </p>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="px-4 md:px-6 py-5">
          {/* Column header */}
          <div className="grid grid-cols-[88px_minmax(0,1.5fr)_120px_minmax(0,1.2fr)_140px_180px_44px] gap-px rounded-t-xl overflow-hidden border border-border bg-border">
            <HeaderCell>Horário</HeaderCell>
            <HeaderCell>Título / Hook</HeaderCell>
            <HeaderCell>Formato</HeaderCell>
            <HeaderCell>Plano</HeaderCell>
            <HeaderCell>Status</HeaderCell>
            <HeaderCell>Redes</HeaderCell>
            <HeaderCell>{""}</HeaderCell>
          </div>

          <div className="rounded-b-xl overflow-hidden border border-t-0 border-border">
            {TIME_SLOTS.map((slot, idx) => {
              const it = drafts[slot];
              if (!it) return null;
              const meta = STATUS_META[it.status];
              const filled = isFilled(it);
              const isExpanded = expandedSlot === slot;
              const isLast = idx === TIME_SLOTS.length - 1;

              return (
                <div key={slot}>
                  <div
                    className={cn(
                      "grid grid-cols-[88px_minmax(0,1.5fr)_120px_minmax(0,1.2fr)_140px_180px_44px] gap-px bg-border",
                      !isLast && "border-b border-border",
                    )}
                  >
                    {/* Slot label */}
                    <div
                      className={cn(
                        "px-3 py-2.5 flex items-center justify-center font-mono text-xs",
                        filled
                          ? "bg-surface-elevated text-foreground"
                          : "bg-surface text-muted-foreground",
                        slot === "Extra" && "italic",
                      )}
                    >
                      {slot}
                    </div>

                    {/* Title / Hook */}
                    <button
                      onClick={() => setExpandedSlot(isExpanded ? null : slot)}
                      className={cn(
                        "px-3 py-2 text-left text-xs transition-colors min-h-[44px] flex items-center",
                        filled ? "bg-surface-elevated" : "bg-surface",
                        "hover:bg-surface-elevated",
                      )}
                    >
                      <span
                        className={cn(
                          "truncate",
                          it.title ? "text-foreground/90" : "text-muted-foreground/60 italic",
                        )}
                      >
                        {it.title || "Título / Hook..."}
                      </span>
                    </button>

                    {/* Format */}
                    <div className={cn("px-1 py-1 flex items-center", filled ? "bg-surface-elevated" : "bg-surface")}>
                      <Select
                        value={it.format}
                        onValueChange={(v) => updateDraft(slot, { format: v as any })}
                      >
                        <SelectTrigger className="h-9 border-0 bg-transparent shadow-none text-xs px-2 hover:bg-surface focus:ring-1 focus:ring-primary/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTENT_FORMATS.map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Plan */}
                    <input
                      value={it.plan}
                      onChange={(e) => updateDraft(slot, { plan: e.target.value })}
                      placeholder="Plano/Roteiro..."
                      className={cn(
                        "px-3 py-2 text-xs bg-transparent outline-none focus:bg-surface focus:ring-1 focus:ring-inset focus:ring-primary/40",
                        filled ? "bg-surface-elevated" : "bg-surface",
                        "placeholder:text-muted-foreground/50 placeholder:italic",
                      )}
                    />

                    {/* Status */}
                    <div className={cn("px-1 py-1 flex items-center", filled ? "bg-surface-elevated" : "bg-surface")}>
                      <Select
                        value={it.status}
                        onValueChange={(v) => {
                          updateDraft(slot, { status: v as ContentStatus });
                          setPrevStatus((p) => {
                            const { [slot]: _, ...rest } = p;
                            return rest;
                          });
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-9 border-0 shadow-none text-xs px-2 gap-1.5 focus:ring-1 focus:ring-primary/40 transition-colors",
                            meta.bg,
                            meta.text,
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_ORDER.map((s) => (
                            <SelectItem key={s} value={s}>
                              <span className="flex items-center gap-2">
                                <span className={cn("status-dot", STATUS_META[s].dot)} />
                                {STATUS_META[s].label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div
                      className={cn(
                        "px-2 py-2 flex flex-wrap gap-1 items-center",
                        filled ? "bg-surface-elevated" : "bg-surface",
                      )}
                    >
                      {NETWORKS.map((net) => {
                        const active = it.networks.includes(net.id);
                        return (
                          <button
                            key={net.id}
                            type="button"
                            onClick={() => {
                              const nextNetworks = active
                                ? it.networks.filter((n) => n !== net.id)
                                : [...it.networks, net.id];
                              const total = NETWORKS.length;
                              const wasAll = it.networks.length === total;
                              const isAll = nextNetworks.length === total;
                              const patch: Partial<ContentItem> = { networks: nextNetworks };

                              if (!wasAll && isAll) {
                                // todas marcadas → vira "Postado", lembrando o status anterior
                                setPrevStatus((p) => ({ ...p, [slot]: it.status }));
                                patch.status = "posted";
                              } else if (wasAll && !isAll) {
                                // saiu do "todas marcadas" → volta pro status anterior
                                const restore = prevStatus[slot];
                                if (restore) {
                                  patch.status = restore;
                                  setPrevStatus((p) => {
                                    const { [slot]: _, ...rest } = p;
                                    return rest;
                                  });
                                } else if (it.status === "posted") {
                                  patch.status = "none";
                                }
                              }
                              updateDraft(slot, patch);
                            }}
                            title={net.full}
                            className={cn(
                              "px-1.5 h-5 rounded text-[9px] font-mono font-semibold border transition-all",
                              active
                                ? "bg-primary text-primary-foreground border-primary shadow-glow-soft"
                                : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
                            )}
                          >
                            {net.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div
                      className={cn(
                        "flex items-center justify-center",
                        filled ? "bg-surface-elevated" : "bg-surface",
                      )}
                    >
                      <button
                        onClick={() => handleClearSlot(slot)}
                        className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Limpar bloco"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded editor for this row */}
                  {isExpanded && (
                    <div className="bg-background border-b border-border px-4 md:px-6 py-5 animate-fade-in">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <FieldLabel>Título / Hook</FieldLabel>
                          <Input
                            value={it.title}
                            onChange={(e) => updateDraft(slot, { title: e.target.value })}
                            placeholder="Headline matadora..."
                            className="bg-surface border-border focus-visible:ring-primary/40"
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <FieldLabel>Tipo</FieldLabel>
                              <Select
                                value={it.type}
                                onValueChange={(v) => updateDraft(slot, { type: v as any })}
                              >
                                <SelectTrigger className="mt-1.5 bg-surface border-border">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONTENT_TYPES.map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <FieldLabel>Produto</FieldLabel>
                              <Input
                                value={it.product}
                                onChange={(e) => updateDraft(slot, { product: e.target.value })}
                                placeholder="Ex.: Mentoria"
                                className="mt-1.5 bg-surface border-border focus-visible:ring-primary/40"
                              />
                            </div>
                          </div>

                          <div>
                            <FieldLabel>Descrição / Legenda</FieldLabel>
                            <Textarea
                              value={it.description}
                              onChange={(e) => updateDraft(slot, { description: e.target.value })}
                              rows={4}
                              placeholder="Resumo do que será dito..."
                              className="mt-1.5 bg-surface border-border focus-visible:ring-primary/40 resize-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <FieldLabel className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-primary" />
                            Roteiro completo
                          </FieldLabel>
                          <Textarea
                            value={it.script}
                            onChange={(e) => updateDraft(slot, { script: e.target.value })}
                            rows={11}
                            placeholder="Hook · desenvolvimento · CTA..."
                            className="bg-surface border-border focus-visible:ring-primary/40 font-mono text-xs leading-relaxed resize-none"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(slot)}
                          className="gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        >
                          <Copy className="w-3.5 h-3.5" /> Duplicar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            persist(slot);
                            setExpandedSlot(null);
                            toast.success("Bloco salvo");
                          }}
                          className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                        >
                          Confirmar bloco
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 text-center">
            Clique em uma linha para abrir o editor completo · "Salvar dia" persiste todos os blocos
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2.5 bg-primary text-primary-foreground font-display text-[11px] font-semibold uppercase tracking-[0.15em]">
      {children}
    </div>
  );
}

function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground block",
        className,
      )}
    >
      {children}
    </label>
  );
}
