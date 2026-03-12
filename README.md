# IMAGO Media Search

A lightweight search layer over IMAGO-style media metadata, built with [Next.js](https://nextjs.org) (App Router), TypeScript, and Tailwind CSS. It provides keyword search, filters (credit, date range, restrictions), sorting, pagination, basic analytics, and a polished search UI.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the search interface.

---

## High-level approach

- **Search API** (`GET /api/search`): In-memory search over a preprocessed dataset in `src/data/media.ts`. Query params: `q`, `credit`, `dateFrom`, `dateTo`, `restrictions`, `sort`, `page`, `pageSize`. Response includes `items`, `page`, `pageSize`, `total`, and `totalPages`.

- **Preprocessing** (at module load in `src/data/media.ts`): Raw items are normalized—dates parsed to ISO, text lowercased and diacritic-stripped, restriction tokens (e.g. `PUBLICATIONxINxGERxSUIxAUTxONLY`) extracted from `suchtext` via regex into a `restrictions` array. Derived facets (`UNIQUE_PHOTOGRAPHERS`, `UNIQUE_RESTRICTIONS`) feed the filter UI.

- **Analytics** (`GET /api/analytics`): In-memory tracking of search count, average response time, and top keywords; `/api/search` records each request and its duration.

- **Frontend**: Single-page search UI with debounced keyword input, credit dropdown, date range inputs, restriction chips, date sort toggle, result list with snippets and highlighting, and pagination. Clear loading, empty, and error states; labeled controls and focus styles for accessibility.

---

## Assumptions

- **Data shape**: Raw media items follow the challenge schema (`suchtext`, `bildnummer`, `fotografen`, `datum`, `hoehe`, `breite`). `datum` is `DD.MM.YYYY`; missing or invalid dates are treated as `dateISO: null` and excluded from date filters/sort when ambiguous.

- **Restrictions**: Restriction tokens are embedded in `suchtext` in the form `[A-Z]+x[A-Zx]+ONLY` (e.g. `PUBLICATIONxINxGERxSUIxAUTxONLY`). The regex extracts these; no other restriction formats are inferred.

- **Search behaviour**: Keyword search is token-based with prefix matching on normalized text. Empty `q` returns all items (subject to filters). Credit filter is exact match on the original `fotografen` string; date filters use ISO `YYYY-MM-DD`; restrictions filter requires the item to contain *all* selected tokens.

- **Scale**: The implementation is aimed at ~10k items in memory. For larger datasets or production, an external search engine or inverted index is assumed (see Limitations).

- **Analytics**: In-memory only for the demo; no persistence or time-based reporting. Production would use a proper metrics/analytics backend.

---

## Design decisions (especially search / relevance)

- **Relevance scoring**: Query string is normalized (lowercase, diacritics removed, non-alphanumeric collapsed) and split into tokens. Each item gets a score from prefix matches in normalized fields:
  - Match in **suchtext** (primary): **+3**
  - Match in **fotografen** (secondary): **+2**
  - Match in **bildnummer** (optional): **+1**  
  Items with query tokens but score 0 are excluded. Results are ordered by score descending, then by date (asc/desc per `sort`). This prioritizes main content over credit and ID, and supports partial matches (e.g. "micha" → "Michael").

- **Tokenization and normalization**: Same `normalize()` for both query and stored text (NFKD, strip diacritics, `[a-z0-9]` + spaces, lowercase). No stemming or stop words; keeps the demo simple and predictable. Restriction tokens are extracted once at load and stored in a dedicated array for filtering and UI facets.

- **Filters**: Credit is exact match to keep dropdown behaviour predictable. Date range uses `dateISO` so comparisons are consistent. Restrictions are AND within the selection (item must have all chosen tokens). Filters apply before scoring so only matching items are ranked.

- **Pagination**: 1-based `page`, `pageSize` capped between 1 and 100. Total and totalPages are returned so the client can drive the UI without extra requests.

- **Performance**: Precomputed normalized fields and restriction arrays avoid repeated string work per request. Linear scan over ~10k items is acceptable for the challenge; see Limitations for scaling beyond that.

---

## Limitations and “what I would do next”

**Limitations**

- **In-memory only**: Dataset and analytics live in process memory; no persistence, so restarts lose analytics and any runtime-added data.
- **Scale**: Linear scan is fine for ~10k items but does not scale to hundreds of thousands or millions without an index or external search engine.
- **Language**: No stemming, synonyms, or multilingual handling; relevance is purely token/prefix-based.
- **Security and multi-tenant**: No auth, rate limiting, or tenant isolation; suitable only for a demo.
- **Tests**: No automated tests in the repo; logic is structured so normalization, scoring, and filters can be unit-tested in a follow-up.

**What I would do next**

1. **Search at scale**: Introduce an inverted index (token → item IDs) or integrate Elasticsearch/OpenSearch/Meilisearch; map `suchtext` (high boost), `fotografen`, and `bildnummer` to appropriate field types and use BM25-style scoring.
2. **Persistent analytics**: Store search events and timings in a time-series or analytics DB (e.g. BigQuery, ClickHouse, Postgres); add reporting, dashboards, and retention/rotation.
3. **Ingestion pipeline**: For “new items every minute”, add a small ingestion path that normalizes and indexes new items (or pushes to a search engine) asynchronously so the search API stays fast and the UI non-blocking.
4. **Testing**: Add unit tests for `normalize()`, date parsing, restriction extraction, and the scoring function; add API tests for `/api/search` (params, pagination, filters) and basic UI tests for debounce and states.
5. **Relevance and i18n**: Add stemming and optional synonyms; consider language detection and per-language analyzers for a multilingual catalog.
6. **Production hardening**: Auth, rate limits, input validation, and structured error responses; consider feature flags and A/B testing for relevance changes.

---

For a deeper technical write-up (architecture, scaling, ingestion), see `docs/ARCHITECTURE.md`. For deployment, use any Next.js-capable platform (e.g. Vercel, Netlify); the app has no special deployment requirements beyond Node and the default build.
