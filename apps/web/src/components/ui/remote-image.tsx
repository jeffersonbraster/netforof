"use client";

import Image from "next/image";
import { useState } from "react";

import { FALLBACK_IMAGE, urlDaImagem } from "@/lib/images";

type RemoteImageProps = {
  /** URL do portal de origem; `null` cai direto no banner. */
  src: string | null;
  alt?: string;
  sizes: string;
  priority?: boolean;
  quality?: 60 | 75;
  className?: string;
};

/**
 * `next/image` com rede de segurança: se o upstream quebrar, o card mostra o
 * banner do NETFOR em vez de um buraco. O erro de carregamento só existe no
 * cliente — daí o "use client" (o restante do card segue Server Component).
 */
export function RemoteImage({
  src,
  alt = "",
  sizes,
  priority = false,
  quality,
  className,
}: RemoteImageProps) {
  const [quebrou, setQuebrou] = useState(false);
  const usarFallback = !src || quebrou;
  // Todo caminho sai pelo nosso domínio: o de terceiro nunca chega ao navegador.
  const endereco = usarFallback ? FALLBACK_IMAGE : urlDaImagem(src);

  return (
    <Image
      src={endereco}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={quality}
      onError={() => setQuebrou(true)}
      className={className}
    />
  );
}
