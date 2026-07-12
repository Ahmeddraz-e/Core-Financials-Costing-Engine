import React, { useState, useMemo } from 'react';
import { BookOpen, Search, FileSpreadsheet, Download } from 'lucide-react';
import { ERPData, Account, JournalEntry } from '../types';
import { printDocument, fmtCurrency, fmtDate, companyHeaderHTML, signaturesHTML, footerHTML, exportToCSV } from '../utils/printUtils';

interface GeneralLedgerProps {
  data: ERPData;
  lang: 'ar' | 'en';
}

interface LedgerRow {
  date: string;
  entryNumber: string;
  description: string;
  debit: number;
  credit: number;
  balanceAfter: number;
}

export default function GeneralLedger({ data, lang }: GeneralLedgerProps) {
  const isAr = lang === 'ar';
  
  const [accountId, setAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const generateLedger = (): LedgerRow[] => {
    if (!accountId) return [];

    let rawRows: Omit<LedgerRow, 'balanceAfter'>[] = [];

    // Extract all lines for this account from all journal entries
    (data.journalEntries || []).forEach(je => {
      // Only include approved entries (in a real system, unapproved shouldn't hit GL)
      if (!je.approved) return;

      je.lines.forEach(line => {
        if (line.accountId === accountId) {
          rawRows.push({
            date: je.date,
            entryNumber: je.entryNumber,
            description: je.description,
            debit: line.debit,
            credit: line.credit
          });
        }
      });
    });

    // Sort by date ascending, then by entry number for same-date entries
    rawRows.sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.entryNumber.localeCompare(b.entryNumber, undefined, { numeric: true });
    });

    let runningBalance = 0;
    let openingBalance = 0;

    const filtered: LedgerRow[] = [];
    const account = data.accounts.find(a => a.id === accountId);
    
    // Determine normal balance nature: ASSET/EXPENSE/COST_OF_SALES = Debit (+) Credit (-)
    // LIABILITY/EQUITY/REVENUE = Credit (+) Debit (-)
    const isDebitNormal = account?.type === 'ASSET' || account?.type === 'EXPENSE' || account?.type === 'COST_OF_SALES';

    rawRows.forEach(row => {
      const rowDate = new Date(row.date);
      const isBeforeStart = startDate ? rowDate < new Date(startDate) : false;
      const isAfterEnd = endDate ? rowDate > new Date(endDate) : false;

      const impact = isDebitNormal ? (row.debit - row.credit) : (row.credit - row.debit);

      if (isBeforeStart) {
        openingBalance += impact;
      }

      runningBalance += impact;

      if (!isBeforeStart && !isAfterEnd) {
        filtered.push({
          ...row,
          balanceAfter: runningBalance
        });
      }
    });

    if (startDate) {
      filtered.unshift({
        date: startDate,
        entryNumber: '-',
        description: isAr ? 'رصيد افتتاحي للفترة' : 'Opening Balance',
        debit: isDebitNormal ? (openingBalance > 0 ? openingBalance : 0) : (openingBalance < 0 ? Math.abs(openingBalance) : 0),
        credit: !isDebitNormal ? (openingBalance > 0 ? openingBalance : 0) : (openingBalance < 0 ? Math.abs(openingBalance) : 0),
        balanceAfter: openingBalance
      });
    }

    return filtered;
  };

  const ledger = useMemo(() => generateLedger(), [accountId, startDate, endDate, data]);
  const selectedAccount = data.accounts.find(a => a.id === accountId);



  const handleExport = () => {
    if (ledger.length === 0) return;
    const rows = ledger.map(r => ({
      'التاريخ': r.date,
      'رقم القيد': r.entryNumber,
      'البيان': r.description,
      'مدين': r.debit,
      'دائن': r.credit,
      'الرصيد': r.balanceAfter
    }));
    exportToCSV(rows, `GL_${selectedAccount?.code || 'Account'}`);
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-5.5 w-5.5 text-slate-900 dark:text-white" />
            <span>{isAr ? 'دفتر الأستاذ المساعد' : 'General Ledger Detailed'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'تحليل القيود والحركات التفصيلية لكل حساب في الدليل المحاسبي' : 'Detailed transaction analysis for every account in the chart of accounts'}
          </p>
        </div>
        {ledger.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-lg cursor-pointer">
              <FileSpreadsheet className="h-4 w-4" />
              {isAr ? 'تصدير دفتر الأستاذ إلى Excel' : 'Export Ledger to Excel'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'الحساب المالي' : 'Financial Account'}</label>
            <select value={accountId} onChange={e => setAccountId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
              <option value="">{isAr ? '— اختر حساب لعرص الدفتر —' : '— Select Account —'}</option>
              {data.accounts.sort((a, b) => a.code.localeCompare(b.code)).map(a => (
                <option key={a.id} value={a.id}>{a.code} - {isAr ? a.nameAr : a.nameEn}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'من تاريخ' : 'From Date'}</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'إلى تاريخ' : 'To Date'}</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>
        </div>
      </div>

      {accountId && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-slate-400" />
              {selectedAccount?.code} - {isAr ? selectedAccount?.nameAr : selectedAccount?.nameEn}
            </h3>
            <div className="flex gap-4 mt-2">
              <p className="text-xs font-bold text-slate-500">
                {isAr ? 'الرصيد الدفتري الحالي:' : 'Current Book Balance:'} <span className="text-slate-900 dark:text-white">{fmtCurrency(selectedAccount?.balance || 0, lang)}</span>
              </p>
              <p className="text-xs font-bold text-slate-500">
                {isAr ? 'طبيعة الحساب:' : 'Account Nature:'} <span className="text-slate-700 dark:text-slate-300">{selectedAccount?.type}</span>
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'رقم القيد' : 'Entry #'}</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'البيان' : 'Description'}</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500">{isAr ? 'مدين' : 'Debit'}</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500">{isAr ? 'دائن' : 'Credit'}</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500">{isAr ? 'الرصيد' : 'Balance'}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      {isAr ? 'لا توجد حركات مالية في هذا الحساب' : 'No transactions in this account'}
                    </td>
                  </tr>
                ) : (
                  ledger.map((row, idx) => (
                    <tr key={row.entryNumber} className={`border-b border-slate-100 dark:border-slate-800/50 ${row.type === 'OPENING' ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                      <td className="px-4 py-2.5 font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">{row.date}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{row.entryNumber}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{row.description}</td>
                      <td className="px-4 py-2.5 font-black text-slate-700 dark:text-slate-300 text-left">{row.debit > 0 ? fmtCurrency(row.debit, lang) : '-'}</td>
                      <td className="px-4 py-2.5 font-black text-slate-700 dark:text-slate-300 text-left">{row.credit > 0 ? fmtCurrency(row.credit, lang) : '-'}</td>
                      <td className="px-4 py-2.5 font-black text-slate-900 dark:text-white dark:text-white text-left bg-slate-50 dark:bg-slate-800/40">
                        {fmtCurrency(row.balanceAfter, lang)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
