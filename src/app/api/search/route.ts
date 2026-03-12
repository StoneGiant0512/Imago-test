import { NextRequest, NextResponse } from "next/server";
import { MEDIA_ITEMS, MediaItem } from "@/data/media";
import { recordSearch } from "@/lib/searchAnalytics";

type SearchParams = {
  q?: string;
  credit?: string;
  dateFrom?: string;
  dateTo?: string;
  restrictions?: string;
  sort?: "date_asc" | "date_desc";
  page?: string;
  pageSize?: string;
};

type SearchResult = {
  items: MediaItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreItem(item: MediaItem, normalizedQueryTokens: string[]): number {
  if (normalizedQueryTokens.length === 0) return 0;

  const textTokens = item.normalizedText.split(" ");
  const photographerTokens = item.normalizedPhotographer.split(" ");
  const bildnummerTokens = item.normalizedBildnummer.split(" ");

  let score = 0;

  for (const token of normalizedQueryTokens) {
    const inText = textTokens.some((t) => t.startsWith(token));
    const inPhotographer = photographerTokens.some((t) => t.startsWith(token));
    const inBildnummer = bildnummerTokens.some((t) => t.startsWith(token));

    if (inText) score += 3;
    if (inPhotographer) score += 2;
    if (inBildnummer) score += 1;
  }

  return score;
}

export async function GET(req: NextRequest) {
  const start = performance.now();

  const { searchParams } = new URL(req.url);
  const params: SearchParams = {
    q: searchParams.get("q") ?? undefined,
    credit: searchParams.get("credit") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    restrictions: searchParams.get("restrictions") ?? undefined,
    sort: (searchParams.get("sort") as SearchParams["sort"]) ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  };

  const normalizedQuery = params.q ? normalize(params.q) : "";
  const queryTokens = normalizedQuery ? normalizedQuery.split(" ") : [];

  const dateFrom = params.dateFrom ?? undefined;
  const dateTo = params.dateTo ?? undefined;

  const restrictionList = params.restrictions
    ? params.restrictions.split(",").map((r) => r.toUpperCase())
    : [];

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(params.pageSize ?? "20", 10) || 20),
  );

  const resultsWithScore = MEDIA_ITEMS.flatMap((item) => {
    if (params.credit && item.fotografen !== params.credit) {
      return [];
    }

    if (dateFrom && item.dateISO && item.dateISO < dateFrom) {
      return [];
    }
    if (dateTo && item.dateISO && item.dateISO > dateTo) {
      return [];
    }

    if (
      restrictionList.length > 0 &&
      !restrictionList.every((r) => item.restrictions.includes(r))
    ) {
      return [];
    }

    const score = scoreItem(item, queryTokens);

    if (queryTokens.length > 0 && score === 0) {
      return [];
    }

    return [{ item, score }];
  });

  resultsWithScore.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    if (params.sort === "date_asc") {
      const ad = a.item.dateISO ?? "";
      const bd = b.item.dateISO ?? "";
      return ad.localeCompare(bd);
    }
    const ad = a.item.dateISO ?? "";
    const bd = b.item.dateISO ?? "";
    return bd.localeCompare(ad);
  });

  const total = resultsWithScore.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const items = resultsWithScore
    .slice(startIndex, startIndex + pageSize)
    .map((r) => r.item);

  const result: SearchResult = {
    items,
    page,
    pageSize,
    total,
    totalPages,
  };

  const durationMs = performance.now() - start;
  recordSearch({ keyword: params.q ?? "", durationMs });

  return NextResponse.json(result);
}

