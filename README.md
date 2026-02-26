# CS2 Skin Market Pump & Dump Detection

A browser-based market analysis dashboard that detects upcoming pump & dump scenarios for CS2 skins by comparing trading patterns between Western (CSFloat/Steam) and Eastern (BAF163/YuPin) marketplaces.

## Architecture

```
cs2-pump-detection/
├── backend/               # Node.js + Express + TypeScript
│   └── src/
│       ├── database/      # SQLite schema & connection
│       ├── services/      # CSFloat API, market data, pump detection
│       ├── routes/        # REST API endpoints
│       └── cron/          # 6-hour automated pipeline
└── frontend/              # React + TypeScript + Tailwind + Recharts
    └── src/
        ├── components/    # Dashboard, SkinTable, SkinDetail, Alerts
        ├── api/           # Axios client
        ├── hooks/         # useAutoRefresh
        └── types/         # Shared TypeScript types
```

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Start both frontend and backend in dev mode
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api

## Environment Variables

Copy `.env.example` to `.env` in the `backend/` directory:

```bash
cp .env.example backend/.env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
| `WEBHOOK_URL` | _(empty)_ | Optional webhook for pump alerts |

## Detection Algorithm

### Stage 1 – Volume Divergence Analysis
- Compares **% volume growth** (not absolute numbers) between Western and Eastern markets
- Evaluated over 7, 14, and 30 day windows (7d weighted 50%, 14d 30%, 30d 20%)
- Eastern growth exceeding Western by >40% triggers a flag
- Output: **Divergence Score** (0–100)

### Stage 2 – Buyer Clustering Analysis
- Queries CSFloat transaction history for flagged skins
- Normal pattern: many different buyers
- Suspicious pattern: single profile buying same skin 5–17×
- Score components: repeat count, concentration %, buyer diversity
- Output: **Clustering Score** (0–100)

### Combined Score
```
Pump Probability = Divergence × 0.6 + Clustering × 0.4
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/skins` | All monitored skins with scores |
| GET | `/api/skins/:id` | Detail + history for one skin |
| POST | `/api/skins/monitor` | Add skin to monitoring |
| DELETE | `/api/skins/:id/monitor` | Remove from monitoring |
| POST | `/api/skins/:id/analyze` | Trigger fresh analysis |
| GET | `/api/analysis/alerts` | Skins above threshold |
| POST | `/api/analysis/run` | Trigger full pipeline |
| GET | `/api/analysis/stats` | System statistics |
| GET | `/api/health` | Health check |

## Automated Monitoring

- Cron job runs every 6 hours (`0 */6 * * *`)
- Fetches fresh data for all monitored skins
- Persists snapshots to SQLite
- Triggers webhook if pump probability ≥ 70

## Dashboard Features

- **Alert Panel**: Skins with score >70 highlighted prominently
- **Skin Table**: Color-coded rows (green/yellow/red) with score bars
- **Detail View**: Price chart, volume comparison, score history, buyer distribution
- **Filters**: Score threshold, weapon type, price range, time window
- **Auto-refresh**: Every 30 minutes with last-updated timestamp
- **Manual Pipeline**: One-click trigger from UI
