# FinanceTrackr Frontend

React + TypeScript frontend for personal finance management.

## Architecture

### Directory Structure

```
frontend/src/
├── main.tsx                 # Application entry point
├── App.tsx                  # Main app component with routing
├── pages/                   # Page-level components
│   ├── Dashboard/          # Dashboard page
│   ├── Accounts/           # Accounts management
│   ├── Transactions/       # Transaction management
│   ├── Vehicles/           # Vehicle tracking
│   ├── Budget/             # Budget management
│   ├── Savings/            # Savings & investments
│   └── Profile/            # User profile
├── components/             # Reusable components
│   ├── ui/                # UI primitives (Button, Input, Modal)
│   ├── layout/            # Layout components (Sidebar)
│   └── shared/            # Shared business components
├── services/              # API client layer
│   ├── supabase/         # Supabase operations
│   │   ├── client.ts     # Supabase client setup
│   │   ├── auth.ts       # Authentication functions
│   │   └── database.ts   # Database CRUD operations
│   ├── external/         # External APIs
│   │   ├── pdf.ts        # PDF service
│   │   ├── bedrock.ts    # AWS Bedrock AI
│   │   └── gemini.ts     # Google Gemini AI
│   └── storage/          # Local storage
│       └── categories.ts  # Category management
├── hooks/                 # Custom React hooks (future)
├── utils/                 # Utility functions (future)
├── types/                 # TypeScript types
│   └── index.ts          # Type definitions
├── constants/            # Constants
│   └── index.ts          # App constants
└── styles/               # Global styles
    └── globals.css       # Global CSS
```

## Key Concepts

### Authentication

Authentication is handled via **Supabase Auth**. See `services/supabase/auth.ts` for available functions:

- `signIn(email, password)` - Sign in user
- `signUp(email, password)` - Register new user
- `signOut()` - Sign out current user
- `getCurrentUser()` - Get current user
- `onAuthStateChange(callback)` - Listen for auth changes

### Data Flow

1. User interacts with UI component (e.g., `pages/Transactions/`)
2. Component calls service layer (e.g., `services/supabase/database.ts`)
3. Service makes API call to Supabase
4. Data flows back through the chain and updates UI

### Database Operations

All database operations go through `services/supabase/database.ts`:

- **Transactions**: `fetchTransactions`, `addTransactionToDb`, `updateTransactionInDb`, `deleteTransactionFromDb`
- **Accounts**: `fetchAccounts`, `addAccountToDb`, `updateAccountInDb`, `deleteAccountFromDb`
- **Budgets**: `fetchBudgets`, `saveBudgetsToDb`
- **Vehicles**: `fetchVehicles`, `addVehicleToDb`, `updateVehicleInDb`, `deleteVehicleFromDb`
- **Investments**: `fetchInvestments`, `addInvestmentToDb`, `updateInvestmentInDb`, `deleteInvestmentFromDb`

All functions handle:
- User authentication checks
- Case conversion (camelCase ↔ snake_case)
- Error handling

### PDF Import

PDF import uses the Python backend (`/api/pdf/parse`):

1. User uploads PDF via `PdfImportModal`
2. Frontend sends PDF to backend (`services/external/pdf.ts`)
3. Backend extracts text and uses AI to parse transactions
4. Frontend receives structured transaction data
5. User reviews and imports transactions

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create `.env.local` in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AWS_ACCESS_KEY_ID=your-aws-key
VITE_AWS_SECRET_ACCESS_KEY=your-aws-secret
VITE_AWS_REGION=us-east-1
```

## Code Style

- **Naming**: camelCase for variables/functions, PascalCase for components
- **Comments**: JSDoc for all exported functions
- **Imports**: Absolute imports using `@/` alias
- **Types**: TypeScript strict mode enabled
