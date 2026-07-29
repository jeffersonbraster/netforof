import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export function createDb(databaseUrl: string | undefined = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não definida");
  }
  return drizzle(neon(databaseUrl), { schema });
}

export type Db = ReturnType<typeof createDb>;
