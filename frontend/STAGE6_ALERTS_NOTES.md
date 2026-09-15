# Stage 6 — Alerts

The page is backend-driven and does not fabricate alert records. It calls `/api/alerts/active` and `/api/alerts/history`, with acknowledge/clear actions mapped to their lifecycle endpoints when available.
