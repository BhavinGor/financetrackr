export type ViewState = 'dashboard' | 'accounts' | 'transactions' | 'vehicles' | 'budget' | 'savings' | 'profile';

export enum AccountType {
  CHECKING = 'Checking',
  SAVINGS = 'Savings',
  CREDIT_CARD = 'Credit Card',
  WALLET = 'Wallet',
  INVESTMENT = 'Investment'
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bankName: string;
  balance: number;
  currency: string;
  limit?: number; // For credit cards
  dueDate?: string; // For credit cards
}

export enum TransactionType {
  INCOME = 'Income',
  EXPENSE = 'Expense'
}

export enum Category {
  FOOD = 'Food',
  GROCERIES = 'Groceries',
  RENT = 'Rent',
  TRANSPORT = 'Transport',
  FUEL = 'Fuel',
  UTILITIES = 'Utilities',
  SHOPPING = 'Shopping',
  ENTERTAINMENT = 'Entertainment',
  SALARY = 'Salary',
  FREELANCE = 'Freelance',
  VEHICLE_MAINTENANCE = 'Vehicle Maint.',
  INSURANCE = 'Insurance',
  SAVINGS = 'Savings',
  OTHER = 'Other'
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: Category | string;
  description: string;
  accountId: string;
  source?: 'manual' | 'gmail' | 'csv'; // Track origin
}

export interface Vehicle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  mileage: number;
  type?: string; // e.g. SUV, Sedan
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: string;
  liters: number;
  cost: number;
  mileage: number;
}

export interface Budget {
  id?: string;
  user_id?: string;
  category: Category | string;
  limit: number;
}

export enum InvestmentType {
  INDIAN_STOCK = 'Indian Stock',
  US_STOCK = 'US Stock',
  MUTUAL_FUND_IN = 'Mutual Fund (IN)',
  MUTUAL_FUND_US = 'Mutual Fund (US)',
  BOND = 'Bond',
  IPO = 'IPO',
  GOLD = 'Gold',
  FD = 'Fixed Deposit',
  CRYPTO = 'Crypto',
  OTHER = 'Other'
}

export interface Investment {
  id: string;
  name: string;
  type: InvestmentType;
  investedAmount: number;
  currentValue: number;
  quantity?: number;
  date: string; // Date of investment or last update
}

// PDF Import Types
export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category?: Category;
  balance?: number;
}

export interface ExtractedAccount {
  accountNumber?: string;
  bankName?: string;
  accountHolderName?: string;
}

export interface PdfExtractionResult {
  transactions: ExtractedTransaction[];
  accountInfo: ExtractedAccount;
  statementPeriod?: {
    from: string;
    to: string;
  };
}

export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  savingsRate: number;
}
