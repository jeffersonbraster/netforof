const TIME_ZONE = "America/Fortaleza";

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** "29/07, 15:47" — estável para HTML cacheado (sem "há X min" que envelhece). */
export function formatShortDateTime(date: Date): string {
  return dateTimeFormatter.format(date).replace(" ", " ");
}

/** "29 de julho de 2026" */
export function formatLongDate(date: Date): string {
  return dateFormatter.format(date);
}

const longDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * "29 de julho de 2026 às 15:47".
 *
 * Um formato só, em vez de juntar data longa com data curta: a assinatura da
 * matéria trazia "01 de agosto de 2026 · 01/08, 13:57" e repetia o dia e o mês.
 * O `às` sai do próprio Intl em pt-BR ao combinar data e hora.
 */
export function formatLongDateTime(date: Date): string {
  return longDateTimeFormatter.format(date);
}

const kickoffFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** "dom., 03/08 · 16:00" → "Dom, 03/08 · 16:00" */
export function formatKickoff(date: Date): string {
  const formatted = kickoffFormatter.format(date).replace(/\./g, "").replace(", ", ", ");
  const withSeparator = formatted.replace(/(\d{2}\/\d{2}),? /, "$1 · ");
  return withSeparator.charAt(0).toUpperCase() + withSeparator.slice(1);
}
