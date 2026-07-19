import type { Lead, LeadStage, Search, PresenceFilter } from "@/types";
import { MOCK_LEADS } from "@/mocks/leads";
import { CITY_SUGGESTIONS } from "@/lib/constants";

const delay = (ms = 300 + Math.random() * 400) => new Promise<void>((r) => setTimeout(r, ms));

// Pequena chance controlada de erro para demonstrar estados de falha.
// Desligue com localStorage["radar-local:sim-errors"] = "0".
const maybeFail = (rate = 0.08, message = "Falha simulada na comunicação. Tente novamente.") => {
  if (
    typeof window !== "undefined" &&
    window.localStorage.getItem("radar-local:sim-errors") === "0"
  )
    return;
  if (Math.random() < rate) throw new Error(message);
};

export interface SearchInput {
  niche: string;
  location: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  presence: PresenceFilter;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const searchService = {
  async run(input: SearchInput): Promise<{ leads: Lead[]; search: Search }> {
    await delay(400);
    maybeFail();

    // Filter mock leads to those "reasonably close" to the location; if none, take a slice.
    const results = MOCK_LEADS.map((l) => ({
      ...l,
      distanceKm: Number(
        haversine(input.latitude, input.longitude, l.latitude, l.longitude).toFixed(1),
      ),
    }))
      .filter((l) => l.distanceKm <= input.radiusKm)
      .filter((l) =>
        input.presence === "no-website"
          ? !l.hasWebsite
          : input.presence === "with-website"
            ? l.hasWebsite
            : true,
      )
      .filter(
        (l) =>
          l.category.toLowerCase().includes(input.niche.toLowerCase()) ||
          input.niche === "" ||
          Math.random() > 0.3,
      );

    // Ensure at least 15 leads to make the demo feel populated: fall back to nearest N regardless of radius
    let final = results;
    if (final.length < 15) {
      final = MOCK_LEADS.map((l) => ({
        ...l,
        distanceKm: Number(
          haversine(input.latitude, input.longitude, l.latitude, l.longitude).toFixed(1),
        ),
      }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 30)
        .filter((l) =>
          input.presence === "no-website"
            ? !l.hasWebsite
            : input.presence === "with-website"
              ? l.hasWebsite
              : true,
        );
    }

    const withoutSite = final.filter((l) => !l.hasWebsite).length;
    const enriched = final.filter((l) => l.phone || l.whatsapp || l.email).length;

    const search: Search = {
      id: `search-${Date.now()}`,
      niche: input.niche || "Todas as categorias",
      location: input.location,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusKm: input.radiusKm,
      presence: input.presence,
      createdAt: new Date().toISOString(),
      totalFound: final.length,
      enrichedCount: enriched,
      addedToPipeline: 0,
      contactsFound: enriched,
    };
    void withoutSite;
    return { leads: final, search };
  },
};

export const leadService = {
  async updateStage(lead: Lead, stage: LeadStage, extra?: Partial<Lead>): Promise<Lead> {
    await delay(150);
    maybeFail(0.05, "Falha ao atualizar o estágio. Tente novamente.");
    return {
      ...lead,
      stage,
      ...extra,
      timeline: [
        ...lead.timeline,
        {
          id: `t-${Date.now()}`,
          kind: "stage",
          label: `Movido para ${stage}`,
          at: new Date().toISOString(),
        },
      ],
      lastInteractionAt: new Date().toISOString(),
    };
  },
};

export const historyService = {
  suggestLocation(query: string) {
    if (!query) return CITY_SUGGESTIONS.slice(0, 5);
    return CITY_SUGGESTIONS.filter((c) =>
      c.label.toLowerCase().includes(query.toLowerCase()),
    ).slice(0, 6);
  },
};
