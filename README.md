This is an IMAGO media search demo built with [Next.js](https://nextjs.org) (App Router), TypeScript, and Tailwind CSS. It implements a lightweight search layer over a small media dataset with keyword search, filters, sorting, pagination, basic analytics, and a polished UI.

## Getting Started

First, install dependencies and then run the development server:

```bash
npm install

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to use the search UI.

## High-level approach

- **Search API**: `/api/search` performs in-memory search over a preprocessed dataset in `src/data/media.ts`.
- **Relevance**: token-based, normalized keyword search with field weights (`suchtext` > `fotografen` > `bildnummer`) and prefix matching.
- **Filters**: credit, date range (ISO) and restriction tokens extracted from `suchtext`.
- **Sorting**: by `datum` ascending/descending, applied after relevance scoring.
- **Pagination**: `page`, `pageSize` and response metadata (`items`, `page`, `pageSize`, `total`, `totalPages`).
- **Analytics**: tracked in-memory and exposed via `/api/analytics` (search count, average response time, top keywords).
- **Frontend**: a single-page, Tailwind-based, accessible search interface with debounced input, filters, sorting toggle and pagination.

See `docs/ARCHITECTURE.md` for a detailed architecture and approach overview suitable for export to PDF and inclusion in your submission.

## Running tests

For this exercise, no automated test suite is wired up, but the core logic (normalization, scoring and filtering) is factored so it can be moved into pure functions and covered with unit tests (e.g. using Jest or Vitest).

## Deployment

You can deploy this app to any platform that supports Next.js (for example Vercel, Netlify or a custom Node server). On Vercel, simply import the repository and use the default Next.js 16 settings.

## Creating the PDF deliverable

For the coding challenge:

- Use `docs/ARCHITECTURE.md` as the content basis for your PDF.
- Open it in your editor or a Markdown viewer, export/print to PDF, and include it with your submission along with:
  - a link to this repository (or zipped project),
  - a link to the deployed app,
  - and any additional notes you want to add.
