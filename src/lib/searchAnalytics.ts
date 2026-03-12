export type SearchAnalyticsSnapshot = {
  totalSearches: number;
  averageResponseMs: number;
  topKeywords: { keyword: string; count: number }[];
};

type MutableAnalytics = {
  totalSearches: number;
  totalResponseMs: number;
  keywordCounts: Map<string, number>;
};

const analytics: MutableAnalytics = {
  totalSearches: 0,
  totalResponseMs: 0,
  keywordCounts: new Map<string, number>(),
};

export function recordSearch({
  keyword,
  durationMs,
}: {
  keyword: string;
  durationMs: number;
}) {
  analytics.totalSearches += 1;
  analytics.totalResponseMs += durationMs;

  const normalized = keyword.trim().toLowerCase();
  if (normalized) {
    analytics.keywordCounts.set(
      normalized,
      (analytics.keywordCounts.get(normalized) ?? 0) + 1,
    );
  }
}

export function getAnalyticsSnapshot(): SearchAnalyticsSnapshot {
  const averageResponseMs =
    analytics.totalSearches === 0
      ? 0
      : analytics.totalResponseMs / analytics.totalSearches;

  const topKeywords = Array.from(analytics.keywordCounts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalSearches: analytics.totalSearches,
    averageResponseMs,
    topKeywords,
  };
}

