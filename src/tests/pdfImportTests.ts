/**
 * Test file for PDF Import functionality
 * 
 * This file simulates PDF import without needing actual PDF files or LLM calls.
 * Use this to test account creation, transaction mapping, and database persistence.
 */

import { Account, Transaction, AccountType, TransactionType } from '../types';

// Mock PDF extraction data
export const mockPdfData = {
    accountInfo: {
        bankName: 'ICICI BANK LIMITED',
        accountNumber: 'XXXXXXXX5683',
        primaryBalance: '10,787.05'
    },
    transactions: [
        {
            date: '21-11-2024',
            description: 'UPI-JOHN DOE-PAYTM',
            amount: '500.00',
            type: 'debit'
        },
        {
            date: '20-11-2024',
            description: 'SALARY CREDIT',
            amount: '50,000.00',
            type: 'credit'
        },
        {
            date: '19-11-2024',
            description: 'ATM WITHDRAWAL',
            amount: '2,000.00',
            type: 'debit'
        }
    ],
    summary: {
        closingBalance: '10,787.05'
    }
};

// Mock detected accounts
export const mockDetectedAccounts: Account[] = [
    {
        id: 'detected-primary-XXXXXXXX5683',
        name: 'ICICI BANK LIMITED',
        type: AccountType.SAVINGS,
        bankName: 'ICICI BANK LIMITED',
        balance: 10787.05,
        currency: 'INR'
    }
];

// Expected transactions after import
export const expectedTransactions = [
    {
        date: '2024-11-21',
        type: TransactionType.EXPENSE,
        category: 'Other',
        amount: 500.00,
        description: 'UPI-JOHN DOE-PAYTM',
        accountName: 'ICICI BANK LIMITED'
    },
    {
        date: '2024-11-20',
        type: TransactionType.INCOME,
        category: 'Salary',
        amount: 50000.00,
        description: 'SALARY CREDIT',
        accountName: 'ICICI BANK LIMITED'
    },
    {
        date: '2024-11-19',
        type: TransactionType.EXPENSE,
        category: 'Other',
        amount: 2000.00,
        description: 'ATM WITHDRAWAL',
        accountName: 'ICICI BANK LIMITED'
    }
];

/**
 * Test: Account Creation
 * 
 * Expected behavior:
 * 1. Only ONE account should be created (not duplicates)
 * 2. Account type should be SAVINGS (not CHECKING)
 * 3. Account should have proper UUID from database
 * 4. Balance should match PDF data
 */
export function testAccountCreation(createdAccounts: Account[]) {
    console.log('🧪 Testing Account Creation...');

    // Test 1: No duplicates
    const accountNames = createdAccounts.map(a => a.name);
    const uniqueNames = new Set(accountNames);
    if (accountNames.length !== uniqueNames.size) {
        console.error('❌ FAIL: Duplicate accounts created!');
        console.error('Accounts:', createdAccounts);
        return false;
    }
    console.log('✅ PASS: No duplicate accounts');

    // Test 2: Account type is SAVINGS
    const icicAccount = createdAccounts.find(a =>
        a.bankName?.includes('ICICI') || a.name?.includes('ICICI')
    );
    if (!icicAccount) {
        console.error('❌ FAIL: ICICI account not found');
        console.error('Created accounts:', createdAccounts);
        return false;
    }

    if (icicAccount.type !== AccountType.SAVINGS) {
        console.error(`❌ FAIL: Account type is ${icicAccount.type}, expected SAVINGS`);
        return false;
    }
    console.log('✅ PASS: Account type is SAVINGS');

    // Test 3: Has valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(icicAccount.id)) {
        console.error(`❌ FAIL: Invalid UUID: ${icicAccount.id}`);
        return false;
    }
    console.log('✅ PASS: Valid UUID');

    // Test 4: Correct balance
    if (Math.abs(icicAccount.balance - 10787.05) > 0.01) {
        console.error(`❌ FAIL: Balance is ${icicAccount.balance}, expected 10787.05`);
        return false;
    }
    console.log('✅ PASS: Correct balance');

    console.log('✅ All account creation tests passed!');
    return true;
}

/**
 * Test: Transaction Mapping
 * 
 * Expected behavior:
 * 1. No transactions should have "detected-" IDs
 * 2. All transactions should have valid UUIDs for accountId
 * 3. Transactions should map to correct account by name
 */
export function testTransactionMapping(transactions: Transaction[], accounts: Account[]) {
    console.log('🧪 Testing Transaction Mapping...');

    // Test 1: No detected IDs
    const hasDetectedIds = transactions.some(tx => tx.accountId.includes('detected'));
    if (hasDetectedIds) {
        console.error('❌ FAIL: Transactions still have detected IDs!');
        const detectedTxs = transactions.filter(tx => tx.accountId.includes('detected'));
        console.error('Transactions with detected IDs:', detectedTxs);
        return false;
    }
    console.log('✅ PASS: No detected IDs');

    // Test 2: Valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidUuids = transactions.filter(tx => !uuidRegex.test(tx.accountId));
    if (invalidUuids.length > 0) {
        console.error('❌ FAIL: Invalid UUIDs found!');
        console.error('Transactions with invalid UUIDs:', invalidUuids);
        return false;
    }
    console.log('✅ PASS: All transactions have valid UUIDs');

    // Test 3: Correct account mapping
    const icicAccount = accounts.find(a =>
        a.bankName?.includes('ICICI') || a.name?.includes('ICICI')
    );
    if (!icicAccount) {
        console.error('❌ FAIL: ICICI account not found for mapping test');
        console.error('Available accounts:', accounts);
        return false;
    }

    const wronglyMapped = transactions.filter(tx => tx.accountId !== icicAccount.id);
    if (wronglyMapped.length > 0) {
        console.error('❌ FAIL: Some transactions not mapped to ICICI account!');
        console.error('Wrongly mapped transactions:', wronglyMapped);
        return false;
    }
    console.log('✅ PASS: All transactions mapped correctly');

    console.log('✅ All transaction mapping tests passed!');
    return true;
}

/**
 * Test: Database Persistence
 * 
 * Expected behavior:
 * 1. Transactions should be saved to database
 * 2. Accounts should be saved to database
 * 3. Data should persist after page refresh
 */
export function testDatabasePersistence(
    transactionsBefore: Transaction[],
    transactionsAfter: Transaction[],
    accountsBefore: Account[],
    accountsAfter: Account[]
) {
    console.log('🧪 Testing Database Persistence...');

    // Test 1: Transactions persisted
    if (transactionsAfter.length <= transactionsBefore.length) {
        console.error('❌ FAIL: Transactions not persisted!');
        console.error(`Before: ${transactionsBefore.length}, After: ${transactionsAfter.length}`);
        return false;
    }
    console.log('✅ PASS: Transactions persisted');

    // Test 2: Accounts persisted
    if (accountsAfter.length <= accountsBefore.length) {
        console.error('❌ FAIL: Accounts not persisted!');
        console.error(`Before: ${accountsBefore.length}, After: ${accountsAfter.length}`);
        return false;
    }
    console.log('✅ PASS: Accounts persisted');

    console.log('✅ All persistence tests passed!');
    return true;
}

/**
 * Run all tests
 */
export function runAllTests(
    createdAccounts: Account[],
    importedTransactions: Transaction[],
    allAccounts: Account[]
) {
    console.log('🚀 Running PDF Import Tests...\n');

    const accountTest = testAccountCreation(createdAccounts);
    console.log('');

    const mappingTest = testTransactionMapping(importedTransactions, allAccounts);
    console.log('');

    if (accountTest && mappingTest) {
        console.log('🎉 ALL TESTS PASSED!');
        return true;
    } else {
        console.log('❌ SOME TESTS FAILED');
        return false;
    }
}

/**
 * Helper function to get current app state from React DevTools
 * This makes manual testing easier
 */
export function getAppState() {
    console.log('ℹ️ To run tests manually, you need to get the state from React.');
    console.log('');
    console.log('Option 1: Use React DevTools');
    console.log('  1. Install React DevTools extension');
    console.log('  2. Select the App component');
    console.log('  3. In console: $r.props or check the state');
    console.log('');
    console.log('Option 2: Tests run automatically after PDF import');
    console.log('  Just import a PDF and check the console!');
    console.log('');
    console.log('Option 3: Expose state globally (for debugging)');
    console.log('  Add this to App.tsx:');
    console.log('  (window as any).appState = { accounts, transactions };');
    console.log('  Then run: window.pdfImportTests.runAllTests(');
    console.log('    window.appState.accounts,');
    console.log('    window.appState.transactions,');
    console.log('    window.appState.accounts');
    console.log('  )');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    (window as any).pdfImportTests = {
        mockPdfData,
        mockDetectedAccounts,
        expectedTransactions,
        testAccountCreation,
        testTransactionMapping,
        testDatabasePersistence,
        runAllTests,
        getAppState,  // ← New helper
        help: getAppState  // ← Alias
    };

    console.log('📝 PDF Import Tests loaded!');
    console.log('💡 Run window.pdfImportTests.help() for usage instructions');
}
