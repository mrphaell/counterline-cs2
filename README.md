# Counterline

A CS2 esports stats dashboard focused on team map records and player performance. Choose a team to see its map breakdowns and recent matches; no team is selected on first load.

## Data

- Team map and player map data: [CSAPI](https://api.csapi.de/docs), using its rolling three-month sample. Its refresh cadence can lag recent tournaments. The expanded map view averages the current roster's per-map rating, ADR, KAST, and side ratings.
- CT/T round win rates, pistol rate, team logos, and team match history: [CS2Observer](https://www.cs2observer.com/teams). Its CT/T and pistol rates cover its all-time sample, a different window from CSAPI. Logos are shown when the source provides them; other teams use a generic shield icon.
- Global ladder: [Valve Regional Standings](https://github.com/ValveSoftware/counter-strike_regional_standings), fetched from the latest published global snapshot in Valve's repository. The snapshot date appears in the app.
- Utility usage is not available from these feeds and is not estimated.
- Tournament calendar: a curated snapshot checked September 19, 2026 against [HLTV's event calendar](https://www.hltv.org/events). It is not a live feed. Update `events` in `src/main.tsx` to maintain the calendar.

This is an independent project and is not affiliated with Valve, HLTV, or CSAPI.

## Run locally

```bash
npm install
npm run dev
```

The Vite development server proxies CSAPI requests and serves the Valve ranking, team feed, and map insight handlers locally. Vercel runs the same handlers and the allowlisted `/api/data` function.

## PandaScore free tier

The optional `/api/results` endpoint still supports PandaScore fixtures if `PANDASCORE_API_KEY` is configured server side. The current interface shows CS2Observer match history on team pages only. PandaScore's free tier does not provide detailed team/player stats.

## Build

```bash
npm run build
```
