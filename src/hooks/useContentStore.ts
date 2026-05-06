import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ContentItem, ContentStatus } from "@/types/content";
import { toast } from "sonner";

interface DbRow {
  id: string;
  user_id: string;
  date: string;
  time: string;
  slot: string;
  type: string;
  format: string;
  product: string;
  plan: string;
  title: string;
  description: string;
  script: string;
  status: ContentStatus;
  networks: string[];
  created_at: string;
  updated_at: string;
}

const fromRow = (r: DbRow): ContentItem => ({
  id: r.id,
  date: r.date,
  time: r.time,
  slot: r.slot ?? "",
  type: r.type as ContentItem["type"],
  format: r.format as ContentItem["format"],
  product: r.product,
  plan: r.plan ?? "",
  title: r.title,
  description: r.description,
  script: r.script,
  status: r.status,
  networks: r.networks ?? [],
  createdAt: new Date(r.created_at).getTime(),
});

export function useContentStore(ownerId?: string, canWrite = true) {
  const { user } = useAuth();
  const effectiveOwnerId = ownerId ?? user?.id;
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user || !effectiveOwnerId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("content_items")
      .select("*")
      .eq("user_id", effectiveOwnerId)
      .order("date", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar conteúdos");
      setLoading(false);
      return;
    }
    setItems((data as DbRow[]).map(fromRow));
    setLoading(false);
  }, [user, effectiveOwnerId]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  // realtime subscription so multi-tab stays in sync
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`content_items_changes_${effectiveOwnerId ?? "none"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "content_items" },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, effectiveOwnerId, reload]);

  const upsert = useCallback(
    async (item: ContentItem) => {
      if (!user || !effectiveOwnerId || !canWrite) return;
      const exists = items.some((x) => x.id === item.id);

      // optimistic
      setItems((prev) =>
        exists ? prev.map((x) => (x.id === item.id ? item : x)) : [...prev, item],
      );

      const payload = {
        id: item.id,
        user_id: effectiveOwnerId,
        date: item.date,
        time: item.time,
        slot: item.slot,
        type: item.type,
        format: item.format,
        product: item.product,
        plan: item.plan,
        title: item.title,
        description: item.description,
        script: item.script,
        status: item.status,
        networks: item.networks,
      };

      const { error } = await supabase
        .from("content_items")
        .upsert(payload, { onConflict: "id" });
      if (error) {
        toast.error("Falha ao salvar — recarregando");
        reload();
      }
    },
    [user, effectiveOwnerId, canWrite, items, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!canWrite) return;
      setItems((prev) => prev.filter((x) => x.id !== id));
      const { error } = await supabase.from("content_items").delete().eq("id", id);
      if (error) {
        toast.error("Falha ao remover");
        reload();
      }
    },
    [canWrite, reload],
  );

  const duplicate = useCallback(
    async (id: string) => {
      if (!canWrite) return;
      const found = items.find((x) => x.id === id);
      if (!found || !user) return;
      const copy: ContentItem = {
        ...found,
        id: crypto.randomUUID(),
        title: found.title + " (cópia)",
        status: "none",
        createdAt: Date.now(),
      };
      await upsert(copy);
    },
    [items, user, canWrite, upsert],
  );

  const copyMonth = useCallback(
    (fromIso: string, toIso: string) => {
      if (!canWrite) return 0;
      const fromDate = new Date(fromIso + "T00:00:00");
      const toDate = new Date(toIso + "T00:00:00");
      const fromYear = fromDate.getFullYear();
      const fromMonth = fromDate.getMonth();
      const toYear = toDate.getFullYear();
      const toMonth = toDate.getMonth();
      const lastDayOfTarget = new Date(toYear, toMonth + 1, 0).getDate();
      const inMonth = items.filter((it) => {
        const d = new Date(it.date + "T00:00:00");
        return d.getFullYear() === fromYear && d.getMonth() === fromMonth;
      });
      let count = 0;
      inMonth.forEach((it) => {
        const d = new Date(it.date + "T00:00:00");
        const day = Math.min(d.getDate(), lastDayOfTarget);
        const newDate = new Date(toYear, toMonth, day);
        const copy: ContentItem = {
          ...it,
          id: crypto.randomUUID(),
          date: newDate.toISOString().slice(0, 10),
          status: "none",
          createdAt: Date.now(),
        };
        upsert(copy);
        count++;
      });
      return count;
    },
    [items, canWrite, upsert],
  );

  return { items, loading, upsert, remove, duplicate, copyMonth, ownerId: effectiveOwnerId };
}
