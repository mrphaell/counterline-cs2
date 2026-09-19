# Counterline

A CS2 esports stats dashboard for exploring team map records, player performance by map, rankings, recent results, and tournaments.

## Data

- Team map and player map data: [CSAPI](https://api.csapi.de/docs). This source's refresh cadence can lag recent tournaments.
- Weekly world ranking: [HLTV ranking as republished by Pley.gg](https://pley.gg/cs2/world-rankings-cs2-2/). The app displays the source's update date.
- Recent results: [PandaScore](https://developers.pandascore.co/docs/plan-reference) free fixtures feed when `PANDASCORE_API_KEY` is configured, combined with [CS2Observer](https://www.cs2observer.com/results). The server de-duplicates matching teams and dates, prefers PandaScore scores, and caches the merged result for five minutes. Without a key, CS2Observer remains the results source.
- Tournament calendar: a curated snapshot checked September 19, 2026 against [HLTV's event calendar](https://www.hltv.org/events). It is not a live feed. Update `events` in `src/main.tsx` to maintain the calendar.

This is an independent project and is not affiliated with Valve, HLTV, or CSAPI.

## Run locally

```bash
npm install
npm run dev
```

The Vite development server proxies CSAPI requests and serves the ranking and results handlers locally. Vercel runs the same feed handlers and the allowlisted `/api/data` function.

## PandaScore free tier

Create a token in the PandaScore dashboard and set `PANDASCORE_API_KEY` as a server-side environment variable in Vercel for Production. Redeploy after adding it. For local development, export the same variable in the shell before starting Vite. Never place the key in client code or commit it to Git.

## Build

```bash
npm run build
```
