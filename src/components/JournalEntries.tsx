import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, Check, AlertCircle, Save, Calendar, Eye, FileText, CheckCircle, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { ERPData, JournalEntry, JournalEntryType, JournalLine, Account, AccountType } from '../types';
import { exportToCSV } from '../utils/printUtils';

interface JournalEntriesProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdateEntries: (entries: JournalEntry[]) => void;
  onUpdateAccounts: (accounts: Account[]) => void;
  onUpdateTreasuries: (treasuries: any[]) => void;
  onUpdateBankAccounts: (bankAccounts: any[]) => void;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
}

export default function JournalEntries({ 
  data, 
  lang, 
  onUpdateEntries, 
  onUpdateAccounts, 
  onUpdateTreasuries,
  onUpdateBankAccounts,
  onAddAuditLog 
}: JournalEntriesProps) {
  const isAr = lang === 'ar';

  const getAccountNature = (type: AccountType) => {
    const isDebit = type === AccountType.Asset || type === AccountType.CostOfSales || type === AccountType.Expense;
    return isAr
      ? (isDebit ? 'مدين' : 'دائن')
      : (isDebit ? 'Debit' : 'Credit');
  };
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const formatCurrency = (val: number) => {
    const hasDecimal = val % 1 !== 0;
    const formattedNum = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasDecimal ? 2 : 0,
      maximumFractionDigits: hasDecimal ? 2 : 0
    }).format(val);
    return isAr ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
  };

  const handleExportJournalToExcel = () => {
    const flatEntries = data.journalEntries.flatMap(entry => 
      entry.lines.map(line => {
        const acc = data.accounts.find(a => a.id === line.accountId);
        return {
          'رقم القيد': entry.entryNumber,
          'التاريخ': entry.date,
          'نوع القيد': entry.type,
          'البيان': entry.description,
          'الحساب المحاسبي': acc ? `${acc.code} - ${isAr ? acc.nameAr : acc.nameEn}` : '',
          'مدين (Debit)': line.debit || 0,
          'دائن (Credit)': line.credit || 0,
          'الاعتماد': entry.approvedBy || ''
        };
      })
    );
    exportToCSV(flatEntries, 'journal_entries');
  };

  // New Journal Entry Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<JournalEntryType>(JournalEntryType.Manual);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: '', debit: 0, credit: 0 },
    { accountId: '', debit: 0, credit: 0 }
  ]);

  // Helper calculations for dynamic validation
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference === 0 && totalDebit > 0 && lines.every(l => l.accountId !== '');

  const getAccountName = (id: string) => {
    const acc = data.accounts.find(a => a.id === id);
    return acc ? (isAr ? `${acc.code} - ${acc.nameAr}` : `${acc.code} - ${acc.nameEn}`) : 'Unknown Account';
  };

  const handleAddLine = () => {
    setLines([...lines, { accountId: '', debit: 0, credit: 0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: keyof JournalLine, value: string | number) => {
    const newLines = [...lines];
    if (field === 'accountId') {
      newLines[idx].accountId = String(value);
    } else {
      newLines[idx][field] = Number(value) || 0;
      // In professional ERPs, a line cannot have both Debit and Credit.
      if (field === 'debit' && Number(value) > 0) {
        newLines[idx].credit = 0;
      } else if (field === 'credit' && Number(value) > 0) {
        newLines[idx].debit = 0;
      }
    }
    setLines(newLines);
  };

  // POST THE JOURNAL ENTRY - MODIFIES DATABASE LEDGER BALANCES
  const handlePostEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return;

    // Generate unique serial JV number
    const year = date.split('-')[0];
    const serial = String(data.journalEntries.length + 1).padStart(3, '0');
    const entryNumber = `JV-${year}-${serial}`;

    const newEntry: JournalEntry = {
      id: 'je-' + Math.random().toString(36).substring(2, 9),
      entryNumber,
      date,
      type,
      description,
      lines: lines.map(l => ({
        accountId: l.accountId,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0
      })),
      approved: true,
      approvedBy: isAr ? 'المدير العام' : 'General Manager'
    };

    // Apply double-entry balances to general ledger accounts!
    // Compute net balance change per account from the journal lines
    const balanceChanges = new Map<string, number>();
    lines.forEach(l => {
      const acc = data.accounts.find(a => a.id === l.accountId);
      if (!acc) return;
      const isDebitAcc = acc.type === 'ASSET' || acc.type === 'COST_OF_SALES' || acc.type === 'EXPENSE';
      const change = isDebitAcc
        ? (Number(l.debit) || 0) - (Number(l.credit) || 0)
        : (Number(l.credit) || 0) - (Number(l.debit) || 0);
      balanceChanges.set(l.accountId, (balanceChanges.get(l.accountId) || 0) + change);
    });

    const updatedAccounts = data.accounts.map(acc => {
      const change = balanceChanges.get(acc.id);
      if (change) {
        return { ...acc, balance: acc.balance + change };
      }
      return acc;
    });

    // Sync linked treasuries
    const updatedTreasuries = (data.treasuries || []).map(t => {
      const accId = t.accountId || (t.id === 'cb-1' ? '101' : '');
      const change = balanceChanges.get(accId);
      if (change) {
        return { ...t, balance: t.balance + change };
      }
      return t;
    });

    // Sync linked bank accounts (with balance validation)
    const updatedBankAccounts = (data.bankAccounts || []).map(b => {
      const accId = b.accountId || (b.id === 'ba-1' ? '102' : '');
      const change = balanceChanges.get(accId);
      if (change && change < 0 && (b.balance + change) < 0) {
        // Prevent bank from going negative
        window.showAlert(
          `المبلغ غير متوفر في الحساب البنكي ${b.bankNameAr}`,
          `Insufficient balance in bank account ${b.bankNameEn}`,
          'danger'
        );
        return b; // Skip this bank, don't apply change
      }
      if (change) {
        return { ...b, balance: b.balance + change };
      }
      return b;
    });

    const updatedEntries = [newEntry, ...data.journalEntries];

    onUpdateAccounts(updatedAccounts);
    onUpdateTreasuries(updatedTreasuries);
    onUpdateBankAccounts(updatedBankAccounts);
    onUpdateEntries(updatedEntries);

    onAddAuditLog(
      `ترحيل قيد يومية: ${entryNumber}`,
      `Posted Journal Entry: ${entryNumber}`,
      `تم ترحيل قيد يومية تلقائي بقيمة موازنة ${totalDebit} ج.م ووصف: ${description}.`
    );

    // Reset Form
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setType(JournalEntryType.Manual);
    setLines([
      { accountId: '', debit: 0, credit: 0 },
      { accountId: '', debit: 0, credit: 0 }
    ]);
    setShowAddForm(false);
  };

  return (
    <div id="journal_entries_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'القيود اليومية والترحيل المباشر' : 'General Journal Ledger Book'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'إدخال قيود التسويات، قيود الإغلاق، وتعديل أرصدة دفتر الأستاذ العام بمطابقة ثنائية صارمة' : 'Record accounting adjustments, opening/closing ledgers, and execute automated double-entry verification'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportJournalToExcel}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>{isAr ? 'تصدير لـ Excel' : 'Export to Excel'}</span>
          </button>

          <button
            id="new_jv_toggle_btn"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/15 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{isAr ? 'إدراج قيد تسوية جديد' : 'Record New Journal Entry'}</span>
          </button>
        </div>
      </div>

      {/* NEW JOURNAL ENTRY BUILDER */}
      {showAddForm && (
        <div id="new_jv_panel" className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {isAr ? 'إنشاء قيد مالي مزدوج جديد (Double Entry)' : 'Build Double-Entry Journal Document'}
            </h3>
            <span className="text-xs bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full font-bold">
              {isAr ? 'حسابات مطابقة نشطة' : 'Ledger Auto-Validation Active'}
            </span>
          </div>

          <form onSubmit={handlePostEntry} className="space-y-4">
            
            {/* Metadata Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'تاريخ الترحيل المعنمد' : 'Value Date'}</label>
                <div className="relative">
                  <span className={`absolute inset-y-0 ${isAr ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-slate-400`}>
                    <Calendar className="h-4 w-4" />
                  </span>
                  <input
                    id="jv_date_input"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full text-xs font-semibold py-2.5 ${isAr ? 'pr-9' : 'pl-9'} rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'نوع قيد اليومية' : 'Document Type'}</label>
                <select
                  id="jv_type_select"
                  value={type}
                  onChange={(e) => setType(e.target.value as JournalEntryType)}
                  className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none"
                >
                  <option value={JournalEntryType.Manual}>{isAr ? 'قيد يدوي عام (General)' : 'Manual General'}</option>
                  <option value={JournalEntryType.Adjustment}>{isAr ? 'قيد تسوية مخزنية/مالية (Adjustment)' : 'Adjustment'}</option>
                  <option value={JournalEntryType.Opening}>{isAr ? 'قيد أرصدة افتتاحية (Opening)' : 'Opening Balance'}</option>
                  <option value={JournalEntryType.Closing}>{isAr ? 'قيد تسوية إغلاق فترات (Closing)' : 'Closing Adjustments'}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'الوصف العام / البيان المحاسبي' : 'General Narration'}</label>
                <input
                  id="jv_desc_input"
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={isAr ? 'شرح كافٍ لوجهة حركة الحسابات...' : 'Explain the nature of this financial transaction...'}
                  className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Ledger Line Builder Grid */}
            <div className="space-y-3">
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                {isAr ? 'تفاصيل الحسابات وأطراف القيد' : 'Ledger Lines Allocation'}
              </span>

              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div key={`line-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    
                    {/* GL Account Selection */}
                    <div className="md:col-span-6">
                      <select
                        id={`jv_line_account_${idx}`}
                        required
                        value={line.accountId}
                        onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                        className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                      >
                        <option value="">{isAr ? '-- اختر الحساب الدائن/المدين --' : '-- Choose general ledger account --'}</option>
                        {data.accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {isAr ? acc.nameAr : acc.nameEn} [{getAccountNature(acc.type)}] (الرصيد: {acc.balance} ج.م)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Debit Amount */}
                    <div className="md:col-span-2">
                      <input
                        id={`jv_line_debit_${idx}`}
                        type="number"
                        min="0"
                        step="any"
                        placeholder={isAr ? 'مدين (Dr)' : 'Debit'}
                        value={line.debit || ''}
                        onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                        className="w-full text-xs font-mono font-bold text-end py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                      />
                    </div>

                    {/* Credit Amount */}
                    <div className="md:col-span-2">
                      <input
                        id={`jv_line_credit_${idx}`}
                        type="number"
                        min="0"
                        step="any"
                        placeholder={isAr ? 'دائن (Cr)' : 'Credit'}
                        value={line.credit || ''}
                        onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                        className="w-full text-xs font-mono font-bold text-end py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                      />
                    </div>

                    {/* Delete Line */}
                    <div className="md:col-span-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length <= 2}
                        className="p-2 rounded bg-rose-50 dark:bg-rose-950/20 text-slate-900 dark:text-white disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>

              {/* Add Line button */}
              <button
                id="jv_add_line_btn"
                type="button"
                onClick={handleAddLine}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer mt-2"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'إضافة سطر حساب آخر' : 'Add Another Ledger Line'}</span>
              </button>
            </div>

            {/* REAL-TIME LEDGER BALANCER VALIDATOR SUMMARY */}
            <div className={`p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 ${
              isBalanced ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-rose-500/5 border border-rose-500/10'
            }`}>
              <div className="flex items-center gap-3">
                {isBalanced ? (
                  <CheckCircle className="h-5.5 w-5.5 text-slate-900 dark:text-white shrink-0" />
                ) : (
                  <AlertCircle className="h-5.5 w-5.5 text-rose-500 shrink-0" />
                )}
                <div className="text-start">
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    {isBalanced 
                      ? (isAr ? 'القيد متوازن وجاهز للترحيل!' : 'Balanced double-entry criteria met!') 
                      : (isAr ? 'القيد غير متوازن حالياً!' : 'Journal entries do not balance!')}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {isAr 
                      ? 'القواعد: يجب أن يتساوى مجمع المدين مع مجمع الدائن، ويجب تحديد الحسابات في كل سطر.' 
                      : 'Rule: Sum of Debits must match Sum of Credits, and all line account selections are required.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-6 text-xs font-bold font-mono">
                <div className="text-end">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-tight">{isAr ? 'إجمالي المدين' : 'Total Debits'}</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono text-sm">{totalDebit.toFixed(2)}</span>
                </div>
                <div className="text-end">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-tight">{isAr ? 'إجمالي الدائن' : 'Total Credits'}</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono text-sm">{totalCredit.toFixed(2)}</span>
                </div>
                <div className="text-end border-s ps-4 border-slate-200 dark:border-slate-800">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-tight">{isAr ? 'الفارق المتبقي' : 'Unallocated Variance'}</span>
                  <span className={difference > 0 ? 'text-slate-900 dark:text-white font-bold text-sm' : 'text-slate-900 dark:text-white font-bold text-sm'}>
                    {difference.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Posting Button controls */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                id="jv_cancel_form_btn"
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                {isAr ? 'إلغاء التراجع' : 'Discard Draft'}
              </button>
              <button
                id="jv_post_submit_btn"
                type="submit"
                disabled={!isBalanced}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-emerald-500/10"
              >
                {isAr ? 'ترحيل واعتماد القيد المحاسبي' : 'Post & Update Accounts Ledger'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* JOURNAL ENTRIES HISTORICAL TABLE */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs">
        
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-4">
          {isAr ? 'دفتر اليومية التاريخي المعتمد' : 'Historical Journal Document Trail'}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-xs font-semibold" dir={isAr ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
                <th className="py-3 px-4 text-start">{isAr ? 'رقم السند/القيد' : 'Voucher Number'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'تاريخ الترحيل' : 'Value Date'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'النوع' : 'Category'}</th>
                <th className="py-3 px-4 text-start">{isAr ? 'البيان المحاسبي والملاحظات' : 'Narration / Description'}</th>
                <th className="py-3 px-4 text-end">{isAr ? 'قيمة القيد المجمع' : 'Aggregate Value'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'الاعتماد والمراجعة' : 'Approval Audit'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
              {data.journalEntries.map((entry) => {
                const totalVal = entry.lines.reduce((sum, l) => sum + l.debit, 0);
                return (
                  <React.Fragment key={entry.id}>
                    <tr 
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 cursor-pointer"
                      onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                    >
                      <td className="py-3 px-4 text-start font-mono font-extrabold text-blue-600 text-[11px]">
                        {entry.entryNumber}
                      </td>
                      <td className="py-3 px-4 text-start font-mono text-[11px] text-slate-500">
                        {entry.date}
                      </td>
                      <td className="py-3 px-4 text-start">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.type === JournalEntryType.Opening ? 'bg-violet-500/10 text-violet-600' :
                          entry.type === JournalEntryType.Adjustment ? 'bg-amber-500/10 text-amber-600' :
                          entry.type === JournalEntryType.Auto ? 'bg-emerald-500/10 text-slate-900 dark:text-white' :
                          'bg-slate-500/10 text-slate-600'
                        }`}>
                          {isAr ? entry.type : entry.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-start text-slate-700 dark:text-slate-300">
                        {entry.description}
                      </td>
                      <td className="py-3 px-4 text-end font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                        {formatCurrency(totalVal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          <Check className="h-3 w-3" />
                          <span>{entry.approvedBy || (isAr ? 'مُعتمد' : 'Approved')}</span>
                        </span>
                      </td>
                    </tr>

                    {/* Collapsible View Lines for each entry */}
                    {selectedEntry?.id === entry.id && (
                      <tr className="bg-slate-50/70 dark:bg-slate-900/40">
                        <td colSpan={6} className="p-4">
                          <div className="border border-slate-200/60 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-950 space-y-2">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                              {isAr ? 'القيود المحاسبية التفصيلية للدفتر' : 'Underlying General Ledger Rows'}
                            </span>
                            <div className="space-y-1">
                              {entry.lines.map((l, lIdx) => {
                                const lineKey = `${entry.id}-${lIdx}`;
                                const showItems = expandedItems.has(lineKey);
                                const hasItems = l.items && l.items.length > 0;
                                return (
                                  <div key={lIdx}>
                                    <div className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-slate-800/40 py-1.5 last:border-0 font-semibold">
                                      <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        {hasItems && (
                                          <button onClick={() => {
                                            const next = new Set(expandedItems);
                                            if (showItems) next.delete(lineKey);
                                            else next.add(lineKey);
                                            setExpandedItems(next);
                                          }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-0.5">
                                            {showItems ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                          </button>
                                        )}
                                        {getAccountName(l.accountId)}
                                      </span>
                                      <div className="flex gap-8 font-mono text-[11px]">
                                        <div className="w-24 text-end">
                                          {l.debit > 0 && <span className="text-slate-900 dark:text-white font-bold">{l.debit.toFixed(2)} (Dr)</span>}
                                        </div>
                                        <div className="w-24 text-end">
                                          {l.credit > 0 && <span className="text-slate-500">{l.credit.toFixed(2)} (Cr)</span>}
                                        </div>
                                      </div>
                                    </div>
                                    {hasItems && showItems && (
                                      <div className="ps-6 py-1 space-y-0.5 border-b border-slate-50 dark:border-slate-800/40">
                                        {l.items!.map((item, iIdx) => (
                                          <div key={iIdx} className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 py-0.5">
                                            <span>{isAr ? item.nameAr : item.nameEn}</span>
                                            <span className="font-mono whitespace-nowrap">
                                              {item.quantity.toFixed(3)} {isAr ? item.unitAr : item.unitEn}
                                              <span className="ms-3 text-slate-400">({item.cost.toFixed(2)})</span>
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
