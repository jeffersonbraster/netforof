import { criarProvedorOpenAI } from "./openai";
import type { ProvedorDeReescrita } from "./provider";

export type { MateriaReescrita, PedidoDeReescrita, ProvedorDeReescrita } from "./provider";

/**
 * Escolhe o provedor por `REWRITE_PROVIDER`. Para plugar outro fornecedor:
 * criar o arquivo implementando ProvedorDeReescrita e registrar aqui — o
 * pipeline não muda.
 */
export function criarProvedor(): ProvedorDeReescrita {
  const escolhido = (process.env.REWRITE_PROVIDER ?? "openai").toLowerCase();

  switch (escolhido) {
    case "openai":
      return criarProvedorOpenAI();
    default:
      throw new Error(`REWRITE_PROVIDER desconhecido: "${escolhido}"`);
  }
}
