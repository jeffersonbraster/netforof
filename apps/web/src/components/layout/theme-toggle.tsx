"use client";

// Client component: interação de clique + localStorage para persistir o tema.
// Sem estado React: os ícones alternam via CSS (variante dark:) e o tema vive
// no data-theme do <html>, aplicado antes do paint pelo script do layout.
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("netfor-theme", next);
    } catch {
      // storage indisponível (modo privado) — só aplica na sessão
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-primary/50 hover:text-foreground"
    >
      {/* sol (visível no dark → ação: ir p/ claro) / lua (visível no light) */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="hidden size-4 dark:block"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 dark:hidden"
        aria-hidden
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    </button>
  );
}
