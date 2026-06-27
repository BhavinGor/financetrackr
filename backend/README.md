# Backend

## APIs

- `POST /api/pdf/parse` -> parse PDF and return structured transactions JSON
- `GET /api/pdf/health` -> pdf parser health
- `GET /api/localdb/state?user_id=...` -> read user state from SQLite
- `PUT /api/localdb/state` -> save user state to SQLite

## Flags

### OCR
- `OCR_PROVIDER=legacy|docling|lighton_hf|ollama_lighton`
- `OCR_MODEL_ID=lightonai/LightOnOCR-2-1B` (for `lighton_hf`)
- `OCR_OLLAMA_URL=http://localhost:11434/api/generate`
- `OCR_OLLAMA_MODEL=maternion/LightOnOCR-2` (for `ollama_lighton`)

### JSON extraction
- `JSON_PROVIDER=ollama|openrouter|bedrock`
- `OLLAMA_URL=http://localhost:11434/api/generate`
- `OLLAMA_MODEL=llama3.2:latest`

### Storage
- `SQLITE_DB_PATH=backend/data/financetrackr.db`

## Run

```bash
pip install -r backend/requirements.txt
python3 backend/main.py
```

Optional OCR deps:

```bash
pip install -r backend/requirements-ocr.txt
```

## Recommended (your setup)

```env
OCR_PROVIDER=ollama_lighton
OCR_OLLAMA_MODEL=maternion/LightOnOCR-2
JSON_PROVIDER=ollama
OLLAMA_MODEL=llama3.2:latest
```
