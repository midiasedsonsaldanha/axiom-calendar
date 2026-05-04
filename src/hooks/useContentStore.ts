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

export function useContentStore() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("content_items")
      .select("*")
      .order("date", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar conteúdos");
      setLoading(false);
      return;
    }
    setItems((data as DbRow[]).map(fromRow));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  // realtime subscription so multi-tab stays in sync
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("content_items_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "content_items" },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, reload]);

  const upsert = useCallback(
    async (item: ContentItem) => {
      if (!user) return;
      const exists = items.some((x) => x.id === item.id);

      // optimistic
      setItems((prev) =>
        exists ? prev.map((x) => (x.id === item.id ? item : x)) : [...prev, item],
      );

      const payload = {
        id: item.id,
        user_id: user.id,
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
    [user, items, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((x) => x.id !== id));
      const { error } = await supabase.from("content_items").delete().eq("id", id);
      if (error) {
        toast.error("Falha ao remover");
        reload();
      }
    },
    [reload],
  );

  const duplicate = useCallback(
    async (id: string) => {
      const found = items.find((x) => x.id === id);
      if (!found || !user) return;
      const copy: ContentItem = {
        ...found,
        id: crypto.randomUUID(),
        title: found.title + " (cópia)",
        status: "pending",
        createdAt: Date.now(),
      };
      await upsert(copy);
    },
    [items, user, upsert],
  );

  const copyWeek = useCallback(
    (fromIso: string, toIso: string) => {
      const fromDate = new Date(fromIso + "T00:00:00");
      const toDate = new Date(toIso + "T00:00:00");
      const diffDays = Math.round(
        (toDate.getTime() - fromDate.getTime()) / 86400000,
      );
      const weekStart = fromDate.getTime();
      const weekEnd = weekStart + 7 * 86400000;
      const inWeek = items.filter((it) => {
        const d = new Date(it.date + "T00:00:00").getTime();
        return d >= weekStart && d < weekEnd;
      });
      let count = 0;
      inWeek.forEach((it) => {
        const newDate = new Date(it.date + "T00:00:00");
        newDate.setDate(newDate.getDate() + diffDays);
        const copy: ContentItem = {
          ...it,
          id: crypto.randomUUID(),
          date: newDate.toISOString().slice(0, 10),
          status: "pending",
          createdAt: Date.now(),
        };
        upsert(copy);
        count++;
      });
      return count;
    },
    [items, upsert],
  );

  return { items, loading, upsert, remove, duplicate, copyWeek };
}
