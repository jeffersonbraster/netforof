import Image from "next/image";
import Link from "next/link";

const sections = [
  { href: "/noticias", label: "Notícias" },
  { href: "/agenda", label: "Agenda de jogos" },
  { href: "/classificacao", label: "Classificação" },
  { href: "/cantos-da-torcida", label: "Cantos da torcida" },
  { href: "/videos", label: "Vídeos" },
  { href: "/sobre", label: "Sobre o NET FOR" },
];

const aggregatedSources = [
  { name: "ge (Globo Esporte)", url: "https://ge.globo.com/ce/futebol/times/fortaleza/" },
  { name: "Fortaleza EC (oficial)", url: "https://www.fortaleza1918.com.br" },
  { name: "Diário do Nordeste", url: "https://diariodonordeste.verdesmares.com.br" },
  { name: "Sou Fortaleza", url: "https://soufortaleza.com" },
  { name: "O Povo", url: "https://www.opovo.com.br" },
  { name: "ESPN Brasil", url: "https://www.espn.com.br" },
];

export function Footer() {
  return (
    <footer className="mt-12 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-4">
          <Image
            src="/netfor.svg"
            alt="NET FOR"
            width={120}
            height={33}
            className="hidden dark:block"
          />
          <Image
            src="/netfor-logo-full.svg"
            alt="NET FOR"
            width={120}
            height={33}
            className="dark:hidden"
          />
          <p className="text-sm leading-relaxed text-muted">
            Todas as notícias do Leão em um só lugar. Agregamos conteúdo dos principais portais
            esportivos, sempre com crédito e link para a matéria original.
          </p>
          <p className="text-xs text-muted">
            <Link href="/noticias/rss" className="text-link hover:underline underline-offset-4">
              Feed RSS
            </Link>{" "}
            · Disponível no Google News
          </p>
        </div>

        <nav aria-label="Seções">
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Seções</h3>
          <ul className="space-y-2 text-sm text-muted">
            {sections.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="transition-colors hover:text-foreground">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide">
            Fontes agregadas
          </h3>
          <ul className="space-y-2 text-sm text-muted">
            {aggregatedSources.map((s) => (
              <li key={s.name}>
                <a
                  href={s.url}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="transition-colors hover:text-foreground"
                >
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} NET FOR — portal independente, sem vínculo com o Fortaleza
            EC.
          </p>
          <p>Conteúdo agregado com crédito e link para as fontes originais.</p>
        </div>
      </div>
    </footer>
  );
}
