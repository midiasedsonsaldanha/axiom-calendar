import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Eye, Heart, MessageCircle, Bookmark, Share2, Film, Image as ImageIcon, Play, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface IGData {
  account: {
    username: string;
    name?: string;
    profile_picture_url?: string;
    biography?: string;
    followers_count?: number;
    follows_count?: number;
    media_count?: number;
  };
  accountInsights: { name: string; title?: string; total_value?: { value: number } }[];
  media: any[];
  fetchedAt: string;
}

const fmt = (n?: number) =>
  n == null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")}k` : String(n);

export function InsightsView() {
  const [data, setData] = useState<IGData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("instagram-insights");
      if (err) throw err;
      if (res?.error) throw new Error(res.error);
      setData(res);
    } catch (e: any) {
      setError(e.message ?? "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reachMetric = data?.accountInsights.find((m) => m.name === "reach");
  const profileViews = data?.accountInsights.find((m) => m.name === "profile_views");
  const engaged = data?.accountInsights.find((m) => m.name === "accounts_engaged");
  const interactions = data?.accountInsights.find((m) => m.name === "total_interactions");

  const stories = data?.media.filter((m) => m.media_product_type === "STORY") ?? [];
  const reels = data?.media.filter((m) => m.media_product_type === "REELS" || m.media_type === "VIDEO") ?? [];
  const posts = data?.media.filter((m) => !["STORY", "REELS"].includes(m.media_product_type) && m.media_type !== "VIDEO") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Insights do Instagram</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? `Atualizado em ${new Date(data.fetchedAt).toLocaleString("pt-BR")}` : "Carregando..."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-sm font-medium text-destructive">Não foi possível carregar os insights</p>
            <p className="text-xs text-muted-foreground break-all">{error}</p>
            <p className="text-xs text-muted-foreground">
              Verifique se o token é de uma conta <strong>Business/Creator</strong> e está válido.
            </p>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Account header */}
          <div className="p-5 rounded-xl border border-border bg-surface flex items-center gap-4">
            {data.account.profile_picture_url && (
              <img
                src={data.account.profile_picture_url}
                alt={data.account.username}
                className="w-16 h-16 rounded-full object-cover border border-border"
              />
            )}
            <div className="min-w-0">
              <p className="font-semibold">@{data.account.username}</p>
              {data.account.name && <p className="text-sm text-muted-foreground">{data.account.name}</p>}
              {data.account.biography && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.account.biography}</p>
              )}
            </div>
          </div>

          {/* Account summary */}
          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Resumo da conta
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat icon={Users} label="Seguidores" value={fmt(data.account.followers_count)} />
              <Stat icon={ImageIcon} label="Publicações" value={fmt(data.account.media_count)} />
              <Stat icon={Eye} label="Alcance (30d)" value={fmt(reachMetric?.total_value?.value)} />
              <Stat icon={Users} label="Visitas perfil (30d)" value={fmt(profileViews?.total_value?.value)} />
              <Stat icon={Heart} label="Contas engajadas (30d)" value={fmt(engaged?.total_value?.value)} />
              <Stat icon={MessageCircle} label="Interações (30d)" value={fmt(interactions?.total_value?.value)} />
              <Stat icon={Film} label="Reels recentes" value={String(reels.length)} />
              <Stat icon={Play} label="Stories recentes" value={String(stories.length)} />
            </div>
          </section>

          {/* Posts */}
          {posts.length > 0 && (
            <MediaSection title="Performance por post" items={posts} />
          )}

          {/* Reels */}
          {reels.length > 0 && (
            <MediaSection title="Reels e vídeos" items={reels} isVideo />
          )}

          {/* Stories */}
          {stories.length > 0 && (
            <MediaSection title="Stories" items={stories} isStory />
          )}

          {data.media.length === 0 && !error && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma mídia encontrada na conta.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-mono uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-display font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function MediaSection({ title, items, isVideo, isStory }: { title: string; items: any[]; isVideo?: boolean; isStory?: boolean }) {
  return (
    <section>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
        {title} <span className="text-foreground/60">({items.length})</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m) => (
          <a
            key={m.id}
            href={m.permalink}
            target="_blank"
            rel="noreferrer"
            className="group rounded-xl border border-border bg-surface overflow-hidden hover:border-primary/40 transition-all"
          >
            <div className="aspect-square bg-muted relative overflow-hidden">
              {(m.thumbnail_url || m.media_url) ? (
                <img
                  src={m.thumbnail_url || m.media_url}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
              {(isVideo || m.media_type === "VIDEO") && (
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-background/80 backdrop-blur text-[10px] font-mono uppercase">
                  {m.media_product_type === "REELS" ? "Reel" : "Vídeo"}
                </span>
              )}
            </div>
            <div className="p-3 space-y-2">
              {m.caption && (
                <p className="text-xs text-muted-foreground line-clamp-2">{m.caption}</p>
              )}
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {new Date(m.timestamp).toLocaleDateString("pt-BR")}
              </p>
              <div className="flex flex-wrap gap-3 text-xs pt-1 border-t border-border">
                {isStory ? (
                  <>
                    <Metric icon={Eye} value={m.insights?.reach} />
                    <Metric icon={Play} value={m.insights?.views} />
                    <Metric icon={MessageCircle} value={m.insights?.replies} />
                  </>
                ) : (
                  <>
                    <Metric icon={Eye} value={m.insights?.reach} />
                    {m.insights?.views != null && <Metric icon={Play} value={m.insights?.views} />}
                    <Metric icon={Heart} value={m.insights?.likes ?? m.like_count} />
                    <Metric icon={MessageCircle} value={m.insights?.comments ?? m.comments_count} />
                    <Metric icon={Bookmark} value={m.insights?.saved} />
                    <Metric icon={Share2} value={m.insights?.shares} />
                  </>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function Metric({ icon: Icon, value }: { icon: any; value?: number }) {
  if (value == null) return null;
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Icon className="w-3 h-3" />
      {fmt(value)}
    </span>
  );
}
