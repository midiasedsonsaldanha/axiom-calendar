import { useMemo, useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CONTENT_FORMATS,
  CONTENT_TYPES,
  STATUS_META,
  WEEKDAY_TEMPLATES,
  type ContentItem,
  type ContentStatus,
} from "@/types/content";
import { fromIso, WEEKDAYS_FULL } from "@/lib/date";
import { Copy, Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DayPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  iso: string | null;
  items: ContentItem[]; // items for that day
  upsert: (item: ContentItem) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
}

const MAX_PER_DAY = 10;

const empty = (iso: string): ContentItem => ({
  id: crypto.randomUUID(),
  date: iso,
  time: "18:00",
  type: "Reels",
  format: "Educativo",
  product: "",
  title: "",
  description: "",
  script: "",
  status: "pending",
  createdAt: Date.now(),
});

export function DayPanel({
  open,
  onOpenChange,
  iso,
  items,
  upsert,
  remove,
  duplicate,
}: DayPanelProps) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContentItem | null>(null);

  const date = iso ? fromIso(iso) : null;
  const weekday = date ? date.getDay() : 0;
  const template = WEEKDAY_TEMPLATES[weekday];

  const dayItems = useMemo(
    () => items.slice().sort((a, b) => a.time.localeCompare(b.time)),
    [items],
  );

  // open / select first or new
  useEffect(() => {
    if (!open || !iso) return;
    if (dayItems.length > 0) {
      const first = dayItems[0];
      setDraftId(first.id);
      setDraft(first);
    } else {
      const fresh = empty(iso);
      setDraftId(fresh.id);
      setDraft(fresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, iso]);

  if (!iso || !date || !draft) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[560px] bg-surface border-border" />
      </Sheet>
    );
  }

  const selectExisting = (it: ContentItem) => {
    setDraftId(it.id);
    setDraft(it);
  };

  const startNew = () => {
    if (dayItems.length >= MAX_PER_DAY) {
      toast.error(`Máximo de ${MAX_PER_DAY} conteúdos por dia.`);
      return;
    }
    const fresh = empty(iso);
    setDraftId(fresh.id);
    setDraft(fresh);
  };

  const applyTemplate = () => {
    if (!template || !draft) return;
    setDraft({
      ...draft,
      type: template.type,
      format: template.format,
      title: draft.title || template.label,
      description: draft.description || template.suggestion,
    });
    toast.success(`Template "${template.label}" aplicado`);
  };

  const handleSave = () => {
    if (!draft) return;
    upsert(draft);
    toast.success("Conteúdo salvo", {
      description: `${draft.type} · ${draft.time}`,
    });
  };

  const handleDelete = () => {
    if (!draft) return;
    remove(draft.id);
    toast("Conteúdo removido");
    if (dayItems.length > 1) {
      const next = dayItems.find((x) => x.id !== draft.id);
      if (next) selectExisting(next);
    } else {
      const fresh = empty(iso);
      setDraftId(fresh.id);
      setDraft(fresh);
    }
  };

  const handleDuplicate = () => {
    if (!draft) return;
    duplicate(draft.id);
    toast.success("Conteúdo duplicado");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[640px] bg-surface border-l border-border p-0 overflow-y-auto"
      >
        {/* Header */}
        <SheetHeader className="sticky top-0 z-10 px-6 py-5 border-b border-border bg-surface/95 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-1">
                {WEEKDAYS_FULL[weekday]}
              </p>
              <SheetTitle className="font-display text-2xl">
                {date.getDate().toString().padStart(2, "0")}{" "}
                <span className="text-muted-foreground font-normal">
                  {date.toLocaleDateString("pt-BR", { month: "long" })}
                </span>
              </SheetTitle>
              {template && (
                <button
                  onClick={applyTemplate}
                  className="mt-2 inline-flex items-center gap-1.5 chip text-primary border-primary/30 hover:bg-primary/10 transition-colors"
                >
                  <Wand2 className="w-3 h-3" />
                  Template: {template.label}
                </button>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </SheetHeader>

        {/* Items list */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Conteúdos do dia · {dayItems.length}/{MAX_PER_DAY}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={startNew}
              className="h-7 gap-1.5 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="w-3.5 h-3.5" /> Novo
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {dayItems.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Nenhum conteúdo ainda — preencha abaixo e salve.</p>
            )}
            {dayItems.map((it) => {
              const meta = STATUS_META[it.status];
              const active = it.id === draftId;
              return (
                <button
                  key={it.id}
                  onClick={() => selectExisting(it)}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all",
                    active
                      ? "border-primary/60 bg-primary/10 shadow-glow-soft"
                      : "border-border bg-surface-elevated hover:border-primary/30",
                  )}
                >
                  <span className={cn("status-dot", meta.dot)} />
                  <span className="font-mono">{it.time}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="truncate max-w-[140px]">{it.title || it.type}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-5 animate-fade-in">
          {/* Status pills */}
          <div>
            <Label className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground mb-2 block">
              Status
            </Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_META) as ContentStatus[]).map((s) => {
                const meta = STATUS_META[s];
                const active = draft.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setDraft({ ...draft, status: s })}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all",
                      active
                        ? "border-primary/60 bg-primary/10 shadow-glow-soft text-foreground"
                        : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className={cn("status-dot", meta.dot)} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="time" className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
                Horário
              </Label>
              <Input
                id="time"
                type="time"
                value={draft.time}
                onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                className="mt-1.5 bg-surface-elevated border-border focus-visible:ring-primary/40"
              />
            </div>
            <div>
              <Label className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
                Tipo
              </Label>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft({ ...draft, type: v as any })}
              >
                <SelectTrigger className="mt-1.5 bg-surface-elevated border-border">
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
              <Label className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
                Formato
              </Label>
              <Select
                value={draft.format}
                onValueChange={(v) => setDraft({ ...draft, format: v as any })}
              >
                <SelectTrigger className="mt-1.5 bg-surface-elevated border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_FORMATS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="product" className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
                Produto / Plano
              </Label>
              <Input
                id="product"
                value={draft.product}
                onChange={(e) => setDraft({ ...draft, product: e.target.value })}
                placeholder="Ex.: Mentoria"
                className="mt-1.5 bg-surface-elevated border-border focus-visible:ring-primary/40"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="title" className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Título
            </Label>
            <Input
              id="title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Headline matadora..."
              className="mt-1.5 bg-surface-elevated border-border focus-visible:ring-primary/40 text-base"
            />
          </div>

          <div>
            <Label htmlFor="desc" className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Descrição / Legenda
            </Label>
            <Textarea
              id="desc"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Resumo do que será dito..."
              rows={3}
              className="mt-1.5 bg-surface-elevated border-border focus-visible:ring-primary/40 resize-none"
            />
          </div>

          <div>
            <Label htmlFor="script" className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-primary" />
              Roteiro / Plano
            </Label>
            <Textarea
              id="script"
              value={draft.script}
              onChange={(e) => setDraft({ ...draft, script: e.target.value })}
              placeholder="Hook · desenvolvimento · CTA..."
              rows={8}
              className="mt-1.5 bg-surface-elevated border-border focus-visible:ring-primary/40 font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-border font-mono text-[10px]">
                {draft.type}
              </Badge>
              <Badge variant="outline" className="border-border font-mono text-[10px]">
                {draft.format}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {items.some((x) => x.id === draft.id) && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDuplicate}
                    className="gap-1.5 border-border hover:border-primary/50"
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplicar
                  </Button>
                </>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow-soft"
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
