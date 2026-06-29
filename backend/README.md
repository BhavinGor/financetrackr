# Backend

Python Flask backend for FinanceTrackr. Handles PDF parsing, AI-powered transaction extraction, and all CRUD operations via a local SQLite database.

## Quick Start

```bash
pip install -r backend/requirements.txt
python3 backend/main.py
```

Server starts on `http://localhost:5000`.

Optional OCR dependencies (for `docling`, `lighton_hf`, `ollama_lighton`):

```bash
pip install -r backend/requirements-ocr.txt
```

## Project Structure

```
backend/
├── main.py                 # App entry point, Flask factory, CORS setup
├── config.py               # Environment variable loading and validation
├── db_store.py             # SQLite CRUD operations (accounts, transactions, etc.)
├── schema.sql              # SQLite schema (auto-applied on startup)
├── api/                    # Flask blueprints (route definitions)
│   ├── routes.py           # Blueprint registration
│   ├── pdf_routes.py       # POST /api/pdf/parse, GET /api/pdf/health
│   ├── localdb_routes.py   # All entity CRUD endpoints
│   └── ai_routes.py        # POST /api/ai/insights, /api/ai/extract
├── services/               # Business logic layer
│   ├── ocr_provider.py     # OCR strategy dispatch (encrypted/non-encrypted)
│   ├── pdf_extractor.py    # Legacy text extraction (pdfplumber/PyPDF2)
│   ├── docling_extractor.py# Docling document understanding
│   ├── ocr_lighton.py      # HuggingFace LightOnOCR-2 pipeline
│   ├── ocr_ollama.py       # Ollama vision model OCR
│   ├── ai_formatter.py     # LLM-based extraction (Ollama/Bedrock)
│   └── transaction_parser.py # JSON parsing from AI responses
├── llm/                    # LLM client implementations
│   ├── openrouter_client.py# OpenRouter API with model fallback
│   ├── model_registry.py   # Model priority list
│   ├── response_validator.py # JSON response validation
│   └── retry_handler.py    # Retry logic with backoff
├── utils/
│   ├── logger.py           # Logging setup
│   └── validators.py       # Request validation
├── tests/                  # Backend tests
├── data/                   # SQLite database files (auto-created, gitignored)
├── requirements.txt        # Core dependencies
└── requirements-ocr.txt    # Optional OCR dependencies
```

## API Reference

### PDF Routes (`/api/pdf`)

| Method | Endpoint | Description | Request |
|--------|----------|-------------|---------|
| `POST` | `/api/pdf/parse` | Parse PDF, extract transactions | `multipart/form-data`: `file` (PDF), `password` (optional) |
| `GET` | `/api/pdf/health` | Health check | — |

### LocalDB Routes (`/api/localdb`)

**State (Legacy)**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/state?user_id=...` | Get all user data (legacy migration) |
| `PUT` | `/state` | Save all user data (legacy migration) |

**Accounts**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/accounts?user_id=...` | List user accounts |
| `POST` | `/accounts` | Create account (body: `user_id`, `account`) |
| `PUT` | `/accounts/:id` | Update account (body: `user_id`, `account`) |
| `DELETE` | `/accounts/:id?user_id=...` | Delete account |

**Transactions**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/transactions?user_id=...` | List transactions (includes fuel/investment metadata) |
| `POST` | `/transactions` | Create transaction (body: `user_id`, `transaction`, optional `fuelData`, `investmentData`) |
| `PUT` | `/transactions/:id` | Update transaction (body: `user_id`, `transaction`) |
| `DELETE` | `/transactions/:id?user_id=...` | Delete transaction |

**Fuel**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/fuel?user_id=...&vehicle_id=...` | List fuel transactions (optionally filtered by vehicle) |

**Investments**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/investments?user_id=...` | List investment transactions |

**Budgets**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/budgets?user_id=...` | List budgets |
| `PUT` | `/budgets` | Save budgets (body: `user_id`, `budgets[]` — replaces all) |

**Vehicles**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/vehicles?user_id=...` | List vehicles |
| `POST` | `/vehicles` | Create vehicle (body: `user_id`, `vehicle`) |
| `PUT` | `/vehicles/:id` | Update vehicle (body: `user_id`, `vehicle`) |
| `DELETE` | `/vehicles/:id?user_id=...` | Delete vehicle |

**Custom Categories**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/categories?user_id=...` | List custom categories |
| `POST` | `/categories` | Create category (body: `user_id`, `name`) |
| `DELETE` | `/categories/:name?user_id=...` | Delete category |

**Health**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check |

### AI Routes (`/api/ai`)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/ai/insights` | Generate AI financial insights | `{ transactions, balance, provider, user_id }` |
| `POST` | `/ai/extract` | Extract transactions from text | `{ pdf_text, provider, user_id }` |

## Configuration

All configuration is loaded from `.env.local` (or parent directories). Copy `.env.local.example` to get started.

### Core Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_DEBUG` | `True` | Enable Flask debug mode |
| `FLASK_PORT` | `5000` | Server port |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS origins (comma-separated) |
| `SQLITE_DB_PATH` | `backend/data/financetrackr.db` | SQLite database path |

### AI Provider Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `JSON_PROVIDER` | `ollama` or `bedrock` | Transaction extraction provider |
| `USE_OLLAMA` | `true` | Use Ollama as default |
| `OLLAMA_URL` | `http://localhost:11434/api/generate` | Ollama API endpoint |
| `OLLAMA_MODEL` | `llama3.2:latest` | Ollama model for extraction |
| `GEMINI_API_KEY` | — | Google Gemini API key |
| `OPENROUTER_API_KEY` | — | OpenRouter API key |
| `AWS_ACCESS_KEY_ID` | — | AWS key (Bedrock only) |
| `AWS_SECRET_ACCESS_KEY` | — | AWS secret (Bedrock only) |
| `AWS_REGION` | `us-east-1` | AWS region (Bedrock only) |

### OCR Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `OCR_PROVIDER` | `legacy` | OCR engine: `legacy`, `docling`, `lighton_hf`, `ollama_lighton` |
| `OCR_OLLAMA_URL` | `http://localhost:11434/api/generate` | Ollama endpoint for OCR |
| `OCR_OLLAMA_MODEL` | `maternion/LightOnOCR-2` | Vision model for OCR |
| `OCR_MODEL_ID` | `lightonai/LightOnOCR-2-1B` | HuggingFace model (for `lighton_hf`) |

## Providers

### OCR Providers

| Provider | Value | Description | Dependencies |
|----------|-------|-------------|--------------|
| Legacy | `legacy` | pdfplumber/PyPDF2 text extraction | None (core deps) |
| Docling | `docling` | Docling document understanding | `docling` |
| LightOn HF | `lighton_hf` | HuggingFace local pipeline | `transformers`, `torch`, `Pillow` |
| Ollama LightOn | `ollama_lighton` | Ollama vision model | Ollama + vision model |

### JSON Extraction Providers

| Provider | Value | Description | Requirements |
|----------|-------|-------------|--------------|
| Ollama | `ollama` | Local LLM (recommended) | Ollama running + model |
| Bedrock | `bedrock` | AWS Bedrock Nova Pro | AWS credentials |
| OpenRouter | `openrouter` | OpenRouter with model fallback | API key |
| Gemini | `gemini` | Google Gemini | API key |

## Architecture

### Request Flow (PDF Import)

```
PDF Upload → validate_pdf_file → extract_text (OCR provider)
    → AI formatting (Ollama/Bedrock/OpenRouter/Gemini)
    → parse_ai_response (JSON extraction)
    → Return structured transactions
```

### OCR Pipeline

The `ocr_provider.py` module handles two paths:

1. **Non-encrypted PDFs** — Saved to temp file, dispatched to configured OCR provider
2. **Encrypted PDFs** — Prompted for password, decrypted to temp file, dispatched to OCR provider

If the configured OCR provider fails, the system **falls back to legacy extraction** (pdfplumber/PyPDF2) automatically.

### Service Layer

| Service | Purpose |
|---------|---------|
| `ocr_provider.py` | Strategy dispatch — routes to the correct OCR engine |
| `pdf_extractor.py` | Legacy text extraction via pdfplumber and PyPDF2 |
| `docling_extractor.py` | Docling document understanding extraction |
| `ocr_lighton.py` | HuggingFace LightOnOCR-2 local pipeline |
| `ocr_ollama.py` | Ollama vision model for OCR |
| `ai_formatter.py` | Sends extracted text to LLM for structured JSON output |
| `transaction_parser.py` | Extracts and validates JSON from AI responses |

## Database

SQLite database auto-initializes on first startup:

1. `config.py` reads `SQLITE_DB_PATH` (default: `backend/data/financetrackr.db`)
2. `db_store.init_db()` creates the directory if needed
3. `schema.sql` is executed (CREATE TABLE IF NOT EXISTS)
4. Database is ready

**Tables:** `users`, `accounts`, `transactions`, `budgets`, `vehicles`, `fuel_extensions`, `investment_extensions`, `custom_categories`

**Reset:** `rm backend/data/financetrackr.db` and restart the server.

## Health Checks

```bash
curl http://localhost:5000/api/pdf/health
# {"status":"ok","service":"pdf-parser"}

curl http://localhost:5000/api/localdb/health
# {"status":"ok","service":"localdb"}
```

## Testing

```bash
pytest backend/tests/
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `PROCESSING_FAILED` with Ollama | Verify Ollama is running: `curl http://localhost:11434/api/tags`. Pull model: `ollama pull llama3.2:latest` |
| PDF OCR fails with image errors | Install OCR deps: `pip install -r backend/requirements-ocr.txt` |
| Bedrock missing credentials | Set `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`, or switch `JSON_PROVIDER=ollama` |
| Port in use | Change `FLASK_PORT` in `.env.local` |
| Encrypted PDF fails | Ensure password is correct; system falls back to legacy extraction on OCR failure |
