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
