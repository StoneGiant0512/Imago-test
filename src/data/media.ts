export type RawMediaItem = {
  suchtext: string;
  bildnummer: string;
  fotografen: string;
  datum: string; // DD.MM.YYYY
  hoehe: string;
  breite: string;
};

export type MediaItem = RawMediaItem & {
  id: number;
  dateISO: string | null;
  restrictions: string[];
  normalizedText: string;
  normalizedPhotographer: string;
  normalizedBildnummer: string;
};

const RAW_MEDIA: RawMediaItem[] = [
  {
    suchtext:
      "J.Morris, Manchester Utd inside right 7th January 1948 UnitedArchives00421716 PUBLICATIONxINxGERxSUIxAUTxONLY",
    bildnummer: "0059987730",
    fotografen: "IMAGO / United Archives International",
    datum: "01.01.1900",
    hoehe: "2460",
    breite: "3643",
  },
  {
    suchtext:
      "Michael Jackson 11 95 her Mann Musik Gesang Pop USA Hemd leger Studio hoch ganz stehend Bühne...",
    bildnummer: "0056821849",
    fotografen: "IMAGO / teutopress",
    datum: "01.11.1995",
    hoehe: "948",
    breite: "1440",
  },
];

function toISODate(datum: string): string | null {
  const [day, month, year] = datum.split(".");
  if (!day || !month || !year) return null;
  const iso = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(
    2,
    "0",
  )}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Extract restriction tokens like PUBLICATIONxINxGERxSUIxAUTxONLY from suchtext.
function extractRestrictions(suchtext: string): string[] {
  const matches = suchtext.match(/[A-Z]+x[A-Zx]+ONLY\b/g);
  if (!matches) return [];
  return matches.map((m) => m.toUpperCase());
}

export const MEDIA_ITEMS: MediaItem[] = RAW_MEDIA.map((item, index) => {
  const restrictions = extractRestrictions(item.suchtext);
  const normalizedText = normalize(item.suchtext);
  const normalizedPhotographer = normalize(item.fotografen);
  const normalizedBildnummer = normalize(item.bildnummer);

  return {
    ...item,
    id: index,
    dateISO: toISODate(item.datum),
    restrictions,
    normalizedText,
    normalizedPhotographer,
    normalizedBildnummer,
  };
});

// Simple helper to get unique photographer credits for filters.
export const UNIQUE_PHOTOGRAPHERS: string[] = Array.from(
  new Set(MEDIA_ITEMS.map((m) => m.fotografen)),
).sort();

// Simple helper to get unique restrictions for filters.
export const UNIQUE_RESTRICTIONS: string[] = Array.from(
  new Set(MEDIA_ITEMS.flatMap((m) => m.restrictions)),
).sort();

