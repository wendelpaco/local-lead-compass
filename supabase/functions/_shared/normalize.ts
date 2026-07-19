// Normalization helpers shared by dedupe + scoring. Mirrors src/lib/phone.ts.

export interface NormalizedPhone {
  raw: string;
  e164?: string;
  countryCode?: string;
  areaCode?: string;
  isValid: boolean;
  type: "mobile" | "landline" | "unknown";
}

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68,
  69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95,
  96, 97, 98, 99,
]);

export function normalizeBrazilianPhone(raw: string): NormalizedPhone {
  const digits = raw.replace(/\D/g, "");
  let national = digits;
  if (national.startsWith("55") && national.length >= 12) national = national.slice(2);
  if (national.startsWith("0")) national = national.slice(1);

  if (national.length !== 10 && national.length !== 11) {
    return { raw, isValid: false, type: "unknown" };
  }
  const ddd = parseInt(national.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) return { raw, isValid: false, type: "unknown" };

  const subscriber = national.slice(2);
  const isMobile = subscriber.length === 9 && subscriber.startsWith("9");
  const isLandline = subscriber.length === 8 && /^[2-5]/.test(subscriber);
  if (!isMobile && !isLandline) return { raw, isValid: false, type: "unknown" };

  return {
    raw,
    e164: `+55${national}`,
    countryCode: "55",
    areaCode: String(ddd),
    isValid: true,
    type: isMobile ? "mobile" : "landline",
  };
}

export function normalizeDomain(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(ltda|me|epp|eireli|sa|s\/a|cia)\b\.?/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasRealWebsite(websiteUri: string | null | undefined): boolean {
  if (!websiteUri || !websiteUri.trim()) return false;
  // Social profiles are not a proper website for presence classification.
  const domain = normalizeDomain(websiteUri);
  if (!domain) return false;
  return !["facebook.com", "instagram.com", "wa.me", "api.whatsapp.com", "linktr.ee"].some(
    (social) => domain === social || domain.endsWith(`.${social}`),
  );
}

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
