# FinanceTrackr

**A full-stack personal finance management app with AI-powered PDF bank statement import.**

Track transactions, manage accounts, set budgets, monitor vehicles & fuel spending, and grow savings & investments — all from a single dashboard. Import bank statements via PDF with OCR + LLM extraction, or add transactions manually.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React Frontend (:5173)                       │
│  ┌──────────┐ ┌────────────┐ ┌─────────┐ ┌──────┐ ┌────────────┐  │
│  │Dashboard │ │Transactions│ │Accounts │ │Budget│ │Vehicles/   │  │
│  │  Page    │ │    Page    │ │  Page   │ │ Page │ │Savings Page│  │
│  └────┬─────┘ └─────┬──────┘ └────┬────┘ └──┬───┘ └─────┬──────┘  │
│       │              │             │          │            │         │
│  ┌────┴──────────────┴─────────────┴──────────┴────────────┴────┐   │
│  │              Zustand Stores (auth, transaction,              │   │
│  │              account, budget, vehicle)                       │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────┴───────────────────────────────────┐   │
│  │  Services: Supabase Client Shim, PDF API, Bedrock Proxy,    │   │
│  │            Gemini, Gmail                                      │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────┘
                              │ HTTP (fetch)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Flask Backend (:5000)                           │
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │ /api/pdf/*   │ │ /api/localdb │ │ /api/ai/*    │               │
│  │ PDF Parsing  │ │ CRUD + State │ │ Insights +   │               │
│  │ + OCR        │ │ SQLite       │ │ Extraction   │               │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘               │
│         │                │                 │                        │
│  ┌──────┴───────┐  ┌─────┴──────┐  ┌──────┴───────┐              │
│  │ OCR Provider │  │  db_store  │  │ AI Formatter │              │
│  │ (Strategy)   │  │  (SQLite)  │  │ (Ollama/     │              │
│  │ legacy/      │  │            │  │  Bedrock/    │              │
│  │ docling/     │  │            │  │  OpenRouter/ │              │
│  │ lighton_hf/  │  │            │  │  Gemini)     │              │
│  │ ollama_lighton│  │            │  │              │              │
│  └──────┬───────┘  └────────────┘  └──────────────┘              │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────┐                         │
│  │         Ollama (Local LLM)           │                         │
│  │  llama3.2:latest (JSON extraction)   │                         │
│  │  maternion/LightOnOCR-2 (OCR)        │                         │
│  └──────────────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
```

**Data flow:**
1. User uploads PDF or adds transaction manually in the React frontend
2. Frontend sends request to Flask backend (`/api/pdf/parse` or `/api/localdb/*`)
3. Backend runs OCR on the PDF (via configured OCR provider) to extract raw text
4. Extracted text is sent to an LLM (Ollama, Bedrock, OpenRouter, or Gemini) for structured JSON extraction
5. Parsed transactions are returned to the frontend for review and confirmation
6. Confirmed transactions are saved to local SQLite via `/api/localdb/*`
7. Dashboard aggregates and visualizes all data with charts and KPIs

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Zustand, Recharts, Lucide Icons |
| **Backend** | Python 3, Flask, flask-cors, python-dotenv |
| **Database** | SQLite (local, auto-initialized), Supabase PostgreSQL (optional) |
| **OCR** | PyPDF2, pdfplumber, Docling, LightOn OCR (HuggingFace), Ollama vision |
| **AI / LLM** | Ollama (local), AWS Bedrock, OpenRouter, Google Gemini |
| **Auth** | Local browser-based (localStorage), Supabase Auth (optional) |
| **PDF Handling** | PyPDF2, pycryptodome (encrypted PDFs), PyMuPDF (OCR) |

---

## Project Structure

```
financetrackr/
├── frontend/                    # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── layout/          # Sidebar, navigation
│   │   │   ├── ui/              # Button, Card, Input, Modal, Select, Badge, ConfirmDialog
│   │   │   └── shared/          # Shared components
│   │   ├── pages/               # Page-level components
│   │   │   ├── Dashboard/       # KPIs, charts, AI insights
│   │   │   ├── Transactions/    # Transaction list, PDF import, add/edit modals
│   │   │   ├── Accounts/        # Account management
│   │   │   ├── Budget/          # Budget tracking per category
│   │   │   ├── Vehicles/        # Vehicle management, fuel logs
│   │   │   ├── Savings/         # Investment tracking, portfolio view
│   │   │   ├── Profile/         # Settings page
│   │   │   └── Login.tsx        # Authentication page
│   │   ├── stores/              # Zustand state management
│   │   │   ├── authStore.ts     # Session, sign in/out
│   │   │   ├── transactionStore.ts  # Transactions, fuel, investments
│   │   │   ├── accountStore.ts  # Bank accounts
│   │   │   ├── budgetStore.ts   # Budget limits per category
│   │   │   └── vehicleStore.ts  # Vehicle fleet
│   │   ├── services/            # API and external service integrations
│   │   │   ├── supabase/        # Local auth shim + database queries
│   │   │   ├── external/        # Bedrock, Gemini, Gmail, PDF API
│   │   │   └── storage/         # Category storage
│   │   ├── hooks/               # Custom React hooks (usePdfImport)
│   │   ├── types/               # TypeScript type definitions
│   │   ├── utils/               # Formatting, ID generation
│   │   ├── constants/           # App constants
│   │   └── config.ts            # Frontend configuration
│   └── styles/                  # Global styles
│
├── backend/                     # Python Flask backend
│   ├── main.py                  # App entry point, Flask factory
│   ├── config.py                # Environment config loading
│   ├── db_store.py              # SQLite database operations
│   ├── schema.sql               # SQLite schema (auto-applied)
│   ├── api/                     # Flask blueprints (route definitions)
│   │   ├── routes.py            # Blueprint registration
│   │   ├── pdf_routes.py        # POST /api/pdf/parse, GET /api/pdf/health
│   │   ├── localdb_routes.py    # CRUD for accounts, transactions, budgets, vehicles, categories
│   │   └── ai_routes.py         # POST /api/ai/insights, /api/ai/extract (proxied)
│   ├── services/                # Business logic
│   │   ├── ocr_provider.py      # OCR strategy dispatch (encrypted/non-encrypted)
│   │   ├── pdf_extractor.py     # Legacy PDF text extraction (pdfplumber/PyPDF2)
│   │   ├── docling_extractor.py # Docling OCR path
│   │   ├── ocr_lighton.py       # HuggingFace LightOn OCR
│   │   ├── ocr_ollama.py        # Ollama vision OCR
│   │   ├── ai_formatter.py      # LLM-based transaction extraction (Ollama/Bedrock)
│   │   └── transaction_parser.py # JSON parsing from AI response
│   ├── llm/                     # LLM client implementations
│   │   ├── openrouter_client.py # OpenRouter API with model fallback
│   │   ├── model_registry.py    # Model priority list
│   │   ├── response_validator.py # JSON response validation
│   │   └── retry_handler.py     # Retry logic with backoff
│   ├── utils/                   # Utilities
│   │   ├── logger.py            # Logging setup
│   │   └── validators.py        # Request validation
│   ├── tests/                   # Backend tests
│   └── data/                    # SQLite database files (gitignored)
│
├── supabase/                    # Supabase SQL schemas (optional cloud DB)
│   ├── schema.sql               # Full PostgreSQL schema with RLS policies
│   └── new_changes.sql          # Migration changes
│
├── .env.local.example           # Environment variable template
├── start.sh                     # One-command startup script
├── package.json                 # Frontend dependencies and scripts
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── vitest.config.ts             # Test configuration
└── UI_UX_Instructions.md        # Design system principles
```

---

## Features

### Dashboard & Analytics

The dashboard provides a real-time overview of your financial health:

- **KPI Cards** — Total net worth, monthly income, monthly expenses, and budget utilization at a glance
- **Spending Trend Chart** — Daily expense breakdown for the current month
- **Income vs Expense Chart** — 6-month rolling comparison
- **Category Breakdown** — Pie chart of spending by category
- **Savings Widget** — Savings rate visualization
- **Upcoming Bills Widget** — Reminder for upcoming due dates
- **AI Financial Insights** — One-click AI-generated analysis of your spending patterns using Bedrock/Gemini
- **Time Range Filtering** — Toggle between This Month, Last Month, This Year, All Time, or pick a custom month

### Transaction Management

Full CRUD for income and expense transactions:

- **Manual Entry** — Add transactions with date, amount, type, category, description, account, and notes
- **PDF Import** — Upload bank statement PDFs for automatic transaction extraction (see PDF Import Pipeline below)
- **Filtering & Search** — Filter by search text, month, and account
- **Categories** — 13 built-in categories (Food, Groceries, Rent, Transport, Fuel, Utilities, Shopping, Entertainment, Salary, Freelance, Vehicle Maint., Insurance, Savings, Other) plus custom categories
- **Transaction Sources** — Track whether transactions came from manual entry, Gmail, CSV, or PDF import
- **Bulk Import** — Import multiple transactions at once from PDF extraction

### PDF Import Pipeline

The core differentiator — AI-powered bank statement parsing:

1. **Upload** — User selects a PDF bank statement (supports encrypted PDFs with password)
2. **OCR** — Text is extracted using the configured OCR provider:
   - `legacy` — pdfplumber/PyPDF2 text extraction (fast, no AI needed)
   - `docling` — Docling document understanding
   - `lighton_hf` — HuggingFace LightOnOCR-2 local pipeline
   - `ollama_lighton` — Ollama vision model (recommended)
3. **AI Extraction** — Extracted text is sent to an LLM for structured JSON parsing:
   - `ollama` — Local Ollama model (default, no API key needed)
   - `bedrock` — AWS Bedrock (Nova Pro)
   - `openrouter` — OpenRouter API with model fallback
   - `gemini` — Google Gemini
4. **Review** — Transactions are displayed in an import panel with PDF preview
5. **Confirm** — User reviews, edits if needed, and confirms to bulk-add transactions

Supports password-protected PDFs with automatic fallback from OCR to legacy extraction.

### Account Management

Manage multiple bank accounts:

- **Account Types** — Checking, Savings, Credit Card, Wallet, Investment
- **Fields** — Name, bank name, balance, currency (default INR), credit limit, due date
- **CRUD** — Add, edit, delete accounts with cascading transaction cleanup
- **Auto-creation** — Accounts can be auto-created during PDF import from extracted account info

### Budget Tracking

Set and monitor spending limits per category:

- **Per-Category Limits** — Set monthly or yearly budget limits for each spending category
- **Visual Progress** — Dashboard shows budget utilization percentage
- **Remaining Balance** — Real-time calculation of how much budget is left
- **Persistent Storage** — Budgets are saved per user in SQLite

### Vehicle & Fuel Tracking

Track your vehicles and fuel expenses:

- **Vehicle Management** — Add vehicles with make, model, year, license plate, type (SUV, Sedan, etc.)
- **Fuel Logs** — Record fuel purchases with liters, cost, mileage, and date
- **Mileage Charts** — Visualize fuel efficiency over time per vehicle
- **Linked Transactions** — Fuel purchases are linked to both the vehicle and the transaction ledger
- **Per-Vehicle View** — Filter fuel logs by selected vehicle

### Savings & Investment Tracking

Monitor your investment portfolio:

- **Investment Types** — Indian Stock, US Stock, Mutual Fund (IN/US), Bond, IPO, Gold, Fixed Deposit, Crypto, Other
- **Portfolio Fields** — Name, type, invested amount, current value, quantity, date
- **Performance Metrics** — Total invested, current value, gain/loss per investment
- **Pie Chart** — Asset allocation breakdown by investment type
- **Transaction Extension** — Investments are stored as transaction records with metadata extensions

### Authentication

Local browser-based authentication:

- **Sign Up / Sign In** — Email + password, stored in localStorage
- **Session Management** — 7-day session expiry, automatic renewal
- **Password Hashing** — SHA-256 hashing in browser
- **Auth State** — Zustand store manages session across the app
- **No Server Dependency** — All auth is handled client-side (no Supabase required)

### Custom Categories

Extend the built-in category list:

- **Add Custom** — Create your own spending categories
- **Delete Custom** — Remove categories you no longer need
- **Per-User** — Categories are scoped to each user
- **Unique Constraint** — No duplicate category names per user

---

## Frontend Architecture

### State Management (Zustand)

Five stores manage all application state:

| Store | Purpose | Key Data |
|---|---|---|
| `authStore` | Authentication session | `session`, `loading`, `setSession()`, `signOut()` |
| `transactionStore` | Transactions, fuel logs, investments | `transactions[]`, `fuelLogs[]`, `investments[]`, CRUD operations |
| `accountStore` | Bank accounts | `accounts[]`, `addAccount()`, `updateAccount()`, `deleteAccount()` |
| `budgetStore` | Budget limits | `budgets[]`, `saveBudgets()`, computed `spent` per category |
| `vehicleStore` | Vehicle fleet | `vehicles[]`, `addVehicle()`, `updateVehicle()`, `deleteVehicle()` |

### Services Layer

| Service | Purpose |
|---|---|
| `supabase/client.ts` | Local auth shim — maintains `supabase.auth.*` API surface using localStorage |
| `supabase/database.ts` | All CRUD operations — proxies to Flask backend `/api/localdb/*` |
| `external/pdf.ts` | PDF upload and parsing via Flask backend `/api/pdf/parse` |
| `external/bedrock.ts` | AI insights and transaction extraction via `/api/ai/*` |
| `external/gemini.ts` | Gemini-based AI insights |
| `external/gmail.ts` | Gmail sync integration (stub) |
| `storage/categoryStorage.ts` | Custom category persistence |

### Key Hooks

- `usePdfImport` — Orchestrates the entire PDF import flow: file upload, backend call, response parsing, password handling, and bulk transaction creation

### UI Components

Reusable component library in `components/ui/`:

| Component | Description |
|---|---|
| `Button` | Primary, secondary, destructive variants with loading state |
| `Card` | Container with header, content, optional footer |
| `Input` | Text input with label and validation |
| `Select` | Dropdown select |
| `Modal` | Overlay modal dialog |
| `Badge` | Status/category badges |
| `ConfirmDialog` | Destructive action confirmation |

---

## Backend Architecture

### Flask Application

- **Factory Pattern** — `create_app()` initializes Flask with CORS, routes, and SQLite
- **Blueprint-based Routing** — Three blueprints: `pdf`, `localdb`, `ai`
- **Configuration** — Loaded from `.env.local` via `python-dotenv`, supports multiple env file locations

### Service Layer

| Service | Purpose |
|---|---|
| `ocr_provider.py` | Strategy pattern for OCR dispatch — handles encrypted vs non-encrypted PDFs, delegates to the configured provider |
| `pdf_extractor.py` | Legacy text extraction using pdfplumber/PyPDF2 |
| `docling_extractor.py` | Docling document understanding extraction |
| `ocr_lighton.py` | HuggingFace LightOnOCR-2 local pipeline |
| `ocr_ollama.py` | Ollama vision model for OCR |
| `ai_formatter.py` | LLM-powered structured extraction (Ollama or Bedrock) |
| `transaction_parser.py` | JSON extraction and validation from AI responses |

### OCR Pipeline

```
PDF Input
    │
    ▼
Check Encryption ──── Encrypted ──→ Prompt for Password ──→ Decrypt ──→ Save Temp File
    │                                                                      │
    │ Not Encrypted                                                        │
    │                                                                      ▼
    └──────────────────────────────────────────────────────────→ Dispatch to OCR Provider
                                                                           │
                                                              ┌────────────┼────────────┐
                                                              ▼            ▼            ▼
                                                          docling    lighton_hf    ollama_lighton
                                                              │            │            │
                                                              └────────────┼────────────┘
                                                                           │
                                                                     Extracted Text
                                                                           │
                                                                           ▼
                                                              Fallback to legacy on failure
```

### LLM Integration

**Ollama (Local):**
- Direct HTTP POST to `http://localhost:11434/api/generate`
- Temperature: 0.1 (deterministic)
- No API key required

**AWS Bedrock:**
- Uses `boto3` client
- Model: `us.amazon.nova-pro-v1:0`
- Requires AWS credentials

**OpenRouter:**
- REST API with model fallback chain
- Retry logic with `retry_handler.py`
- JSON response validation

**Google Gemini:**
- `google-genai` SDK
- Model: `gemini-2.5-flash`
- Proxied through backend to keep API key secure

---

## Database

### Local SQLite (Default)

Auto-initialized at `backend/data/financetrackr.db`. Schema applied on startup via `backend/schema.sql`.

**Tables:**
- `users` — Local user accounts (id, email)
- `accounts` — Bank accounts (name, type, bank, balance, currency, limit, due date)
- `transactions` — All transactions (date, amount, type, category, description, source, notes)
- `budgets` — Budget limits per category (category, limit, period)
- `vehicles` — Vehicle fleet (name, make, model, year, plate, mileage, type)
- `fuel_extensions` — Fuel transaction metadata (vehicle, liters, mileage)
- `investment_extensions` — Investment metadata (type, asset, quantity, price per unit)
- `custom_categories` — User-defined categories

**Indexes:** Performance indexes on user_id, account_id, date, vehicle_id, asset_name.

### Supabase PostgreSQL (Optional)

Full schema in `supabase/schema.sql` with Row Level Security (RLS) policies. Tables mirror the SQLite schema with UUID primary keys and proper foreign key constraints. Includes validation triggers for fuel and investment extensions.

---

## AI Provider Matrix

### OCR Providers (`OCR_PROVIDER`)

| Provider | Flag Value | Description | Requires |
|---|---|---|---|
| Legacy | `legacy` | pdfplumber/PyPDF2 text extraction | Nothing extra |
| Docling | `docling` | Docling document understanding | `docling` package |
| LightOn HF | `lighton_hf` | HuggingFace local pipeline | `transformers`, `torch` |
| Ollama LightOn | `ollama_lighton` | Ollama vision OCR (recommended) | Ollama + model pulled |

### JSON Extraction Providers (`JSON_PROVIDER`)

| Provider | Flag Value | Description | Requires |
|---|---|---|---|
| Ollama | `ollama` | Local LLM (recommended) | Ollama running + model |
| Bedrock | `bedrock` | AWS Bedrock Nova Pro | AWS credentials |
| OpenRouter | `openrouter` | OpenRouter API with fallback | `OPENROUTER_API_KEY` |
| Gemini | `gemini` | Google Gemini | `GEMINI_API_KEY` |

Providers are independent — you can mix OCR and JSON providers (e.g., `ollama_lighton` OCR + `bedrock` JSON).

---

## API Reference

### PDF Endpoints (`/api/pdf`)

| Method | Endpoint | Description | Body |
|---|---|---|---|
| `POST` | `/api/pdf/parse` | Parse PDF and extract transactions | `multipart/form-data`: `file` (PDF), `password` (optional) |
| `GET` | `/api/pdf/health` | Health check | — |

**Response (`/api/pdf/parse`):**
```json
{
  "success": true,
  "data": {
    "accountInfo": { "accountNumber": "...", "bankName": "...", "linkedAccounts": [...] },
    "transactions": [{ "date": "...", "description": "...", "amount": 1234, "type": "debit" }],
    "summary": { "totalCredits": "...", "totalDebits": "...", "closingBalance": "..." },
    "extractionQuality": { "confidence": "high", "notes": "..." }
  }
}
```

### Local DB Endpoints (`/api/localdb`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/state?user_id=...` | Get all user data (legacy) |
| `PUT` | `/state` | Save all user data (legacy) |
| `GET` | `/accounts?user_id=...` | List accounts |
| `POST` | `/accounts` | Create account |
| `PUT` | `/accounts/:id` | Update account |
| `DELETE` | `/accounts/:id?user_id=...` | Delete account |
| `GET` | `/transactions?user_id=...` | List transactions |
| `POST` | `/transactions` | Create transaction (with optional fuel/investment extensions) |
| `PUT` | `/transactions/:id` | Update transaction |
| `DELETE` | `/transactions/:id?user_id=...` | Delete transaction |
| `GET` | `/fuel?user_id=...&vehicle_id=...` | List fuel transactions |
| `GET` | `/investments?user_id=...` | List investment transactions |
| `GET` | `/budgets?user_id=...` | List budgets |
| `PUT` | `/budgets` | Save budgets (replaces all) |
| `GET` | `/vehicles?user_id=...` | List vehicles |
| `POST` | `/vehicles` | Create vehicle |
| `PUT` | `/vehicles/:id` | Update vehicle |
| `DELETE` | `/vehicles/:id?user_id=...` | Delete vehicle |
| `GET` | `/categories?user_id=...` | List custom categories |
| `POST` | `/categories` | Create custom category |
| `DELETE` | `/categories/:name?user_id=...` | Delete custom category |
| `GET` | `/health` | Health check |

### AI Endpoints (`/api/ai`)

| Method | Endpoint | Description | Body |
|---|---|---|---|
| `POST` | `/ai/insights` | Generate AI financial insights | `{ transactions, balance, provider, user_id }` |
| `POST` | `/ai/extract` | Extract transactions from text | `{ pdf_text, provider, user_id }` |

---

## UI/UX Design System

FinanceTrackr follows strict design principles (defined in `UI_UX_Instructions.md`):

- **Hierarchy Over Decoration** — Visual weight represents data importance
- **Explicit Action** — All edits are intentional; no accidental changes
- **Progressive Disclosure** — Minimal by default, complex data on demand
- **Space Over Lines** — Whitespace defines sections, not heavy borders
- **State Visibility** — Loading, success, error, and unsaved states are always shown
- **8-Point Spacing System** — All spacing follows mathematical consistency

---

## License

Private project. All rights reserved.
