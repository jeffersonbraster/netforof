export * from "./schema";
export * from "./client";
// Re-exporta os operadores para os consumidores usarem a MESMA instância do
// drizzle-orm (duas cópias no pnpm geram tipos nominalmente incompatíveis).
export * from "drizzle-orm";
