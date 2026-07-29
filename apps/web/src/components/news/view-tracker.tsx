"use client";

// Client component: dispara o contador de views após o mount, mantendo a
// página do artigo 100% cacheável na borda.
import { useEffect } from "react";

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      // métrica best-effort; falha silenciosa
    });
    return () => controller.abort();
  }, [slug]);

  return null;
}
