"use client";

import { useEffect, useMemo, useState } from "react";
import { UNIQUE_PHOTOGRAPHERS, UNIQUE_RESTRICTIONS } from "@/data/media";

type SearchItem = {
  id: number;
  suchtext: string;
  bildnummer: string;
  fotografen: string;
  datum: string;
};

type SearchResponse = {
  items: SearchItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type SortOption = "date_desc" | "date_asc";

export default function Home() {
  const [query, setQuery] = useState("");
  const [credit, setCredit] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>(
    [],
  );
  const [sort, setSort] = useState<SortOption>("date_desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  const restrictionParam = useMemo(
    () => (selectedRestrictions.length ? selectedRestrictions.join(",") : ""),
    [selectedRestrictions],
  );

  useEffect(() => {
    const controller = new AbortController();
    async function fetchResults() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (credit) params.set("credit", credit);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (restrictionParam) params.set("restrictions", restrictionParam);
      params.set("sort", sort);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      try {
        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const json: SearchResponse = await res.json();
        setData(json);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();

    return () => controller.abort();
  }, [debouncedQuery, credit, dateFrom, dateTo, restrictionParam, sort, page, pageSize]);

  const toggleRestriction = (value: string) => {
    setPage(1);
    setSelectedRestrictions((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const handleQueryChange = (value: string) => {
    setPage(1);
    setQuery(value);
  };

  const handleCreditChange = (value: string) => {
    setPage(1);
    setCredit(value);
  };

  const handleDateFromChange = (value: string) => {
    setPage(1);
    setDateFrom(value);
  };

  const handleDateToChange = (value: string) => {
    setPage(1);
    setDateTo(value);
  };

  const handleSortToggle = () => {
    setSort((prev) => (prev === "date_desc" ? "date_asc" : "date_desc"));
  };

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            IMAGO Media Search
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Explore a large media library with keyword search, filters, and
            analytics-friendly APIs.
          </p>
        </header>

        <section
          aria-label="Search controls"
          className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm shadow-slate-900/40 backdrop-blur"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label
                htmlFor="search"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-300"
              >
                Keyword
              </label>
              <input
                id="search"
                type="search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search suchtext, photographer, bildnummer…"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-0 transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/60"
              />
            </div>

            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="credit"
                  className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-300"
                >
                  Credit
                </label>
                <select
                  id="credit"
                  value={credit}
                  onChange={(e) => handleCreditChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/60"
                >
                  <option value="">All credits</option>
                  {UNIQUE_PHOTOGRAPHERS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end justify-between gap-2">
                <button
                  type="button"
                  onClick={handleSortToggle}
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-blue-400 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
                >
                  <span className="mr-1">Sort by date</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                    {sort === "date_desc" ? "Newest first" : "Oldest first"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="date-from"
                  className="text-xs font-medium uppercase tracking-wide text-slate-300"
                >
                  Date from
                </label>
              </div>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/60"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="date-to"
                className="text-xs font-medium uppercase tracking-wide text-slate-300"
              >
                Date to
              </label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/60"
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-300">
                Restrictions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {UNIQUE_RESTRICTIONS.length === 0 && (
                  <span className="text-xs text-slate-500">
                    No restrictions in sample data
                  </span>
                )}
                {UNIQUE_RESTRICTIONS.map((restriction) => {
                  const active = selectedRestrictions.includes(restriction);
                  return (
                    <button
                      key={restriction}
                      type="button"
                      onClick={() => toggleRestriction(restriction)}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 ${
                        active
                          ? "border-blue-400 bg-blue-500/20 text-blue-100"
                          : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {restriction}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-inner shadow-black/40">
          <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-400">
            <div>
              {loading && <span>Loading results…</span>}
              {!loading && data && (
                <span>
                  Showing{" "}
                  <span className="font-semibold text-slate-100">
                    {data.items.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-100">
                    {data.total}
                  </span>{" "}
                  matches
                </span>
              )}
            </div>
            {data && data.total > 0 && (
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-full border border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-[11px] text-slate-400">
                  Page{" "}
                  <span className="font-semibold text-slate-100">{page}</span> /
                  <span className="font-semibold text-slate-100">
                    {" "}
                    {totalPages}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-full border border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/60 bg-red-950/50 px-3 py-2 text-sm text-red-100">
              <p className="font-medium">Something went wrong</p>
              <p className="text-xs text-red-200">{error}</p>
            </div>
          )}

          {!error && !loading && data && data.total === 0 && (
            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/60">
              <p className="text-sm text-slate-400">
                No results yet. Try adjusting your query or filters.
              </p>
            </div>
          )}

          {loading && (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-20 animate-pulse rounded-xl bg-slate-800/60"
                />
              ))}
            </div>
          )}

          {!loading && !error && data && data.items.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-800">
              {data.items.map((item) => (
                <li key={item.id} className="py-3">
                  <article className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold tracking-tight text-slate-50">
                        {item.bildnummer}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {item.fotografen}
                        </span>
                        <span className="rounded-full bg-slate-900/80 px-2 py-0.5 font-medium">
                          {item.datum}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-300">
                      {highlightQuery(item.suchtext, debouncedQuery)}
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

function highlightQuery(text: string, query: string) {
  if (!query.trim()) return text;

  const terms = Array.from(
    new Set(
      query
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, idx) =>
    pattern.test(part) ? (
      <mark
        key={idx}
        className="rounded bg-amber-300/70 px-0.5 text-slate-950"
      >
        {part}
      </mark>
    ) : (
      <span key={idx}>{part}</span>
    ),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
