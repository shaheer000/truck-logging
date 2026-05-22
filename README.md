# TruckLog Pro

FMCSA-compliant ELD trip planner and daily-log generator. Enter current location,
pickup, dropoff, and cycle hours used; get a routed plan with HOS-compliant rest/fuel
stops and printable daily log sheets.

- **Backend:** Django + Django REST Framework (SQLite by default, Postgres optional)
- **Frontend:** React + Vite + Tailwind, Zustand, Leaflet, Recharts, jsPDF
- **Routing:** OpenRouteService (truck profile) with a haversine fallback when no key is set
- **Geocoding:** Nominatim (OpenStreetMap)

## Backend

```bash
cd backend
python -m venv venv
venv/Scripts/activate         # Windows; use `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # optional: set ORS_API_KEY, USE_POSTGRES, etc.
python manage.py migrate
python manage.py test trips   # runs the HOS engine test suite
python manage.py runserver 8000
```

Without an `ORS_API_KEY`, routing falls back to a straight-line haversine estimate so the
app still works offline. Set `USE_POSTGRES=True` (and the `POSTGRES_*` vars) to use Postgres
instead of SQLite — install `psycopg2-binary` first.

### API

Auth uses DRF token auth. Register or log in, then send `Authorization: Token <key>`
on every trip request. Trips are owner-scoped — a driver only sees their own.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/register/` | no | Create a driver (username, password, full_name, optional license/carrier); returns token |
| POST | `/api/auth/login/` | no | Log in; returns token + driver profile |
| GET | `/api/auth/me/` | yes | Current driver profile |
| POST | `/api/trip/calculate/` | yes | Calculate a trip (saved as `pending`); returns summary, stops, geometry, log sheets |
| GET | `/api/trips/` | yes | Trip history (`?status=confirmed` to filter) |
| GET | `/api/trip/<uuid>/` | yes | Fetch a saved trip |
| GET | `/api/trip/<uuid>/logs/` | yes | Fetch only the log sheets for a trip |
| POST | `/api/trip/<uuid>/confirm/` | yes | Mark a trip `confirmed` so it appears in history |

## Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173 — proxies /api to http://localhost:8000
npm run build
```

> Note: if your repo path contains spaces, npm's bin shims can fail to resolve. Invoke Vite
> directly: `node node_modules/vite/bin/vite.js` and `node node_modules/vite/bin/vite.js build`.

## Design

The visual system (fonts, colors, spacing, HOS status colors, log-sheet SVG coordinates)
is defined in `DESIGN.md`. The HOS scheduling rules and API contract are in `PRODUCT_DESIGN.md`.
