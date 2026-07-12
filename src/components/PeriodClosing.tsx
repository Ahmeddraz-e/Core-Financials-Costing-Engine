import React, { useState } from 'react';
import { Lock, LockOpen, CheckCircle, AlertTriangle } from 'lucide-react';
import { ERPData, AccountingPeriod, JournalEntry, JournalEntryType } from '../types';
import { fmtDate } from '../utils/printUtils';

interface PeriodClosingProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdatePeriods: (periods: AccountingPeriod[]) => void;
  onUpdateEntries: (entries: JournalEntry[]) => void;
  onUpdateAccounts: (accounts: any[]) => void;
  onAddAuditLog: (ar: string, en: string, d: string) => void;
}

export default function PeriodClosing({
  data, lang, onUpdatePeriods, onUpdateEntries, onUpdateAccounts, onAddAuditLog
}: PeriodClosingProps) {
  const isAr = lang === 'ar';
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const periods = data.accountingPeriods || [];
  
  const formatCurrency = (val: number) => {
    const formattedNum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val);
    return isAr ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
  }

  const getAccountBalances = (typeFilter: string[]) => {
    return data.accounts.filter(a => typeFilter.includes(a.type) && a.balance !== 0);
  };

  const handleClosePeriod = () => {
    const existing = periods.find(p => p.year === selectedYear && p.month === selectedMonth);
    if (existing?.status === 'CLOSED') {
      window.showAlert(
        `الفترة ${selectedMonth}/${selectedYear} مغلقة بالفعل`,
        `Period ${selectedMonth}/${selectedYear} is already closed`,
        'warning'
      );
      return;
    }

    // Determine Revenue and Expense accounts
    const revenueAccounts = getAccountBalances(['REVENUE']);
    const expenseAccounts = getAccountBalances(['EXPENSE', 'COST_OF_SALES']);
    
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    const jeLines: { accountId: string; debit: number; credit: number }[] = [];

    // Revenue accounts have normal CREDIT balance. To close, we DEBIT them.
    revenueAccounts.forEach(acc => {
      totalRevenue += acc.balance;
      jeLines.push({ accountId: acc.id, debit: acc.balance, credit: 0 });
    });

    // Expense accounts have normal DEBIT balance. To close, we CREDIT them.
    expenseAccounts.forEach(acc => {
      totalExpenses += acc.balance;
      jeLines.push({ accountId: acc.id, debit: 0, credit: acc.balance });
    });

    const netIncome = totalRevenue - totalExpenses;
    
    // Find Retained Earnings Account (Usually equity, let's assume code '302' or find by type)
    let retainedEarnings = data.accounts.find(a => a.code === '302' || (a.type === 'EQUITY' && (a.nameEn.toLowerCase().includes('retained') || a.nameAr.includes('محتجزة'))));
    
    // If not found, fallback to the first EQUITY account
    if (!retainedEarnings) {
      retainedEarnings = data.accounts.find(a => a.type === 'EQUITY');
    }

    if (!retainedEarnings) {
      window.showAlert(
        'لم يتم العثور على حساب أرباح محتجزة أو حقوق ملكية لإقفال الفترة.',
        'Retained earnings or equity account not found for closing.',
        'danger'
      );
      return;
    }

    if (netIncome > 0) {
      // Profit: Credit Retained Earnings
      jeLines.push({ accountId: retainedEarnings.id, debit: 0, credit: netIncome });
    } else if (netIncome < 0) {
      // Loss: Debit Retained Earnings
      jeLines.push({ accountId: retainedEarnings.id, debit: Math.abs(netIncome), credit: 0 });
    }

    const jeId = 'je-close-' + Math.random().toString(36).substring(2, 9);
    const newJE: JournalEntry = {
      id: jeId,
      entryNumber: `JV-CLS-${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
      date: new Date().toISOString().split('T')[0],
      type: JournalEntryType.Closing,
      description: isAr ? `قيد إقفال الفترة ${selectedMonth}/${selectedYear}` : `Closing Entry for ${selectedMonth}/${selectedYear}`,
      lines: jeLines,
      approved: true,
      approvedBy: 'النظام'
    };

    // Update Account Balances
    const updatedAccounts = data.accounts.map(acc => {
      // Zero out revenue and expenses
      if (revenueAccounts.some(r => r.id === acc.id)) return { ...acc, balance: 0 };
      if (expenseAccounts.some(e => e.id === acc.id)) return { ...acc, balance: 0 };
      
      // Update Retained Earnings
      if (acc.id === retainedEarnings?.id) {
        return { ...acc, balance: acc.balance + netIncome };
      }
      return acc;
    });

    const newPeriod: AccountingPeriod = {
      id: 'ap-' + Math.random().toString(36).substring(2, 9),
      year: selectedYear,
      month: selectedMonth,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      closedBy: 'المدير المالي',
      closingEntryId: jeId
    };

    window.showConfirm(
      `سيتم إقفال الإيرادات والمصروفات وترحيل صافي ${netIncome >= 0 ? 'الربح' : 'الخسارة'} (${formatCurrency(Math.abs(netIncome))}) إلى حساب الأرباح المحتجزة. هل أنت متأكد؟`,
      `Revenues and expenses will be closed, and net ${netIncome >= 0 ? 'profit' : 'loss'} of ${formatCurrency(Math.abs(netIncome))} will be posted to Retained Earnings. Are you sure?`,
      () => {
        onUpdateEntries([newJE, ...data.journalEntries]);
        onUpdateAccounts(updatedAccounts);
        onUpdatePeriods([newPeriod, ...periods.filter(p => p.id !== existing?.id)]);
        
        onAddAuditLog(
          `إقفال مالي للفترة ${selectedMonth}/${selectedYear}`,
          `Financial Closing for ${selectedMonth}/${selectedYear}`,
          `تم إنشاء قيد الإقفال وترصيد الحسابات.`
        );
        window.showAlert('تم إقفال الفترة بنجاح', 'Period closed successfully', 'success');
      }
    );
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'إقفال الفترات المحاسبية' : 'Period Closing'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'إقفال حسابات النتيجة (الإيرادات والمصروفات) وترحيل الأرباح/الخسائر' : 'Close income statement accounts and roll over retained earnings'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-400">
            <p className="font-bold mb-1">{isAr ? 'تنبيه هام قبل الإقفال:' : 'Important notice before closing:'}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{isAr ? 'تأكد من تسجيل كافة القيود والفواتير الخاصة بالفترة.' : 'Ensure all entries and invoices for the period are recorded.'}</li>
              <li>{isAr ? 'عملية الإقفال ستقوم بتصفير كافة حسابات الإيرادات والمصروفات.' : 'Closing will zero out all revenue and expense accounts.'}</li>
              <li>{isAr ? 'سيتم ترحيل الفارق (الربح أو الخسارة) تلقائياً لحساب الأرباح المحتجزة.' : 'The difference (profit or loss) will be rolled into Retained Earnings.'}</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'شهر الإقفال' : 'Closing Month'}</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)}
              className="w-32 px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
              {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'سنة الإقفال' : 'Closing Year'}</label>
            <input type="number" value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}
              className="w-32 px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>
          <button onClick={handleClosePeriod} className="px-6 py-2.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-lg flex items-center gap-2">
            <Lock className="h-4 w-4" /> {isAr ? 'تنفيذ الإقفال المالي' : 'Execute Financial Close'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'سجل الفترات المغلقة' : 'Closed Periods History'}</h3>
        </div>
        {periods.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold">
            {isAr ? 'لم يتم إقفال أي فترات بعد' : 'No closed periods yet'}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'الفترة' : 'Period'}</th>
                <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'تاريخ الإقفال' : 'Closed At'}</th>
                <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'رقم قيد الإقفال' : 'Closing Entry #'}</th>
                <th className="text-center px-4 py-3 font-bold text-slate-500">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {periods.sort((a, b) => b.year - a.year || b.month - a.month).map(p => (
                <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-black text-slate-900 dark:text-white">{p.month} / {p.year}</td>
                  <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">{fmtDate(p.closedAt || '', lang)}</td>
                  <td className="px-4 py-3 font-bold text-blue-600">{data.journalEntries.find(j => j.id === p.closingEntryId)?.entryNumber || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <CheckCircle className="h-3 w-3" /> {isAr ? 'مغلق' : 'Closed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
