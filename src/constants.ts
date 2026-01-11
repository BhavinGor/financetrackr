import { Account, AccountType, Category, FuelLog, Transaction, TransactionType, Vehicle, Budget, Investment, InvestmentType } from './types';

export const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc_1',
    name: 'HDFC Salary Account',
    type: AccountType.CHECKING,
    bankName: 'HDFC',
    balance: 85400.00,
    currency: 'INR'
  },
  {
    id: 'acc_2',
    name: 'SBI Savings',
    type: AccountType.SAVINGS,
    bankName: 'SBI',
    balance: 210000.00,
    currency: 'INR'
  },
  {
    id: 'acc_3',
    name: 'ICICI Coral Card',
    type: AccountType.CREDIT_CARD,
    bankName: 'ICICI',
    balance: -12400.00,
    limit: 150000,
    dueDate: '2023-11-25',
    currency: 'INR'
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx_1', date: '2023-10-25', amount: 120000, type: TransactionType.INCOME, category: Category.SALARY, description: 'Monthly Salary', accountId: 'acc_1', source: 'manual' },
  { id: 'tx_2', date: '2023-10-26', amount: 25000, type: TransactionType.EXPENSE, category: Category.RENT, description: 'House Rent', accountId: 'acc_1', source: 'manual' },
  { id: 'tx_3', date: '2023-10-27', amount: 3500, type: TransactionType.EXPENSE, category: Category.GROCERIES, description: 'BigBasket', accountId: 'acc_3', source: 'manual' },
  { id: 'tx_4', date: '2023-10-28', amount: 2500, type: TransactionType.EXPENSE, category: Category.FUEL, description: 'Indian Oil', accountId: 'acc_3', source: 'manual' },
  { id: 'tx_5', date: '2023-10-29', amount: 4500, type: TransactionType.EXPENSE, category: Category.ENTERTAINMENT, description: 'PVR IMAX Tickets', accountId: 'acc_3', source: 'manual' },
  { id: 'tx_6', date: '2023-10-30', amount: 649, type: TransactionType.EXPENSE, category: Category.UTILITIES, description: 'Netflix Subscription', accountId: 'acc_3', source: 'manual' },
  { id: 'tx_7', date: '2023-10-31', amount: 5000, type: TransactionType.EXPENSE, category: Category.SHOPPING, description: 'Myntra Sale', accountId: 'acc_3', source: 'manual' },
];

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'v_1',
    name: 'My City Ride',
    make: 'Hyundai',
    model: 'Creta',
    year: 2022,
    licensePlate: 'MH-02-AB-1234',
    mileage: 18500
  }
];

export const MOCK_FUEL_LOGS: FuelLog[] = [
  { id: 'fl_1', vehicleId: 'v_1', date: '2023-10-10', liters: 35, cost: 3600, mileage: 18100 },
  { id: 'fl_2', vehicleId: 'v_1', date: '2023-10-28', liters: 38, cost: 3900, mileage: 18500 },
];

export const MOCK_BUDGETS: Budget[] = [
  { category: Category.FOOD, limit: 10000 },
  { category: Category.GROCERIES, limit: 15000 },
  { category: Category.RENT, limit: 25000 },
  { category: Category.ENTERTAINMENT, limit: 5000 },
  { category: Category.SHOPPING, limit: 8000 },
];

export const MOCK_INVESTMENTS: Investment[] = [
  { id: 'inv_1', name: 'Reliance Industries', type: InvestmentType.INDIAN_STOCK, investedAmount: 50000, currentValue: 54000, quantity: 20, date: '2023-08-15' },
  { id: 'inv_2', name: 'Parag Parikh Flexi Cap', type: InvestmentType.MUTUAL_FUND_IN, investedAmount: 100000, currentValue: 115000, date: '2023-01-10' },
  { id: 'inv_3', name: 'Apple Inc.', type: InvestmentType.US_STOCK, investedAmount: 85000, currentValue: 92000, quantity: 5, date: '2023-05-20' },
  { id: 'inv_4', name: 'Sovereign Gold Bond', type: InvestmentType.GOLD, investedAmount: 30000, currentValue: 32500, quantity: 5, date: '2022-11-05' },
];
