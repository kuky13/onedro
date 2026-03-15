import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const xmlEscape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const toDateOnly = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

Deno.serve(async () => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabaseAdmin
      .from("stores")
      .select("slug, updated_at, created_at")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const baseUrl = (Deno.env.get("SITE_URL") || "https://onedrip.com.br").replace(/\/+$/, "");
    const rows = (data || []).filter((r: any) => typeof r.slug === "string" && r.slug.trim().length > 0);

    const urlsXml = rows
      .map((row: any) => {
        const slug = String(row.slug).trim();
        const loc = `${baseUrl}/loja/${encodeURIComponent(slug)}`;
        const lastmod = toDateOnly(row.updated_at || row.created_at);

        return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmod ? `\n    <lastmod>${xmlEscape(lastmod)}</lastmod>` : ""}\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlsXml}\n</urlset>\n`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (e) {
    return new Response("Erro interno", { status: 500 });
  }
});
