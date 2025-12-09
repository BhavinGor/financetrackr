# FinanceTrackr

A comprehensive personal finance management application built with React, TypeScript, and Supabase.

## Features

- 📊 **Dashboard** - Visual overview of your finances with charts and insights
- 💰 **Transactions** - Track income and expenses with PDF/CSV import
- 🏦 **Accounts** - Manage multiple bank accounts and credit cards
- 📈 **Budget** - Set and monitor spending limits by category
- 🚗 **Vehicles** - Track vehicle expenses and fuel logs
- 💼 **Investments** - Monitor investment portfolio
- 🤖 **AI Insights** - Get financial advice powered by AWS Bedrock

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- Supabase account
- AWS account (for AI features)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
pip install -r requirements.txt
```

2. **Set up environment variables:**

Create `.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_AWS_ACCESS_KEY_ID=your_aws_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_aws_secret_key
VITE_AWS_REGION=us-east-1
```

3. **Set up database:**

Run the SQL schema in Supabase:
```bash
# Copy schema from supabase/schema.sql to Supabase SQL Editor
```

4. **Start the application:**
```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start PDF API (for PDF import)
cd backend
python3 pdf_api.py
```

5. **Access the app:**
- Frontend: http://localhost:5173
- PDF API: http://localhost:8000

## Project Structure

```
financetrackr/
├── components/          # React components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Transactions.tsx # Transaction management
│   ├── Accounts.tsx    # Account management
│   ├── Budget.tsx      # Budget tracking
│   └── ...
├── services/           # API services
│   ├── supabase.ts    # Database operations
│   ├── bedrockService.ts # AI insights
│   └── categoryStorage.ts # Category management
├── backend/            # Python backend
│   └── pdf_api.py     # PDF extraction API
├── supabase/          # Database schema
│   └── schema.sql     # Database setup
├── tests/             # Test files
│   └── pdfImportTests.ts # PDF import tests
└── types.ts           # TypeScript types
```

## Key Features

### PDF Import
- Upload bank statements (PDF)
- Automatic transaction extraction
- Account detection
- Category mapping
- **Tests run automatically in dev mode**

### Database
- **Supabase** for backend
- Row Level Security (RLS) enabled
- Real-time sync across devices
- Automatic UUID generation

### AI Insights
- Powered by AWS Bedrock
- Financial advice and analysis
- Spending pattern detection

## Development

### Running Tests

PDF import tests run automatically after each import in development mode.

Manual testing:
```js
// In browser console
window.pdfImportTests.help()
```

### Database Schema

Key tables:
- `profiles` - User profiles
- `accounts` - Bank accounts
- `transactions` - Financial transactions
- `budgets` - Budget limits
- `custom_categories` - User-defined categories
- `vehicles` - Vehicle information
- `fuel_logs` - Fuel tracking
- `investments` - Investment portfolio

### Date Formats
- **Storage**: yyyy-MM-dd (database)
- **Display**: dd-MM-yyyy (UI)
- All dates are automatically converted

## Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run `supabase/schema.sql` in SQL Editor
3. Enable Row Level Security on all tables
4. Copy project URL and anon key to `.env.local`

### AWS Bedrock Setup

1. Create AWS account
2. Enable Bedrock API access
3. Request access to Amazon Nova Pro model
4. Add credentials to `.env.local`

## Troubleshooting

### PDF Import Issues
- Ensure PDF API is running (`python3 backend/pdf_api.py`)
- Check console for errors
- Verify PDF is not password-protected

### Database Errors
- Check Supabase connection
- Verify RLS policies are set correctly
- Ensure user is authenticated

### Date Filter Not Working
- Dates must be in yyyy-MM-dd format in database
- Check browser console for errors

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL)
- **AI**: AWS Bedrock (Amazon Nova Pro)
- **Charts**: Recharts
- **Icons**: Lucide React

## License

MIT License - feel free to use for personal projects
