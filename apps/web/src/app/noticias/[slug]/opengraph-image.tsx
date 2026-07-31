import { ImageResponse } from "next/og";

import { getArticleBySlug } from "@/modules/news/queries";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "NETFOR — Notícias do Fortaleza EC";

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  const title = article?.title ?? "NETFOR — Todas as notícias do Leão em um só lugar";
  const category = article?.category ?? "Notícias";
  const source = article?.sourceName ?? "";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: "linear-gradient(135deg, #0A0E1A 0%, #101a33 60%, #1a0e14 100%)",
        color: "#f1f4fa",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            display: "flex",
            background: "#E11D2E",
            borderRadius: 12,
            padding: "8px 20px",
            fontSize: 28,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {category}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: title.length > 90 ? 48 : 60,
          fontWeight: 800,
          lineHeight: 1.15,
          maxWidth: 1000,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 30,
        }}
      >
        <div style={{ display: "flex", fontWeight: 900 }}>
          netfor<span style={{ color: "#E11D2E" }}>.</span>club
        </div>
        {source && <div style={{ display: "flex", color: "#8a93a8" }}>Fonte: {source}</div>}
      </div>
    </div>,
    size,
  );
}
