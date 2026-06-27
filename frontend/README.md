# FinanceTrackr Frontend

React + TypeScript frontend served by Vite (`root: frontend`).

## Auth and Data

- Login/session: local browser auth shim (`src/services/supabase/client.ts`)
- Data persistence: backend SQLite (`src/services/supabase/database.ts` -> `/api/localdb/state`)

## PDF Import

- Frontend sends PDFs to `http://localhost:5000/api/pdf/parse`
- Backend OCR + JSON providers are toggleable by env flags

## Commands

```bash
npm install
npm run dev
npm run build
```
