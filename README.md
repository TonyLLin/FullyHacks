# Shoal 🐟
> Navigate together — a collaborative road trip planner

## What it does
Plan multi-day road trips with friends. Add stops, assign them to days, 
see routes colored by day on a live map, and track trip costs.

## Tech Stack
- **Frontend**: React, Leaflet
- **Backend**: Flask + Python
- **Data**: OpenStreetMap, OSRM, Nominatim (all free, no API keys)

## Running locally

### Prerequisites
- Python 3.9+
- Node.js 18+

### Setup
```bash
# Terminal 1 — backend
cd backend
pip install -r requirements.txt
flask --app main run --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install --legacy-peer-deps
npm start
```

Open http://localhost:3000
