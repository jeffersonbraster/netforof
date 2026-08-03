import Script from "next/script";

import { GA_ID } from "@/lib/analytics";

/**
 * Google Analytics 4, no gtag.js oficial.
 *
 * Sem `@next/third-parties`: o pacote é um invólucro de duas tags <Script> em
 * volta deste mesmo snippet, e uma dependência a mais no `package.json` custa
 * mais do que as dez linhas que ela pouparia.
 *
 * `afterInteractive` (e não `lazyOnload`, como o AdSense): analytics precisa
 * disparar antes de a pessoa sair. Com `lazyOnload` o gtag só sobe depois do
 * `load` completo — em quem abre e volta em três segundos, a sessão nunca é
 * contada, e num portal de notícias isso é boa parte do tráfego. O AdSense
 * segue lazy porque lá o custo é o LCP, não a contagem.
 *
 * Não há pageview manual em troca de rota: a Medição Otimizada do GA4 ouve o
 * History API, que é o que o App Router usa para navegar. Um componente de
 * cliente com `usePathname` só duplicaria o evento — e `usePathname` é dado
 * não cacheado, que já derrubou o build deste projeto uma vez fora de
 * <Suspense>.
 */
export function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      {/* O `config` pula o /admin: o painel é acesso nosso, todo dia, e entraria
          no relatório como audiência. Não dá para decidir isso no servidor —
          o layout raiz não conhece a rota —, então a checagem é no cliente. */}
      <Script id="ga-config" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
if (!location.pathname.startsWith('/admin')) { gtag('config', '${GA_ID}'); }`}
      </Script>
    </>
  );
}
