# Counterline

A CS2 esports stats dashboard for exploring team map records, player performance by map, rankings, recent results, and tournaments.

## Data

- Team, player, ranking, and match data: [CSAPI](https://api.csapi.de/docs). The API exposes its own rolling window and snapshot dates; the app displays dates where supplied.
- Tournament calendar: a curated snapshot checked September 19, 2026 against [HLTV's event calendar](https://www.hltv.org/events). It is not a live feed. Update `events` in `src/main.tsx` to maintain the calendar.

This is an independent project and is not affiliated with Valve, HLTV, or CSAPI.

## Run locally

```bash
npm install
npm run dev
```

The Vite development server proxies `/api/*` to CSAPI. Vercel serves the allowlisted `/api/data` function, which caches responses for five minutes.

## Build

```bash
npm run build
```
