# MineWatch Frontend — Stage 10

## Final frontend integration and diagnostics pass

This stage is based on Stage 9 and adds a read-only **System Diagnostics** page. It checks the existing backend endpoints used by the frontend without changing the FastAPI backend or database.

### Run

```powershell
cd frontend
npm install
npm run dev
```

Backend:

```powershell
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload --host 127.0.0.1 --port 8080
```

### Routes

- `/`
- `/monitoring`
- `/sensors`
- `/ai-analysis`
- `/gis`
- `/alerts`
- `/history`
- `/settings`
- `/diagnostics`

Open **Settings → System diagnostics** to run the final browser-to-backend checks.

### API contract checks

- `GET /api/nodes`
- `GET /api/sensors/latest`
- `GET /api/ai/latest`
- `GET /api/ai/history`
- `GET /api/ai/summary`
- `GET /api/alerts?limit=200`

The diagnostics page performs GET-only checks. It does not acknowledge or resolve alerts.

### Scope

A passing diagnostics run proves browser/API connectivity and response availability. It does not prove ESP32 sensor accuracy, ESP-NOW reliability, database persistence under hardware load, or ML calibration. Those are hardware/integration tests.
