import React, { useState, useMemo } from 'react';
import { 
  Coins, Plus, Search, ChevronRight, TrendingUp, TrendingDown, 
  ArrowRightLeft, CreditCard, Save, Calendar, Check, AlertOctagon, 
  Printer, Download, Eye, Edit, Trash2, ArrowUpRight, ArrowDownRight, 
  BookOpen, X, FileSpreadsheet, Lock, Briefcase, Key, ShieldCheck, Landmark, FileText
} from 'lucide-react';
import { 
  ERPData, Treasury, BankAccount, MoneyTransaction, Cheque, 
  ChequeStatus, Account, JournalEntry, Voucher, VoucherType, Checkbook, CheckbookCheck 
} from '../types';
import { printDocument, fmtCurrency, fmtDate, numberToArabicWords, companyHeaderHTML, signaturesHTML, footerHTML, exportToCSV } from '../utils/printUtils';

interface TreasuryProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdateTreasuries: (treasuries: Treasury[]) => void;
  onUpdateBankAccounts: (banks: BankAccount[]) => void;
  onUpdateCheques: (cheques: Cheque[]) => void;
  onUpdateMoneyTransactions: (txs: MoneyTransaction[]) => void;
  onUpdateAccounts: (accounts: Account[]) => void;
  onUpdateEntries: (entries: JournalEntry[]) => void;
  onUpdateVouchers: (vouchers: Voucher[]) => void;
  onUpdateCheckbooks: (checkbooks: Checkbook[]) => void;
  onUpdateCustomers: (customers: any[]) => void;
  onUpdateSuppliers: (suppliers: any[]) => void;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
}

export default function TreasuryModule({
  data, lang,
  onUpdateTreasuries, onUpdateBankAccounts, onUpdateCheques,
  onUpdateMoneyTransactions, onUpdateAccounts, onUpdateEntries,
  onUpdateVouchers, onUpdateCheckbooks, onUpdateCustomers, onUpdateSuppliers,
  onAddAuditLog
}: TreasuryProps) {
  const isAr = lang === 'ar';

  // Navigation states
  const [selectedSafeId, setSelectedSafeId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [selectedCheckbookId, setSelectedCheckbookId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SAFES' | 'BANKS' | 'CHECKBOOKS'>('ALL');

  // Add Entity Forms Visibility
  const [showAddSafeForm, setShowAddSafeForm] = useState(false);
  const [showAddBankForm, setShowAddBankForm] = useState(false);
  const [showAddCheckbookForm, setShowAddCheckbookForm] = useState(false);

  // Add Safe State
  const [safeNameAr, setSafeNameAr] = useState('');
  const [safeNameEn, setSafeNameEn] = useState('');
  const [safeBranch, setSafeBranch] = useState('main');
  const [safeResponsible, setSafeResponsible] = useState('');
  const [safeInitBalance, setSafeInitBalance] = useState(0);

  // Add Bank State
  const [bankNameAr, setBankNameAr] = useState('');
  const [bankNameEn, setBankNameEn] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('main');
  const [bankResponsible, setBankResponsible] = useState('');
  const [bankInitBalance, setBankInitBalance] = useState(0);

  // Add Checkbook State
  const [checkbookCode, setCheckbookCode] = useState('');
  const [checkbookBankId, setCheckbookBankId] = useState('');
  const [checkbookStartNum, setCheckbookStartNum] = useState(1000);
  const [checkbookCount, setCheckbookCount] = useState(25);

  // Active Embedded Form inside Safe/Bank Detail View
  // 'NONE' | 'RECEIPT' | 'PAYMENT' | 'TRANSFER' | 'STATEMENT' | 'EDIT'
  const [activeDetailForm, setActiveDetailForm] = useState<'NONE' | 'RECEIPT' | 'PAYMENT' | 'TRANSFER' | 'STATEMENT' | 'EDIT'>('NONE');

  // Vouchers / Transactions Form State
  const [vType, setVType] = useState<VoucherType>(VoucherType.Receipt);
  const [amount, setAmount] = useState(0);
  const [partyType, setPartyType] = useState<'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'OTHER'>('CUSTOMER');
  const [partyId, setPartyId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [selectedGLAccountId, setSelectedGLAccountId] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherDesc, setVoucherDesc] = useState('');
  const [voucherRef, setVoucherRef] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCheckNumber, setSelectedCheckNumber] = useState<number | ''>('');

  // Transfer Form State
  const [transferAmount, setTransferAmount] = useState(0);
  const [transferDestType, setTransferDestType] = useState<'CASHBOX' | 'BANK'>('CASHBOX');
  const [transferDestId, setTransferDestId] = useState('');
  const [transferDesc, setTransferDesc] = useState('');

  // Edit Safe/Bank State
  const [editNameAr, setEditNameAr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editResponsible, setEditResponsible] = useState('');
  const [editBankNo, setEditBankNo] = useState('');

  // Statement Filter State
  const [statementStart, setStatementStart] = useState('');
  const [statementEnd, setStatementEnd] = useState(new Date().toISOString().split('T')[0]);
  const [statementSearch, setStatementSearch] = useState('');

  // Helper formatting functions
  const formatCurrency = (val: number) => {
    const formattedNum = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
    return isAr ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
  };

  // Find linked accounts or default
  const getSafeAccountId = (safe: Treasury) => {
    return safe.accountId || (safe.id === 'cb-1' ? '101' : '');
  };

  const getBankAccountId = (bank: BankAccount) => {
    return bank.accountId || (bank.id === 'ba-1' ? '102' : '');
  };

  // Dynamic values based on active Safe or Bank
  const currentEntity = useMemo(() => {
    if (selectedSafeId) {
      const s = data.treasuries.find(t => t.id === selectedSafeId);
      return s ? { ...s, isBank: false } : null;
    }
    if (selectedBankId) {
      const b = data.bankAccounts.find(ba => ba.id === selectedBankId);
      return b ? { ...b, isBank: true } : null;
    }
    return null;
  }, [selectedSafeId, selectedBankId, data.treasuries, data.bankAccounts]);

  // Safe names and helpers for current entity to prevent type casting union compile errors
  const currentEntityNameAr = useMemo(() => {
    if (!currentEntity) return '';
    return currentEntity.isBank 
      ? (currentEntity as BankAccount).bankNameAr 
      : (currentEntity as Treasury).nameAr;
  }, [currentEntity]);

  const currentEntityNameEn = useMemo(() => {
    if (!currentEntity) return '';
    return currentEntity.isBank 
      ? (currentEntity as BankAccount).bankNameEn 
      : (currentEntity as Treasury).nameEn;
  }, [currentEntity]);

  const currentEntityAccount = useMemo(() => {
    if (!currentEntity) return null;
    const accId = currentEntity.isBank 
      ? getBankAccountId(currentEntity as BankAccount)
      : getSafeAccountId(currentEntity as Treasury);
    return data.accounts.find(a => a.id === accId) || null;
  }, [currentEntity, data.accounts]);

  // Sibling account code generator
  const proposeNextCode = (prefix: string) => {
    const siblings = data.accounts.filter(a => a.code.startsWith(prefix));
    if (siblings.length > 0) {
      const codes = siblings.map(s => Number(s.code)).filter(c => !isNaN(c));
      const highest = Math.max(...codes);
      return String(highest + 1);
    }
    return prefix + '001';
  };

  // Create Safe Action
  const handleCreateSafe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!safeNameAr || !safeNameEn) return;

    // 1. Propose and create accounting account under Assets (1101)
    const proposedCode = proposeNextCode('1101');
    const newAccountId = 'acc-' + Math.random().toString(36).substring(2, 9);
    const newAccount: Account = {
      id: newAccountId,
      code: proposedCode,
      nameAr: `حساب خزينة - ${safeNameAr}`,
      nameEn: `Cash Box - ${safeNameEn}`,
      type: 'ASSET' as any,
      parentCode: null,
      balance: safeInitBalance
    };

    // 2. Create the Treasury record
    const newSafeId = 'safe-' + Math.random().toString(36).substring(2, 9);
    const newSafe: Treasury = {
      id: newSafeId,
      nameAr: safeNameAr,
      nameEn: safeNameEn,
      balance: safeInitBalance,
      branch: safeBranch,
      responsible: safeResponsible,
      accountId: newAccountId
    };

    // 3. Add to lists
    const updatedAccounts = [...data.accounts, newAccount].sort((a, b) => a.code.localeCompare(b.code));
    const updatedTreasuries = [...data.treasuries, newSafe];

    // 4. Create Opening Journal Entry if balance > 0
    let updatedEntries = [...data.journalEntries];
    if (safeInitBalance > 0) {
      const jvNumber = `JV-${new Date().getFullYear()}-${String(data.journalEntries.length + 1).padStart(3, '0')}`;
      const openingJV: JournalEntry = {
        id: 'je-' + Math.random().toString(36).substring(2, 9),
        entryNumber: jvNumber,
        date: new Date().toISOString().split('T')[0],
        type: 'OPENING' as any,
        description: `قيد افتتاحي للخزينة الجديدة: ${safeNameAr}`,
        approved: true,
        approvedBy: 'النظام تلقائيًا',
        lines: [
          { accountId: newAccountId, debit: safeInitBalance, credit: 0 },
          { accountId: '301', debit: 0, credit: safeInitBalance } // Credit Share Capital
        ]
      };
      updatedEntries = [openingJV, ...updatedEntries];
      
      // Update Share Capital balance
      const shareCapitalIndex = updatedAccounts.findIndex(a => a.id === '301');
      if (shareCapitalIndex > -1) {
        updatedAccounts[shareCapitalIndex].balance += safeInitBalance;
      }
    }

    onUpdateAccounts(updatedAccounts);
    onUpdateTreasuries(updatedTreasuries);
    if (safeInitBalance > 0) {
      onUpdateEntries(updatedEntries);
    }

    onAddAuditLog(
      `إنشاء خزنة جديدة: ${safeNameAr}`,
      `Created Safe: ${safeNameEn}`,
      `تم إنشاء الخزنة ${safeNameAr} بالفرع ${safeBranch} وربطها تلقائيًا بالحساب المحاسبي ${proposedCode} برصيد ابتدائي ${safeInitBalance} ج.م.`
    );

    // Reset Form
    setSafeNameAr('');
    setSafeNameEn('');
    setSafeResponsible('');
    setSafeInitBalance(0);
    setShowAddSafeForm(false);
    window.showAlert('تم إنشاء الخزنة والحساب بنجاح', 'Safe and Account created successfully', 'success');
  };

  // Create Bank Action
  const handleCreateBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankNameAr || !bankNameEn || !bankNumber) return;

    // 1. Propose and create accounting account under Assets (1102)
    const proposedCode = proposeNextCode('1102');
    const newAccountId = 'acc-' + Math.random().toString(36).substring(2, 9);
    const newAccount: Account = {
      id: newAccountId,
      code: proposedCode,
      nameAr: `حساب بنك - ${bankNameAr}`,
      nameEn: `Bank - ${bankNameEn}`,
      type: 'ASSET' as any,
      parentCode: null,
      balance: bankInitBalance
    };

    // 2. Create the Bank Account record
    const newBankId = 'bank-' + Math.random().toString(36).substring(2, 9);
    const newBank: BankAccount = {
      id: newBankId,
      accountNumber: bankNumber,
      bankNameAr: bankNameAr,
      bankNameEn: bankNameEn,
      balance: bankInitBalance,
      branch: bankBranch,
      responsible: bankResponsible,
      accountId: newAccountId
    };

    // 3. Add to lists
    const updatedAccounts = [...data.accounts, newAccount].sort((a, b) => a.code.localeCompare(b.code));
    const updatedBanks = [...data.bankAccounts, newBank];

    // 4. Create Opening Journal Entry if balance > 0
    let updatedEntries = [...data.journalEntries];
    if (bankInitBalance > 0) {
      const jvNumber = `JV-${new Date().getFullYear()}-${String(data.journalEntries.length + 1).padStart(3, '0')}`;
      const openingJV: JournalEntry = {
        id: 'je-' + Math.random().toString(36).substring(2, 9),
        entryNumber: jvNumber,
        date: new Date().toISOString().split('T')[0],
        type: 'OPENING' as any,
        description: `قيد افتتاحي للبنك الجديد: ${bankNameAr}`,
        approved: true,
        approvedBy: 'النظام تلقائيًا',
        lines: [
          { accountId: newAccountId, debit: bankInitBalance, credit: 0 },
          { accountId: '301', debit: 0, credit: bankInitBalance }
        ]
      };
      updatedEntries = [openingJV, ...updatedEntries];

      // Update Share Capital balance
      const shareCapitalIndex = updatedAccounts.findIndex(a => a.id === '301');
      if (shareCapitalIndex > -1) {
        updatedAccounts[shareCapitalIndex].balance += bankInitBalance;
      }
    }

    onUpdateAccounts(updatedAccounts);
    onUpdateBankAccounts(updatedBanks);
    if (bankInitBalance > 0) {
      onUpdateEntries(updatedEntries);
    }

    onAddAuditLog(
      `إنشاء بنك جديد: ${bankNameAr}`,
      `Created Bank: ${bankNameEn}`,
      `تم إنشاء البنك ${bankNameAr} برقم حساب ${bankNumber} وربطه تلقائيًا بالحساب المحاسبي ${proposedCode} برصيد ابتدائي ${bankInitBalance} ج.م.`
    );

    // Reset Form
    setBankNameAr('');
    setBankNameEn('');
    setBankNumber('');
    setBankResponsible('');
    setBankInitBalance(0);
    setShowAddBankForm(false);
    window.showAlert('تم إنشاء البنك والحساب بنجاح', 'Bank and Account created successfully', 'success');
  };

  // Create Checkbook Action
  const handleCreateCheckbook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkbookCode || !checkbookBankId || checkbookCount <= 0) return;

    const checks: CheckbookCheck[] = [];
    for (let i = 0; i < checkbookCount; i++) {
      checks.push({
        number: Number(checkbookStartNum) + i,
        status: 'UNUSED'
      });
    }

    const newBook: Checkbook = {
      id: 'cbk-' + Math.random().toString(36).substring(2, 9),
      bankAccountId: checkbookBankId,
      code: checkbookCode,
      startNumber: Number(checkbookStartNum),
      endNumber: Number(checkbookStartNum) + Number(checkbookCount) - 1,
      checks
    };

    const updatedCheckbooks = [...(data.checkbooks || []), newBook];
    onUpdateCheckbooks(updatedCheckbooks);

    const targetBank = data.bankAccounts.find(b => b.id === checkbookBankId);
    onAddAuditLog(
      `إنشاء دفتر شيكات: ${checkbookCode}`,
      `Created Checkbook: ${checkbookCode}`,
      `تم إنشاء دفتر شيكات باسم ${checkbookCode} مرتبط بـ ${targetBank ? targetBank.bankNameAr : ''} ويحتوي على ${checkbookCount} شيك تبدأ من ${checkbookStartNum}.`
    );

    setCheckbookCode('');
    setCheckbookStartNum(1000);
    setCheckbookCount(25);
    setShowAddCheckbookForm(false);
    window.showAlert('تم إنشاء دفتر الشيكات بنجاح', 'Checkbook created successfully', 'success');
  };

  // Edit Safe/Bank Details
  const handleEditDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEntity) return;

    if (currentEntity.isBank) {
      const updated = data.bankAccounts.map(b => {
        if (b.id === currentEntity.id) {
          return {
            ...b,
            bankNameAr: editNameAr || b.bankNameAr,
            bankNameEn: editNameEn || b.bankNameEn,
            branch: editBranch || b.branch,
            responsible: editResponsible || b.responsible,
            accountNumber: editBankNo || b.accountNumber
          };
        }
        return b;
      });
      onUpdateBankAccounts(updated);
    } else {
      const updated = data.treasuries.map(t => {
        if (t.id === currentEntity.id) {
          return {
            ...t,
            nameAr: editNameAr || t.nameAr,
            nameEn: editNameEn || t.nameEn,
            branch: editBranch || t.branch,
            responsible: editResponsible || t.responsible
          };
        }
        return t;
      });
      onUpdateTreasuries(updated);
    }

    onAddAuditLog(
      `تعديل بيانات الخزنة/البنك: ${editNameAr || currentEntityNameAr}`,
      `Updated Safe/Bank: ${editNameEn || currentEntityNameEn}`,
      `تم تعديل الفرع والمسؤول والبيانات المكملة.`
    );

    window.showAlert('تم تحديث البيانات بنجاح', 'Details updated successfully', 'success');
    setActiveDetailForm('NONE');
  };

  // Safe/Bank Search & Card filtering
  const filteredDashboardCards = useMemo(() => {
    const list: any[] = [];
    
    if (filterType === 'ALL' || filterType === 'SAFES') {
      data.treasuries.forEach(t => {
        list.push({ ...t, cardType: 'SAFE' });
      });
    }
    if (filterType === 'ALL' || filterType === 'BANKS') {
      data.bankAccounts.forEach(b => {
        list.push({ ...b, cardType: 'BANK', nameAr: b.bankNameAr, nameEn: b.bankNameEn });
      });
    }
    if (filterType === 'ALL' || filterType === 'CHECKBOOKS') {
      (data.checkbooks || []).forEach(cb => {
        const bk = data.bankAccounts.find(b => b.id === cb.bankAccountId);
        list.push({
          ...cb,
          cardType: 'CHECKBOOK',
          nameAr: `دفتر: ${cb.code}`,
          nameEn: `Book: ${cb.code}`,
          bankName: bk ? (isAr ? bk.bankNameAr : bk.bankNameEn) : '',
          branch: bk?.branch || 'main'
        });
      });
    }

    return list.filter(item => {
      const val = searchTerm.toLowerCase();
      return (
        item.nameAr.toLowerCase().includes(val) ||
        item.nameEn.toLowerCase().includes(val) ||
        (item.branch && item.branch.toLowerCase().includes(val)) ||
        (item.responsible && item.responsible.toLowerCase().includes(val))
      );
    });
  }, [data.treasuries, data.bankAccounts, data.checkbooks, filterType, searchTerm, lang]);

  // Compute stats/meta for cards
  const getCardLastTransaction = (cardId: string, cardType: 'SAFE' | 'BANK' | 'CHECKBOOK') => {
    if (cardType === 'CHECKBOOK') {
      const book = (data.checkbooks || []).find(b => b.id === cardId);
      if (!book) return '-';
      const unused = book.checks.filter(c => c.status === 'UNUSED').length;
      return isAr ? `المتبقي: ${unused} شيك` : `Remaining: ${unused} checks`;
    }
    
    // Find latest money transaction where this is source or dest
    const tx = data.moneyTransactions.find(m => 
      (cardType === 'SAFE' && ((m.sourceType === 'CASHBOX' && m.sourceId === cardId) || (m.destType === 'CASHBOX' && m.destId === cardId))) ||
      (cardType === 'BANK' && ((m.sourceType === 'BANK' && m.sourceId === cardId) || (m.destType === 'BANK' && m.destId === cardId)))
    );
    
    if (!tx) return isAr ? 'لا توجد حركات' : 'No transactions';
    return `${tx.date} — ${formatCurrency(tx.amount)} (${tx.type})`;
  };

  // Get Party Name
  const getPartyDisplayName = (v: Voucher) => {
    if (v.partyName) return v.partyName;
    if (v.partyType === 'CUSTOMER') {
      const c = data.customers.find(c => c.id === v.partyId);
      return c ? (isAr ? c.nameAr : c.nameEn) : '';
    }
    if (v.partyType === 'SUPPLIER') {
      const s = data.suppliers.find(s => s.id === v.partyId);
      return s ? (isAr ? s.nameAr : s.nameEn) : '';
    }
    return v.partyId;
  };

  // Document numbers
  const getNextVoucherNumber = (type: VoucherType) => {
    const prefix = type === VoucherType.Receipt ? 'RV' : 'PV';
    const existing = (data.vouchers || []).filter(v => v.type === type);
    return `${prefix}-${new Date().getFullYear()}-${String(existing.length + 1).padStart(4, '0')}`;
  };

  // Dynamic counter account for journal entry preview
  const resolvedCounterAccount = useMemo(() => {
    if (partyType === 'CUSTOMER') {
      // Accounts Receivable id: 103 (from initialData / standard)
      return data.accounts.find(a => a.id === '103') || null;
    }
    if (partyType === 'SUPPLIER') {
      // Accounts Payable id: 201
      return data.accounts.find(a => a.id === '201') || null;
    }
    if (partyType === 'EMPLOYEE') {
      // Accrued Salaries id: 202 or Employee loans
      return data.accounts.find(a => a.id === '202') || null;
    }
    return data.accounts.find(a => a.id === selectedGLAccountId) || null;
  }, [partyType, selectedGLAccountId, data.accounts]);

  // Preview double entry journal lines
  const journalEntryPreviewLines = useMemo(() => {
    if (amount <= 0 || !currentEntityAccount || !resolvedCounterAccount) return [];

    const isReceipt = activeDetailForm === 'RECEIPT';
    return [
      {
        account: currentEntityAccount,
        debit: isReceipt ? amount : 0,
        credit: isReceipt ? 0 : amount,
        desc: isAr ? `${isReceipt ? 'إيداع وقبض' : 'صرف وسحب'} - سند رقم تلقائي` : `Receipt/Payment - Auto doc`
      },
      {
        account: resolvedCounterAccount,
        debit: isReceipt ? 0 : amount,
        credit: isReceipt ? amount : 0,
        desc: voucherDesc || (isAr ? 'حساب مقابل' : 'Contra account')
      }
    ];
  }, [amount, currentEntityAccount, resolvedCounterAccount, activeDetailForm, voucherDesc, isAr]);

  // Handle Save Voucher (Receipt / Payment)
  const handleSaveVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !currentEntity || !currentEntityAccount || !resolvedCounterAccount) {
      window.showAlert('البيانات غير مكتملة', 'Incomplete voucher parameters', 'danger');
      return;
    }

    const isReceipt = activeDetailForm === 'RECEIPT';
    const vType = isReceipt ? VoucherType.Receipt : VoucherType.Payment;
    const docNumber = getNextVoucherNumber(vType);

    // 1. Update balances
    const targetAccountId = currentEntityAccount.id;
    const counterAccountId = resolvedCounterAccount.id;

    // A. Update accounts chart balances
    const updatedAccounts = data.accounts.map(acc => {
      if (acc.id === targetAccountId) {
        return { ...acc, balance: isReceipt ? acc.balance + amount : acc.balance - amount };
      }
      if (acc.id === counterAccountId) {
        // Customer balance (receivable asset) decreases on Receipt (credit asset), increases on payment (debit asset)
        // Supplier balance (payable liability) decreases on Payment (debit liability), increases on receipt (credit liability)
        const isAsset = acc.type === 'ASSET';
        const isLiability = acc.type === 'LIABILITY';
        
        let change = 0;
        if (isAsset) {
          change = isReceipt ? -amount : amount;
        } else if (isLiability) {
          change = isReceipt ? amount : -amount;
        } else {
          // General rule: Debit increases asset/expense, Credit increases liability/equity/revenue
          // So if we debit it (Payment), it increases expense/asset or decreases liability. 
          // If we credit it (Receipt), it increases liability/revenue or decreases asset.
          change = isReceipt ? amount : -amount;
        }
        return { ...acc, balance: acc.balance + change };
      }
      return acc;
    });

    // B. Update Safe/Bank actual balances
    const updatedTreasuries = data.treasuries.map(t => {
      if (!currentEntity.isBank && t.id === currentEntity.id) {
        return { ...t, balance: isReceipt ? t.balance + amount : t.balance - amount };
      }
      return t;
    });

    const updatedBanks = data.bankAccounts.map(b => {
      if (currentEntity.isBank && b.id === currentEntity.id) {
        return { ...b, balance: isReceipt ? b.balance + amount : b.balance - amount };
      }
      return b;
    });

    // C. Update Customer/Supplier sub-ledger if applicable
    const updatedCustomers = data.customers.map(c => {
      if (partyType === 'CUSTOMER' && c.id === partyId) {
        return { ...c, balance: isReceipt ? c.balance - amount : c.balance + amount };
      }
      return c;
    });

    const updatedSuppliers = data.suppliers.map(s => {
      if (partyType === 'SUPPLIER' && s.id === partyId) {
        return { ...s, balance: isReceipt ? s.balance + amount : s.balance - amount };
      }
      return s;
    });

    // D. If method is CHEQUE, mark check as used in checkbook and create cheque record
    let updatedCheckbooks = [...(data.checkbooks || [])];
    let updatedCheques = [...data.cheques];
    if (payMethod === 'CHEQUE' && selectedCheckNumber) {
      updatedCheckbooks = updatedCheckbooks.map(cb => {
        const hasCheck = cb.checks.some(c => c.number === selectedCheckNumber);
        if (hasCheck) {
          return {
            ...cb,
            checks: cb.checks.map(c => c.number === selectedCheckNumber ? { ...c, status: 'USED' as const } : c)
          };
        }
        return cb;
      });

      // Add to Cheques Portfolio
      const newCheque: Cheque = {
        id: 'chq-' + Math.random().toString(36).substring(2, 9),
        chequeNumber: String(selectedCheckNumber),
        bankName: currentEntity.isBank ? (currentEntity as BankAccount).bankNameAr : 'خزينة نقدية',
        amount,
        type: isReceipt ? 'INCOMING' : 'OUTGOING',
        dueDate: chequeDueDate,
        status: ChequeStatus.Outstanding,
        partyName: partyName || (partyType === 'CUSTOMER' ? data.customers.find(c => c.id === partyId)?.nameAr || '' : data.suppliers.find(s => s.id === partyId)?.nameAr || '')
      };
      updatedCheques = [newCheque, ...updatedCheques];
    }

    // 2. Create Voucher Document
    const newVoucher: Voucher = {
      id: 'vch-' + Math.random().toString(36).substring(2, 9),
      voucherNumber: docNumber,
      type: vType,
      date: voucherDate,
      amount,
      partyType,
      partyId,
      partyName: partyName || (partyType === 'CUSTOMER' ? data.customers.find(c => c.id === partyId)?.nameAr || '' : data.suppliers.find(s => s.id === partyId)?.nameAr || 'جهة أخرى'),
      paymentMethod: payMethod,
      treasuryId: !currentEntity.isBank ? currentEntity.id : undefined,
      bankAccountId: currentEntity.isBank ? currentEntity.id : undefined,
      description: voucherDesc,
      referenceNumber: payMethod === 'CHEQUE' && selectedCheckNumber ? String(selectedCheckNumber) : voucherRef
    };

    // 3. Create General Ledger Auto Journal Entry
    const jvNumber = `JV-${new Date().getFullYear()}-${String(data.journalEntries.length + 1).padStart(3, '0')}`;
    const autoJV: JournalEntry = {
      id: 'je-' + Math.random().toString(36).substring(2, 9),
      entryNumber: jvNumber,
      date: voucherDate,
      type: 'AUTO' as any,
      description: `قيد تلقائي لسند ${isReceipt ? 'قبض' : 'صرف'} رقم ${docNumber} — ${voucherDesc}`,
      approved: true,
      approvedBy: 'ترحيل متكامل - وحدة النقدية',
      lines: [
        { accountId: targetAccountId, debit: isReceipt ? amount : 0, credit: isReceipt ? 0 : amount },
        { accountId: counterAccountId, debit: isReceipt ? 0 : amount, credit: isReceipt ? amount : 0 }
      ]
    };

    // 4. Create Statement MoneyTransaction record
    const newTx: MoneyTransaction = {
      id: 'mtx-' + Math.random().toString(36).substring(2, 9),
      number: docNumber,
      date: voucherDate,
      type: isReceipt ? ('RECEIPT' as any) : ('PAYMENT' as any),
      amount,
      sourceType: isReceipt ? 'DIRECT' : (currentEntity.isBank ? 'BANK' : 'CASHBOX'),
      sourceId: isReceipt ? '' : currentEntity.id,
      destType: isReceipt ? (currentEntity.isBank ? 'BANK' : 'CASHBOX') : 'DIRECT',
      destId: isReceipt ? currentEntity.id : '',
      description: voucherDesc || `سند ${isReceipt ? 'قبض وإضافة' : 'صرف نقدية'}`
    };

    // 5. Update system state
    onUpdateAccounts(updatedAccounts);
    onUpdateTreasuries(updatedTreasuries);
    onUpdateBankAccounts(updatedBanks);
    onUpdateCustomers(updatedCustomers);
    onUpdateSuppliers(updatedSuppliers);
    onUpdateCheques(updatedCheques);
    onUpdateCheckbooks(updatedCheckbooks);
    onUpdateVouchers([newVoucher, ...(data.vouchers || [])]);
    onUpdateMoneyTransactions([newTx, ...data.moneyTransactions]);
    onUpdateEntries([autoJV, ...data.journalEntries]);

    // 6. Audit Logging
    onAddAuditLog(
      `إصدار سند ${isReceipt ? 'قبض' : 'صرف'}: ${docNumber}`,
      `Issued ${isReceipt ? 'Receipt' : 'Payment'} Voucher: ${docNumber}`,
      `مبلغ ${amount} ج.م بـ ${payMethod} في ${currentEntityNameAr}. البيان: ${voucherDesc}`
    );

    // Reset Form
    setAmount(0);
    setPartyId('');
    setPartyName('');
    setVoucherDesc('');
    setVoucherRef('');
    setSelectedCheckNumber('');
    setActiveDetailForm('NONE');
    window.showAlert(`تم حفظ السند ${docNumber} بنجاح وترحيل القيود`, 'Voucher saved and posted successfully', 'success');
  };

  // Preview double entry journal lines for Transfer
  const transferJournalPreviewLines = useMemo(() => {
    if (transferAmount <= 0 || !currentEntityAccount || !transferDestId) return [];

    const destAccount = transferDestType === 'BANK'
      ? data.bankAccounts.find(b => b.id === transferDestId)
      : data.treasuries.find(t => t.id === transferDestId);

    if (!destAccount) return [];

    const destAccId = transferDestType === 'BANK'
      ? getBankAccountId(destAccount as BankAccount)
      : getSafeAccountId(destAccount as Treasury);

    const destAccObj = data.accounts.find(a => a.id === destAccId);
    if (!destAccObj) return [];

    return [
      {
        account: destAccObj,
        debit: transferAmount,
        credit: 0,
        desc: isAr ? `تحويل وارد إلى ${(destAccount as any).bankNameAr || (destAccount as any).nameAr}` : `Transfer in`
      },
      {
        account: currentEntityAccount,
        debit: 0,
        credit: transferAmount,
        desc: isAr ? `تحويل صادر من ${currentEntityNameAr}` : `Transfer out`
      }
    ];
  }, [transferAmount, currentEntityAccount, transferDestId, transferDestType, data.bankAccounts, data.treasuries, data.accounts, isAr, currentEntityNameAr]);

  // Handle Transfer save
  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferAmount <= 0 || !currentEntity || !currentEntityAccount || !transferDestId) {
      window.showAlert('بيانات التحويل ناقصة', 'Incomplete transfer fields', 'danger');
      return;
    }

    if (currentEntity.balance < transferAmount) {
      window.showAlert('رصيد الخزينة/البنك غير كافٍ للتحويل', 'Insufficient balance for transfer', 'warning');
      return;
    }

    // Find destination safe/bank object
    const destObj = transferDestType === 'BANK'
      ? data.bankAccounts.find(b => b.id === transferDestId)
      : data.treasuries.find(t => t.id === transferDestId);

    if (!destObj) return;

    const destNameAr = transferDestType === 'BANK'
      ? (destObj as BankAccount).bankNameAr
      : (destObj as Treasury).nameAr;

    // Accounts involved
    const sourceAccountId = currentEntityAccount.id;
    const destAccountId = transferDestType === 'BANK'
      ? getBankAccountId(destObj as BankAccount)
      : getSafeAccountId(destObj as Treasury);

    // 1. Update balances
    const updatedAccounts = data.accounts.map(acc => {
      if (acc.id === sourceAccountId) {
        return { ...acc, balance: acc.balance - transferAmount };
      }
      if (acc.id === destAccountId) {
        return { ...acc, balance: acc.balance + transferAmount };
      }
      return acc;
    });

    const updatedTreasuries = data.treasuries.map(t => {
      // Source Safe
      if (!currentEntity.isBank && t.id === currentEntity.id) {
        return { ...t, balance: t.balance - transferAmount };
      }
      // Dest Safe
      if (transferDestType === 'CASHBOX' && t.id === transferDestId) {
        return { ...t, balance: t.balance + transferAmount };
      }
      return t;
    });

    const updatedBanks = data.bankAccounts.map(b => {
      // Source Bank
      if (currentEntity.isBank && b.id === currentEntity.id) {
        return { ...b, balance: b.balance - transferAmount };
      }
      // Dest Bank
      if (transferDestType === 'BANK' && b.id === transferDestId) {
        return { ...b, balance: b.balance + transferAmount };
      }
      return b;
    });

    // 2. Generate transaction code
    const docNumber = `TR-${new Date().getFullYear()}-${String(data.moneyTransactions.length + 1).padStart(3, '0')}`;
    let txType = 'TRANSFER';
    if (!currentEntity.isBank && transferDestType === 'BANK') txType = 'DEPOSIT';
    if (currentEntity.isBank && transferDestType === 'CASHBOX') txType = 'WITHDRAWAL';

    const newTx: MoneyTransaction = {
      id: 'mtx-' + Math.random().toString(36).substring(2, 9),
      number: docNumber,
      date: new Date().toISOString().split('T')[0],
      type: txType as any,
      amount: transferAmount,
      sourceType: currentEntity.isBank ? 'BANK' : 'CASHBOX',
      sourceId: currentEntity.id,
      destType: transferDestType,
      destId: transferDestId,
      description: transferDesc || `تحويل أرصدة نقدية إلى ${destNameAr}`
    };

    // 3. Generate journal entry
    const jvNumber = `JV-${new Date().getFullYear()}-${String(data.journalEntries.length + 1).padStart(3, '0')}`;
    const autoJV: JournalEntry = {
      id: 'je-' + Math.random().toString(36).substring(2, 9),
      entryNumber: jvNumber,
      date: new Date().toISOString().split('T')[0],
      type: 'AUTO' as any,
      description: `قيد تحويل أرصدة تلقائي - سند رقم ${docNumber}`,
      approved: true,
      approvedBy: 'مزامنة التحويلات',
      lines: [
        { accountId: destAccountId, debit: transferAmount, credit: 0 },
        { accountId: sourceAccountId, debit: 0, credit: transferAmount }
      ]
    };

    // Apply updates
    onUpdateAccounts(updatedAccounts);
    onUpdateTreasuries(updatedTreasuries);
    onUpdateBankAccounts(updatedBanks);
    onUpdateMoneyTransactions([newTx, ...data.moneyTransactions]);
    onUpdateEntries([autoJV, ...data.journalEntries]);

    onAddAuditLog(
      `ترحيل سند تحويل: ${docNumber}`,
      `Executed transfer: ${docNumber}`,
      `تم تحويل ${transferAmount} ج.م من ${currentEntityNameAr} إلى ${destNameAr}.`
    );

    setTransferAmount(0);
    setTransferDestId('');
    setTransferDesc('');
    setActiveDetailForm('NONE');
    window.showAlert(`تم ترحيل قيد التحويل بنجاح برقم ${docNumber}`, 'Transfer posted successfully', 'success');
  };

  // Generate detailed account statement list
  const statementHistory = useMemo(() => {
    if (!currentEntity) return [];

    const entityId = currentEntity.id;
    const isBank = currentEntity.isBank;

    // Filter moneyTransactions
    const filtered = data.moneyTransactions.filter(tx => {
      const isSource = isBank 
        ? (tx.sourceType === 'BANK' && tx.sourceId === entityId)
        : (tx.sourceType === 'CASHBOX' && tx.sourceId === entityId);
      
      const isDest = isBank 
        ? (tx.destType === 'BANK' && tx.destId === entityId)
        : (tx.destType === 'CASHBOX' && tx.destId === entityId);

      const inDateRange = (!statementStart || tx.date >= statementStart) &&
                          (!statementEnd || tx.date <= statementEnd);

      const matchesSearch = !statementSearch || 
                            tx.number.toLowerCase().includes(statementSearch.toLowerCase()) ||
                            tx.description.toLowerCase().includes(statementSearch.toLowerCase());

      return (isSource || isDest) && inDateRange && matchesSearch;
    });

    // Sort chronologically to calculate rolling balance
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = 0;
    return filtered.map(tx => {
      const isSource = isBank 
        ? (tx.sourceType === 'BANK' && tx.sourceId === entityId)
        : (tx.sourceType === 'CASHBOX' && tx.sourceId === entityId);

      // Source means cash is leaving (Credit / Outflow), Dest means cash is coming in (Debit / Inflow)
      const isOutflow = isSource; 
      const debit = isOutflow ? 0 : tx.amount;
      const credit = isOutflow ? tx.amount : 0;
      balance = isOutflow ? balance - tx.amount : balance + tx.amount;

      return {
        ...tx,
        debit,
        credit,
        balanceAfter: balance
      };
    }).reverse(); // Reverse to display newest first
  }, [currentEntity, data.moneyTransactions, statementStart, statementEnd, statementSearch]);

  // Settle Checkbook check status
  const toggleCheckStatus = (bookId: string, checkNum: number, currentStatus: string) => {
    const nextStatus = (currentStatus === 'UNUSED' ? 'CANCELLED' : 'UNUSED') as 'UNUSED' | 'CANCELLED';
    
    const updated = (data.checkbooks || []).map(cb => {
      if (cb.id === bookId) {
        return {
          ...cb,
          checks: cb.checks.map((c): CheckbookCheck => c.number === checkNum ? { ...c, status: nextStatus } : c)
        };
      }
      return cb;
    });
    
    onUpdateCheckbooks(updated);
    onAddAuditLog(
      `تعديل حالة شيك: رقم ${checkNum}`,
      `Changed Check Status: No ${checkNum}`,
      `تم تعديل حالة الشيك رقم ${checkNum} بالدفتر إلى ${nextStatus}`
    );
    window.showAlert('تم تحديث حالة الشيك', 'Check status updated', 'success');
  };

  // Delete Safe or Bank Account
  const handleDeleteEntity = (id: string, name: string, isBank: boolean) => {
    window.showConfirm(
      isAr ? `⚠️ هل أنت متأكد من حذف "${name}" بالكامل من النظام؟ سيتم حذف ربطها فقط دون التأثير على القيود المحاسبية التاريخية.` : `Are you sure you want to delete "${name}"? Historical ledger entries won't be deleted.`,
      isAr ? `تنبيه: لا يمكن التراجع عن هذا الإجراء` : `Warning: This action cannot be undone`,
      () => {
        if (isBank) {
          onUpdateBankAccounts(data.bankAccounts.filter(b => b.id !== id));
        } else {
          onUpdateTreasuries(data.treasuries.filter(t => t.id !== id));
        }
        
        onAddAuditLog(
          `حذف خزنة/بنك: ${name}`,
          `Deleted Safe/Bank: ${name}`,
          `تم إزالة الكيان المالي من لوحة المتابعة الرئيسية.`
        );

        setSelectedSafeId(null);
        setSelectedBankId(null);
        setActiveDetailForm('NONE');
        window.showAlert('تم الحذف بنجاح', 'Deleted successfully', 'success');
      }
    );
  };

  // Export checkbook checks to Excel
  const handleExportCheckbookToExcel = (book: Checkbook) => {
    const bank = data.bankAccounts.find(b => b.id === book.bankAccountId);
    const rows = book.checks.map(c => ({
      'رقم الشيك': c.number,
      'حالة الشيك': c.status === 'UNUSED' ? (isAr ? 'متاح / غير مستخدم' : 'Unused') :
                   c.status === 'USED' ? (isAr ? 'صادر / مستخدم' : 'Used') :
                   (isAr ? 'ملغى' : 'Cancelled'),
      'البنك المرتبط': bank ? (isAr ? bank.bankNameAr : bank.bankNameEn) : '',
      'رقم الحساب البنكي': bank ? bank.accountNumber : '',
      'دفتر الشيكات': book.code
    }));
    exportToCSV(rows, `checkbook-${book.code}`);
  };

  // Detailed Account Statement Printing
  const handlePrintStatement = () => {
    if (!currentEntity) return;

    const title = isAr 
      ? `كشف حساب تفصيلي - ${currentEntityNameAr}`
      : `Detailed Statement - ${currentEntityNameEn}`;

    const rowsHTML = statementHistory.map(tx => `
      <tr>
        <td style="padding:8px; border-bottom:1px solid #e2e8f0; font-family:monospace; color:#2563eb;">${tx.number}</td>
        <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${tx.date}</td>
        <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${tx.type}</td>
        <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right; font-family:monospace; font-weight:bold; color:#16a34a;">${tx.debit > 0 ? fmtCurrency(tx.debit, lang) : '-'}</td>
        <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right; font-family:monospace; font-weight:bold; color:#dc2626;">${tx.credit > 0 ? fmtCurrency(tx.credit, lang) : '-'}</td>
        <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right; font-family:monospace; font-weight:bold;">${fmtCurrency(tx.balanceAfter, lang)}</td>
        <td style="padding:8px; border-bottom:1px solid #e2e8f0; max-width:200px; overflow:hidden; text-overflow:ellipsis;">${tx.description}</td>
      </tr>
    `).join('');

    const html = `
      <div class="print-page">
        ${companyHeaderHTML()}
        <div class="doc-title" style="background:#f8fafc; border-color:#e2e8f0;">
          <h2>${title}</h2>
          <div style="font-size:10px; color:#64748b; margin-top:4px;">
            ${isAr ? `تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG-u-nu-latn')}` : `Printed on: ${new Date().toLocaleDateString()}`}
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <div class="label">${isAr ? 'اسم الكيان' : 'Entity Name'}</div>
            <div class="value" style="font-weight:bold; color:#1e3a8a;">${currentEntityNameAr}</div>
          </div>
          <div class="info-box">
            <div class="label">${isAr ? 'الفرع المسؤول' : 'Responsible Branch'}</div>
            <div class="value">${currentEntity.branch || '-'}</div>
          </div>
          <div class="info-box">
            <div class="label">${isAr ? 'الرصيد الحالي' : 'Current Balance'}</div>
            <div class="value" style="font-weight:bold; color:#1e40af; font-family:monospace;">${fmtCurrency(currentEntity.balance, lang)}</div>
          </div>
          <div class="info-box">
            <div class="label">${isAr ? 'المسؤول' : 'Person Responsible'}</div>
            <div class="value">${currentEntity.responsible || '-'}</div>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:10px; margin-top:20px; text-align:right;">
          <thead>
            <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1; font-weight:bold; color:#475569;">
              <th style="padding:8px; text-align:right;">${isAr ? 'رقم المستند' : 'Doc No'}</th>
              <th style="padding:8px; text-align:right;">${isAr ? 'التاريخ' : 'Date'}</th>
              <th style="padding:8px; text-align:right;">${isAr ? 'النوع' : 'Type'}</th>
              <th style="padding:8px; text-align:right;">${isAr ? 'وارد (مدين)' : 'Inflow (Dr)'}</th>
              <th style="padding:8px; text-align:right;">${isAr ? 'صادر (دائن)' : 'Outflow (Cr)'}</th>
              <th style="padding:8px; text-align:right;">${isAr ? 'الرصيد بعد' : 'Balance After'}</th>
              <th style="padding:8px; text-align:right;">${isAr ? 'البيان والملاحظات' : 'Narrative'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>

        ${signaturesHTML([
          isAr ? 'أمين الخزينة' : 'Cashier',
          isAr ? 'رئيس الحسابات' : 'Chief Accountant',
          isAr ? 'المدير المالي' : 'CFO'
        ])}

        ${footerHTML()}
      </div>
    `;

    printDocument(html, title);
  };

  // Export Account Statement to CSV
  const handleExportStatement = () => {
    if (!currentEntity) return;

    const rows = statementHistory.map(tx => ({
      'رقم المستند': tx.number,
      'التاريخ': tx.date,
      'النوع': tx.type,
      'مدين (وارد)': tx.debit,
      'دائن (صادر)': tx.credit,
      'الرصيد المتبقي': tx.balanceAfter,
      'البيان والتفاصيل': tx.description
    }));

    exportToCSV(rows, `statement-${currentEntity.id}`);
  };

  // Get checks of selected Bank
  const availableUnusedChecks = useMemo(() => {
    if (!currentEntity || !currentEntity.isBank) return [];
    
    // Find all checkbooks for this bank
    const books = (data.checkbooks || []).filter(cb => cb.bankAccountId === currentEntity.id);
    const list: number[] = [];
    books.forEach(b => {
      b.checks.forEach(c => {
        if (c.status === 'UNUSED') {
          list.push(c.number);
        }
      });
    });
    return list;
  }, [currentEntity, data.checkbooks]);

  // List of other safes/banks for Transfer destination dropdown
  const otherTransferDestinations = useMemo(() => {
    if (!currentEntity) return [];

    const list: { id: string; label: string; type: 'CASHBOX' | 'BANK' }[] = [];
    
    data.treasuries.forEach(t => {
      if (currentEntity.isBank || t.id !== currentEntity.id) {
        list.push({
          id: t.id,
          label: isAr ? `خزينة: ${t.nameAr} (${formatCurrency(t.balance)})` : `Safe: ${t.nameEn} (${t.balance} EGP)`,
          type: 'CASHBOX'
        });
      }
    });

    data.bankAccounts.forEach(b => {
      if (!currentEntity.isBank || b.id !== currentEntity.id) {
        list.push({
          id: b.id,
          label: isAr ? `بنك: ${b.bankNameAr} (${formatCurrency(b.balance)})` : `Bank: ${b.bankNameEn} (${b.balance} EGP)`,
          type: 'BANK'
        });
      }
    });

    return list;
  }, [currentEntity, data.treasuries, data.bankAccounts, isAr]);

  return (
    <div id="unified_treasury_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1 text-slate-800 dark:text-slate-200" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* 1. TOP TITLE SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Coins className="h-7 w-7 text-[#0056b3] dark:text-[#00c6ff]" />
            <span>{isAr ? 'وحدة إدارة الخزائن والبنوك المركزية' : 'Consolidated Treasury & Corporate Banking Center'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-1">
            {isAr 
              ? 'إدارة التدفقات النقدية المركزية، إضافة الخزائن والبنوك الفورية، إصدار سندات المقبوضات والمدفوعات ومطابقة الشيكات' 
              : 'Centralized liquidity control panel: direct ledger creation, instant voucher processing, and checkbook audit loops'}
          </p>
        </div>

        {/* Home Breadcrumb button if deep inside details */}
        {(selectedSafeId || selectedBankId || selectedCheckbookId) && (
          <button
            onClick={() => { setSelectedSafeId(null); setSelectedBankId(null); setSelectedCheckbookId(null); setActiveDetailForm('NONE'); }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <ChevronRight className={`h-4 w-4 ${isAr ? 'rotate-0' : 'rotate-180'}`} />
            <span>{isAr ? 'العودة للوحة الخزائن والبنوك' : 'Back to Dashboard'}</span>
          </button>
        )}
      </div>

      {/* 2. DASHBOARD MAIN VIEW (If nothing deep-selected) */}
      {!selectedSafeId && !selectedBankId && !selectedCheckbookId && (
        <div className="space-y-6">
          
          {/* CONTROL BAR (Search + Add Buttons) */}
          <div className="flex flex-col lg:flex-row justify-between gap-4 bg-white/70 dark:bg-slate-950/40 p-4 rounded-2xl border border-[#cbdcf8] dark:border-slate-900 backdrop-blur-md">
            
            {/* Search + Filter */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className={`absolute ${isAr ? 'left-auto right-3' : 'right-auto left-3'} top-3 h-4 w-4 text-slate-400`} />
                <input
                  type="text"
                  placeholder={isAr ? 'البحث بالاسم، الفرع، المسؤول...' : 'Search by name, branch, manager...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full text-xs font-semibold ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500`}
                />
              </div>

              {/* Sub-group tabs selector */}
              <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200/50 dark:border-slate-850">
                {(['ALL', 'SAFES', 'BANKS', 'CHECKBOOKS'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3.5 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      filterType === type 
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-sm font-black' 
                        : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-300'
                    }`}
                  >
                    {type === 'ALL' ? (isAr ? 'الكل' : 'All') :
                     type === 'SAFES' ? (isAr ? 'الخزائن' : 'Safes') :
                     type === 'BANKS' ? (isAr ? 'البنوك' : 'Banks') :
                     (isAr ? 'دفاتر الشيكات' : 'Checkbooks')}
                  </button>
                ))}
              </div>
            </div>

            {/* Dashboard Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => { setShowAddSafeForm(!showAddSafeForm); setShowAddBankForm(false); setShowAddCheckbookForm(false); }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isAr ? 'إنشاء خزنة نقدية' : 'New Cash Safe'}</span>
              </button>

              <button
                onClick={() => { setShowAddBankForm(!showAddBankForm); setShowAddSafeForm(false); setShowAddCheckbookForm(false); }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isAr ? 'إدراج حساب بنكي' : 'New Bank Account'}</span>
              </button>

              <button
                onClick={() => { setShowAddCheckbookForm(!showAddCheckbookForm); setShowAddSafeForm(false); setShowAddBankForm(false); }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-all shadow-md shadow-purple-500/10 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isAr ? 'إنشاء دفتر شيكات' : 'Create Checkbook'}</span>
              </button>
            </div>
          </div>

          {/* ADD SAFE FORM INLINE ACCORDION */}
          {showAddSafeForm && (
            <form onSubmit={handleCreateSafe} className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950/40 p-6 rounded-2xl space-y-4 shadow-xl">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
                <h3 className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                  <Coins className="h-4.5 w-4.5" />
                  <span>{isAr ? 'إنشاء خزنة نقدية جديدة وتوليد حسابها المحاسبي تلقائياً' : 'Create New Cash Safe Vault'}</span>
                </h3>
                <button type="button" onClick={() => setShowAddSafeForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'الاسم باللغة العربية' : 'Safe Name (AR)'}</label>
                  <input type="text" required value={safeNameAr} onChange={(e) => setSafeNameAr(e.target.value)} placeholder="خزينة مبيعات الصالة"
                    className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'الاسم باللغة الإنجليزية' : 'Safe Name (EN)'}</label>
                  <input type="text" required value={safeNameEn} onChange={(e) => setSafeNameEn(e.target.value)} placeholder="Dine-in Sales Safe"
                    className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'الفرع التابع له' : 'Branch'}</label>
                  <select value={safeBranch} onChange={(e) => setSafeBranch(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white">
                    <option value="main">{isAr ? 'الفرع الرئيسي' : 'Main Branch'}</option>
                    <option value="branch1">{isAr ? 'فرع الهرم' : 'Haram Branch'}</option>
                    <option value="branch2">{isAr ? 'فرع التجمع' : 'Tagamoa Branch'}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'أمين الخزينة المسؤول' : 'Responsible Person'}</label>
                  <input type="text" required value={safeResponsible} onChange={(e) => setSafeResponsible(e.target.value)} placeholder="محمد علي"
                    className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'الرصيد الابتدائي الافتتاحي' : 'Opening balance'}</label>
                  <input type="number" min="0" value={safeInitBalance || ''} onChange={(e) => setSafeInitBalance(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white" />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-6 rounded-xl shadow-md cursor-pointer">
                  {isAr ? 'توليد الحساب وحفظ الخزنة' : 'Generate Account & Save Safe'}
                </button>
                <button type="button" onClick={() => setShowAddSafeForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-850 dark:text-slate-300 font-bold text-xs py-2 px-4 rounded-xl cursor-pointer">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          )}

          {/* ADD BANK FORM INLINE ACCORDION */}
          {showAddBankForm && (
            <form onSubmit={handleCreateBank} className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-950/40 p-6 rounded-2xl space-y-4 shadow-xl">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
                <h3 className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                  <Landmark className="h-4.5 w-4.5" />
                  <span>{isAr ? 'إدراج حساب بنكي جديد وتوليد حسابه المحاسبي تلقائياً' : 'Link New Bank Account'}</span>
                </h3>
                <button type="button" onClick={() => setShowAddBankForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'اسم البنك باللغة العربية' : 'Bank Name (AR)'}</label>
                  <input type="text" required value={bankNameAr} onChange={(e) => setBankNameAr(e.target.value)} placeholder="بنك مصر - حساب جاري"
                    className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'اسم البنك باللغة الإنجليزية' : 'Bank Name (EN)'}</label>
                  <input type="text" required value={bankNameEn} onChange={(e) => setBankNameEn(e.target.value)} placeholder="Banque Misr - Current Account"
                    className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'رقم الحساب أو IBAN' : 'Account/IBAN No.'}</label>
                  <input type="text" required value={bankNumber} onChange={(e) => setBankNumber(e.target.value)} placeholder="EG123000..."
                    className="w-full text-xs font-mono font-semibold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'الفرع المسؤول' : 'Branch'}</label>
                  <select value={bankBranch} onChange={(e) => setBankBranch(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white">
                    <option value="main">{isAr ? 'الفرع الرئيسي' : 'Main Branch'}</option>
                    <option value="branch1">{isAr ? 'فرع الهرم' : 'Haram Branch'}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'مسؤول الحساب البنكي' : 'Responsible Person'}</label>
                  <input type="text" required value={bankResponsible} onChange={(e) => setBankResponsible(e.target.value)} placeholder="شادي مصطفى"
                    className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'الرصيد الابتدائي الافتتاحي' : 'Opening balance'}</label>
                  <input type="number" min="0" value={bankInitBalance || ''} onChange={(e) => setBankInitBalance(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white" />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-6 rounded-xl shadow-md cursor-pointer">
                  {isAr ? 'توليد الحساب وحفظ البنك' : 'Generate Account & Link Bank'}
                </button>
                <button type="button" onClick={() => setShowAddBankForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-850 dark:text-slate-300 font-bold text-xs py-2 px-4 rounded-xl cursor-pointer">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          )}

          {/* ADD CHECKBOOK FORM INLINE ACCORDION */}
          {showAddCheckbookForm && (
            <form onSubmit={handleCreateCheckbook} className="bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-950/40 p-6 rounded-2xl space-y-4 shadow-xl">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
                <h3 className="text-sm font-bold text-purple-600 flex items-center gap-1.5">
                  <CreditCard className="h-4.5 w-4.5" />
                  <span>{isAr ? 'إنشاء دفتر شيكات جديد وربطه بحساب بنكي' : 'Create New Corporate Checkbook'}</span>
                </h3>
                <button type="button" onClick={() => setShowAddCheckbookForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'رمز أو اسم الدفتر' : 'Book Name / Code'}</label>
                  <input type="text" required value={checkbookCode} onChange={(e) => setCheckbookCode(e.target.value)} placeholder="دفتر شيكات - أ"
                    className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'الحساب البنكي المرتبط' : 'Linked Bank Account'}</label>
                  <select required value={checkbookBankId} onChange={(e) => setCheckbookBankId(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white">
                    <option value="">{isAr ? '-- اختر البنك --' : '-- Choose Bank --'}</option>
                    {data.bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{isAr ? b.bankNameAr : b.bankNameEn}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'رقم البداية للمتسلسل' : 'Start Check Number'}</label>
                  <input type="number" required value={checkbookStartNum} onChange={(e) => setCheckbookStartNum(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 block">{isAr ? 'عدد الأوراق (الشيكات)' : 'Number of Checks'}</label>
                  <input type="number" required value={checkbookCount} onChange={(e) => setCheckbookCount(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-850 dark:border-slate-800 text-slate-900 dark:text-white" />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 px-6 rounded-xl shadow-md cursor-pointer">
                  {isAr ? 'إنشاء الدفتر وتوليد الشيكات' : 'Create & Generate checks'}
                </button>
                <button type="button" onClick={() => setShowAddCheckbookForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-850 dark:text-slate-300 font-bold text-xs py-2 px-4 rounded-xl cursor-pointer">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          )}

          {/* SQUEEZE GRID OF CARDS (Safes, Banks, Checkbooks) */}
          {filteredDashboardCards.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 text-xs font-extrabold">
              {isAr ? 'لا توجد خزائن أو بنوك مطابقة للبحث' : 'No safes, banks, or checkbooks found matching criteria'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDashboardCards.map((card) => {
                const isSafe = card.cardType === 'SAFE';
                const isBank = card.cardType === 'BANK';
                const isBook = card.cardType === 'CHECKBOOK';

                return (
                  <div
                    key={card.id}
                    className={`relative overflow-hidden bg-white dark:bg-slate-950 p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${
                      isSafe ? 'border-emerald-100 hover:border-emerald-300 dark:border-emerald-950/40 hover:dark:border-emerald-800' :
                      isBank ? 'border-blue-100 hover:border-blue-300 dark:border-blue-950/40 hover:dark:border-blue-800' :
                      'border-purple-100 hover:border-purple-300 dark:border-purple-950/40 hover:dark:border-purple-800'
                    }`}
                  >
                    {/* Top Type Indicator */}
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        isSafe ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                        isBank ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      }`}>
                        {isSafe ? (isAr ? 'خزينة نقدية' : 'Cash Safe') :
                         isBank ? (isAr ? 'حساب جاري' : 'Bank Account') :
                         (isAr ? 'دفتر شيكات' : 'Checkbook')}
                      </span>

                      {/* Icon */}
                      <div className={`p-2.5 rounded-xl ${
                        isSafe ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-500' :
                        isBank ? 'bg-blue-50 dark:bg-blue-950 text-blue-500' :
                        'bg-purple-50 dark:bg-purple-950 text-purple-500'
                      }`}>
                        {isSafe ? <Coins className="h-5 w-5" /> :
                         isBank ? <Landmark className="h-5 w-5" /> :
                         <CreditCard className="h-5 w-5" />}
                      </div>
                    </div>

                    {/* Card Title */}
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {isAr ? card.nameAr : card.nameEn}
                      </h3>
                      {isBank && <span className="text-[10px] text-slate-400 font-mono font-bold mt-0.5 block">{card.accountNumber}</span>}
                      {isBook && <span className="text-[10px] text-slate-400 font-mono font-bold mt-0.5 block">{card.bankName}</span>}
                    </div>

                    {/* Balance / Status */}
                    <div className="my-5">
                      <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">
                        {isBook ? (isAr ? 'حالة الأوراق المالية' : 'Checks statistics') : (isAr ? 'الرصيد المتاح' : 'Available Balance')}
                      </span>
                      <p className={`text-lg font-black font-mono mt-1 ${isBook ? 'text-purple-600 dark:text-purple-400' : (isSafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400')}`}>
                        {isBook ? (isAr ? `نطاق: ${card.startNumber} - ${card.endNumber}` : `Range: ${card.startNumber} - ${card.endNumber}`) : formatCurrency(card.balance)}
                      </p>
                    </div>

                    {/* Footer Branch + Action */}
                    <div className="pt-3 border-t border-slate-50 dark:border-slate-900 flex justify-between items-center">
                      <div className="text-[10px] font-bold text-slate-400">
                        <span>{isAr ? 'الفرع: ' : 'Branch: '}</span>
                        <span className="text-slate-600 dark:text-slate-300">{card.branch === 'main' ? (isAr ? 'الرئيسي' : 'Main') : card.branch}</span>
                      </div>

                      <button
                        onClick={() => {
                          if (isSafe) setSelectedSafeId(card.id);
                          else if (isBank) setSelectedBankId(card.id);
                          else setSelectedCheckbookId(card.id);
                        }}
                        className={`flex items-center gap-1 text-[10px] font-black hover:underline cursor-pointer ${
                          isSafe ? 'text-emerald-600 dark:text-emerald-400' :
                          isBank ? 'text-blue-600 dark:text-blue-400' :
                          'text-purple-600 dark:text-purple-400'
                        }`}
                      >
                        <span>{isAr ? 'إدارة العمليات والتفاصيل' : 'Manage & Details'}</span>
                        <ChevronRight className={`h-3 w-3 ${isAr ? 'rotate-180' : 'rotate-0'}`} />
                      </button>
                    </div>

                    {/* Last Transaction Badge */}
                    <div className="mt-2.5 text-[9px] text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg truncate">
                      <strong>{isAr ? 'آخر حركة: ' : 'Last transaction: '}</strong>
                      <span>{getCardLastTransaction(card.id, card.cardType)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* 3. DEEP CHECKBOOK VIEW */}
      {selectedCheckbookId && (() => {
        const book = (data.checkbooks || []).find(b => b.id === selectedCheckbookId);
        if (!book) return null;
        const bank = data.bankAccounts.find(b => b.id === book.bankAccountId);
        const unused = book.checks.filter(c => c.status === 'UNUSED').length;
        const used = book.checks.filter(c => c.status === 'USED').length;
        const cancelled = book.checks.filter(c => c.status === 'CANCELLED').length;

        return (
          <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-900 space-y-6">
            
            {/* Header Details */}
            <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-4 border-slate-50 dark:border-slate-900">
              <div className="flex items-start justify-between w-full md:w-auto gap-6">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    {isAr ? `دفتر شيكات: ${book.code}` : `Checkbook: ${book.code}`}
                  </h2>
                  <p className="text-slate-400 text-xs font-bold mt-1">
                    {isAr 
                      ? `مرتبط بالبنك: ${bank ? bank.bankNameAr : ''} — النطاق الرقمي: ${book.startNumber} إلى ${book.endNumber}`
                      : `Linked with: ${bank ? bank.bankNameEn : ''} — Range: ${book.startNumber} to ${book.endNumber}`}
                  </p>
                </div>
                <button
                  onClick={() => handleExportCheckbookToExcel(book)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] cursor-pointer shadow-md shadow-emerald-500/10 self-center"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isAr ? 'تصدير لـ Excel' : 'Export to Excel'}</span>
                </button>
              </div>

              {/* Counts summary cards */}
              <div className="flex gap-4 text-xs font-black">
                <div className="bg-purple-50 dark:bg-purple-950/20 px-4 py-2 rounded-xl text-purple-650 font-bold">
                  {isAr ? 'الأوراق المتاحة (غير مستخدمة)' : 'Remaining checks'}: {unused}
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2 rounded-xl text-emerald-650 font-bold">
                  {isAr ? 'الشيكات الصادرة (المستخدمة)' : 'Used checks'}: {used}
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/20 px-4 py-2 rounded-xl text-rose-650 font-bold">
                  {isAr ? 'الشيكات الملغاة' : 'Cancelled checks'}: {cancelled}
                </div>
              </div>
            </div>

            {/* Checks Grid / Table */}
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-4">
                {isAr ? 'قائمة الشيكات التفصيلية وحالتها التشغيلية' : 'Checks inventory ledger'}
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
                {book.checks.map(check => {
                  const isUnused = check.status === 'UNUSED';
                  const isUsed = check.status === 'USED';
                  const isCancelled = check.status === 'CANCELLED';

                  return (
                    <div
                      key={check.number}
                      className={`p-3.5 rounded-2xl text-center border font-mono transition-all ${
                        isUnused ? 'bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800' :
                        isUsed ? 'bg-emerald-50/70 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900' :
                        'bg-rose-50/70 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900'
                      }`}
                    >
                      <span className="text-xs font-black block">{check.number}</span>
                      
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md mt-2 inline-block uppercase ${
                        isUnused ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                        isUsed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-900/30'
                      }`}>
                        {check.status === 'UNUSED' ? (isAr ? 'متاح' : 'Unused') :
                         check.status === 'USED' ? (isAr ? 'صادر' : 'Issued') :
                         (isAr ? 'ملغى' : 'Cancelled')}
                      </span>

                      {/* Cancel/Restore button for unused/cancelled checks */}
                      {!isUsed && (
                        <button
                          onClick={() => toggleCheckStatus(book.id, check.number, check.status)}
                          className="mt-2 text-[9px] font-extrabold text-blue-600 hover:underline block w-full text-center cursor-pointer"
                        >
                          {isUnused ? (isAr ? 'إلغاء الورقة' : 'Cancel') : (isAr ? 'إتاحة مجدداً' : 'Restore')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        );
      })()}

      {/* 4. DEEP DETAILS VIEW (For clicked Safe or Bank) */}
      {currentEntity && (
        <div className="space-y-6">
          
          {/* SAFE/BANK META BANNER CARD */}
          <div className={`p-6 rounded-3xl border bg-white dark:bg-slate-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
            currentEntity.isBank ? 'border-blue-100 dark:border-blue-900/40' : 'border-emerald-100 dark:border-emerald-900/40'
          }`}>
            <div>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${currentEntity.isBank ? 'bg-blue-50 text-blue-600 dark:bg-slate-900' : 'bg-emerald-50 text-emerald-600 dark:bg-slate-900'}`}>
                  {currentEntity.isBank ? <Landmark className="h-6 w-6" /> : <Coins className="h-6 w-6" />}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {currentEntityNameAr}
                  </h2>
                  {currentEntity.isBank && <span className="text-xs font-mono font-bold text-slate-400 mt-1 block">{(currentEntity as BankAccount).accountNumber}</span>}
                </div>
              </div>

              {/* Squeeze meta details info row */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-xs font-semibold text-slate-500">
                <div>
                  <span>{isAr ? 'الفرع: ' : 'Branch: '}</span>
                  <span className="text-slate-800 dark:text-slate-200">{currentEntity.branch === 'main' ? (isAr ? 'الرئيسي' : 'Main') : currentEntity.branch}</span>
                </div>
                <div className="h-3 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
                <div>
                  <span>{isAr ? 'المسؤول المباشر: ' : 'Supervisor: '}</span>
                  <span className="text-slate-800 dark:text-slate-200">{currentEntity.responsible || '-'}</span>
                </div>
                <div className="h-3 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
                <div>
                  <span>{isAr ? 'الحساب المحاسبي المرتبط: ' : 'Chart Account: '}</span>
                  <span className="text-blue-650 dark:text-sky-400 font-mono font-bold">{currentEntityAccount ? `${currentEntityAccount.code} - ${isAr ? currentEntityAccount.nameAr : currentEntityAccount.nameEn}` : (isAr ? 'غير مرتبط' : 'Not Linked')}</span>
                </div>
              </div>
            </div>

            {/* Current balance display */}
            <div className="text-start md:text-end">
              <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-widest">{isAr ? 'الرصيد المالي الحالي للبطاقة' : 'Current Liquidity Balance'}</span>
              <span className={`text-2xl font-black font-mono mt-1.5 block ${currentEntity.isBank ? 'text-blue-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatCurrency(currentEntity.balance)}
              </span>
            </div>
          </div>

          {/* MAIN GRID BLOCK: Action Buttons left, History Preview right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* OPERATIONS SELECTOR PANEL */}
            <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-[#cbdcf8] dark:border-slate-900 space-y-4">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                {isAr ? 'إجراءات مالية وعمليات مباشرة' : 'Operational Commands'}
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                {/* 1. Receipt */}
                <button
                  onClick={() => {
                    setActiveDetailForm('RECEIPT'); 
                    setVType(VoucherType.Receipt); 
                    setPayMethod(currentEntity.isBank ? 'BANK_TRANSFER' : 'CASH');
                    setAmount(0); setPartyId(''); setPartyName(''); setVoucherDesc(''); setVoucherRef('');
                  }}
                  className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    activeDetailForm === 'RECEIPT' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-650 dark:text-emerald-400 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <TrendingUp className="h-5 w-5 text-emerald-650" />
                  <span>{isAr ? 'إذن إضافة (قبض)' : 'Receipt Voucher'}</span>
                </button>

                {/* 2. Payment */}
                <button
                  onClick={() => {
                    setActiveDetailForm('PAYMENT'); 
                    setVType(VoucherType.Payment); 
                    setPayMethod(currentEntity.isBank ? 'BANK_TRANSFER' : 'CASH');
                    setAmount(0); setPartyId(''); setPartyName(''); setVoucherDesc(''); setVoucherRef('');
                  }}
                  className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    activeDetailForm === 'PAYMENT' ? 'bg-rose-600/10 border-rose-500 text-rose-650 dark:text-rose-400 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <TrendingDown className="h-5 w-5 text-rose-650" />
                  <span>{isAr ? 'إذن صرف (دفع)' : 'Payment Voucher'}</span>
                </button>

                {/* 3. Transfer */}
                <button
                  onClick={() => {
                    setActiveDetailForm('TRANSFER');
                    setTransferAmount(0); setTransferDestId(''); setTransferDesc('');
                    // Set default dest type
                    setTransferDestType(currentEntity.isBank ? 'BANK' : 'CASHBOX');
                  }}
                  className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    activeDetailForm === 'TRANSFER' ? 'bg-blue-600/10 border-blue-500 text-blue-600 dark:text-sky-400 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <ArrowRightLeft className="h-5 w-5 text-blue-650" />
                  <span>{isAr ? 'تحويل أرصدة' : 'Transfer Balance'}</span>
                </button>

                {/* 4. Statement */}
                <button
                  onClick={() => {
                    setActiveDetailForm('STATEMENT');
                  }}
                  className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    activeDetailForm === 'STATEMENT' ? 'bg-purple-600/10 border-purple-500 text-purple-650 dark:text-purple-400 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <FileText className="h-5 w-5 text-purple-650" />
                  <span>{isAr ? 'كشف الحساب' : 'Account Statement'}</span>
                </button>

                {/* 5. Edit Details */}
                <button
                  onClick={() => {
                    setActiveDetailForm('EDIT');
                    setEditNameAr(currentEntity.isBank ? (currentEntity as BankAccount).bankNameAr : (currentEntity as Treasury).nameAr);
                    setEditNameEn(currentEntity.isBank ? (currentEntity as BankAccount).bankNameEn : (currentEntity as Treasury).nameEn);
                    setEditBranch(currentEntity.branch || 'main');
                    setEditResponsible(currentEntity.responsible || '');
                    setEditBankNo(currentEntity.isBank ? (currentEntity as BankAccount).accountNumber : '');
                  }}
                  className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    activeDetailForm === 'EDIT' ? 'bg-amber-600/10 border-amber-500 text-amber-650 dark:text-amber-400 font-black' : 'hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <Edit className="h-5 w-5 text-amber-655" />
                  <span>{isAr ? 'تعديل البيانات' : 'Edit Info'}</span>
                </button>

                {/* 6. Export Statement directly to Excel */}
                <button
                  onClick={handleExportStatement}
                  className="p-3.5 rounded-2xl border text-center hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-300 border-slate-100 dark:border-slate-800 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-450"
                >
                  <Download className="h-5 w-5" />
                  <span>{isAr ? 'تصدير لـ Excel' : 'Export to Excel'}</span>
                </button>
              </div>

              {/* DELETE SAFE/BANK BUTTON */}
              <div className="pt-4 border-t border-slate-50 dark:border-slate-900">
                <button
                  onClick={() => handleDeleteEntity(currentEntity.id, currentEntity.isBank ? (currentEntity as BankAccount).bankNameAr : (currentEntity as Treasury).nameAr, currentEntity.isBank)}
                  className="w-full py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-950 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{isAr ? 'حذف من لوحة المتابعة' : 'Delete Safe/Bank'}</span>
                </button>
              </div>
            </div>

            {/* QUICK VIEW LEDGER TRAIL (Latest 6 transactions) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-6 rounded-3xl border border-[#cbdcf8] dark:border-slate-900 flex flex-col">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-4">
                {isAr ? 'أحدث حركات التدفقات المالية المسجلة' : 'Recent Transaction Log Trail'}
              </span>

              <div className="flex-1 overflow-x-auto text-[11px] font-semibold">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-900 text-slate-400 text-[10px] uppercase">
                      <th className="py-2 px-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="py-2 px-3 text-start">{isAr ? 'الرقم' : 'Doc ID'}</th>
                      <th className="py-2 px-3 text-start">{isAr ? 'نوع الحركة' : 'Tx Type'}</th>
                      <th className="py-2 px-3 text-start">{isAr ? 'البيان والتفاصيل' : 'Narrative details'}</th>
                      <th className="py-2 px-3 text-end">{isAr ? 'المبلغ' : 'Value'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-900/60 text-slate-750 dark:text-slate-300">
                    {statementHistory.slice(0, 6).map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/40">
                        <td className="py-2.5 px-3 text-start text-slate-500 font-mono">{tx.date}</td>
                        <td className="py-2.5 px-3 text-start font-mono text-blue-600 dark:text-sky-400 font-bold">{tx.number}</td>
                        <td className="py-2.5 px-3 text-start">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                            tx.type.includes('RECEIPT') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450' :
                            tx.type.includes('PAYMENT') ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450' :
                            'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-450'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-start max-w-[200px] truncate">{tx.description}</td>
                        <td className="py-2.5 px-3 text-end font-mono font-black text-slate-900 dark:text-white">{formatCurrency(tx.amount)}</td>
                      </tr>
                    ))}
                    {statementHistory.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-[10px] font-bold">
                          {isAr ? 'لا توجد حركات مسجلة بعد لهذه البطاقة' : 'No transactions logged yet'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* 5. DYNAMIC COLLAPSIBLE EMBEDDED FORM SECTION */}
          {activeDetailForm !== 'NONE' && (
            <div className="bg-white dark:bg-slate-950 border border-[#cbdcf8] dark:border-slate-900 p-6 rounded-3xl shadow-xl transition-all duration-300">
              
              {/* Form Title & Close */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center mb-6">
                <h3 className="text-sm font-black flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span>
                    {activeDetailForm === 'RECEIPT' ? (isAr ? 'إجراء مستند إذن إضافة مالي جديد' : 'New Cash Receipt Voucher') :
                     activeDetailForm === 'PAYMENT' ? (isAr ? 'إجراء مستند إذن صرف مالي جديد' : 'New Cash Payment Voucher') :
                     activeDetailForm === 'TRANSFER' ? (isAr ? 'تحويل أرصدة نقدية وبنكية متبادل' : 'Inter-vault Asset Transfer') :
                     activeDetailForm === 'EDIT' ? (isAr ? 'تعديل الخصائص والبيانات التنظيمية' : 'Edit Safe/Bank settings') :
                     (isAr ? 'كشف حساب تفصيلي مفلتر ومصدر للتقارير' : 'Account Statement Auditor')}
                  </span>
                </h3>
                <button
                  onClick={() => setActiveDetailForm('NONE')}
                  className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form implementation */}
              {/* A. RECEIPT / PAYMENT VOUCHER FORM */}
              {(activeDetailForm === 'RECEIPT' || activeDetailForm === 'PAYMENT') && (
                <form onSubmit={handleSaveVoucher} className="space-y-6">
                  
                  {/* Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    
                    {/* Auto Generated Voucher Doc Number */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">{isAr ? 'رقم المستند (RV/PV)' : 'Document No'}</label>
                      <input type="text" readOnly value={getNextVoucherNumber(activeDetailForm === 'RECEIPT' ? VoucherType.Receipt : VoucherType.Payment)}
                        className="w-full text-xs font-mono font-black px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 text-blue-650 dark:text-sky-400 focus:outline-none" />
                    </div>

                    {/* Date */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">{isAr ? 'تاريخ السند' : 'Date'}</label>
                      <input type="date" required value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)}
                        className="w-full text-xs font-semibold px-3.5 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none" />
                    </div>

                    {/* Branch */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">{isAr ? 'الفرع المسؤول' : 'Branch'}</label>
                      <input type="text" readOnly value={currentEntity.branch || 'main'}
                        className="w-full text-xs font-semibold px-3.5 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 text-slate-500 focus:outline-none" />
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">{isAr ? 'طريقة الدفع' : 'Payment Method'}</label>
                      <select
                        value={payMethod}
                        onChange={(e) => {
                          setPayMethod(e.target.value as any);
                          setSelectedCheckNumber('');
                        }}
                        className="w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
                      >
                        {/* Cash safe only permits CASH. Bank accounts permit Bank Transfer, Cheque, or Cash deposits */}
                        {!currentEntity.isBank ? (
                          <option value="CASH">{isAr ? 'نقدي' : 'Cash'}</option>
                        ) : (
                          <>
                            <option value="BANK_TRANSFER">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                            <option value="CHEQUE">{isAr ? 'شيك بنكي' : 'Cheque'}</option>
                            <option value="CASH">{isAr ? 'إيداع نقدي مباشر' : 'Cash Deposit'}</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Party Type selector */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">{isAr ? 'نوع الجهة / الحساب المقابل' : 'Contra Party Type'}</label>
                      <select value={partyType} onChange={(e) => { setPartyType(e.target.value as any); setPartyId(''); setPartyName(''); }}
                        className="w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none">
                        <option value="CUSTOMER">{isAr ? 'عميل (ذمم عملاء)' : 'Customer (A/R)'}</option>
                        <option value="SUPPLIER">{isAr ? 'مورد (ذمم موردين)' : 'Supplier (A/P)'}</option>
                        <option value="EMPLOYEE">{isAr ? 'موظف (سلفة/مستحقات)' : 'Employee'}</option>
                        <option value="OTHER">{isAr ? 'حساب محاسبي آخر (أخرى)' : 'Other GL Account'}</option>
                      </select>
                    </div>

                    {/* Party Selector / Free Text Account dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">{isAr ? 'تحديد الجهة / الحساب' : 'Target Entity/Account'}</label>
                      {partyType === 'CUSTOMER' ? (
                        <select required value={partyId} onChange={(e) => setPartyId(e.target.value)}
                          className="w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none">
                          <option value="">{isAr ? '-- اختر عميل --' : '-- Choose Customer --'}</option>
                          {data.customers.map(c => <option key={c.id} value={c.id}>{isAr ? c.nameAr : c.nameEn} ({c.balance} ج.م)</option>)}
                        </select>
                      ) : partyType === 'SUPPLIER' ? (
                        <select required value={partyId} onChange={(e) => setPartyId(e.target.value)}
                          className="w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none">
                          <option value="">{isAr ? '-- اختر مورد --' : '-- Choose Supplier --'}</option>
                          {data.suppliers.map(s => <option key={s.id} value={s.id}>{isAr ? s.nameAr : s.nameEn} ({s.balance}  ج.م)</option>)}
                        </select>
                      ) : partyType === 'EMPLOYEE' ? (
                        <select required value={partyId} onChange={(e) => setPartyId(e.target.value)}
                          className="w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none">
                          <option value="">{isAr ? '-- اختر الموظف --' : '-- Choose Employee --'}</option>
                          {data.employees.map(emp => <option key={emp.id} value={emp.id}>{isAr ? emp.nameAr : emp.nameEn}</option>)}
                        </select>
                      ) : (
                        /* Choose from entire accounts list */
                        <select required value={selectedGLAccountId} onChange={(e) => setSelectedGLAccountId(e.target.value)}
                          className="w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none">
                          <option value="">{isAr ? '-- اختر حساب محاسبي مقابل --' : '-- Choose GL Account --'}</option>
                          {data.accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {isAr ? acc.nameAr : acc.nameEn}</option>)}
                        </select>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">{isAr ? 'مبلغ السند' : 'Voucher Amount'}</label>
                      <input type="number" required min="0.5" step="0.5" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full text-xs font-mono font-bold px-3.5 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none" />
                    </div>

                    {/* Custom details / Narrative */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">{isAr ? 'البيان / تفاصيل العملية' : 'Description / Narrative'}</label>
                      <input type="text" required value={voucherDesc} onChange={(e) => setVoucherDesc(e.target.value)} placeholder="وذلك عن..."
                        className="w-full text-xs font-semibold px-3.5 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none" />
                    </div>
                  </div>

                  {/* ADDITIONAL DYN FIELDS FOR CHEQUE */}
                  {payMethod === 'CHEQUE' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-purple-50/40 dark:bg-purple-950/10 p-4 rounded-2xl border border-purple-200/50">
                      {/* Check number from corporate checkbook */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 block">{isAr ? 'اختر رقم الشيك المتوفر' : 'Select Check Number'}</label>
                        {availableUnusedChecks.length === 0 ? (
                          <div className="text-xs text-rose-500 font-bold py-2 text-slate-900 dark:text-white">
                            {isAr ? '⚠️ لا توجد دفاتر شيكات مفعلة أو لا توجد شيكات شاغرة!' : 'No checkbooks available!'}
                          </div>
                        ) : (
                          <select required value={selectedCheckNumber} onChange={(e) => setSelectedCheckNumber(Number(e.target.value))}
                            className="w-full text-xs font-mono font-bold px-3.5 py-2 border rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none">
                            <option value="">{isAr ? '-- اختر رقم شيك --' : '-- Select check no --'}</option>
                            {availableUnusedChecks.map(num => <option key={num} value={num}>{num}</option>)}
                          </select>
                        )}
                      </div>

                      {/* Cheque Due Date */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-purple-650 dark:text-purple-400 block">{isAr ? 'تاريخ استحقاق الشيك' : 'Maturity / Due Date'}</label>
                        <input type="date" required value={chequeDueDate} onChange={(e) => setChequeDueDate(e.target.value)}
                          className="w-full text-xs font-semibold px-3.5 py-2 border rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none" />
                      </div>

                      {/* Simulated upload field */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-purple-650 dark:text-purple-400 block">{isAr ? 'مرفق صورة الشيك (اختياري)' : 'Upload Cheque copy'}</label>
                        <input type="file" disabled className="w-full text-xs text-slate-400 file:bg-purple-100 file:border-none file:px-3 file:py-1 file:rounded-lg file:text-xs" />
                      </div>
                    </div>
                  )}

                  {/* ────────────────────────────────────────────────────────── */}
                  {/* DYNAMIC JOURNAL ENTRY PREVIEW BOARD */}
                  {/* ────────────────────────────────────────────────────────── */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      {isAr ? 'معاينة القيد المحاسبي المتولد تلقائياً (Double Entry Journal Preview)' : 'Automatic Double-Entry Journal Preview'}
                    </span>

                    {amount <= 0 || !resolvedCounterAccount ? (
                      <p className="text-slate-400 text-xs font-bold py-2">{isAr ? 'قم بإدخال المبلغ واختيار الحساب لمشاهدة معاينة القيد' : 'Input amount and counter-account to generate preview'}</p>
                    ) : (
                      <div className="overflow-x-auto text-[11px] font-semibold mt-2">
                        <table className="w-full text-start border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-500">
                              <th className="py-2 px-3 text-start">{isAr ? 'رقم الحساب' : 'Code'}</th>
                              <th className="py-2 px-3 text-start">{isAr ? 'اسم الحساب المحاسبي' : 'Ledger Name'}</th>
                              <th className="py-2 px-3 text-end">{isAr ? 'مدين (Debit)' : 'Debit'}</th>
                              <th className="py-2 px-3 text-end">{isAr ? 'دائن (Credit)' : 'Credit'}</th>
                              <th className="py-2 px-3 text-start">{isAr ? 'البيان' : 'Narrative'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-800 dark:text-slate-200">
                            {journalEntryPreviewLines.map((line, idx) => (
                              <tr key={idx} className="hover:bg-slate-150/10">
                                <td className="py-2 px-3 text-start font-mono text-slate-500">{line.account.code}</td>
                                <td className="py-2 px-3 text-start text-slate-800 dark:text-white font-bold">{isAr ? line.account.nameAr : line.account.nameEn}</td>
                                <td className="py-2 px-3 text-end font-mono font-black text-emerald-600">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</td>
                                <td className="py-2 px-3 text-end font-mono font-black text-rose-600">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</td>
                                <td className="py-2 px-3 text-start text-slate-400 truncate max-w-[200px]">{line.desc}</td>
                              </tr>
                            ))}
                            {/* Totals row */}
                            <tr className="font-black bg-slate-100/50 dark:bg-slate-900/60 text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-800">
                              <td colSpan={2} className="py-2 px-3 text-start">{isAr ? 'إجمالي أطراف القيد' : 'Balanced Sum'}</td>
                              <td className="py-2 px-3 text-end font-mono text-emerald-600">{formatCurrency(amount)}</td>
                              <td className="py-2 px-3 text-end font-mono text-emerald-600">{formatCurrency(amount)}</td>
                              <td className="py-2 px-3 text-start text-emerald-600 flex items-center gap-1">
                                <Check className="h-4.5 w-4.5" />
                                <span>{isAr ? 'متزن ومطابق' : 'Balanced'}</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2 justify-end pt-2">
                    <button type="submit" className="bg-emerald-650 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-lg shadow-emerald-500/15 cursor-pointer">
                      {isAr ? 'اعتماد وحفظ المستند والترحيل المحاسبي' : 'Save & Post Journal'}
                    </button>
                    <button type="button" onClick={() => setActiveDetailForm('NONE')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-850 dark:text-slate-300 font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer">
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </form>
              )}

              {/* B. TRANSFER FORM */}
              {activeDetailForm === 'TRANSFER' && (
                <form onSubmit={handleSaveTransfer} className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-slate-900 dark:text-white">
                    {/* Source */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'المصدر (حالي)' : 'Source'}</label>
                      <input type="text" readOnly value={currentEntity.nameAr || currentEntity.bankNameAr}
                        className="w-full text-xs font-bold px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-450 dark:border-slate-800 focus:outline-none" />
                    </div>

                    {/* Destination Type */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'نوع الكيان المستهدف' : 'Target Type'}</label>
                      <select value={transferDestType} onChange={(e) => { setTransferDestType(e.target.value as any); setTransferDestId(''); }}
                        className="w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 focus:outline-none">
                        <option value="CASHBOX">{isAr ? 'خزنة نقدية' : 'Cashbox Vault'}</option>
                        <option value="BANK">{isAr ? 'حساب بنكي' : 'Bank Account'}</option>
                      </select>
                    </div>

                    {/* Destination ID */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'اختر الخزينة / البنك المستهدف' : 'Select Target Vault'}</label>
                      <select required value={transferDestId} onChange={(e) => setTransferDestId(e.target.value)}
                        className="w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 focus:outline-none">
                        <option value="">{isAr ? '-- اختر --' : '-- Select --'}</option>
                        {otherTransferDestinations
                          .filter(dest => dest.type === transferDestType)
                          .map(dest => <option key={dest.id} value={dest.id}>{dest.label}</option>)}
                      </select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'مبلغ التحويل' : 'Transfer Amount'}</label>
                      <input type="number" required min="1" max={currentEntity.balance} value={transferAmount || ''} onChange={(e) => setTransferAmount(Number(e.target.value))}
                        className="w-full text-xs font-mono font-bold px-3.5 py-2 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 focus:outline-none" />
                    </div>
                  </div>

                  {/* Transfer description */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'البيان / تفاصيل التحويل' : 'Narrative details'}</label>
                    <input type="text" value={transferDesc} onChange={(e) => setTransferDesc(e.target.value)} placeholder={isAr ? 'تحويل لتغذية الرصيد...' : 'Balance replenishment...'}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none" />
                  </div>

                  {/* TRANSFER JOURNAL PREVIEW */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      {isAr ? 'معاينة قيد تحويل الأرصدة المزدوج' : 'Double-Entry Transfer Journal Preview'}
                    </span>

                    {transferAmount <= 0 || !transferDestId ? (
                      <p className="text-slate-400 text-xs font-bold py-2">{isAr ? 'قم بإدخال مبلغ التحويل وتحديد المستلم لمعاينة القيد' : 'Input amount and target to view journal'}</p>
                    ) : (
                      <div className="overflow-x-auto text-[11px] font-semibold mt-2">
                        <table className="w-full text-start border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-850 text-slate-500">
                              <th className="py-2 px-3 text-start">{isAr ? 'رقم الحساب' : 'Code'}</th>
                              <th className="py-2 px-3 text-start">{isAr ? 'اسم الحساب المحاسبي' : 'Ledger Name'}</th>
                              <th className="py-2 px-3 text-end">{isAr ? 'مدين (Debit)' : 'Debit'}</th>
                              <th className="py-2 px-3 text-end">{isAr ? 'دائن (Credit)' : 'Credit'}</th>
                              <th className="py-2 px-3 text-start">{isAr ? 'البيان' : 'Narrative'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-800 dark:text-slate-200">
                            {transferJournalPreviewLines.map((line, idx) => (
                              <tr key={idx} className="hover:bg-slate-150/10">
                                <td className="py-2 px-3 text-start font-mono text-slate-500">{line.account.code}</td>
                                <td className="py-2 px-3 text-start text-slate-800 dark:text-white font-bold">{isAr ? line.account.nameAr : line.account.nameEn}</td>
                                <td className="py-2 px-3 text-end font-mono font-black text-emerald-600">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</td>
                                <td className="py-2 px-3 text-end font-mono font-black text-rose-600">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</td>
                                <td className="py-2 px-3 text-start text-slate-400 truncate max-w-[200px]">{line.desc}</td>
                              </tr>
                            ))}
                            {/* Totals row */}
                            <tr className="font-black bg-slate-100/50 dark:bg-slate-900/60 text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-800">
                              <td colSpan={2} className="py-2 px-3 text-start">{isAr ? 'إجمالي أطراف القيد' : 'Balanced Sum'}</td>
                              <td className="py-2 px-3 text-end font-mono text-emerald-600">{formatCurrency(transferAmount)}</td>
                              <td className="py-2 px-3 text-end font-mono text-emerald-600">{formatCurrency(transferAmount)}</td>
                              <td className="py-2 px-3 text-start text-emerald-600 flex items-center gap-1">
                                <Check className="h-4.5 w-4.5" />
                                <span>{isAr ? 'متزن ومطابق' : 'Balanced'}</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button type="submit" className="bg-blue-650 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-lg cursor-pointer">
                      {isAr ? 'تنفيذ وترحيل القيد للتحويل' : 'Execute & Post Transfer'}
                    </button>
                    <button type="button" onClick={() => setActiveDetailForm('NONE')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-850 dark:text-slate-300 font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer">
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </form>
              )}

              {/* C. DETAILED STATEMENT AUDIT VIEW */}
              {activeDetailForm === 'STATEMENT' && (
                <div className="space-y-4">
                  {/* Filters Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800">
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 block">{isAr ? 'تاريخ البداية' : 'Start Date'}</label>
                      <input type="date" value={statementStart} onChange={(e) => setStatementStart(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 block">{isAr ? 'تاريخ النهاية' : 'End Date'}</label>
                      <input type="date" value={statementEnd} onChange={(e) => setStatementEnd(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold text-slate-400 block">{isAr ? 'بحث سريع بالنص' : 'Text Search'}</label>
                      <input type="text" placeholder={isAr ? 'رقم المستند، البيان...' : 'Doc no, desc...'} value={statementSearch} onChange={(e) => setStatementSearch(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none" />
                    </div>
                    <div className="flex items-end gap-2">
                      <button onClick={handlePrintStatement} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 shadow-sm cursor-pointer">
                        <Printer className="h-3.5 w-3.5" />
                        <span>{isAr ? 'طباعة' : 'Print'}</span>
                      </button>
                      <button onClick={handleExportStatement} className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 shadow-sm cursor-pointer">
                        <Download className="h-3.5 w-3.5" />
                        <span>Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Detailed Table */}
                  <div className="overflow-x-auto text-xs font-semibold">
                    <table className="w-full text-start border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b text-slate-500 font-bold border-slate-200 dark:border-slate-800">
                          <th className="py-2.5 px-3 text-start">{isAr ? 'رقم المستند' : 'Doc No'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'النوع' : 'Tx Type'}</th>
                          <th className="py-2.5 px-3 text-end">{isAr ? 'وارد (مدين)' : 'Inflow (Dr)'}</th>
                          <th className="py-2.5 px-3 text-end">{isAr ? 'صادر (دائن)' : 'Outflow (Cr)'}</th>
                          <th className="py-2.5 px-3 text-end">{isAr ? 'الرصيد بعد' : 'Balance After'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'البيان والتفاصيل' : 'Narrative details'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60 text-slate-700 dark:text-slate-350">
                        {statementHistory.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 text-start font-mono text-blue-650 dark:text-sky-400 font-bold">{tx.number}</td>
                            <td className="py-2 px-3 text-start font-mono text-slate-500">{tx.date}</td>
                            <td className="py-2 px-3 text-start">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                tx.type.includes('RECEIPT') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20' :
                                tx.type.includes('PAYMENT') ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/20' :
                                'bg-blue-50 text-blue-700 dark:bg-blue-950/20'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-end font-mono text-emerald-600 font-black">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
                            <td className="py-2 px-3 text-end font-mono text-rose-600 font-black">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                            <td className="py-2 px-3 text-end font-mono text-slate-900 dark:text-white font-black">{formatCurrency(tx.balanceAfter)}</td>
                            <td className="py-2 px-3 text-start text-slate-600 dark:text-slate-400 max-w-[250px] truncate" title={tx.description}>{tx.description}</td>
                          </tr>
                        ))}
                        {statementHistory.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                              {isAr ? 'لا توجد حركات مطابقة للفلترة الحالية' : 'No matching transactions logged'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* D. EDIT SAFE / BANK DETAILS */}
              {activeDetailForm === 'EDIT' && (
                <form onSubmit={handleEditDetailsSubmit} className="space-y-4 text-slate-900 dark:text-white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'الاسم باللغة العربية' : 'Name (AR)'}</label>
                      <input type="text" required value={editNameAr} onChange={(e) => setEditNameAr(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 focus:outline-none dark:border-slate-800" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'الاسم باللغة الإنجليزية' : 'Name (EN)'}</label>
                      <input type="text" required value={editNameEn} onChange={(e) => setEditNameEn(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 focus:outline-none dark:border-slate-800" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'الفرع المسؤول' : 'Branch'}</label>
                      <input type="text" required value={editBranch} onChange={(e) => setEditBranch(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 focus:outline-none dark:border-slate-800" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'المسؤول' : 'Person Responsible'}</label>
                      <input type="text" required value={editResponsible} onChange={(e) => setEditResponsible(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 focus:outline-none dark:border-slate-800" />
                    </div>
                    {currentEntity.isBank && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'رقم الحساب / IBAN' : 'Account Number'}</label>
                        <input type="text" required value={editBankNo} onChange={(e) => setEditBankNo(e.target.value)}
                          className="w-full text-xs font-mono font-semibold px-3 py-2 border rounded-xl bg-white dark:bg-slate-950 focus:outline-none dark:border-slate-800" />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button type="submit" className="bg-blue-650 hover:bg-blue-700 text-white font-bold text-xs py-2 px-6 rounded-xl cursor-pointer">
                      {isAr ? 'حفظ التغييرات' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => setActiveDetailForm('NONE')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-850 dark:text-slate-300 font-bold text-xs py-2 px-4 rounded-xl cursor-pointer">
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}
