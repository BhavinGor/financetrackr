# FinanceTrackr — Setup Guide

Everything you need to get FinanceTrackr running locally.

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | 18+ | Frontend build and dev server |
| **npm** | 9+ | Package management |
| **Python** | 3.10+ | Backend server |
| **pip** | 22+ | Python package management |
| **Ollama** | Latest | Local AI models (recommended) |

---

## Quick Start

```bash
# 1. Install dependencies
npm install
pip install -r backend/requirements.txt

# 2. Set up environment
cp .env.local.example .env.local

# 3. Pull Ollama models (if using Ollama)
ollama pull llama3.2:latest
ollama pull maternion/LightOnOCR-2

# 4. Start both servers
bash start.sh
```

Frontend: http://localhost:5173
Backend: http://localhost:5000

---

## Detailed Installation

### Frontend

```bash
npm install
```

This installs React 19, Vite, Tailwind CSS, Zustand, Recharts, and all dev dependencies.

**Dev server:**
```bash
npm run dev          # Starts Vite on :5173
```

**Build for production:**
```bash
npm run build        # Output to dist/
```

**Run tests:**
```bash
npm run test         # Single run (vitest)
npm run test:watch   # Watch mode
```

### Backend

```bash
pip install -r backend/requirements.txt
```

Core packages: Flask, flask-cors, PyPDF2, pycryptodome, pdfplumber, boto3, python-dotenv, docling, requests, pydantic, google-genai.

**Optional OCR dependencies** (only needed for `docling`, `lighton_hf`, or `ollama_lighton` providers):

```bash
pip install -r backend/requirements-ocr.txt
```

Packages: transformers, torch, PyMuPDF, Pillow. These are large packages (~2GB+ for torch).

**Start backend:**
```bash
python3 backend/main.py    # Starts Flask on :5000
```

### Ollama Setup

If using Ollama (recommended for fully local operation):

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull the JSON extraction model
ollama pull llama3.2:latest

# Pull the OCR vision model
ollama pull maternion/LightOnOCR-2

# Verify models are working
ollama run llama3.2:latest "say ok"
ollama run maternion/LightOnOCR-2 "extract text from this image"
```

**Verify Ollama is running:**
```bash
curl http://localhost:11434/api/tags
```

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

```bash
cp .env.local.example .env.local
```

### Complete Variable Reference

| Variable | Default | Description | Options |
|---|---|---|---|
| `USE_OLLAMA` | `true` | Enable Ollama as default JSON provider | `true` / `false` |
| `OLLAMA_URL` | `http://localhost:11434/api/generate` | Ollama API endpoint | Any Ollama URL |
| `OLLAMA_MODEL` | `llama3.2:latest` | Model for JSON extraction | Any Ollama model |
| `JSON_PROVIDER` | `ollama` (if USE_OLLAMA=true) else `bedrock` | AI provider for transaction extraction | `ollama` / `bedrock` / `openrouter` / `gemini` |
| `OCR_PROVIDER` | `legacy` | OCR engine for PDF text extraction | `legacy` / `docling` / `lighton_hf` / `ollama_lighton` |
| `OCR_OLLAMA_URL` | `http://localhost:11434/api/generate` | Ollama endpoint for OCR model | Any Ollama URL |
| `OCR_OLLAMA_MODEL` | `maternion/LightOnOCR-2` | Vision model for OCR | Any Ollama vision model |
| `OCR_MODEL_ID` | `lightonai/LightOnOCR-2-1B` | HuggingFace model ID (for `lighton_hf` only) | Any HF model |
| `SQLITE_DB_PATH` | `backend/data/financetrackr.db` | SQLite database file path | Any valid path |
| `VITE_API_URL` | `http://localhost:5000` | Backend API URL (frontend) | Any backend URL |
| `FLASK_DEBUG` | `True` | Flask debug mode | `True` / `False` |
| `FLASK_PORT` | `5000` | Backend server port | Any available port |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS allowed origins (comma-separated) | Any origins |
| `AWS_ACCESS_KEY_ID` | — | AWS access key (for `bedrock` only) | Your AWS key |
| `AWS_SECRET_ACCESS_KEY` | — | AWS secret key (for `bedrock` only) | Your AWS secret |
| `AWS_REGION` | `us-east-1` | AWS region (for `bedrock` only) | Any AWS region |
| `GEMINI_API_KEY` | — | Google Gemini API key (for `gemini` only) | Your Gemini key |
| `OPENROUTER_API_KEY` | — | OpenRouter API key (for `openrouter` only) | Your OpenRouter key |

### Recommended Configuration (Ollama-only, fully local)

```env
USE_OLLAMA=true
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=llama3.2:latest
JSON_PROVIDER=ollama
OCR_PROVIDER=ollama_lighton
OCR_OLLAMA_URL=http://localhost:11434/api/generate
OCR_OLLAMA_MODEL=maternion/LightOnOCR-2
SQLITE_DB_PATH=backend/data/financetrackr.db
VITE_API_URL=http://localhost:5000
FLASK_DEBUG=True
FLASK_PORT=5000
ALLOWED_ORIGINS=http://localhost:5173
```

### Minimal Configuration (AWS Bedrock)

```env
USE_OLLAMA=false
JSON_PROVIDER=bedrock
OCR_PROVIDER=legacy
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
```

---

## Server Startup

### Option 1: One-Command Script

```bash
bash start.sh
```

Starts both Flask backend and Vite dev server. Press `Ctrl+C` to stop both.

### Option 2: Two Terminals

**Terminal 1 — Backend:**
```bash
python3 backend/main.py
```

Output:
```
🚀 Starting FinanceTrackr PDF Parser API...
📍 Endpoint: http://localhost:5000/api/pdf/parse
🔧 Debug mode: True
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```

Output:
```
  VITE v6.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### Health Checks

```bash
# Backend health
curl http://localhost:5000/api/pdf/health
# {"status":"ok","service":"pdf-parser"}

curl http://localhost:5000/api/localdb/health
# {"status":"ok","service":"localdb"}
```

---

## Provider Configuration

### OCR Provider Selection

Set `OCR_PROVIDER` in `.env.local`:

| Value | Best For | Notes |
|---|---|---|
| `legacy` | Text-based PDFs | Fast, no extra dependencies. Uses pdfplumber/PyPDF2. |
| `docling` | Complex layouts | Requires `docling` package. Good for tables. |
| `lighton_hf` | Scanned documents | Requires `transformers` + `torch` (~2GB). Uses HuggingFace pipeline. |
| `ollama_lighton` | Scanned documents | Recommended. Requires Ollama + vision model. |

### JSON Extraction Provider Selection

Set `JSON_PROVIDER` in `.env.local`:

| Value | Best For | Notes |
|---|---|---|
| `ollama` | Fully local, free | Requires Ollama running. Default. |
| `bedrock` | High accuracy | Requires AWS credentials. Uses Nova Pro model. |
| `openrouter` | Model variety | Requires OpenRouter API key. Has fallback chain. |
| `gemini` | Alternative cloud | Requires Gemini API key. |

### Mixing Providers

Providers are independent. Common combinations:

| OCR | JSON | Use Case |
|---|---|---|
| `legacy` | `ollama` | Text PDFs, fully local |
| `ollama_lighton` | `ollama` | Any PDF, fully local (recommended) |
| `legacy` | `bedrock` | Text PDFs, cloud accuracy |
| `ollama_lighton` | `bedrock` | Any PDF, cloud accuracy |
| `docling` | `openrouter` | Complex layouts, model variety |

---

## Database

### SQLite (Default)

The SQLite database is **automatically created** on first backend startup:

1. Backend reads `SQLITE_DB_PATH` from env (default: `backend/data/financetrackr.db`)
2. `init_db()` creates the directory if needed
3. `schema.sql` is applied (CREATE TABLE IF NOT EXISTS)
4. Database is ready for use

**No manual setup required.** Just start the backend.

**Database file location:** `backend/data/financetrackr.db`

**To reset the database:**
```bash
rm backend/data/financetrackr.db
# Restart backend — schema will be re-applied
```

### Supabase (Optional)

If you want cloud-synced data:

1. Create a Supabase project at https://supabase.com
2. Run `supabase/schema.sql` in the Supabase SQL editor
3. Update `frontend/src/services/supabase/client.ts` to use real Supabase credentials
4. The app will then use Supabase for auth and data storage

Currently, the app uses a **local auth shim** that mimics the Supabase API surface using localStorage. No Supabase connection is needed for default operation.

---

## Common Workflows

### Import a Bank Statement PDF

1. Navigate to **Transactions** page
2. Click **Import PDF**
3. Select your bank statement PDF
4. If password-protected, enter the password when prompted
5. Wait for OCR + AI extraction (progress shown in modal)
6. Review extracted transactions in the import panel
7. Edit any transactions if needed
8. Click **Confirm Import** to add all transactions

### Add a Manual Transaction

1. Navigate to **Transactions** page
2. Click **Add Transaction**
3. Fill in: date, amount, type (Income/Expense), category, description, account
4. Optionally add notes
5. Click **Save**

### Set Up a Budget

1. Navigate to **Budget** page
2. Select a category from the dropdown
3. Enter the budget limit amount
4. Choose period (monthly/yearly)
5. Click **Add Budget**
6. Repeat for other categories

### Track Fuel Expenses

1. Navigate to **Vehicles** page
2. Add a vehicle (name, plate, type)
3. Select the vehicle from the list
4. Click **Add Fuel Log**
5. Enter liters, cost, mileage, and date
6. The fuel transaction is automatically added to your transaction ledger

### Generate AI Insights

1. Navigate to **Dashboard** page
2. Click **AI Insights** button
3. Wait for the AI to analyze your transactions
4. View the generated financial advice in the insight panel

---

## Troubleshooting

### "PROCESSING_FAILED" with Ollama

**Cause:** Ollama daemon is not running or model is not pulled.

**Fix:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve

# Pull the required models
ollama pull llama3.2:latest
ollama pull maternion/LightOnOCR-2
```

### PDF Import Fails with Image Errors

**Cause:** OCR dependencies not installed.

**Fix:**
```bash
pip install -r backend/requirements-ocr.txt
```

### "Cannot connect to PDF service" Error

**Cause:** Backend server is not running.

**Fix:**
```bash
# Start the backend
python3 backend/main.py
# Verify it's running
curl http://localhost:5000/api/pdf/health
```

### Bedrock Selected but Missing Keys

**Cause:** AWS credentials not configured.

**Fix:** Either set AWS env vars or switch to Ollama:
```env
JSON_PROVIDER=ollama
USE_OLLAMA=true
```

### Port Already in Use

**Fix:** Change the port:
```env
FLASK_PORT=5001       # Backend
```
Then update the frontend:
```env
VITE_API_URL=http://localhost:5001
```

### Frontend Shows "Loading" Forever

**Fix:** Check browser console for errors. Common causes:
- Backend not running on :5000
- CORS issues — verify `ALLOWED_ORIGINS` matches your frontend URL
- Check `VITE_API_URL` in `.env.local`

### Reset Everything

```bash
# Clear database
rm backend/data/financetrackr.db

# Clear browser data (localStorage)
# Open DevTools → Application → Local Storage → clear financetrackr_* keys

# Restart backend
python3 backend/main.py
```

---

## Development Commands

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |

### Backend

| Command | Description |
|---|---|
| `python3 backend/main.py` | Start Flask server |
| `pytest backend/tests/` | Run backend tests |

### Ollama

| Command | Description |
|---|---|
| `ollama serve` | Start Ollama daemon |
| `ollama pull <model>` | Download a model |
| `ollama list` | List installed models |
| `ollama run <model>` | Interactive chat with a model |
| `curl http://localhost:11434/api/tags` | List models via API |

---

## Reverting to Previous Behavior

If you need to quickly revert to an older extraction setup:

```env
OCR_PROVIDER=legacy
JSON_PROVIDER=bedrock   # or your previous provider
```

Then restart the backend.
