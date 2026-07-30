// Configuração de anúncios — ativada quando o AdSense aprovar o site.
// Basta preencher as envs (build-time) para os slots reais substituírem os placeholders.
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
export const ADSENSE_SLOT_LEADERBOARD = process.env.NEXT_PUBLIC_ADSENSE_SLOT_LEADERBOARD ?? "";
export const ADSENSE_SLOT_RECTANGLE = process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECTANGLE ?? "";
