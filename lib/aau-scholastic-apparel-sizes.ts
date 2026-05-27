import {
  type AauScholasticApparelSizesInput,
  type AauScholasticLineSelection,
} from "@/lib/aau-scholastic-duals-2026-content"
import {
  formatShirtSizeForDb,
  formatSingletSizeForDb,
  normalizeGearSizeForDb,
} from "@/lib/nhsca-hub-checkout-pricing"

function selectionHas(selections: readonly AauScholasticLineSelection[], lineId: string): boolean {
  return selections.some((s) => s.line.id === lineId && s.quantity > 0)
}

export function aauScholasticApparelSizesForDb(
  selections: readonly AauScholasticLineSelection[],
  sizes: AauScholasticApparelSizesInput,
): {
  singlet_size: string | null
  shorts_size: string | null
  shirt_size: string | null
} {
  return {
    singlet_size: selectionHas(selections, "singlet")
      ? formatSingletSizeForDb(sizes.singletSize, { qty: 1, color: "" })
      : null,
    shorts_size: selectionHas(selections, "shorts") ? normalizeGearSizeForDb(sizes.shortsSize) : null,
    shirt_size:
      selectionHas(selections, "tee") || selectionHas(selections, "long_sleeve")
        ? formatShirtSizeForDb(
            selectionHas(selections, "tee") ? sizes.teeSize : "",
            selectionHas(selections, "long_sleeve") ? sizes.longSleeveSize : "",
          )
        : null,
  }
}

export function parseAauScholasticApparelSizesFromBody(body: Record<string, unknown>): AauScholasticApparelSizesInput {
  return {
    singletSize: typeof body.singlet_size === "string" ? body.singlet_size.trim() : "",
    shortsSize: typeof body.shorts_size === "string" ? body.shorts_size.trim() : "",
    longSleeveSize: typeof body.long_sleeve_size === "string" ? body.long_sleeve_size.trim() : "",
    teeSize: typeof body.tee_size === "string" ? body.tee_size.trim() : "",
  }
}
