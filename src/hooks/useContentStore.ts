import { useCallback, useEffect, useState } from "react";
import type { ContentItem } from "@/types/content";

const STORAGE_KEY = "contentos.items.v1";

function load(): ContentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ContentItem[];
  } catch {
    return [];
  }
}

function save(items: ContentItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

let listeners: Array<(items: ContentItem[]) => void> = [];
let cache: ContentItem[] | null = null;

function getAll() {
  if (cache === null) cache = load();
  return cache;
}

function setAll(next: ContentItem[]) {
  cache = next;
  save(next);
  listeners.forEach((l) => l(next));
}

export function useContentStore() {
  const [items, setItems] = useState<ContentItem[]>(() => getAll());

  useEffect(() => {
    const l = (next: ContentItem[]) => setItems(next);
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);

  const upsert = useCallback((item: ContentItem) => {
    const all = getAll();
    const idx = all.findIndex((x) => x.id === item.id);
    const next =
      idx >= 0
        ? all.map((x, i) => (i === idx ? item : x))
        : [...all, item];
    setAll(next);
  }, []);

  const remove = useCallback((id: string) => {
    setAll(getAll().filter((x) => x.id !== id));
  }, []);

  const duplicate = useCallback((id: string) => {
    const all = getAll();
    const found = all.find((x) => x.id === id);
    if (!found) return;
    const copy: ContentItem = {
      ...found,
      id: crypto.randomUUID(),
      title: found.title + " (cópia)",
      status: "pending",
      createdAt: Date.now(),
    };
    setAll([...all, copy]);
  }, []);

  const copyWeek = useCallback((fromIso: string, toIso: string) => {
    // fromIso/toIso = monday of week (YYYY-MM-DD)
    const fromDate = new Date(fromIso + "T00:00:00");
    const toDate = new Date(toIso + "T00:00:00");
    const diffDays = Math.round(
      (toDate.getTime() - fromDate.getTime()) / 86400000,
    );
    const all = getAll();
    const weekStart = fromDate.getTime();
    const weekEnd = weekStart + 7 * 86400000;
    const inWeek = all.filter((it) => {
      const d = new Date(it.date + "T00:00:00").getTime();
      return d >= weekStart && d < weekEnd;
    });
    const copies = inWeek.map((it) => {
      const newDate = new Date(it.date + "T00:00:00");
      newDate.setDate(newDate.getDate() + diffDays);
      return {
        ...it,
        id: crypto.randomUUID(),
        date: newDate.toISOString().slice(0, 10),
        status: "pending" as const,
        createdAt: Date.now(),
      };
    });
    setAll([...all, ...copies]);
    return copies.length;
  }, []);

  return { items, upsert, remove, duplicate, copyWeek };
}
