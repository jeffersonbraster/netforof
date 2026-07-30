import { ADSENSE_CLIENT, ADSENSE_SLOT_LEADERBOARD, ADSENSE_SLOT_RECTANGLE } from "@/lib/ads";

import { AdSenseUnit } from "./adsense-unit";

// Espaço SEMPRE reservado com altura fixa — anúncio carrega lazy dentro dele,
// nunca empurra o layout (CLS = 0, meta da seção 7 do plano).
export function AdSlot({
  format,
  label = "Publicidade",
}: {
  format: "leaderboard" | "rectangle";
  label?: string;
}) {
  const dimensions =
    format === "leaderboard" ? "h-[100px] w-full md:h-[90px]" : "h-[250px] w-full max-w-[336px]";
  const slot = format === "leaderboard" ? ADSENSE_SLOT_LEADERBOARD : ADSENSE_SLOT_RECTANGLE;

  if (ADSENSE_CLIENT && slot) {
    return (
      <div className={`mx-auto overflow-hidden ${dimensions}`} aria-label={label}>
        <AdSenseUnit client={ADSENSE_CLIENT} slot={slot} />
      </div>
    );
  }

  return (
    <div
      className={`mx-auto flex items-center justify-center rounded-lg border border-dashed border-line bg-surface-2/50 ${dimensions}`}
      role="complementary"
      aria-label={label}
    >
      <span className="text-[10px] tracking-widest text-muted uppercase">{label}</span>
    </div>
  );
}
