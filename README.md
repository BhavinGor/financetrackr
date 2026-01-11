# FinanceTrackr

A comprehensive personal finance management application built with React, TypeScript, Python, and Supabase.

## Features

- 📊 **Dashboard** - Visual overview of your finances with charts and insights
- 💰 **Transactions** - Track income and expenses with PDF/CSV import
- 🏦 **Accounts** - Manage multiple bank accounts and credit cards
- 📈 **Budget** - Set and monitor spending limits by category
- 🚗 **Vehicles** - Track vehicle expenses and fuel logs
- 💼 **Investments** - Monitor investment portfolio
- 🤖 **AI Insights** - Get financial advice powered by AWS Bedrock

## Project Structure

```
financetrackr/
├── frontend/                    # React + TypeScript frontend
│   ├── src/
│   │   ├── main.tsx            # Entry point
│   │   ├── App.tsx             # Main app component
│   │   ├── pages/              # Page components
│   │   ├── components/         # Reusable components
│   │   ├── services/           # API client layer
│   │   ├── types/              # TypeScript types
│   │   └── constants/          # App constants
│   ├── index.html              # HTML entry point
│   └── README.md               # Frontend documentation
│
├── backend/                     # Python Flask backend
│   ├── main.py                 # Application entry point
│   ├── config.py               # Configuration
│   ├── api/                    # API routes
│   ├── services/               # Business logic
│   ├── middleware/             # Middleware
│   ├── utils/                  # Utilities
│   └── README.md               # Backend documentation
│
├── database/                    # Database schema
│   └── schema.sql              # Supabase schema
│
├── .env.local.example          # Environment variables template
├── vite.config.ts              # Vite configuration
├── package.json                # Frontend dependencies
└── README.md                   # This file
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- Supabase account
- AWS account (for AI features)

### Installation

1. **Clone and install dependencies:**
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
pip install -r backend/requirements.txt
```

2. **Set up environment variables:**

Copy `.env.local.example` to `.env.local` and fill in your credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_AWS_ACCESS_KEY_ID=your_aws_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_aws_secret_key
VITE_AWS_REGION=us-east-1
FLASK_DEBUG=True
FLASK_PORT=5000
ALLOWED_ORIGINS=http://localhost:5173
```

3. **Set up database:**

Run the SQL schema in Supabase:
```bash
# Copy schema from database/schema.sql to Supabase SQL Editor and execute
```

4. **Start the application:**
```bash
# Terminal 1: Start backend
cd backend
python main.py

# Terminal 2: Start frontend
npm run dev
```

5. **Access the app:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Architecture

### Frontend Architecture

**Tech Stack**: React 19, TypeScript, Vite, TailwindCSS

**Key Concepts**:
- **Pages**: Top-level route components (Dashboard, Transactions, etc.)
- **Components**: Reusable UI components (buttons, modals, forms)
- **Services**: API client layer for Supabase and external APIs
- **Types**: Centralized TypeScript type definitions

**Data Flow**:
1. User interacts with UI component
2. Component calls service layer
3. Service makes API call (Supabase or backend)
4. Data flows back and updates UI

See [frontend/README.md](frontend/README.md) for detailed documentation.

### Backend Architecture

**Tech Stack**: Python 3, Flask, AWS Bedrock, pdfplumber

**Layers**:
1. **API Layer** (`api/`): Thin controllers, request validation
2. **Service Layer** (`services/`): Business logic (PDF extraction, AI formatting)
3. **Utils Layer** (`utils/`): Logging, validation, helpers

**PDF Processing Workflow**:
1. User uploads PDF via frontend
2. Backend extracts text using pdfplumber
3. Text sent to Amazon Nova Pro for intelligent parsing
4. AI returns structured JSON with transactions
5. Frontend receives and displays data

See [backend/README.md](backend/README.md) for detailed documentation.

### Database

**Supabase (PostgreSQL)** with Row Level Security (RLS)

**Key Tables**:
- `profiles` - User profiles
- `accounts` - Bank accounts
- `transactions` - Financial transactions
- `budgets` - Budget limits
- `custom_categories` - User-defined categories
- `vehicles` - Vehicle information
- `fuel_logs` - Fuel tracking
- `investments` - Investment portfolio

**Features**:
- Automatic UUID generation
- Real-time sync across devices
- Secure row-level access control

### Authentication

**Supabase Auth** handles all authentication:
- Email/password authentication
- Session management
- Password reset
- JWT token validation

Frontend: `services/supabase/auth.ts`
Backend: JWT verification (future middleware)

## Development

### Frontend Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend Development

```bash
cd backend
python main.py   # Start Flask server
```

### Code Style

**Frontend**:
- camelCase for variables/functions
- PascalCase for components
- JSDoc comments for exported functions
- TypeScript strict mode

**Backend**:
- snake_case for variables/functions
- Google-style docstrings
- Type hints where applicable
- Structured logging

## Key Features

### PDF Import

1. Upload bank statement PDF
2. Automatic text extraction (supports password-protected PDFs)
3. AI-powered transaction parsing using Amazon Nova Pro
4. Account detection and mapping
5. Review and import transactions

### AI Insights

- Powered by AWS Bedrock (Amazon Nova Pro)
- Financial advice and analysis
- Spending pattern detection
- Budget recommendations

### Date Handling

- **Storage**: `yyyy-MM-dd` (database)
- **Display**: `dd-MM-yyyy` (UI)
- Automatic conversion in service layer

## Troubleshooting

### Frontend Issues

**Build errors**: Ensure all dependencies are installed (`npm install`)
**Import errors**: Check that Vite config points to correct `frontend/` directory
**Auth errors**: Verify Supabase credentials in `.env.local`

### Backend Issues

**PDF API not starting**: Check Python dependencies (`pip install -r backend/requirements.txt`)
**AWS errors**: Verify AWS credentials and Bedrock access
**CORS errors**: Check `ALLOWED_ORIGINS` in `.env.local`

### Database Issues

**Connection errors**: Verify Supabase URL and anon key
**RLS errors**: Ensure user is authenticated
**Migration errors**: Check that schema.sql was executed correctly

## Contributing

This project follows clean architecture principles:
- Thin controllers, logic in services
- No database logic in routes
- Comprehensive error handling
- Extensive inline documentation

See individual README files in `frontend/` and `backend/` for detailed contribution guidelines.

## License

MIT License - feel free to use for personal projects
