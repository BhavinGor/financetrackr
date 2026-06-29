# FinanceTrackr — Sprint Plan & Feature Roadmap

## Feature Priority Matrix

Features sorted by **impact-to-effort ratio** (highest value first):

| # | Feature | Effort | Complexity | Usefulness | Priority Score | Sprint |
|---|---------|--------|------------|------------|----------------|--------|
| 1 | Google Sign-In | Low-Med | Low-Med | High | ★★★★★ | Sprint 1 |
| 2 | CSV/Excel Upload with LLM Context | Medium | Medium | High | ★★★★☆ | Sprint 2 |
| 3 | Admin Dashboard | Medium | Medium | Medium-High | ★★★★☆ | Sprint 3 |
| 4 | Auto-Assign Categories (AI) | High | High | High | ★★★☆☆ | Sprint 4-5 |
| 5 | Family Feature | High | High | High | ★★★☆☆ | Sprint 6-7 |
| 6 | Email Scanning & Auto-Import | Very High | Very High | Very High | ★★☆☆☆ | Sprint 8-10 |

### Rationale for Ordering

1. **Google Sign-In** — Quick win. Removes signup friction, high user value, small scope. Unlocks real user growth.
2. **CSV/Excel with LLM Context** — Builds on existing PDF import pipeline. High frequency use case. Medium scope.
3. **Admin Dashboard** — Needed before scaling. Requires auth roles + new endpoints. Medium scope.
4. **Auto-Assign Categories** — Leverages existing transaction data. Requires pattern matching / ML logic. High scope but incremental.
5. **Family Feature** — Complex data model changes, multi-user permissions, OTP flow. High scope.
6. **Email Scanning** — OAuth + Gmail API + background jobs + parsing. Most complex, but highest long-term value.

---

## Sprint 1: Google Sign-In

**Duration:** 1 week  
**Goal:** Users can sign in/up with Google OAuth, replacing or supplementing email+password auth.

### Tasks

#### Backend (Flask)
- [ ] Add `python-dotenv` Google OAuth config vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- [ ] Add `authlib` or `google-auth` to `requirements.txt`
- [ ] Create `/api/auth/google` endpoint — accepts Google ID token, verifies it, creates/returns user
- [ ] Add `auth_provider` column to `users` table (`'local'` | `'google'`) in `schema.sql`
- [ ] Add migration for existing users (default `auth_provider = 'local'`)
- [ ] Update `users` table to allow nullable password (Google users don't have one)
- [ ] Return session JWT or session token from `/api/auth/google`

#### Frontend (React)
- [ ] Add `@react-oauth/google` or `@supabase/auth-ui-react` Google button
- [ ] Create Google OAuth callback handler page
- [ ] Update `authStore.ts` to handle Google sign-in flow
- [ ] Update `Login.tsx` — add "Sign in with Google" button alongside existing form
- [ ] Handle case: existing user signs in with Google (link accounts or prompt)
- [ ] Store Google profile info (name, avatar) in user profile
- [ ] Update `Profile.tsx` to show Google-linked status

#### Config & Security
- [ ] Create Google Cloud OAuth 2.0 credentials (document setup steps)
- [ ] Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env.local.example`
- [ ] Validate ID tokens server-side (not just client-side)
- [ ] Rate-limit `/api/auth/google` endpoint

#### Testing
- [ ] Unit test: Google token verification
- [ ] Integration test: Google sign-in creates user
- [ ] Manual test: Full Google OAuth flow in browser

### Deliverable
Users can click "Sign in with Google", complete OAuth, and land on Dashboard. Existing email/password auth still works.

---

## Sprint 2: CSV/Excel Upload with LLM Context

**Duration:** 1.5 weeks  
**Goal:** Users can upload CSV/Excel files with custom column mappings and context hints that are sent to the LLM for better transaction extraction.

### Tasks

#### Backend (Flask)
- [ ] Add `openpyxl` and `pandas` to `requirements.txt` for Excel parsing
- [ ] Create `/api/import/csv` endpoint — accepts CSV file + optional metadata JSON
- [ ] Create `/api/import/excel` endpoint — accepts Excel file + optional metadata JSON
- [ ] Design metadata schema:
  ```json
  {
    "column_mapping": {
      "date": "Transaction Date",
      "amount": "Debit Amount",
      "description": "Narration",
      "balance": "Running Balance"
    },
    "column_hints": {
      "Transaction Type": "C = Credit, D = Debit",
      "Mode": "UPI/NEFT/RTGS/IMPS"
    },
    "date_format": "DD-MM-YYYY",
    "currency": "INR",
    "skip_rows": 3,
    "sheet_name": "Sheet1"
  }
  ```
- [ ] Parse CSV/Excel into raw transaction rows
- [ ] Format rows + metadata into LLM prompt with context instructions
- [ ] Send to existing `ai_formatter.py` pipeline with enhanced prompt
- [ ] Return structured transactions for user review
- [ ] Store import history (file name, timestamp, row count, success/fail count)

#### Frontend (React)
- [ ] Create `ImportPage.tsx` with drag-and-drop file upload zone
- [ ] Add file type validation (`.csv`, `.xlsx`, `.xls`)
- [ ] Build column mapping UI:
  - Auto-detect column headers from file
  - Dropdown to map each column to transaction fields (date, amount, description, type)
  - Text input for column hints/descriptions
- [ ] Add "Preview" step — show first 10 rows parsed with current mapping
- [ ] Add "Import" step — show all extracted transactions in review table
- [ ] Allow user to edit/confirm/delete individual rows before saving
- [ ] Show import history list on the page
- [ ] Add progress indicator during LLM processing

#### LLM Prompt Engineering
- [ ] Design system prompt template that includes column mappings and hints
- [ ] Example: `"Column 'Narration' contains transaction description. Values like 'UPI-HDFC' indicate UPI transfers"`
- [ ] Handle edge cases: multi-currency, negative amounts, date variations
- [ ] Add fallback: if LLM fails, return raw rows for manual entry

#### Testing
- [ ] Unit test: CSV parser with various formats (Indian bank statements, international)
- [ ] Unit test: Excel parser with multiple sheets
- [ ] Unit test: Metadata JSON validation
- [ ] Integration test: Full import flow with sample CSV
- [ ] Test with 3+ real bank statement formats (HDFC, SBI, ICICI samples)

### Deliverable
Users can upload a CSV/Excel, map columns, provide context hints, preview data, and import transactions with LLM-assisted categorization.

---

## Sprint 3: Admin Dashboard

**Duration:** 1.5 weeks  
**Goal:** Admin users can view platform-wide analytics: user count, total uploads, spending metrics, vehicle registrations, etc.

### Tasks

#### Database & Auth
- [ ] Add `role` column to `users` table (`'user'` | `'admin'`) in `schema.sql`
- [ ] Add migration to set default role
- [ ] Create one admin user manually (or via env var `ADMIN_EMAIL`)
- [ ] Add server-side auth middleware to validate `user_id` and check `role` on admin endpoints
- [ ] Create `/api/auth/me` endpoint — returns current user info including role

#### Backend (Flask)
- [ ] Create `/api/admin/stats` endpoint — aggregate queries:
  - Total users (count)
  - Active users (users with transactions in last 30 days)
  - Total transactions (count)
  - Total transaction volume (sum of amounts)
  - Total uploads (PDF + CSV imports count)
  - Total accounts registered
  - Total vehicles registered
  - Average spend per user
  - Median spend per user
  - Top 5 spending categories (global)
  - User growth over time (monthly signups)
  - Revenue per user distribution
- [ ] Create `/api/admin/users` endpoint — paginated user list with:
  - Email, name, signup date, last active, transaction count, total spend
- [ ] Create `/api/admin/users/:id` endpoint — individual user detail
- [ ] Create `/api/admin/transactions/recent` endpoint — recent transactions across all users (anonymized if needed)
- [ ] Add query optimization (indexes, cached aggregates)

#### Frontend (React)
- [ ] Create `Admin/` page directory
- [ ] Create `Admin/index.tsx` — admin dashboard layout
- [ ] Create `Admin/components/StatsOverview.tsx` — KPI cards row:
  - Total Users, Total Transactions, Total Uploads, Avg Spend/User
- [ ] Create `Admin/components/UserGrowthChart.tsx` — line chart of signups over time
- [ ] Create `Admin/components/SpendingDistribution.tsx` — histogram of user spending
- [ ] Create `Admin/components/TopCategories.tsx` — bar chart of global top categories
- [ ] Create `Admin/components/UserTable.tsx` — sortable, searchable user list
- [ ] Create `Admin/components/RecentActivity.tsx` — recent transaction feed
- [ ] Add admin role check in `Sidebar.tsx` — show "Admin" link only for admin users
- [ ] Add route guard: redirect non-admins away from `/admin`

#### Security
- [ ] Server-side admin check on all `/api/admin/*` endpoints
- [ ] Audit log for admin actions
- [ ] Rate-limit admin endpoints
- [ ] Ensure regular users cannot access admin data via API

#### Testing
- [ ] Unit test: aggregate stat queries
- [ ] Integration test: admin endpoints require admin role
- [ ] Integration test: non-admin users get 403
- [ ] Manual test: full admin dashboard with sample data

### Deliverable
Admin can log in, see a dashboard with platform-wide stats, browse users, and view recent activity. Non-admin users cannot access admin features.

---

## Sprint 4-5: Auto-Assign Categories (AI)

**Duration:** 2 weeks (split across 2 sprints)  
**Goal:** When users upload new statements, the system learns from past categorization patterns and auto-assigns (or suggests) categories for new transactions.

### Sprint 4: Pattern Learning Engine

#### Backend (Flask)
- [ ] Create `/api/categories/patterns` endpoint — analyze user's transaction history:
  - Group by description pattern → category
  - Extract keywords from descriptions per category
  - Calculate amount ranges per category
  - Store patterns in new `category_patterns` table:
    ```sql
    CREATE TABLE category_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      keywords TEXT NOT NULL,  -- JSON array of keywords
      amount_min REAL,
      amount_max REAL,
      avg_amount REAL,
      frequency INTEGER,  -- how many times this pattern matched
      last_seen TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    ```
- [ ] Create pattern extraction service (`services/pattern_learner.py`):
  - NLP-lite: tokenize descriptions, remove stopwords, extract key terms
  - TF-IDF style keyword extraction (simple version)
  - Amount clustering per category
- [ ] Create `/api/categories/patterns/learn` endpoint — triggers relearning from transaction history
- [ ] Auto-learn on transaction create/update (background)

#### Frontend (React)
- [ ] Create `Transactions/components/CategoryPatterns.tsx` — show learned patterns per category
- [ ] Add "Learn Patterns" button on Transactions page
- [ ] Show pattern confidence indicators (high/medium/low)
- [ ] Allow users to view/edit/delete learned patterns

### Sprint 5: Smart Category Assignment

#### Backend (Flask)
- [ ] Create `/api/transactions/suggest-category` endpoint:
  - Input: transaction description + amount
  - Match against user's `category_patterns`
  - Score matches by keyword overlap + amount range
  - Return top 3 suggestions with confidence scores
- [ ] Integrate into existing `/api/ai/extract` pipeline:
  - After LLM extracts transactions, run pattern matching
  - If pattern match confidence > 80%, auto-assign category
  - If confidence 50-80%, suggest as primary option
  - If confidence < 50%, use LLM's category or leave as "Other"
- [ ] Add batch suggest endpoint for bulk imports

#### Frontend (React)
- [ ] Update `TransactionCard.tsx` — show category suggestion badge if available
- [ ] Add "Accept Suggestion" / "Override" UI on each transaction
- [ ] Update import flow: show auto-assigned categories with confidence
- [ ] Add "Pattern Learning" section in Settings:
  - Toggle auto-assign on/off
  - Set confidence threshold
  - View/reset learned patterns
- [ ] Add visual indicator: transactions with auto-assigned categories get a small AI icon

#### Testing
- [ ] Unit test: keyword extraction from descriptions
- [ ] Unit test: pattern matching scoring algorithm
- [ ] Integration test: auto-assign after learning from 20+ categorized transactions
- [ ] Test with real data: import 2 months of statements, verify auto-assign accuracy
- [ ] Edge case: new user with no history (should fallback to LLM/Other)

### Deliverable
After categorizing ~20 transactions manually, the system learns patterns. New imports auto-assign categories with confidence scores. Users can accept or override suggestions.

---

## Sprint 6-7: Family Feature

**Duration:** 2 weeks (split across 2 sprints)  
**Goal:** Users can add family members (existing users) after email OTP verification. Family admin can view aggregated finances from a dedicated dashboard tab.

### Sprint 6: Family Data Model & OTP Flow

#### Database
- [ ] Add `families` table:
  ```sql
  CREATE TABLE families (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    admin_user_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES users(id)
  );
  ```
- [ ] Add `family_members` table:
  ```sql
  CREATE TABLE family_members (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',  -- 'admin' | 'member'
    joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(family_id, user_id)
  );
  ```
- [ ] Add `family_invites` table:
  ```sql
  CREATE TABLE family_invites (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id)
  );
  ```

#### Backend (Flask)
- [ ] Create `/api/families` endpoint — CRUD for families
- [ ] Create `/api/families/invite` endpoint — send OTP to email:
  - Generate 6-digit OTP
  - Store with 10-minute expiry
  - Send via email (use existing email config or Add `flask-mail` to requirements)
- [ ] Create `/api/families/verify-otp` endpoint — verify OTP and add member
- [ ] Create `/api/families/members` endpoint — list family members
- [ ] Create `/api/families/leave` endpoint — remove self from family
- [ ] Create `/api/families/remove` endpoint — admin removes a member
- [ ] Add permission checks: only family admin can invite/remove

#### Frontend (React)
- [ ] Create `Family/` page directory
- [ ] Create `Family/index.tsx` — family overview
- [ ] Create `Family/components/CreateFamilyModal.tsx`
- [ ] Create `Family/components/InviteMemberModal.tsx` — enter email, send OTP
- [ ] Create `Family/components/VerifyOtpModal.tsx` — enter 6-digit OTP
- [ ] Create `Family/components/MemberList.tsx` — show members with role, remove button
- [ ] Add "Family" link in sidebar (always visible, shows create/join state)
- [ ] Handle invite link flow (if user clicks invite link while not logged in)

### Sprint 7: Family Finance Dashboard

#### Backend (Flask)
- [ ] Create `/api/families/transactions` endpoint — aggregated transactions for all family members:
  - Filter by date range, category, member
  - Include member name/email for each transaction
- [ ] Create `/api/families/stats` endpoint — family-wide KPIs:
  - Total family income/expenses
  - Per-member breakdown
  - Category breakdown across family
  - Budget usage per member
- [ ] Create `/api/families/budgets` endpoint — family budget overview
- [ ] Create `/api/families/accounts` endpoint — all family accounts

#### Frontend (React)
- [ ] Create `Family/components/FamilyDashboard.tsx`:
  - KPI cards: Total Family Spend, Total Family Income, Number of Members
  - Stacked bar chart: spend per member per category
  - Pie chart: family category breakdown
  - Line chart: family spending trend over time
- [ ] Create `Family/components/FamilyTransactions.tsx`:
  - Full transaction list with member filter
  - Each transaction shows member avatar/name
  - Same filtering as regular transactions page
- [ ] Create `Family/components/FamilyBudget.tsx`:
  - Budget overview across all members
  - Per-member budget progress
- [ ] Add tab navigation: "My Finance" | "Family Finance" on dashboard
- [ ] Add member selector/filter on family pages

#### Testing
- [ ] Unit test: OTP generation and validation
- [ ] Integration test: invite → verify → member added to family
- [ ] Integration test: family admin can invite, member can leave
- [ ] Integration test: family transactions aggregate correctly
- [ ] Test: non-member cannot access family data
- [ ] Test: family admin cannot remove themselves (must transfer admin first or leave)

### Deliverable
Users can create a family, invite others via email OTP, and view a shared family finance dashboard with aggregated data, per-member breakdowns, and family budgets.

---

## Sprint 8-10: Email Scanning & Auto-Import

**Duration:** 3 weeks  
**Goal:** With user permission, scan Gmail for financial statements/bills, auto-extract transactions, and add to user's DB. Runs periodically in background.

### Sprint 8: Gmail OAuth & Email Fetching

#### Backend (Flask)
- [ ] Add Gmail API integration (`google-api-python-client`, `google-auth-httplib2`, `google-auth-oauthlib`)
- [ ] Create `/api/gmail/auth` endpoint — initiate Gmail OAuth flow:
  - Scopes: `https://www.googleapis.com/auth/gmail.readonly`
  - Return authorization URL
- [ ] Create `/api/gmail/callback` endpoint — handle OAuth callback, store refresh token
- [ ] Add `gmail_tokens` table:
  ```sql
  CREATE TABLE gmail_tokens (
    user_id TEXT PRIMARY KEY,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TEXT,
    connected_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  ```
- [ ] Create `services/gmail_service.py`:
  - Fetch emails with pagination
  - Filter by sender patterns (banks: `alerts@hdfcbank.com`, `noreply@sbi.co.in`, etc.)
  - Filter by subject keywords (statement, transaction, payment, invoice)
  - Parse email body (HTML → text, handle MIME multipart)
  - Extract PDF attachments
- [ ] Create `/api/gmail/scan` endpoint — trigger manual scan
- [ ] Create `/api/gmail/emails` endpoint — list scanned emails with status

#### Frontend (React)
- [ ] Add Gmail connection section in `Profile.tsx` or new `Integrations.tsx` page
- [ ] "Connect Gmail" button → OAuth flow
- [ ] Show connection status (connected/disconnected, last scan time)
- [ ] Show scanned emails list with extraction status
- [ ] Allow user to mark emails as "not relevant" to improve filtering

### Sprint 9: Statement Extraction Pipeline

#### Backend (Flask)
- [ ] Create `services/email_statement_extractor.py`:
  - Download PDF attachments from emails
  - Route through existing OCR pipeline (`/api/pdf/parse`)
  - Parse HTML email bodies for inline transaction tables
  - Handle common Indian bank statement formats
- [ ] Create `/api/gmail/process` endpoint — process scanned emails:
  - Extract transactions from each email/attachment
  - Deduplicate against existing transactions (by date + amount + description)
  - Store in `email_imports` table:
    ```sql
    CREATE TABLE email_imports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email_id TEXT NOT NULL,
      email_subject TEXT,
      email_date TEXT,
      source TEXT,  -- 'attachment' | 'body' | 'inline_table'
      status TEXT DEFAULT 'pending',  -- 'pending' | 'processed' | 'failed' | 'skipped'
      transactions_found INTEGER DEFAULT 0,
      error_message TEXT,
      processed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    ```
- [ ] Add deduplication logic (fuzzy match on amount ±1 day)
- [ ] Apply auto-category assignment (from Sprint 4-5 patterns)

#### Frontend (React)
- [ ] Create `Gmail/components/EmailImportReview.tsx`:
  - List of processed emails with transaction counts
  - Preview extracted transactions per email
  - Approve/reject/modify individual transactions
  - Bulk approve all
- [ ] Update Transactions page: show import source badge (manual/PDF/CSV/Email)
- [ ] Add "Email Imports" section in sidebar or as tab

### Sprint 10: Background Sync & Scheduling

#### Backend (Flask)
- [ ] Add background task support (`APScheduler` or `celery` + `redis`):
  - For simplicity, use `APScheduler` (in-process, no Redis needed)
  - Or use a simple cron-style approach with `threading`
- [ ] Create scheduled job: scan connected Gmail accounts every 6 hours:
  - Check `gmail_tokens` for connected users
  - Fetch new emails since last scan
  - Process through extraction pipeline
  - Store results for user to review
- [ ] Create `/api/gmail/sync-status` endpoint — show last sync time, pending items
- [ ] Add email notification (optional): when new statements are found, notify user
- [ ] Handle token refresh (Gmail tokens expire after 1 hour, refresh using refresh_token)

#### Frontend (React)
- [ ] Add sync status indicator in sidebar/header:
  - "Last synced: 2 hours ago"
  - "3 new statements to review"
- [ ] Auto-refresh email imports list
- [ ] Add "Sync Now" button for manual trigger
- [ ] Show notification badge on sidebar when new imports are pending
- [ ] Add settings: toggle auto-sync on/off, set sync frequency

#### Security & Privacy
- [ ] Gmail tokens encrypted at rest (or stored securely)
- [ ] Users can disconnect Gmail (delete tokens)
- [ ] Only scan financial-related emails (configurable sender/subject filters)
- [ ] No email content stored — only extracted transactions
- [ ] Audit log for all Gmail access

#### Testing
- [ ] Unit test: email sender pattern matching
- [ ] Unit test: HTML email parsing
- [ ] Unit test: PDF attachment extraction
- [ ] Integration test: full Gmail scan → extract → store flow
- [ ] Test with real Gmail accounts (sandbox)
- [ ] Test token refresh flow
- [ ] Test deduplication accuracy

### Deliverable
Users connect Gmail once. The system periodically scans for bank statements, extracts transactions via OCR+LLM, deduplicates, auto-categorizes, and presents them for one-click approval on next login.

---

## Summary Timeline

| Sprint | Feature | Duration | Cumulative |
|--------|---------|----------|------------|
| Sprint 1 | Google Sign-In | 1 week | Week 1 |
| Sprint 2 | CSV/Excel Upload with LLM Context | 1.5 weeks | Week 2-3 |
| Sprint 3 | Admin Dashboard | 1.5 weeks | Week 4-5 |
| Sprint 4 | Auto-Assign Categories (Pattern Learning) | 1 week | Week 6 |
| Sprint 5 | Auto-Assign Categories (Smart Assignment) | 1 week | Week 7 |
| Sprint 6 | Family Feature (Data Model + OTP) | 1 week | Week 8 |
| Sprint 7 | Family Feature (Finance Dashboard) | 1 week | Week 9 |
| Sprint 8 | Email Scanning (Gmail OAuth) | 1 week | Week 10 |
| Sprint 9 | Email Scanning (Extraction Pipeline) | 1 week | Week 11 |
| Sprint 10 | Email Scanning (Background Sync) | 1 week | Week 12 |

**Total estimated timeline: ~12 weeks (3 months)**

---

## Dependencies & Notes

### Cross-Feature Dependencies
- **Sprint 2** builds on existing PDF import pipeline (already working)
- **Sprint 4-5** builds on transaction data from existing + Sprint 2 imports
- **Sprint 7** (Family Dashboard) builds on Sprint 6 (Family Data Model)
- **Sprint 9** builds on Sprint 8 (Gmail OAuth) + Sprint 4-5 (Auto-categorization)
- **Sprint 3** (Admin) can run in parallel with Sprint 4-5 if needed

### Technical Debt to Address
1. **Server-side auth validation** — Currently no auth middleware. Add JWT validation before Sprint 3 (Admin).
2. **Database migrations** — Need a migration strategy (Alembic or manual SQL scripts).
3. **Environment config consolidation** — Many features need new env vars; keep `.env.local.example` updated.
4. **Error handling standardization** — All new endpoints should return consistent error response format.

### Infrastructure Needs
- **Sprint 1**: Google Cloud Console project for OAuth credentials
- **Sprint 3**: Potentially a metrics/cache layer (Redis) for admin aggregates at scale
- **Sprint 10**: Background job scheduler (APScheduler or Celery)

### Suggested Team Allocation
- **1 Full-stack developer**: Can handle Sprints 1-3 alone
- **2 Developers**: Sprints 4-10 can be parallelized (backend + frontend)
- **1 Designer** (optional): Family dashboard and admin dashboard UI/UX

---

## Out of Scope (Future Considerations)

- Multi-currency support enhancements
- Mobile app (React Native)
- Bank API integrations (account aggregation via Plaid/Open Banking)
- Recurring transaction detection
- Bill splitting within families
- Tax report generation
- Investment portfolio recommendations
- Voice-based transaction entry
