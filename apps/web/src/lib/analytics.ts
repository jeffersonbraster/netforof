/**
 * Cloudflare Web Analytics — gratuito, sem cookies e sem coletar dado pessoal,
 * então não muda a política de privacidade nem exige banner de consentimento.
 *
 * O token do site NÃO é segredo: ele vai no HTML da página, visível a qualquer
 * visitante. Serve para dizer a qual site pertence a métrica, não para
 * autenticar — por isso mora numa env pública de build, como o AdSense.
 *
 * Vazio = beacon não renderiza. O site funciona igual, só não mede.
 */
export const CF_BEACON_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN ?? "";
