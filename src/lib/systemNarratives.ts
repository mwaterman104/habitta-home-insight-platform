/**
 * System Narratives — Pure copy module
 * 
 * Maps each CapitalSystemType to its narrative identity, pro-tips,
 * forecast tips, and confidence nudges. Single source of truth
 * for all "intelligence" copy on detail pages.
 */

import type { CapitalSystemType } from "@/types/capitalTimeline";

export interface SystemNarrative {
  subtitle: string;
  proTip: string;
  forecastTip: string;
  confidenceTip: string;
}

const NARRATIVES: Record<CapitalSystemType, SystemNarrative> = {
  hvac: {
    subtitle: "The Lungs of Your Home",
    proTip:
      "Replacing a clogged air filter can reduce energy costs by up to 15% and prevent a blower motor failure down the road.",
    forecastTip:
      "HVAC replacements in Florida are best scheduled in spring or fall to avoid peak-season pricing.",
    confidenceTip:
      "Upload a photo of the manufacturer label so I can pinpoint the exact maintenance schedule for this unit.",
  },
  roof: {
    subtitle: "The Shield",
    proTip:
      "Checking your flashings — the metal seals around chimneys and vents — once a year can prevent 90% of attic leaks before they stain your ceiling.",
    forecastTip:
      "Keep an eye out for granule loss in your gutters after heavy rain. It's the first sign your roof's UV protection is thinning.",
    confidenceTip:
      "Upload a photo of the shingles from the ground so I can assess the wear pattern.",
  },
  water_heater: {
    subtitle: "Your Hot Water Lifeline",
    proTip:
      "A 20-minute sediment flush can add up to 3 years of life by clearing mineral buildup from the tank bottom.",
    forecastTip:
      "Inconsistent water temperature or rumbling sounds may indicate sediment is reducing heating efficiency.",
    confidenceTip:
      "Upload a photo of the unit label so I can identify the exact model and maintenance needs.",
  },
};

/**
 * Retrieve narrative copy for a given system.
 * Returns null if no narrative is defined for the system type.
 */
export function getSystemNarrative(
  systemId: string
): SystemNarrative | null {
  return NARRATIVES[systemId as CapitalSystemType] ?? null;
}
