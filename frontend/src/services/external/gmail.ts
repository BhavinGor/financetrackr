import { Transaction, TransactionType, Category } from '../../types/index';
import { parseTransactionFromEmail } from './bedrock';

// Mock emails for simulation if no real API access
const MOCK_EMAILS = [
    {
        id: 'msg_1',
        snippet: 'Your transaction of INR 450.00 at Zomato was successful.',
        body: 'Dear User, Your transaction of INR 450.00 at Zomato was successful on 2023-10-25. Reference: 123456.'
    },
    {
        id: 'msg_2',
        snippet: 'Bill Payment: JioFiber for Rs 999 is successful.',
        body: 'Your bill payment for JioFiber account 555555 of Rs 999 was successful on 2023-10-26.'
    },
    {
        id: 'msg_3',
        snippet: 'Salary Credited: INR 85000',
        body: 'Your account XXXX1234 has been credited with INR 85,000.00 on 2023-10-30 towards Salary.'
    }
];

export const fetchGmailTransactions = async (): Promise<Transaction[]> => {
    // In a real app, this would use the Gmail API to list messages, get details, etc.
    // For this demo, we simulate fetching and then use Bedrock to parse.

    const transactions: Transaction[] = [];

    for (const email of MOCK_EMAILS) {
        const parsed = await parseTransactionFromEmail(email.body);

        if (parsed && parsed.amount) {
            transactions.push({
                id: `gmail_${email.id}_${Date.now()}`,
                date: parsed.date || new Date().toISOString().split('T')[0],
                amount: parsed.amount,
                type: (parsed.type as TransactionType) || TransactionType.EXPENSE,
                category: (parsed.category as Category) || Category.OTHER,
                description: parsed.description || 'Unknown Transaction',
                accountId: 'unknown', // Needs to be mapped or assigned
                source: 'gmail'
            });
        }
    }

    return transactions;
};
