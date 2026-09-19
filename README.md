# Counterline

A CS2 esports stats dashboard for exploring team map records, player performance by map, rankings, recent results, and tournaments.

## Data

- Team map and player map data: [CSAPI](https://api.csapi.de/docs). This source's refresh cadence can lag recent tournaments.
- Weekly world ranking: [HLTV ranking as republished by Pley.gg](https://pley.gg/cs2/world-rankings-cs2-2/). The app displays the source's update date.
- Recent results: [CS2Observer](https://www.cs2observer.com/results), refreshed through a five-minute server cache.
- Tournament calendar: a curated snapshot checked September 19, 2026 against [HLTV's event calendar](https://www.hltv.org/events). It is not a live feed. Update `events` in `src/main.tsx` to maintain the calendar.

This is an independent project and is not affiliated with Valve, HLTV, or CSAPI.

## Run locally

```bash
npm install
npm run dev
```

The Vite development server proxies CSAPI requests and serves the ranking and results handlers locally. Vercel runs the same feed handlers and the allowlisted `/api/data` function.

## Build

```bash
npm run build
```
