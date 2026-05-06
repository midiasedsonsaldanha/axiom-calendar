import { useMemo, useRef, useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  Bold,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Flame,
  Heading,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Palette,
  Pencil,
  Plus,
  Printer,
  Quote,
  Sparkles,
  Trash2,
  Underline,
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
  readOnly?: boolean;
  onChangeIso?: (iso: string) => void;
}

const empty = (iso: string, time: string): ContentItem => ({
  id: crypto.randomUUID(),
  date: iso,
  time,
  slot: time,
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
  readOnly = false,
  onChangeIso,
}: DayPanelProps) {
  const date = iso ? fromIso(iso) : null;
  const weekday = date ? date.getDay() : 0;
  const template = WEEKDAY_TEMPLATES[weekday];

  // local drafts: keyed by item id (dynamic rows)
  const [drafts, setDrafts] = useState<Record<string, ContentItem>>({});
  // ordered list of row ids — keeps stable order even when time is edited
  const [rowOrder, setRowOrder] = useState<string[]>([]);
  // remembers the status before "auto-postado" was applied via "todas redes marcadas"
  const [prevStatus, setPrevStatus] = useState<Record<string, ContentStatus>>({});
  // images uploaded per row (data URLs, in-memory only)
  const [scriptImages, setScriptImages] = useState<Record<string, string[]>>({});
  // image lightbox preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // refs to script textareas for formatting buttons
  const scriptRefs = useState(() => new Map<string, HTMLTextAreaElement | null>())[0];
  // expanded row for full editor (script/description)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // build draft map from items for this day; if none, seed the default grid
  useEffect(() => {
    if (!iso) return;
    const map: Record<string, ContentItem> = {};
    const order: string[] = [];
    if (items.length === 0 && !readOnly) {
      // seed defaults the first time the user opens an empty day
      TIME_SLOTS.filter((s) => s !== "Extra").forEach((slot) => {
        const it = empty(iso, slot);
        map[it.id] = it;
        order.push(it.id);
      });
    } else {
      const sorted = [...items].sort((a, b) => (a.time || "~").localeCompare(b.time || "~"));
      sorted.forEach((it) => {
        map[it.id] = it;
        order.push(it.id);
      });
    }
    setDrafts(map);
    setRowOrder(order);
    setExpandedId(null);
  }, [iso, items, readOnly]);

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

  const updateDraft = (id: string, patch: Partial<ContentItem>) => {
    if (readOnly) return;
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const applyFormat = (
    id: string,
    mode: "wrap" | "line",
    a: string,
    b?: string,
  ) => {
    const ta = scriptRefs.get(id);
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const value = ta.value;
    let newText: string;
    let newStart: number;
    let newEnd: number;
    if (mode === "line") {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const before = value.slice(0, lineStart);
      const region = value.slice(lineStart, end);
      const after = value.slice(end);
      const lines = (region || "").split("\n");
      const prefixed = lines
        .map((l, i) => `${a.includes("{n}") ? a.replace("{n}", String(i + 1)) : a}${l}`)
        .join("\n");
      newText = before + prefixed + after;
      newStart = before.length;
      newEnd = before.length + prefixed.length;
    } else {
      const selected = value.slice(start, end);
      const closing = b ?? a;
      newText = value.slice(0, start) + a + selected + closing + value.slice(end);
      newStart = start + a.length;
      newEnd = newStart + selected.length;
    }
    updateDraft(id, { script: newText });
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newStart, newEnd);
    });
  };

  const isFilled = (it: ContentItem) =>
    !!(it.title || it.description || it.plan || it.script || it.networks.length > 0);

  const persist = (id: string, force = false) => {
    if (readOnly) return;
    const it = drafts[id];
    if (!it) return;
    const exists = items.some((x) => x.id === it.id);
    if (!exists && !force && !isFilled(it)) return; // skip empty new rows
    upsert(it);
  };

  const handleSaveAll = () => {
    if (readOnly) return;
    Object.keys(drafts).forEach((id) => persist(id));
    toast.success("Dia salvo", {
      description: `${WEEKDAYS_FULL[weekday]} · ${date.toLocaleDateString("pt-BR")}`,
    });
  };

  const handleRemoveRow = (id: string) => {
    if (readOnly) return;
    const it = drafts[id];
    if (!it) return;
    const exists = items.some((x) => x.id === it.id);
    if (exists) {
      remove(it.id);
      toast("Bloco removido");
    }
    setDrafts((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    setRowOrder((prev) => prev.filter((x) => x !== id));
    setExpandedId((cur) => (cur === id ? null : cur));
  };

  const handleAddRow = () => {
    if (readOnly) return;
    const used = Object.values(drafts).map((d) => d.time);
    const next =
      TIME_SLOTS.filter((s) => s !== "Extra").find((s) => !used.includes(s)) ?? "";
    const it = empty(iso, next);
    setDrafts((prev) => ({ ...prev, [it.id]: it }));
    setRowOrder((prev) => [...prev, it.id]);
    setExpandedId(it.id);
  };

  const handleDuplicate = (id: string) => {
    if (readOnly) return;
    const it = drafts[id];
    if (!it || !items.some((x) => x.id === it.id)) {
      toast.error("Salve o bloco antes de duplicar");
      return;
    }
    duplicate(it.id);
    toast.success("Bloco duplicado");
  };

  const handleApplyTemplate = () => {
    if (readOnly) return;
    if (!template) return;
    setDrafts((prev) => {
      const next = { ...prev };
      const targetId =
        rowOrder.find((id) => !isFilled(next[id])) ?? rowOrder[0];
      if (!targetId) return prev;
      next[targetId] = {
        ...next[targetId],
        type: template.type,
        format: template.format,
        title: next[targetId].title || template.label,
        description: next[targetId].description || template.suggestion,
      };
      return next;
    });
    toast.success(`Template "${template.label}" aplicado`);
  };

  const dayCount = items.length;
  const hasSales = Object.values(drafts).some((d) => d.salesFocus);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[min(1400px,60vw)] p-0 bg-background border-l border-border overflow-y-auto"
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

            {template && !readOnly && (
              <button
                onClick={handleApplyTemplate}
                className="hidden md:inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-primary/30 bg-primary/5 text-xs text-primary hover:bg-primary/10 transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Template: {template.label}
              </button>
            )}

            {!readOnly && (
              <Button
                size="sm"
                onClick={handleSaveAll}
                className="h-9 px-4 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow-soft"
              >
                Salvar dia
              </Button>
            )}
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
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
            <div className="min-w-[860px]">
          {/* Column header */}
            <div className="grid grid-cols-[88px_130px_minmax(0,1.5fr)_120px_minmax(0,1.2fr)_140px_180px_44px] gap-px rounded-t-xl overflow-hidden border border-border bg-border">
            <HeaderCell>Horário</HeaderCell>
            <HeaderCell>Tipo</HeaderCell>
            <HeaderCell>Título / Hook</HeaderCell>
            <HeaderCell>Formato</HeaderCell>
            <HeaderCell>Inspiração</HeaderCell>
            <HeaderCell>Status</HeaderCell>
            <HeaderCell>Redes</HeaderCell>
            <HeaderCell>{""}</HeaderCell>
          </div>

          <div className="rounded-b-xl overflow-hidden border border-t-0 border-border">
            {rowOrder.map((id, idx) => {
              const it = drafts[id];
              if (!it) return null;
              const meta = STATUS_META[it.status];
              const filled = isFilled(it);
              const isExpanded = expandedId === id;
              const isLast = idx === rowOrder.length - 1;

              return (
                <div key={id}>
                  <div
                    className={cn(
                      "grid grid-cols-[88px_130px_minmax(0,1.5fr)_120px_minmax(0,1.2fr)_140px_180px_44px] gap-px bg-border",
                      !isLast && "border-b border-border",
                    )}
                  >
                      {/* Time */}
                    <div
                      className={cn(
                        "p-0 flex items-center justify-center",
                        filled ? "bg-surface-elevated" : "bg-surface",
                      )}
                    >
                      <input
                        type="time"
                        value={it.time}
                        readOnly={readOnly}
                        disabled={readOnly}
                        onChange={(e) => updateDraft(id, { time: e.target.value, slot: e.target.value })}
                        className={cn(
                          "w-full h-full px-2 py-2.5 bg-transparent outline-none text-center font-mono text-xs [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-80 [&::-webkit-calendar-picker-indicator]:cursor-pointer",
                          "focus:ring-1 focus:ring-inset focus:ring-primary/40",
                          filled ? "text-foreground" : "text-muted-foreground",
                        )}
                      />
                    </div>

                    {/* Type */}
                    <div className={cn("px-1 py-1 flex items-center", filled ? "bg-surface-elevated" : "bg-surface")}>
                      <Select
                        value={it.type}
                        disabled={readOnly}
                        onValueChange={(v) => updateDraft(id, { type: v as any })}
                      >
                        <SelectTrigger className="h-9 border-0 bg-transparent shadow-none text-xs px-2 hover:bg-surface focus:ring-1 focus:ring-primary/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[...CONTENT_TYPES].sort((a, b) => a.localeCompare(b, "pt-BR")).map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Title / Hook */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : id)}
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
                        disabled={readOnly}
                        onValueChange={(v) => updateDraft(id, { format: v as any })}
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

                    {/* Inspiração (links) */}
                      <InspirationCell
                      value={it.plan}
                      filled={filled}
                        readOnly={readOnly}
                      onChange={(v) => updateDraft(id, { plan: v })}
                    />

                    {/* Status */}
                    <div className={cn("px-1 py-1 flex items-center", filled ? "bg-surface-elevated" : "bg-surface")}>
                      <Select
                        value={it.status}
                        disabled={readOnly}
                        onValueChange={(v) => {
                          updateDraft(id, { status: v as ContentStatus });
                          setPrevStatus((p) => {
                            const { [id]: _, ...rest } = p;
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
                            disabled={readOnly}
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
                                setPrevStatus((p) => ({ ...p, [id]: it.status }));
                                patch.status = "posted";
                              } else if (wasAll && !isAll) {
                                // saiu do "todas marcadas" → volta pro status anterior
                                const restore = prevStatus[id];
                                if (restore) {
                                  patch.status = restore;
                                  setPrevStatus((p) => {
                                    const { [id]: _, ...rest } = p;
                                    return rest;
                                  });
                                } else if (it.status === "posted") {
                                  patch.status = "none";
                                }
                              }
                              updateDraft(id, patch);
                            }}
                            title={net.full}
                            className={cn(
                              "px-1.5 h-5 rounded text-[9px] font-mono font-semibold border transition-all",
                              active
                                ? "bg-primary text-primary-foreground border-primary shadow-glow-soft"
                                : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
                              readOnly && "cursor-default hover:border-border hover:text-muted-foreground",
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
                        "flex items-center justify-center gap-1",
                        filled ? "bg-surface-elevated" : "bg-surface",
                      )}
                    >
                      {!readOnly && (
                        <button
                          onClick={() => {
                            updateDraft(id, { salesFocus: !it.salesFocus });
                          }}
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            it.salesFocus
                              ? "text-primary bg-primary/15 hover:bg-primary/25"
                              : "text-muted-foreground/60 hover:text-primary hover:bg-primary/10",
                          )}
                          title={it.salesFocus ? "Remover FOCO EM VENDAS" : "Marcar como FOCO EM VENDAS"}
                        >
                          <Flame className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </button>
                      )}
                      {!readOnly && (
                        <button
                          onClick={() => handleRemoveRow(id)}
                          className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Limpar bloco"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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
                            readOnly={readOnly}
                            onChange={(e) => updateDraft(id, { title: e.target.value })}
                            placeholder="Headline matadora..."
                            className="bg-surface border-border focus-visible:ring-primary/40"
                          />

                          <div>
                            <FieldLabel>Tipo</FieldLabel>
                            <Select
                              value={it.type}
                              disabled={readOnly}
                              onValueChange={(v) => updateDraft(id, { type: v as any })}
                            >
                              <SelectTrigger className="mt-1.5 bg-surface border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[...CONTENT_TYPES].sort((a, b) => a.localeCompare(b, "pt-BR")).map((t) => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <FieldLabel>Descrição / Legenda</FieldLabel>
                            <Textarea
                              value={it.description}
                              readOnly={readOnly}
                              onChange={(e) => updateDraft(id, { description: e.target.value })}
                              rows={4}
                              placeholder="Resumo do que será dito..."
                              className="mt-1.5 bg-surface border-border focus-visible:ring-primary/40 resize-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <FieldLabel className="flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3 text-primary" />
                              Roteiro completo
                            </FieldLabel>
                            <div className="flex items-center gap-1">
                              {!readOnly && (
                                <label
                                  className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-surface hover:bg-surface-elevated text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                  title="Adicionar imagens"
                                >
                                  <ImagePlus className="w-3 h-3" />
                                  Imagens
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files ?? []);
                                      if (!files.length) return;
                                      Promise.all(
                                        files.map(
                                          (f) =>
                                            new Promise<string>((res) => {
                                              const r = new FileReader();
                                              r.onload = () => res(String(r.result));
                                              r.readAsDataURL(f);
                                            }),
                                        ),
                                      ).then((urls) => {
                                        setScriptImages((prev) => ({
                                          ...prev,
                                          [id]: [...(prev[id] ?? []), ...urls],
                                        }));
                                        toast.success(`${urls.length} imagem(ns) adicionada(s)`);
                                      });
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const imgs = scriptImages[id] ?? [];
                                  const w = window.open("", "_blank", "width=800,height=900");
                                  if (!w) {
                                    toast.error("Permita pop-ups para imprimir");
                                    return;
                                  }
                                  const esc = (s: string) =>
                                    s.replace(/[&<>]/g, (c) =>
                                      c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;",
                                    );
                                  const sec = parseScript(it.script);
                                  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Roteiro — ${esc(it.title || "Sem título")}</title>
<style>
  @page{size:A4;margin:14mm;}
  *{box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;line-height:1.45;margin:0;}
  h1{font-size:20px;margin:0 0 4px;}
  .meta{color:#666;font-size:11px;margin-bottom:14px;}
  .sections{display:flex;flex-direction:column;gap:10px;}
  .section{border:1.5px solid #111;border-radius:8px;padding:10px 12px;page-break-inside:avoid;}
  .section h2{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#fff;background:#111;display:inline-block;padding:3px 8px;border-radius:4px;margin:0 0 8px;}
  .section .body{font-size:12.5px;}
  .section .body :first-child{margin-top:0;}
  .section .body :last-child{margin-bottom:0;}
  .imgs{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px;}
  .imgs img{width:100%;height:auto;border-radius:6px;border:1px solid #eee;}
  @media print{body{padding:0;}}
</style>
</head><body>
<h1>${esc(it.title || "Sem título")}</h1>
<div class="meta">${esc(it.date)} · ${esc(it.time)} · ${esc(it.type)} · ${esc(it.format)}</div>

<div class="sections">
  <div class="section"><h2>Hook</h2><div class="body">${sec.hook || "<em style='color:#999'>—</em>"}</div></div>
  <div class="section"><h2>Desenvolvimento</h2><div class="body">${sec.dev || "<em style='color:#999'>—</em>"}</div></div>
  <div class="section"><h2>CTA</h2><div class="body">${sec.cta || "<em style='color:#999'>—</em>"}</div></div>
</div>
${imgs.length ? `<h2 style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#666;margin:14px 0 6px;">Imagens</h2><div class="imgs">${imgs.map((u) => `<img src="${u}"/>`).join("")}</div>` : ""}
<script>window.onload=()=>setTimeout(()=>window.print(),300);<\/script>
</body></html>`);
                                  w.document.close();
                                }}
                                className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-surface hover:bg-surface-elevated text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
                                title="Imprimir roteiro"
                              >
                                <Printer className="w-3 h-3" />
                                Imprimir
                              </button>
                            </div>
                          </div>
                          <RichEditor
                            value={it.script}
                            readOnly={readOnly}
                            onChange={(html) => updateDraft(id, { script: html })}
                          />
                          {(scriptImages[id]?.length ?? 0) > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {scriptImages[id].map((src, i) => (
                                <div key={i} className="relative group rounded-md overflow-hidden border border-border bg-surface">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage(src)}
                                    className="block w-full"
                                    title="Ampliar imagem"
                                  >
                                    <img src={src} alt={`Imagem ${i + 1}`} className="w-full h-20 object-cover hover:opacity-90 transition-opacity" />
                                  </button>
                                  {!readOnly && <button
                                    type="button"
                                    onClick={() =>
                                      setScriptImages((prev) => ({
                                        ...prev,
                                        [id]: prev[id].filter((_, idx) => idx !== i),
                                      }))
                                    }
                                    className="absolute top-1 right-1 p-1 rounded-md bg-background/80 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remover"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {!readOnly && (
                        <div className="mt-4 flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(id)}
                            className="gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <Copy className="w-3.5 h-3.5" /> Duplicar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              persist(id, true);
                              setExpandedId(null);
                              toast.success("Bloco salvo");
                            }}
                            className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                          >
                            Confirmar bloco
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
            </div>
          </div>

          {!readOnly && (
            <button
              onClick={handleAddRow}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-xs font-mono uppercase tracking-[0.18em] text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar conteúdo
            </button>
          )}

          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 text-center">
            {readOnly ? "Clique em uma linha para visualizar o conteúdo" : "Clique em uma linha para abrir o editor completo · \"Salvar dia\" persiste todos os blocos"}
          </p>
        </div>
      </SheetContent>

      <Dialog open={!!previewImage} onOpenChange={(o) => !o && setPreviewImage(null)}>
        <DialogContent className="max-w-5xl p-2 bg-background border-border">
          {previewImage && (
            <img
              src={previewImage}
              alt="Pré-visualização"
              className="w-full h-auto max-h-[85vh] object-contain rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
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

function InspirationCell({
  value,
  filled,
  readOnly = false,
  onChange,
}: {
  value: string;
  filled: boolean;
  readOnly?: boolean;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const urls = (value || "").match(/https?:\/\/\S+/gi) ?? [];
  const hasLinks = urls.length > 0;

  if (!editing && hasLinks) {
    const primary = urls[0];
    let host = primary;
    try {
      host = new URL(primary).hostname.replace(/^www\./, "");
    } catch {
      /* noop */
    }
    const extra = urls.length - 1;
    return (
      <div
        className={cn(
          "px-2 py-1.5 flex items-center gap-1.5 min-w-0",
          filled ? "bg-surface-elevated" : "bg-surface",
        )}
      >
        <a
          href={primary}
          target="_blank"
          rel="noopener noreferrer"
          title={primary}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/25 text-primary text-[10px] font-medium min-w-0 max-w-[160px] transition-colors"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="truncate">{host}</span>
        </a>
        {extra > 0 && !readOnly && (
          <button
            onClick={() => setEditing(true)}
            title={urls.slice(1).join("\n")}
            className="inline-flex items-center justify-center h-6 px-1.5 rounded-md bg-surface border border-border text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0"
          >
            +{extra}
          </button>
        )}
        {!readOnly && (
          <button
            onClick={() => setEditing(true)}
            className="ml-auto text-muted-foreground hover:text-foreground p-1 rounded hover:bg-surface shrink-0"
            title="Editar"
            aria-label="Editar links"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", filled ? "bg-surface-elevated" : "bg-surface")}>
      <input
        autoFocus={editing}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        placeholder="Cole links de inspiração..."
        className={cn(
          "flex-1 px-3 py-2 text-xs bg-transparent outline-none focus:bg-surface focus:ring-1 focus:ring-inset focus:ring-primary/40",
          "placeholder:text-muted-foreground/50 placeholder:italic",
        )}
      />
    </div>
  );
}

export type ScriptSections = { hook: string; dev: string; cta: string };

export function parseScript(value: string): ScriptSections {
  if (!value) return { hook: "", dev: "", cta: "" };
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && "hook" in parsed) {
      return {
        hook: parsed.hook || "",
        dev: parsed.dev || "",
        cta: parsed.cta || "",
      };
    }
  } catch {
    /* legacy plain html */
  }
  return { hook: "", dev: value, cta: "" };
}

export function stringifyScript(s: ScriptSections): string {
  return JSON.stringify(s);
}

function RichEditor({
  value,
  readOnly = false,
  onChange,
}: {
  value: string;
  readOnly?: boolean;
  onChange: (html: string) => void;
}) {
  const sections = parseScript(value);
  const update = (key: keyof ScriptSections, html: string) => {
    onChange(stringifyScript({ ...sections, [key]: html }));
  };
  return (
    <div className="space-y-3">
      <SectionEditor
        label="HOOK"
        placeholder="Frase de impacto inicial..."
        value={sections.hook}
        onChange={(h) => update("hook", h)}
        readOnly={readOnly}
        minHeight={90}
      />
      <SectionEditor
        label="DESENVOLVIMENTO"
        placeholder="Conteúdo principal, argumentos, exemplos..."
        value={sections.dev}
        onChange={(h) => update("dev", h)}
        readOnly={readOnly}
        minHeight={180}
      />
      <SectionEditor
        label="CTA"
        placeholder="Chamada para ação final..."
        value={sections.cta}
        onChange={(h) => update("cta", h)}
        readOnly={readOnly}
        minHeight={90}
      />
    </div>
  );
}

function SectionEditor({
  label,
  placeholder,
  value,
  onChange,
  readOnly = false,
  minHeight,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  minHeight: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const tools: { icon: typeof Bold; title: string; cmd: string; arg?: string }[] = [
    { icon: Bold, title: "Negrito", cmd: "bold" },
    { icon: Italic, title: "Itálico", cmd: "italic" },
    { icon: Underline, title: "Sublinhado", cmd: "underline" },
    { icon: Heading, title: "Título", cmd: "formatBlock", arg: "H3" },
    { icon: Quote, title: "Citação", cmd: "formatBlock", arg: "BLOCKQUOTE" },
    { icon: List, title: "Lista", cmd: "insertUnorderedList" },
    { icon: ListOrdered, title: "Lista numerada", cmd: "insertOrderedList" },
  ];

  const COLORS = [
    { name: "Padrão", value: "inherit" },
    { name: "Vermelho", value: "#ef4444" },
    { name: "Laranja", value: "#f97316" },
    { name: "Amarelo", value: "#eab308" },
    { name: "Verde", value: "#22c55e" },
    { name: "Azul", value: "#3b82f6" },
    { name: "Roxo", value: "#a855f7" },
    { name: "Rosa", value: "#ec4899" },
    { name: "Branco", value: "#ffffff" },
  ];
  const [showColors, setShowColors] = useState(false);

  return (
    <div className="rounded-md border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-2 py-1 border-b border-border bg-surface-elevated">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
          {label}
        </span>
        {!readOnly && <div className="flex flex-wrap items-center gap-0.5">
          {tools.map(({ icon: Icon, title, cmd, arg }) => (
            <button
              key={title}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                exec(cmd, arg);
              }}
              title={title}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            >
              <Icon className="w-3 h-3" />
            </button>
          ))}
          <select
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              exec("fontSize", v);
              e.target.value = "";
            }}
            title="Tamanho da fonte"
            defaultValue=""
            className="h-6 px-1 rounded text-[10px] bg-surface text-muted-foreground hover:text-foreground border border-border focus:outline-none"
          >
            <option value="" disabled>Aa</option>
            <option value="1">Muito pequeno</option>
            <option value="2">Pequeno</option>
            <option value="3">Normal</option>
            <option value="4">Médio</option>
            <option value="5">Grande</option>
            <option value="6">Muito grande</option>
            <option value="7">Enorme</option>
          </select>
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowColors((v) => !v);
              }}
              title="Cor do texto"
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            >
              <Palette className="w-3 h-3" />
            </button>
            {showColors && (
              <div className="absolute z-30 top-full right-0 mt-1 p-2 rounded-md border border-border bg-popover shadow-lg grid grid-cols-5 gap-1.5 w-[160px]">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      exec("foreColor", c.value);
                      setShowColors(false);
                    }}
                    title={c.name}
                    className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                    style={{ background: c.value === "inherit" ? "transparent" : c.value }}
                  >
                    {c.value === "inherit" && <span className="text-[8px] text-muted-foreground">A</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>}
      </div>
      <div
        ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={(e) => !readOnly && onChange((e.target as HTMLDivElement).innerHTML)}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className={cn(
          "bg-white text-neutral-900 px-3 py-2 text-xs leading-relaxed",
          "focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary/40",
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:my-1",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-neutral-600",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_b]:font-bold [&_strong]:font-bold",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 empty:before:italic",
        )}
      />
    </div>
  );
}
