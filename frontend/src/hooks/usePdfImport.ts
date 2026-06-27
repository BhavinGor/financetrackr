import { useState, useRef } from 'react';
import { TransactionType } from '../types';
import { parsePdfFile } from '../services/external/pdf';
import { normalizeDate } from '../utils/format';
import { useTransactionStore } from '../stores/transactionStore';
import { useAccountStore } from '../stores/accountStore';

export const usePdfImport = () => {
  const { bulkAddTransactions } = useTransactionStore();
  const { accounts } = useAccountStore();

  const [isImporting, setIsImporting] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<string | null>(null);
  const [scannedTransactions, setScannedTransactions] = useState<any[]>([]);
  const [rawAccountInfo, setRawAccountInfo] = useState<any>(null);
  const [loadingStage, setLoadingStage] = useState<'uploading' | 'parsing' | 'ai_analysis' | 'complete'>('uploading');
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processPdfResponse = (response: any) => {
    const { transactions: rawTxs, accountInfo, extractionQuality } = response.data;

    const parsedAccounts: any[] = [];
    if (accountInfo) {
      const last4 = accountInfo.accountNumber ? accountInfo.accountNumber.slice(-4) : 'XXXX';
      parsedAccounts.push({
        name: `${accountInfo.bankName || 'Bank'} - ${last4} `,
        bankName: accountInfo.bankName || 'Unknown Bank',
        accountNumber: accountInfo.accountNumber,
        balance: accountInfo.closingBalance || accountInfo.primaryBalance || '0',
        type: 'Savings',
        isPrimary: true,
      });
      if (accountInfo.linkedAccounts && Array.isArray(accountInfo.linkedAccounts)) {
        accountInfo.linkedAccounts.forEach((acc: any) => {
          const lLast4 = acc.accountNumber ? acc.accountNumber.slice(-4) : 'XXXX';
          parsedAccounts.push({
            name: `${acc.name || 'Linked Account'} - ${lLast4} `,
            bankName: accountInfo.bankName,
            accountNumber: acc.accountNumber,
            balance: acc.balance || '0',
            type: acc.name?.includes('PPF') ? 'Investment' : 'Savings',
            isLinked: true,
          });
        });
      }
    }

    const mappedTxs = Array.isArray(rawTxs) ? rawTxs.map((tx: any, index: number) => {
      let type = TransactionType.EXPENSE;
      const rawType = tx.type?.toLowerCase() || '';
      if (rawType.includes('deposit') || rawType.includes('credit')) {
        type = TransactionType.INCOME;
      }
      return {
        id: `import_${Date.now()}_${index}`,
        date: normalizeDate(tx.date),
        description: tx.description,
        amount: typeof tx.amount === 'string' ? parseFloat(tx.amount.replace(/,/g, '')) : tx.amount,
        type,
        category: tx.category || 'Other',
        accountId: accounts[0]?.id || '',
      };
    }) : [];

    setScannedTransactions(mappedTxs);
    setRawAccountInfo({ ...accountInfo, parsedAccounts, extractionQuality });
    setLoadingStage('complete');
    setTimeout(() => {
      setShowLoadingModal(false);
      setIsImporting(true);
    }, 500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      alert('Please upload a valid PDF file.');
      return;
    }

    const url = URL.createObjectURL(file);
    setPdfBlob(url);
    setShowLoadingModal(true);
    setLoadingStage('uploading');
    await new Promise(r => setTimeout(r, 1000));
    setLoadingStage('parsing');

    try {
      const response = await parsePdfFile(file);
      setLoadingStage('ai_analysis');
      await new Promise(r => setTimeout(r, 1500));

      if (response?.success && response.data) {
        processPdfResponse(response);
      } else {
        throw new Error('No data found in PDF');
      }
    } catch (error: any) {
      if (error.message === 'PDF_PASSWORD_REQUIRED' || error.message === 'PDF_INVALID_PASSWORD') {
        const password = prompt(
          error.message === 'PDF_INVALID_PASSWORD'
            ? 'Invalid Password. Please try again:'
            : 'This PDF is password protected. Please enter the password:'
        );
        if (password) {
          try {
            const response = await parsePdfFile(file, password);
            if (response?.success && response.data) {
              processPdfResponse(response);
              return;
            }
          } catch {
            alert('Failed to process PDF with provided password.');
            setShowLoadingModal(false);
            setLoadingStage('uploading');
          }
        } else {
          setShowLoadingModal(false);
          setLoadingStage('uploading');
        }
        return;
      }
      alert('Failed to process PDF. Please check the file and try again.');
      setPdfBlob(null);
      setShowLoadingModal(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async (txs: any[]) => {
    const cleanedTxs = txs.map(tx => {
      const { metadata, id, ...rest } = tx;
      return {
        ...rest,
        id: (typeof id === 'string' && (id.startsWith('pdf_') || id.startsWith('import_'))) ? crypto.randomUUID() : id,
        notes: tx.metadata ? JSON.stringify(tx.metadata) : rest.notes,
      };
    });
    await bulkAddTransactions(cleanedTxs);
    setIsImporting(false);
    setPdfBlob(null);
  };

  const cancelImport = () => {
    setIsImporting(false);
    setPdfBlob(null);
  };

  return {
    isImporting,
    pdfBlob,
    scannedTransactions,
    rawAccountInfo,
    loadingStage,
    showLoadingModal,
    fileInputRef,
    handleFileUpload,
    handleConfirmImport,
    cancelImport,
  };
};
