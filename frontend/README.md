# Frontend

React + TypeScript frontend for FinanceTrackr, served by Vite on `http://localhost:5173`.

## Quick Start

```bash
npm install
npm run dev
```

## Tech Stack

- **React 19** with TypeScript
- **Vite** for dev server and builds
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Recharts** for data visualization
- **Lucide React** for icons
- **Vitest** for testing

## Project Structure

```
frontend/src/
├── main.tsx                 # Entry point
├── App.tsx                  # Root component, routing, auth gate
├── config.ts                # Frontend configuration constants
├── types/
│   └── index.ts             # All TypeScript types and enums
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx      # Navigation sidebar
│   └── ui/
│       ├── Button.tsx       # Primary/secondary/destructive button
│       ├── Card.tsx         # Card container (header, content, footer)
│       ├── Input.tsx        # Text input with label
│       ├── Select.tsx       # Dropdown select
│       ├── Modal.tsx        # Overlay dialog
│       ├── Badge.tsx        # Status/category badges
│       └── ConfirmDialog.tsx# Destructive action confirmation
├── pages/
│   ├── Login.tsx            # Email/password authentication
│   ├── Dashboard/
│   │   ├── index.tsx        # KPIs, charts, AI insights
│   │   └── components/      # KPICard, SpendingChart, IncomeExpenseChart, etc.
│   ├── Transactions/
│   │   ├── index.tsx        # Transaction list, filters, PDF import
│   │   └── components/      # AddTransactionModal, TransactionImportPanel, PDFViewer, etc.
│   ├── Accounts/
│   │   └── index.tsx        # Account management
│   ├── Budget/
│   │   └── index.tsx        # Budget limits per category
│   ├── Vehicles/
│   │   ├── index.tsx        # Vehicle fleet + fuel logs
│   │   └── components/      # AddVehicleModal
│   ├── Savings/
│   │   ├── index.tsx        # Investment portfolio
│   │   └── components/      # AddInvestmentModal
│   └── Profile/
│       └── index.tsx        # Settings page
├── stores/                  # Zustand state management
│   ├── authStore.ts         # Session, sign in/out
│   ├── transactionStore.ts  # Transactions, fuel logs, investments
│   ├── accountStore.ts      # Bank accounts
│   ├── budgetStore.ts       # Budget limits per category
│   └── vehicleStore.ts      # Vehicle fleet
├── services/
│   ├── supabase/
│   │   ├── client.ts        # Local auth shim (localStorage-based)
│   │   └── database.ts      # All CRUD → Flask backend /api/localdb/*
│   ├── external/
│   │   ├── pdf.ts           # PDF upload → Flask backend /api/pdf/parse
│   │   ├── bedrock.ts       # AI insights + extraction → /api/ai/*
│   │   ├── gemini.ts        # Gemini-based AI insights
│   │   └── gmail.ts         # Gmail sync (stub)
│   └── storage/
│       └── categoryStorage.ts # Custom category persistence
├── hooks/
│   └── usePdfImport.ts      # PDF import orchestration hook
├── utils/                   # Formatting, ID generation
├── constants/               # App constants
└── styles/                  # Global styles
```

## Pages

| Page | Route | Description |
|------|-------|-------------|
| **Login** | `/` (when unauthenticated) | Email/password sign up and sign in |
| **Dashboard** | `dashboard` | KPI cards (net worth, income, expenses, budget), spending trend chart, income vs expense chart, category breakdown pie chart, savings widget, AI financial insights |
| **Transactions** | `transactions` | Transaction list with search/filter, add/edit modals, PDF import with review panel, bulk import confirmation |
| **Accounts** | `accounts` | Bank account management — add, edit, delete accounts with type, balance, bank name |
| **Budget** | `budget` | Set monthly/yearly spending limits per category, view utilization |
| **Vehicles** | `vehicles` | Add vehicles, log fuel purchases, mileage efficiency charts per vehicle |
| **Savings** | `savings` | Investment portfolio — add investments by type, view allocation pie chart, track gain/loss |
| **Settings** | `profile` | User settings |

## State Management (Zustand)

| Store | Data | Key Operations |
|-------|------|----------------|
| `authStore` | `session`, `loading` | `setSession()`, `signOut()` |
| `transactionStore` | `transactions[]`, `fuelLogs[]`, `investments[]` | `load()`, `addTransaction()`, `updateTransaction()`, `deleteTransaction()`, `bulkAddTransactions()`, `addTransactionWithExt()`, `addFuelLog()`, `addInvestment()` |
| `accountStore` | `accounts[]` | `load()`, `addAccount()`, `updateAccount()`, `deleteAccount()` |
| `budgetStore` | `budgets[]` | `load()`, `saveBudgets()`, computed `spent` per category |
| `vehicleStore` | `vehicles[]` | `load()`, `addVehicle()`, `updateVehicle()`, `deleteVehicle()` |

## Services

### Authentication (`supabase/client.ts`)

Local browser-based auth using localStorage. Mimics the Supabase auth API surface:

- `signUp({ email, password })` — Create account, auto sign-in
- `signInWithPassword({ email, password })` — Sign in
- `signOut()` — Clear session
- `getSession()` / `getUser()` — Current session
- `onAuthStateChange(callback)` — Session listener

Passwords are SHA-256 hashed in browser. Sessions expire after 7 days.

### Database (`supabase/database.ts`)

All CRUD operations proxy to the Flask backend at `VITE_API_URL/api/localdb/*`:

- `fetchTransactions()`, `addTransactionToDb()`, `updateTransactionInDb()`, `deleteTransactionFromDb()`
- `addTransactionWithExtensions()`, `updateTransactionWithExtensions()`
- `fetchAllFuelTransactions()`, `fetchAllInvestmentTransactions()`
- `fetchAccounts()`, `addAccountToDb()`, `updateAccountInDb()`, `deleteAccountFromDb()`
- `fetchBudgets()`, `saveBudgetsToDb()`
- `fetchVehicles()`, `addVehicleToDb()`, `updateVehicleInDb()`, `deleteVehicleFromDb()`
- `fetchCustomCategories()`, `addCustomCategory()`, `deleteCustomCategory()`

### External APIs

| Service | Endpoint | Purpose |
|---------|----------|---------|
| `pdf.ts` | `POST /api/pdf/parse` | Upload PDF for OCR + AI extraction |
| `bedrock.ts` | `POST /api/ai/insights` | Generate AI financial analysis |
| `bedrock.ts` | `POST /api/ai/extract` | Extract transactions from text |
| `gemini.ts` | Gemini AI insights | Alternative AI provider |

## PDF Import Flow

The `usePdfImport` hook orchestrates the entire import:

1. User selects a PDF file
2. File is sent to Flask backend (`/api/pdf/parse`)
3. Backend runs OCR → AI extraction → returns structured JSON
4. Response is parsed: transactions mapped, account info extracted
5. `TransactionImportPanel` displays extracted transactions with PDF preview
6. User reviews, edits if needed, confirms import
7. Transactions are bulk-added to SQLite via `/api/localdb/transactions`

Password-protected PDFs prompt for password and retry.

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start Vite dev server (HMR enabled) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run tests once (vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5000` | Flask backend URL |

Set in `.env.local` at the project root.
