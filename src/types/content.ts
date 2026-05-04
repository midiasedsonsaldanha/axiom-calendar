export type ContentStatus = "pending" | "production" | "scheduled" | "posted";

export type ContentType =
  | "Reels"
  | "Story"
  | "Carrossel"
  | "Live"
  | "Post"
  | "YouTube";

export type ContentFormat =
  | "Venda"
  | "Educativo"
  | "Prova social"
  | "Bastidor"
  | "Engajamento"
  | "Lançamento";

export interface ContentItem {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: ContentType;
  format: ContentFormat;
  product: string;
  title: string;
  description: string;
  script: string;
  status: ContentStatus;
  createdAt: number;
}

export const CONTENT_TYPES: ContentType[] = [
  "Reels",
  "Story",
  "Carrossel",
  "Live",
  "Post",
  "YouTube",
];

export const CONTENT_FORMATS: ContentFormat[] = [
  "Venda",
  "Educativo",
  "Prova social",
  "Bastidor",
  "Engajamento",
  "Lançamento",
];

export const STATUS_META: Record<
  ContentStatus,
  { label: string; dot: string; text: string; bg: string }
> = {
  pending: {
    label: "Pendente",
    dot: "bg-status-pending",
    text: "text-status-pending",
    bg: "bg-status-pending/10",
  },
  production: {
    label: "Em produção",
    dot: "bg-status-production",
    text: "text-status-production",
    bg: "bg-status-production/10",
  },
  scheduled: {
    label: "Agendado",
    dot: "bg-status-scheduled",
    text: "text-status-scheduled",
    bg: "bg-status-scheduled/10",
  },
  posted: {
    label: "Postado",
    dot: "bg-status-posted",
    text: "text-status-posted",
    bg: "bg-status-posted/10",
  },
};

// Templates por dia da semana (0 = dom .. 6 = sab)
export const WEEKDAY_TEMPLATES: Record<
  number,
  { label: string; type: ContentType; format: ContentFormat; suggestion: string }
> = {
  0: { label: "Bastidor / Leve", type: "Story", format: "Bastidor", suggestion: "Mostre o bastidor da semana, rotina ou reflexão." },
  1: { label: "Educativo", type: "Reels", format: "Educativo", suggestion: "Ensine algo prático sobre o seu nicho." },
  2: { label: "Produto / Oferta", type: "Reels", format: "Venda", suggestion: "Apresente o produto principal com gatilho claro." },
  3: { label: "Engajamento", type: "Carrossel", format: "Engajamento", suggestion: "Pergunta, enquete ou debate com a audiência." },
  4: { label: "Dica de valor", type: "Reels", format: "Educativo", suggestion: "Tip rápido aplicável imediatamente." },
  5: { label: "Prova social", type: "Carrossel", format: "Prova social", suggestion: "Resultados, depoimentos ou cases." },
  6: { label: "CTA / Vendas", type: "Story", format: "Venda", suggestion: "Sequência de stories levando à oferta." },
};
