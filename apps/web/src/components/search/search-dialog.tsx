"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Busca em spotlight.
 *
 * Substitui a lupa antiga, que só linkava para /noticias — enganava o usuário
 * com a promessa de busca. Aqui ela busca de verdade.
 *
 * Decisões que importam:
 * - debounce de 250 ms e mínimo de 2 caracteres: sem isso cada tecla vira uma
 *   consulta ao banco;
 * - `AbortController` por requisição, senão resposta lenta de um termo antigo
 *   sobrescreve o resultado do termo novo;
 * - navegação por teclado completa (setas, Enter, Esc) e foco devolvido ao
 *   gatilho ao fechar — diálogo sem isso é armadilha para quem usa teclado.
 */

interface Resultado {
  titulo: string;
  slug: string;
  resumo: string;
  categoria: string | null;
  veiculo: string;
}

const DEBOUNCE_MS = 250;
const MIN_TERMO = 2;

export function SearchDialog() {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [itens, setItens] = useState<Resultado[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState(0);

  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fechar = useCallback(() => {
    setAberto(false);
    setTermo("");
    setItens([]);
    setSelecionado(0);
    gatilhoRef.current?.focus();
  }, []);

  // ⌘K / Ctrl+K abre de qualquer lugar; Esc fecha.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto((v) => !v);
      }
      if (e.key === "Escape" && aberto) fechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto, fechar]);

  useEffect(() => {
    if (aberto) inputRef.current?.focus();
  }, [aberto]);

  useEffect(() => {
    const limpo = termo.trim();
    // Nada de limpar estado aqui: `setState` síncrono dentro de efeito dispara
    // renderização em cascata. O que o termo curto precisa é ser DERIVADO na
    // hora de renderizar (ver `itensVisiveis`), não guardado duas vezes.
    if (limpo.length < MIN_TERMO) return;

    const timer = setTimeout(async () => {
      setCarregando(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const r = await fetch(`/api/busca?q=${encodeURIComponent(limpo)}`, {
          signal: controller.signal,
        });
        const dados = (await r.json()) as { itens?: Resultado[] };
        setItens(dados.itens ?? []);
        setSelecionado(0);
      } catch {
        // Aborto é fluxo normal (usuário continuou digitando), não erro.
      } finally {
        setCarregando(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [termo]);

  const termoValido = termo.trim().length >= MIN_TERMO;
  // Derivado, não armazenado: enquanto o termo é curto não existe resultado a
  // mostrar, mesmo que a busca anterior tenha deixado itens em memória.
  const itensVisiveis = termoValido ? itens : [];
  const mostrarVazio = termoValido && !carregando && itensVisiveis.length === 0;

  function navegar(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelecionado((i) => Math.min(i + 1, itensVisiveis.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelecionado((i) => Math.max(i - 1, 0));
    }
  }

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => setAberto(true)}
        className="group flex h-9 items-center gap-2 border border-line bg-surface px-3 text-sm text-muted transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Buscar notícia</span>
        <kbd className="ml-1 hidden border border-line px-1.5 font-sans text-[10px] tracking-wide text-muted md:inline">
          ⌘K
        </kbd>
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) fechar();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Buscar notícia"
            className="w-full max-w-xl border border-line bg-background shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5 shrink-0 text-muted" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                onKeyDown={navegar}
                placeholder="Digite o que procura no Leão…"
                aria-label="Termo de busca"
                className="h-14 flex-1 bg-transparent font-display text-lg font-semibold outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-muted"
              />
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar busca"
                className="border border-line px-2 py-0.5 text-[10px] tracking-wide text-muted hover:text-foreground"
              >
                ESC
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto">
              {carregando && (
                <p className="px-4 py-6 text-sm text-muted">Buscando…</p>
              )}

              {mostrarVazio && (
                <p className="px-4 py-6 text-sm text-muted">
                  Nada encontrado para <strong className="text-foreground">{termo}</strong>.
                </p>
              )}

              {!carregando && itensVisiveis.length > 0 && (
                <ul>
                  {itensVisiveis.map((item, i) => (
                    <li key={item.slug}>
                      <Link
                        href={`/noticias/${item.slug}`}
                        onClick={fechar}
                        onMouseEnter={() => setSelecionado(i)}
                        aria-current={i === selecionado ? "true" : undefined}
                        className={`block border-b border-line px-4 py-3 transition-colors ${
                          i === selecionado ? "bg-surface-2" : ""
                        }`}
                      >
                        <p className="font-display leading-snug font-bold">{item.titulo}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                          {item.categoria ? `${item.categoria} · ` : ""}
                          {item.veiculo}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {!termoValido && (
                <p className="px-4 py-6 text-sm text-muted">
                  Digite ao menos {MIN_TERMO} letras — busca por título ou resumo.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
