/**
 * ID de medição do Google Analytics 4 (formato G-XXXXXXXXXX).
 *
 * Público por natureza — vai no HTML de toda página, como o do AdSense. Por
 * isso é `NEXT_PUBLIC_` e entra no deploy como `vars`, não como `secrets`.
 *
 * Vazio = nada é carregado. É de propósito: em desenvolvimento e em preview a
 * env não está definida, então o local não polui o relatório com sessões de
 * teste — que é o jeito mais comum de sujar a média de um site novo.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
