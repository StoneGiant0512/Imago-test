## IMAGO Search – Architecture & Approach

### High-level Architecture

- **Framework**: Next.js App Router (TypeScript, React Server Components)
- **Search API**: `/api/search` – in-memory search over a preprocessed dataset
- **Analytics API**: `/api/analytics` – exposes usage metrics collected in memory
- **Frontend**: Single-page search UI at `/` built with Tailwind CSS, using a debounced client-side query to the search API

Data lives in `src/data/media.ts` where raw IMAGO-like media items are preprocessed into a normalized structure suitable for efficient keyword search and filtering.

### Data Modeling & Preprocessing

Raw items mirror the challenge fields:

- `suchtext` (primary text)
- `fotografen` (credit)
- `bildnummer`
- `datum` (as string `DD.MM.YYYY`)
- `hoehe`, `breite`

Preprocessed `MediaItem` augments this with:

- `id` – numeric identifier for stable keys
- `dateISO` – normalized `YYYY-MM-DD` for robust comparisons and sorting
- `restrictions: string[]` – restriction tokens extracted from `suchtext`
- `normalizedText`, `normalizedPhotographer`, `normalizedBildnummer` – lowercased, diacritic-stripped, alphanumeric-only versions used for search.

**Preprocessing steps**

- **Date normalization**: `DD.MM.YYYY` → `YYYY-MM-DD` (`dateISO`) using simple string splitting and `Date.parse` validation.
- **Text normalization**: `normalize("NFKD")`, remove combining diacritics, keep `[a-z0-9]`, collapse to single spaces, lowercased.
- **Restriction extraction**: regex `/[A-Z]+x[A-Zx]+ONLY\b/g` to pull tokens like `PUBLICATIONxINxGERxSUIxAUTxONLY` into a dedicated `restrictions` array.
- **Derived filter facets**: `UNIQUE_PHOTOGRAPHERS` and `UNIQUE_RESTRICTIONS` are computed once at module load for populating dropdowns and chips on the UI.

**Why this helps**

- Normalized text ensures that query matching is case-insensitive and robust to punctuation and diacritics.
- Normalized dates enable lexicographic range comparisons and efficient date sorting.
- Explicit restriction tokens turn noisy embedded flags into a structured facet we can filter and display.

**Where preprocessing happens**

- All preprocessing runs **at module load time** (`src/data/media.ts`). In a real deployment with a 10k dataset, this would typically happen:
  - at build time (static JSON → preprocessed TS/JSON),
  - or at startup when the server process warms up.

**Updating the index**

For new items arriving at runtime:

- Append them to `MEDIA_ITEMS` (or in a real app, to a mutable in-memory collection) and run the same normalization pipeline to populate derived fields.
- For performance on larger datasets, move from a flat array to:
  - a **token → itemID[] inverted index** for text fields, and
  - precomputed **credit → itemID[]** / **restriction → itemID[]** maps.

### Search Strategy & Relevance

The search endpoint accepts query parameters:

- `q`: keyword(s)
- `credit`: exact photographer/credit match
- `dateFrom`, `dateTo`: ISO date range filter
- `restrictions`: comma-separated list of restriction tokens
- `sort`: `date_asc` or `date_desc`
- `page`, `pageSize`: pagination

**Keyword search**

- The query `q` is normalized with the same function used for items (lowercase, diacritics stripped, punctuation removed).
- The normalized query is split into tokens.
- For each item, a relevance **score** is computed based on prefix matches in normalized tokens:
  - If any token is found in `normalizedText` (primary field) → +3 points
  - If found in `normalizedPhotographer` → +2 points
  - If found in `normalizedBildnummer` → +1 point
- Items with **zero score** when query tokens are present are excluded from the result set.

This gives:

- A simple relevance sorting by score.
- Higher weight for matches in `suchtext` (as requested), then `fotografen`, then `bildnummer`.
- Prefix matching so that partial words still retrieve intuitive results (e.g. "micha" matches "Michael").

**Filters**

- **Credit**: exact match on `fotografen` (using original string to keep UI simple and predictable).
- **Date range**:
  - `dateFrom` filters out items whose `dateISO` is strictly earlier.
  - `dateTo` filters out items whose `dateISO` is strictly later.
- **Restrictions**:
  - The client sends a comma-separated list of tokens (e.g. `PUBLICATIONxINxGERxSUIxAUTxONLY`).
  - Items must contain **all** selected restriction tokens in their `restrictions` array.

**Sorting and pagination**

- Results are first sorted by **descending relevance score**.
- Within equal scores, they are sorted by:
  - `date_asc`: `dateISO` ascending, or
  - `date_desc` (default): `dateISO` descending.
- Pagination is implemented with:
  - `page` (1-based, clamped to ≥1)
  - `pageSize` (1–100, default 20)
- The response includes `items`, `page`, `pageSize`, `total`, and `totalPages`.

### Analytics

Analytics is tracked in `src/lib/searchAnalytics.ts` as an in-memory module-level singleton:

- `totalSearches`: incremented per request.
- `totalResponseMs`: accumulates request processing time.
- `keywordCounts`: `Map<string, number>` keyed by normalized keyword strings.

The `/api/search` endpoint:

- Captures `performance.now()` at the start and end of request handling.
- Calls `recordSearch({ keyword: q ?? "", durationMs })`.

The `/api/analytics` endpoint:

- Returns `totalSearches`, **average response time** (`totalResponseMs / totalSearches`), and the **top 10 keywords** by frequency.

For production, this in-memory approach would be replaced by:

- A time-series or metrics backend (e.g. Prometheus, OpenTelemetry exporters).
- A persistent event log or analytics store (e.g. BigQuery, ClickHouse, or even Postgres) to keep history.

### Frontend UI & UX

The search UI (`src/app/page.tsx`) is a client component with:

- **Debounced search input** (`useDebouncedValue`) that waits 300ms after typing before triggering a new API call.
- **Filters**:
  - Credit dropdown populated from `UNIQUE_PHOTOGRAPHERS`.
  - Date range (from/to) using native date inputs; values are sent as ISO strings to the API.
  - Restriction chips built from `UNIQUE_RESTRICTIONS`, with toggle behavior.
- **Sorting**:
  - A single button toggling between "Newest first" (`date_desc`) and "Oldest first" (`date_asc`).
- **Results list**:
  - Displays `bildnummer`, `fotografen`, `datum`, and a highlighted snippet of `suchtext`.
  - Highlighting is done by splitting on case-insensitive query terms and wrapping matches in `<mark>`.
- **Pagination controls**:
  - "Prev" / "Next" buttons with disabled states.
  - Current page and total pages indicator.
- **UI states**:
  - Loading skeleton rows while data is fetched.
  - Empty state with guidance when there are no results.
  - Error banner if the API request fails.

Accessibility and UX considerations:

- All controls have labels and focus styles.
- Keyboard-friendly: inputs and buttons are standard HTML controls with clear focus rings.
- Tailwind is used to create a modern, dark-themed interface with high contrast and subtle motion (e.g. `hover`, `focus`, and `backdrop-blur`).

### Performance Considerations – 10k vs. Millions

**For 10k items (current implementation)**

- A linear scan over ~10k in-memory items with simple scoring and filters is fast:
  - O(N × T) where `N` is item count and `T` is query term count, but with small constants and all data in memory.
- Precomputed normalized strings dramatically reduce per-request work to:
  - tokenization of the query,
  - prefix checks against pre-split tokens.

This is sufficient for the challenge’s 10k-item target.

**Scaling to millions of items**

Beyond ~100k items, a full scan per request becomes wasteful. A realistic plan:

1. **Move to an inverted index**
   - Build token → posting list (item IDs, possibly with field and frequency info).
   - At query time, quickly intersect or union posting lists for tokens to obtain candidate sets instead of scanning all items.
   - Keep lightweight per-item metadata (dates, credits, restrictions) in memory or a fast key-value store for filtering and scoring.

2. **Use a specialized search engine**
   - Offload indexing and scoring to Elasticsearch/OpenSearch, Meilisearch, or Typesense.
   - Map:
     - `suchtext` → high-boost full-text field.
     - `fotografen` → secondary full-text / keyword field.
     - `bildnummer` → exact or partial-match field.
   - Leverage built-in tokenization, stemming, BM25 scoring, faceting, and pagination.

3. **Caching & query optimization**
   - Cache frequent queries (e.g. top keywords) at the API layer.
   - Use result windowing and search-after/scroll for deep pagination if necessary.

4. **Horizontal scaling**
   - Run the Next.js API routes as stateless services behind a load balancer.
   - Have them talk to a centralized search cluster (e.g. Elasticsearch) and metrics store.

### Continuous Ingestion – “New items every minute”

Assuming ~1 new item per minute:

1. **Ingestion**
   - New media items flow into a durable store (Object storage + metadata in DB).
   - A small ingestion service:
     - Validates input.
     - Runs the same normalization pipeline as in `media.ts`.
     - Publishes structured records to a stream or directly to the search index.

2. **Index updates**
   - For a homegrown inverted index:
     - Update in-memory maps for tokens, credits, restrictions with the new item(s).
     - Periodically snapshot to disk or a persistent store.
   - For a search engine:
     - Use bulk or streaming indexing APIs with near-real-time refresh intervals.

3. **Low-latency queries**
   - Queries are always served from the live index in memory/on the search cluster.
   - Ingestion is decoupled via async processing or buffering; index refreshes are small and incremental.

4. **Avoiding UI blocking**
   - The Next.js frontend never blocks on ingestion; it just queries `/api/search`.
   - Fresh items become visible once they are committed to the index (e.g. within seconds).

### Testing Approach

Tests (conceptual, for brevity in this demo):

- **Unit tests** (for a full solution):
  - Normalization utilities: dates, text, restriction extraction.
  - Scoring function: ensure weighting and prefix matching behave as expected.
  - Filter logic: credits, date ranges, and restrictions all independently and in combination.
- **API tests**:
  - `/api/search` response shape and pagination.
  - Edge cases: empty queries, out-of-range pages, invalid parameters.
- **UI tests**:
  - Debounced search behavior (ensuring we don’t spam the API).
  - Filter interactions and visible states (empty, loading, error).

For this coding exercise, manual checks via the browser plus console logging/inspecting the JSON responses are sufficient, but the architecture is shaped so that the core logic (normalization, scoring, and filtering) can be easily extracted into pure functions and unit-tested.

### Limitations & Next Steps

- Current implementation keeps data and analytics in memory; a production version would:
  - Persist analytics, support reporting across time ranges, and reset/rotation policies.
  - Use an external search engine or robust inverted index to handle millions of documents.
  - Implement better language handling (stemming, synonyms, multilingual support).
- Security and multi-tenant concerns are out of scope for this exercise but would be essential in a real IMAGO deployment.

