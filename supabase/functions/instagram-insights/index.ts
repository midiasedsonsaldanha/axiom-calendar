import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";

const GRAPH = "https://graph.instagram.com";

async function ig(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH}${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url.toString());
  const data = await r.json();
  if (!r.ok) throw new Error(`IG ${path} ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
    if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN not configured");

    // 1. Account info
    const me = await ig("/me", token, {
      fields: "id,username,account_type,media_count,followers_count,follows_count,name,profile_picture_url,biography",
    });

    // 2. Account-level insights (last 30 days)
    const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const until = Math.floor(Date.now() / 1000);

    let accountInsights: any = { data: [] };
    try {
      accountInsights = await ig(`/${me.id}/insights`, token, {
        metric: "reach,profile_views,accounts_engaged,total_interactions",
        period: "day",
        metric_type: "total_value",
        since: String(since),
        until: String(until),
      });
    } catch (e) {
      console.warn("account insights failed:", (e as Error).message);
    }

    // 3. Recent media (last 25)
    const media = await ig(`/${me.id}/media`, token, {
      fields: "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
      limit: "25",
    });

    // 4. Per-post insights
    const mediaWithInsights = await Promise.all(
      (media.data ?? []).map(async (m: any) => {
        try {
          const isVideo = m.media_type === "VIDEO" || m.media_product_type === "REELS";
          const isStory = m.media_product_type === "STORY";
          let metric: string;
          if (isStory) metric = "reach,replies,views";
          else if (isVideo) metric = "reach,views,likes,comments,saved,shares";
          else metric = "views,likes,comments,saved,shares";

          const ins = await ig(`/${m.id}/insights`, token, { metric });
          const flat: Record<string, number> = {};
          for (const item of ins.data ?? []) {
            flat[item.name] = item.values?.[0]?.value ?? 0;
          }
          return { ...m, insights: flat };
        } catch (e) {
          return { ...m, insights: {}, insightsError: (e as Error).message };
        }
      }),
    );

    return new Response(
      JSON.stringify({
        account: me,
        accountInsights: accountInsights.data ?? [],
        media: mediaWithInsights,
        fetchedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("instagram-insights error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
