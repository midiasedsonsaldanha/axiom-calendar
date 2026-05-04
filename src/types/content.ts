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
  slot: string; // bloco da grade — ex: "08:00", "Extra", "Bloco da Semana"
  type: ContentType;
  format: ContentFormat;
  product: string;
  plan: string; // plano / roteiro curto da grade
  title: string;
  description: string;
  script: string;
  status: ContentStatus;
  networks: string[]; // ["IG","FB","YT",...]
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

/** Slots fixos da grade diária (estilo planilha). */
export const TIME_SLOTS: string[] = [
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
  "Extra",
];

/** Redes sociais — ordem e siglas como na referência. */
export interface NetworkDef {
  id: string;
  label: string;
  full: string;
  hue: number; // hsl
}
export const NETWORKS: NetworkDef[] = [
  { id: "IG",  label: "IG",  full: "Instagram",      hue: 330 },
  { id: "YT",  label: "YT",  full: "YouTube",        hue: 0   },
  { id: "TK",  label: "TK",  full: "TikTok",         hue: 195 },
  { id: "FB",  label: "FB",  full: "Facebook",       hue: 220 },
  { id: "PI",  label: "PI",  full: "Pinterest",      hue: 355 },
  { id: "KW",  label: "KW",  full: "Kwai",           hue: 28  },
  { id: "TH",  label: "TH",  full: "Threads",        hue: 0   },
  { id: "C.IG",label: "C.IG",full: "Close Friends",  hue: 280 },
  { id: "C.YT",label: "C.YT",full: "Comunidade YT",  hue: 12  },
];

export const STATUS_META: Record<
  ContentStatus,
  { label: string; dot: string; text: string; bg: string; ring: string }
> = {
  pending: {
    label: "Pendente",
    dot: "bg-status-pending",
    text: "text-status-pending",
    bg: "bg-status-pending/10",
    ring: "ring-status-pending/40",
  },
  production: {
    label: "Em produção",
    dot: "bg-status-production",
    text: "text-status-production",
    bg: "bg-status-production/15",
    ring: "ring-status-production/40",
  },
  scheduled: {
    label: "Agendado",
    dot: "bg-status-scheduled",
    text: "text-status-scheduled",
    bg: "bg-status-scheduled/15",
    ring: "ring-status-scheduled/40",
  },
  posted: {
    label: "Postado",
    dot: "bg-status-posted",
    text: "text-status-posted",
    bg: "bg-status-posted/20",
    ring: "ring-status-posted/40",
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
