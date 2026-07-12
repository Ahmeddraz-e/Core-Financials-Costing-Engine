import React, { useState } from 'react';
import { FolderTree, Plus, Search, HelpCircle, Save, Trash2, CheckCircle, FolderPlus, X, Edit, ShieldAlert } from 'lucide-react';
import { ERPData, Account, AccountType, Treasury, BankAccount } from '../types';

interface AccountsChartProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdateAccounts: (accounts: Account[]) => void;
  onUpdateTreasuries?: (treasuries: Treasury[]) => void;
  onUpdateBankAccounts?: (bankAccounts: BankAccount[]) => void;
  onUpdateCheckbooks?: (checkbooks: any[]) => void;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
}

export default function AccountsChart({ data, lang, onUpdateAccounts, onUpdateTreasuries, onUpdateBankAccounts, onUpdateCheckbooks, onAddAuditLog }: AccountsChartProps) {
  const isAr = lang === 'ar';

  // Fallback accountId resolution (mirrors Treasury.tsx logic)
  const getTreasuryAccId = (t: Treasury) => t.accountId || (t.id === 'cb-1' ? '101' : '');
  const getBankAccId = (b: BankAccount) => b.accountId || (b.id === 'ba-1' ? '102' : '');

  // Match linked treasury by accountId or by name pattern
  const findLinkedTreasury = (account: Account) => {
    let linked = data.treasuries.find(t => getTreasuryAccId(t) === account.id);
    if (!linked) {
      const name = isAr ? account.nameAr : account.nameEn;
      const prefixAr = 'حساب خزينة - ';
      const prefixEn = 'Cash Box - ';
      const prefix = isAr ? prefixAr : prefixEn;
      if (name.startsWith(prefix)) {
        const stripped = name.slice(prefix.length);
        linked = data.treasuries.find(t =>
          (isAr ? t.nameAr : t.nameEn) === stripped
        );
      }
    }
    return linked;
  };

  // Match linked bankAccount by accountId or by name pattern
  const findLinkedBank = (account: Account) => {
    let linked = data.bankAccounts.find(b => getBankAccId(b) === account.id);
    if (!linked) {
      const name = isAr ? account.nameAr : account.nameEn;
      const prefixAr = 'حساب بنك - ';
      const prefixEn = 'Bank - ';
      const prefix = isAr ? prefixAr : prefixEn;
      if (name.startsWith(prefix)) {
        const stripped = name.slice(prefix.length);
        linked = data.bankAccounts.find(b =>
          (isAr ? b.bankNameAr : b.bankNameEn) === stripped
        );
      }
    }
    return linked;
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroup, setActiveGroup] = useState<AccountType | 'ALL'>('ALL');

  const formatCurrency = (val: number) => {
    const hasDecimal = val % 1 !== 0;
    const formattedNum = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasDecimal ? 2 : 0,
      maximumFractionDigits: hasDecimal ? 2 : 0
    }).format(val);
    return isAr ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
  };

  // New account form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newType, setNewType] = useState<AccountType>(AccountType.Asset);
  const [newParentCode, setNewParentCode] = useState('');
  const [newBalance, setNewBalance] = useState(0);

  // Edit account state
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editNameAr, setEditNameAr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editType, setEditType] = useState<AccountType>(AccountType.Asset);
  const [editParentCode, setEditParentCode] = useState('');
  const [editBalance, setEditBalance] = useState(0);

  // Custom alert & confirmation modal states
  const [alertModal, setAlertModal] = useState<{ show: boolean; title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }>({ show: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setAlertModal({ show: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  const handleStartEdit = (acc: Account) => {
    setEditingAccount(acc);
    setEditCode(acc.code);
    setEditNameAr(acc.nameAr);
    setEditNameEn(acc.nameEn);
    setEditType(acc.type);
    setEditParentCode(acc.parentCode || '');
    setEditBalance(acc.balance);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editCode || !editNameAr || !editNameEn) return;

    if (editCode !== editingAccount.code && data.accounts.some(a => a.code === editCode && a.id !== editingAccount.id)) {
      showAlert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'كود الحساب الجديد مسجل مسبقاً لحساب آخر!' : 'The new account code is already taken by another account!',
        'error'
      );
      return;
    }

    const oldCode = editingAccount.code;

    // Propagate changes to parent references
    const updatedAccounts = data.accounts.map(acc => {
      if (acc.id === editingAccount.id) {
        return {
          ...acc,
          code: editCode,
          nameAr: editNameAr,
          nameEn: editNameEn,
          type: editType,
          parentCode: editParentCode || null,
          balance: Number(editBalance)
        };
      }
      if (acc.parentCode === oldCode) {
        return { ...acc, parentCode: editCode };
      }
      return acc;
    }).sort((a, b) => a.code.localeCompare(b.code));

    onUpdateAccounts(updatedAccounts);

    // Sync linked Treasury (safe) name
    if (onUpdateTreasuries) {
      const linkedTreasury = findLinkedTreasury(editingAccount);
      if (linkedTreasury) {
        const updatedTreasuries = data.treasuries.map(t =>
          t.id === linkedTreasury.id
            ? { ...t, nameAr: editNameAr, nameEn: editNameEn, balance: Number(editBalance) }
            : t
        );
        onUpdateTreasuries(updatedTreasuries);
      }
    }

    // Sync linked BankAccount name
    if (onUpdateBankAccounts) {
      const linkedBank = findLinkedBank(editingAccount);
      if (linkedBank) {
        const updatedBanks = data.bankAccounts.map(b =>
          b.id === linkedBank.id
            ? { ...b, bankNameAr: editNameAr, bankNameEn: editNameEn, balance: Number(editBalance) }
            : b
        );
        onUpdateBankAccounts(updatedBanks);
      }
    }

    onAddAuditLog(
      `تعديل حساب: ${editNameAr}`,
      `Updated Account: ${editNameEn}`,
      `تم تعديل بيانات الحساب ذو الكود ${oldCode} (الكود الجديد: ${editCode}) ورصيده الجديد ${editBalance} ج.م.`
    );

    setEditingAccount(null);
    showAlert(
      isAr ? 'تم تعديل الحساب' : 'Account Updated',
      isAr ? '✅ تم حفظ تعديلات الحساب الشجري بنجاح!' : 'Account details updated successfully!',
      'success'
    );
  };

  // Group translations
  const groupLabels: Record<AccountType, { ar: string; en: string }> = {
    [AccountType.Asset]: { ar: 'الأصول (1000000)', en: 'Assets (1000000)' },
    [AccountType.Liability]: { ar: 'الالتزامات / الخصوم (2000000)', en: 'Liabilities (2000000)' },
    [AccountType.Equity]: { ar: 'حقوق الملكية (3000000)', en: 'Equity (3000000)' },
    [AccountType.Revenue]: { ar: 'الإيرادات التشغيلية (4000000)', en: 'Operating Revenues (4000000)' },
    [AccountType.CostOfSales]: { ar: 'تكلفة المبيعات والأغذية (5000000)', en: 'Cost of Sales & Food Cost (5000000)' },
    [AccountType.Expense]: { ar: 'المصروفات الإدارية والعمومية (6000000)', en: 'General Expenses (6000000)' }
  };

  // Helper to get total balance of a group
  const getGroupSum = (type: AccountType) => {
    return data.accounts
      .filter(a => a.type === type)
      .reduce((sum, a) => sum + a.balance, 0);
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newNameAr || !newNameEn) return;

    // Check if code exists
    if (data.accounts.some(a => a.code === newCode)) {
      alert(isAr ? 'كود الحساب هذا مسجل مسبقاً!' : 'This account code is already taken!');
      return;
    }

    const newAcc: Account = {
      id: 'acc-' + Math.random().toString(36).substring(2, 9),
      code: newCode,
      nameAr: newNameAr,
      nameEn: newNameEn,
      type: newType,
      parentCode: newParentCode || null,
      balance: Number(newBalance) || 0,
      isSystem: false
    };

    const updatedAccounts = [...data.accounts, newAcc].sort((a, b) => a.code.localeCompare(b.code));
    onUpdateAccounts(updatedAccounts);

    onAddAuditLog(
      `إضافة حساب جديد: ${newNameAr}`,
      `Chart of Accounts addition: ${newNameEn}`,
      `تم إدراج الحساب الشجري ذو الكود ${newCode} برصيد ابتدائي ${newBalance} جنيه.`
    );

    // Reset Form
    setNewCode('');
    setNewNameAr('');
    setNewNameEn('');
    setNewParentCode('');
    setNewBalance(0);
    setShowAddForm(false);
  };

  // Generate intelligent next code proposal
  const handleTypeChangeProposeCode = (type: AccountType) => {
    setNewType(type);
    const siblings = data.accounts.filter(a => a.type === type);
    if (siblings.length > 0) {
      // Get highest sibling code, convert to int, add 1, convert back
      const codes = siblings.map(s => Number(s.code)).filter(c => !isNaN(c));
      const highest = Math.max(...codes);
      setNewCode(String(highest + 1));
    } else {
      const prefixes: Record<AccountType, string> = {
        [AccountType.Asset]: '1101001',
        [AccountType.Liability]: '2101001',
        [AccountType.Equity]: '3101001',
        [AccountType.Revenue]: '4101001',
        [AccountType.CostOfSales]: '5101001',
        [AccountType.Expense]: '6101001'
      };
      setNewCode(prefixes[type]);
    }
  };

  const handleDeleteAccount = (id: string, name: string) => {
    const accToDelete = data.accounts.find(a => a.id === id);
    if (!accToDelete) return;

    const linkedTreasury = findLinkedTreasury(accToDelete);
    const linkedBank = findLinkedBank(accToDelete);
    const linkedNames: string[] = [];
    if (linkedTreasury) linkedNames.push(isAr ? linkedTreasury.nameAr : linkedTreasury.nameEn);
    if (linkedBank) linkedNames.push(isAr ? linkedBank.bankNameAr : linkedBank.bankNameEn);

    showConfirm(
      isAr ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion',
      isAr
        ? `هل أنت متأكد من حذف الحساب "${name}" نهائياً؟ سيتم فك ارتباط مرجعيات الحسابات التابعة له.${linkedNames.length ? ` ⚠️ سيتم أيضاً حذف السجلات المرتبطة: ${linkedNames.join('، ')}` : ''}`
        : `Are you sure you want to permanently delete account "${name}"? Children accounts will be unlinked.${linkedNames.length ? ` ⚠️ Linked records will also be deleted: ${linkedNames.join(', ')}` : ''}`,
      () => {
        const deletedCode = accToDelete.code;
        const deletedParentCode = accToDelete.parentCode;

        // Propagate child accounts parent updates
        const updatedAccounts = data.accounts
          .filter(a => a.id !== id)
          .map(acc => {
            if (acc.parentCode === deletedCode) {
              return { ...acc, parentCode: deletedParentCode };
            }
            return acc;
          });

        onUpdateAccounts(updatedAccounts);

        // Remove linked Treasury if any
        if (linkedTreasury && onUpdateTreasuries) {
          onUpdateTreasuries(data.treasuries.filter(t => t.id !== linkedTreasury.id));
        }

        // Remove linked BankAccount if any
        if (linkedBank && onUpdateBankAccounts) {
          onUpdateBankAccounts(data.bankAccounts.filter(b => b.id !== linkedBank.id));
          // Also remove linked checkbooks
          if (onUpdateCheckbooks) {
            onUpdateCheckbooks((data.checkbooks || []).filter(c => c.bankAccountId !== linkedBank.id));
          }
        }

        onAddAuditLog(
          `حذف حساب: ${name}`,
          `Deleted Account: ${name}`,
          `تم حذف الحساب ذو الكود ${deletedCode} من دليل الحسابات وتحديث مرجعيات الحسابات التابعة.`
        );
        showAlert(
          isAr ? 'تم الحذف' : 'Deleted',
          isAr ? '👤 تم حذف الحساب بنجاح!' : 'Account deleted successfully!',
          'success'
        );
      }
    );
  };

  // Filter accounts
  const filteredAccounts = data.accounts.filter(acc => {
    const matchesSearch = 
      acc.code.includes(searchTerm) || 
      acc.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) || 
      acc.nameEn.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = activeGroup === 'ALL' || acc.type === activeGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div id="accounts_chart_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'دليل شجرة الحسابات العام للشركات' : 'General Ledger Chart of Accounts'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'إدارة المستويات المحاسبية الستة من الأصول والخصوم وحقوق الملكية والإيرادات والمصروفات والتكاليف' : 'Manage hierarchical general ledger entities across six corporate accounting accounts'}
          </p>
        </div>
        
        <button
          id="toggle_add_account_btn"
          onClick={() => {
            setShowAddForm(!showAddForm);
            handleTypeChangeProposeCode(newType);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/15"
        >
          <FolderPlus className="h-4 w-4" />
          <span>{isAr ? 'إضافة حساب شجري جديد' : 'Add New GL Account'}</span>
        </button>
      </div>

      {/* Group Summaries Badges */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.keys(groupLabels) as AccountType[]).map((type) => {
          const sum = getGroupSum(type);
          return (
            <button
              key={type}
              onClick={() => setActiveGroup(activeGroup === type ? 'ALL' : type)}
              className={`p-3.5 rounded-xl text-start transition-all border ${
                activeGroup === type 
                  ? 'bg-blue-600/10 border-blue-500 dark:border-blue-400/60' 
                  : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800'
              }`}
            >
              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-tight truncate">
                {isAr ? groupLabels[type].ar.split(' ')[0] : groupLabels[type].en.split(' ')[0]}
              </span>
              <span className="block text-xs font-black text-slate-900 dark:text-white mt-1.5 font-mono truncate">
                {formatCurrency(sum)}
              </span>
            </button>
          );
        })}
      </div>

      {/* NEW ACCOUNT FORM DRAWER/ACCORDION */}
      {showAddForm && (
        <div id="add_account_panel" className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl relative transition-all">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Plus className="h-4 w-4 text-blue-600" />
            {isAr ? 'إدراج حساب جديد في شجرة الحسابات' : 'Append New Account Node'}
          </h3>
          
          <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Type selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'نوع الحساب الرئيسي' : 'GL Category'}</label>
              <select
                id="new_account_type"
                value={newType}
                onChange={(e) => handleTypeChangeProposeCode(e.target.value as AccountType)}
                className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
              >
                <option value={AccountType.Asset}>{isAr ? 'أصول (Assets)' : 'Assets'}</option>
                <option value={AccountType.Liability}>{isAr ? 'خصوم/التزامات (Liabilities)' : 'Liabilities'}</option>
                <option value={AccountType.Equity}>{isAr ? 'حقوق ملكية (Equity)' : 'Equity'}</option>
                <option value={AccountType.Revenue}>{isAr ? 'إيرادات (Revenues)' : 'Revenues'}</option>
                <option value={AccountType.CostOfSales}>{isAr ? 'تكلفة المبيعات (Cost of Sales)' : 'Cost of Sales'}</option>
                <option value={AccountType.Expense}>{isAr ? 'مصروفات (Expenses)' : 'Expenses'}</option>
              </select>
            </div>

            {/* Account Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'رقم الكود المحاسبي' : 'GL Code'}</label>
              <input
                id="new_account_code"
                type="text"
                required
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="1101002"
              />
            </div>

            {/* Arabic Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'الاسم باللغة العربية' : 'Arabic Ledger Name'}</label>
              <input
                id="new_account_name_ar"
                type="text"
                required
                value={newNameAr}
                onChange={(e) => setNewNameAr(e.target.value)}
                className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="خزينة المشروبات الفرعية"
              />
            </div>

            {/* English Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'الاسم باللغة الإنجليزية' : 'English Ledger Name'}</label>
              <input
                id="new_account_name_en"
                type="text"
                required
                value={newNameEn}
                onChange={(e) => setNewNameEn(e.target.value)}
                className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="Beverage safe sub-vault"
              />
            </div>

            {/* Parent Account */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'الحساب الرئيسي الأب (اختياري)' : 'Parent Account (Optional)'}</label>
              <select
                id="new_account_parent"
                value={newParentCode}
                onChange={(e) => setNewParentCode(e.target.value)}
                className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">{isAr ? 'بدون (حساب رئيسي)' : 'None (Top Level Node)'}</option>
                {data.accounts
                  .filter(a => a.type === newType)
                  .map(a => (
                    <option key={a.id} value={a.code}>{a.code} - {isAr ? a.nameAr : a.nameEn}</option>
                  ))}
              </select>
            </div>

            {/* Initial balance */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'الرصيد الابتدائي الافتتاحي' : 'Opening balance'}</label>
              <input
                id="new_account_balance"
                type="number"
                value={newBalance}
                onChange={(e) => setNewBalance(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Actions Buttons */}
            <div className="md:col-span-2 flex gap-3">
              <button
                id="save_new_account_btn"
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs"
              >
                <Save className="h-4 w-4" />
                <span>{isAr ? 'حفظ وإدراج الحساب' : 'Apply Node to Tree'}</span>
              </button>
              <button
                id="cancel_new_account_btn"
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* FILTER AND CHART TREE TABLE */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs space-y-4">
        
        {/* Search & Selector Row */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <span className={`absolute inset-y-0 ${isAr ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-slate-400`}>
              <Search className="h-4 w-4" />
            </span>
            <input
              id="accounts_search_input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isAr ? 'ابحث برقم الكود أو الاسم...' : 'Filter by code or name...'}
              className={`w-full text-xs font-semibold py-2.5 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
            />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveGroup('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                activeGroup === 'ALL' 
                  ? 'bg-slate-900 dark:bg-slate-800 text-white' 
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {isAr ? 'عرض الكل' : 'Show All'}
            </button>
            {(Object.keys(groupLabels) as AccountType[]).map((type) => (
              <button
                key={type}
                onClick={() => setActiveGroup(type)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                  activeGroup === type 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {isAr ? groupLabels[type].ar.split(' ')[0] : groupLabels[type].en.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* LEDGER GRID TREE */}
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-xs font-semibold" dir={isAr ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
                <th className="py-3 px-4 text-start">{isAr ? 'الكود المحاسبي' : 'GL Code'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'الحساب المالي الفرعي' : 'Ledger Node Account'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'نوع الحساب' : 'GL Category'}</th>
                <th className="py-3 px-4 text-end">{isAr ? 'الرصيد الحالي' : 'Debit/Credit Balance'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'إجراءات' : 'Control'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {filteredAccounts.map((acc) => {
                const isParent = !acc.parentCode;
                const balanceVal = acc.balance;
                
                // Debit vs Credit standard displays
                const isDebit = acc.type === AccountType.Asset || acc.type === AccountType.CostOfSales || acc.type === AccountType.Expense;
                
                return (
                  <tr 
                    key={acc.id} 
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors ${
                      isParent ? 'font-bold bg-slate-50/30 dark:bg-slate-900/5' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-start font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {acc.code}
                    </td>
                    <td className="py-3 px-4 text-start">
                      <div className="flex items-center gap-2">
                        {!isParent && <span className="text-slate-300 dark:text-slate-700">├─</span>}
                        <span className="text-slate-800 dark:text-slate-200">
                          {isAr ? acc.nameAr : acc.nameEn}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-start">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        acc.type === AccountType.Asset ? 'bg-blue-500/10 text-blue-600' :
                        acc.type === AccountType.Liability ? 'bg-amber-500/10 text-amber-600' :
                        acc.type === AccountType.Equity ? 'bg-violet-500/10 text-violet-600' :
                        acc.type === AccountType.Revenue ? 'bg-emerald-500/10 text-emerald-600' :
                        acc.type === AccountType.CostOfSales ? 'bg-rose-500/10 text-slate-900 dark:text-white' :
                        'bg-slate-500/10 text-slate-600'
                      }`}>
                        {isAr ? groupLabels[acc.type].ar.split(' ')[0] : groupLabels[acc.type].en.split(' ')[0]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-end font-mono text-[11px] font-bold">
                      <span className={balanceVal < 0 ? 'text-slate-900 dark:text-white' : 'text-slate-950 dark:text-white'}>
                        {formatCurrency(balanceVal)}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold ml-1">
                        {isDebit ? (isAr ? 'مَدين' : 'Dr') : (isAr ? 'دائن' : 'Cr')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleStartEdit(acc)}
                          className="p-1 rounded hover:bg-blue-500/10 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                          title={isAr ? 'تعديل الحساب' : 'Edit Account Details'}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(acc.id, isAr ? acc.nameAr : acc.nameEn)}
                          className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-slate-900 dark:text-white transition-colors cursor-pointer"
                          title={isAr ? 'حذف الحساب' : 'Remove GL Account'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-3xl shadow-2xl w-full max-w-sm text-start overflow-hidden flex flex-col text-xs font-semibold">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center shrink-0">
              <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider">{isAr ? 'تعديل بيانات الحساب' : 'Edit Account Details'}</span>
              <button onClick={() => setEditingAccount(null)} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">{isAr ? 'كود الحساب' : 'Account Code'} *</label>
                <input type="text" required value={editCode} onChange={(e) => setEditCode(e.target.value)} className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">{isAr ? 'الاسم بالكامل (عربي) *' : 'Full Name (AR) *'}</label>
                <input type="text" required value={editNameAr} onChange={(e) => setEditNameAr(e.target.value)} className="w-full text-xs font-semibold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">{isAr ? 'الاسم بالكامل (إنجليزي) *' : 'Full Name (EN) *'}</label>
                <input type="text" required value={editNameEn} onChange={(e) => setEditNameEn(e.target.value)} className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">{isAr ? 'تصنيف الحساب' : 'Account Type'} *</label>
                <select required value={editType} onChange={(e) => setEditType(e.target.value as AccountType)} className="w-full text-xs font-semibold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                  {(Object.keys(groupLabels) as AccountType[]).map(t => (
                    <option key={t} value={t}>{isAr ? groupLabels[t].ar : groupLabels[t].en}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">{isAr ? 'كود الحساب الرئيسي (الأب)' : 'Parent Account Code'}</label>
                <select value={editParentCode} onChange={(e) => setEditParentCode(e.target.value)} className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                  <option value="">{isAr ? '— حساب رئيسي مستقل (جذر) —' : '— Standalone Root Account —'}</option>
                  {data.accounts.filter(a => a.id !== editingAccount.id).map(a => (
                    <option key={a.id} value={a.code}>{a.code} - {isAr ? a.nameAr : a.nameEn}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">{isAr ? 'الرصيد الافتتاحي الجاري' : 'Current Balance'}</label>
                <input type="number" value={editBalance} onChange={(e) => setEditBalance(Number(e.target.value))} className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setEditingAccount(null)} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-355 px-4 py-2 rounded-xl cursor-pointer">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl cursor-pointer">{isAr ? 'حفظ التعديل' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Styled React Alert Modal */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-3xl shadow-2xl w-full max-w-sm text-start overflow-hidden flex flex-col text-xs font-semibold">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center shrink-0">
              <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider">{alertModal.title}</span>
              <button onClick={() => setAlertModal(prev => ({ ...prev, show: false }))} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <div className="flex justify-center">
                <ShieldAlert className={`h-12 w-12 ${
                  alertModal.type === 'success' ? 'text-emerald-500' :
                  alertModal.type === 'error' ? 'text-rose-500' :
                  alertModal.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                }`} />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{alertModal.message}</p>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-855 flex justify-end shrink-0">
              <button 
                onClick={() => setAlertModal(prev => ({ ...prev, show: false }))} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl cursor-pointer"
              >
                {isAr ? 'موافق' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styled React Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-3xl shadow-2xl w-full max-w-sm text-start overflow-hidden flex flex-col text-xs font-semibold">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center shrink-0">
              <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider">{confirmModal.title}</span>
              <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <div className="flex justify-center">
                <ShieldAlert className="h-12 w-12 text-amber-500" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-855 flex justify-end gap-2 shrink-0">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} 
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-355 px-4 py-2 rounded-xl cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, show: false }));
                }} 
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl cursor-pointer"
              >
                {isAr ? 'تأكيد' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
