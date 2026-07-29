import { createDb } from "@netfor/db";

// Cliente HTTP do Neon — stateless, seguro para reutilizar entre requests.
export const db = createDb();
