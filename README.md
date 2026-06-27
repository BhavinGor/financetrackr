# FinanceTrackr

FinanceTrackr runs as:
- React frontend (`frontend/`)
- Flask backend (`backend/`)
- Local auth (browser storage)
- Local app data in SQLite (`backend/data/financetrackr.db` by default)

## 1) Install

```bash
npm install
pip install -r backend/requirements.txt
```

Optional OCR extras (needed for `docling`, `lighton_hf`, or `ollama_lighton` because PDF pages are rendered as images):

```bash
pip install -r backend/requirements-ocr.txt
```

## 2) Ollama Models

For your setup:

```bash
ollama pull llama3.2:latest
ollama pull maternion/LightOnOCR-2
```

Quick checks:

```bash
ollama run llama3.2:latest "say ok"
ollama run maternion/LightOnOCR-2 "extract text"
```

## 3) Environment (`.env.local`)

Start from `.env.local.example`.

Recommended for your requested stack:

```env
# JSON extraction model
JSON_PROVIDER=ollama
USE_OLLAMA=true
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=llama3.2:latest

# OCR model
OCR_PROVIDER=ollama_lighton
OCR_OLLAMA_URL=http://localhost:11434/api/generate
OCR_OLLAMA_MODEL=maternion/LightOnOCR-2

# Local DB
SQLITE_DB_PATH=backend/data/financetrackr.db

# App server
FLASK_DEBUG=True
FLASK_PORT=5000
ALLOWED_ORIGINS=http://localhost:5173
```

## 4) Run

Terminal 1:

```bash
python3 backend/main.py
```

Terminal 2:

```bash
npm run dev
```

Frontend: `http://localhost:5173`

## 5) Provider Toggle Matrix

### OCR provider (`OCR_PROVIDER`)
- `legacy`: existing pdfplumber/PyPDF2 text extraction (old path)
- `docling`: Docling extractor path
- `lighton_hf`: Hugging Face local pipeline (`lightonai/LightOnOCR-2-1B`)
- `ollama_lighton`: Ollama vision OCR (`maternion/LightOnOCR-2`)

### JSON provider (`JSON_PROVIDER`)
- `ollama`: local Ollama text model (`OLLAMA_MODEL`)
- `openrouter`: OpenRouter path (`OPENROUTER_API_KEY` required)
- `bedrock`: AWS Bedrock path (`VITE_AWS_ACCESS_KEY_ID`, `VITE_AWS_SECRET_ACCESS_KEY` required)

These are independent, so you can mix old/new paths, e.g.:
- old OCR + new JSON: `OCR_PROVIDER=legacy`, `JSON_PROVIDER=ollama`
- new OCR + old JSON: `OCR_PROVIDER=ollama_lighton`, `JSON_PROVIDER=bedrock`

## 6) Local DB Notes

- Backend endpoint for state: `/api/localdb/state`
- Data is per logged-in local user id.
- Login remains local (not Supabase).

## 7) Troubleshooting

- `PROCESSING_FAILED` with `ollama`: confirm Ollama daemon is running and model is pulled.
- OCR path fails with image errors: install `backend/requirements-ocr.txt`.
- Bedrock selected but missing keys: set AWS env vars or switch `JSON_PROVIDER=ollama`.
- To revert to previous extraction behavior quickly:
  - `OCR_PROVIDER=legacy`
  - `JSON_PROVIDER=bedrock` (or your previous provider)
