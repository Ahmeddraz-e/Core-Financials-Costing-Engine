import React, { useState } from 'react';
import { FileBarChart, Search, CheckCircle, AlertCircle, FileText, BarChart3, TrendingUp, ShieldCheck, Printer, Calculator } from 'lucide-react';
import { ERPData, Account, AccountType } from '../types';
import TaxReport from './TaxReport';
import AgingReport from './AgingReport';

interface ReportsProps {
  data: ERPData;
  lang: 'ar' | 'en';
}

export default function Reports({ data, lang }: ReportsProps) {
  const isAr = lang === 'ar';
  const [activeReport, setActiveReport] = useState<'trial_balance' | 'income_statement' | 'balance_sheet' | 'tax_report' | 'aging_report'>('trial_balance');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(val);
  };

  const getAccountGroupTotal = (type: AccountType) => {
    return data.accounts
      .filter(a => a.type === type)
      .reduce((sum, a) => sum + a.balance, 0);
  };

  // CALCULATE INCOME STATEMENT (PROFIT & LOSS)
  const salesRevenue = getAccountGroupTotal(AccountType.Revenue);
  const costOfSales = getAccountGroupTotal(AccountType.CostOfSales);
  const grossProfit = salesRevenue - costOfSales;

  // Operating Expenses (individual GL accounts)
  const salariesExpense = data.accounts.find(a => a.id === '601')?.balance || 0;
  const utilitiesExpense = data.accounts.find(a => a.id === '603')?.balance || 0;
  const rentExpense = data.accounts.find(a => a.id === '602')?.balance || 0;
  const marketingExpense = data.accounts.find(a => a.id === '604')?.balance || 0;
  const depreciationExpense = data.accounts.find(a => a.id === '605')?.balance || 0;
  const totalOperatingExpenses = salariesExpense + utilitiesExpense + rentExpense + marketingExpense + depreciationExpense;
  const netIncome = grossProfit - totalOperatingExpenses;

  // CALCULATE TRIAL BALANCE AGGREGATES
  // In a balanced Trial Balance, we sum Debit accounts and Credit accounts
  let trialDebitSum = 0;
  let trialCreditSum = 0;

  data.accounts.forEach(acc => {
    const isDebit = acc.type === AccountType.Asset || acc.type === AccountType.Expense || acc.type === AccountType.CostOfSales;
    if (isDebit) {
      trialDebitSum += Math.max(0, acc.balance);
      trialCreditSum += Math.max(0, -acc.balance);
    } else {
      trialCreditSum += Math.max(0, acc.balance);
      trialDebitSum += Math.max(0, -acc.balance);
    }
  });

  const trialDifference = Math.abs(trialDebitSum - trialCreditSum);
  const trialIsBalanced = trialDifference < 1; // within float tolerances

  // CALCULATE BALANCE SHEET ASSETS, LIABILITIES & EQUITY
  // Assets (match seed account IDs)
  const cashAsset = data.accounts.find(a => a.id === '101')?.balance || 0;
  const bankAsset = data.accounts.find(a => a.id === '102')?.balance || 0;
  const receivablesAsset = data.accounts.find(a => a.id === '103')?.balance || 0;
  const inventoryFoodAsset = data.accounts.find(a => a.id === '104')?.balance || 0;
  const inventoryPkgAsset = data.accounts.find(a => a.id === '105')?.balance || 0;
  const equipmentAsset = data.accounts.find(a => a.id === '106')?.balance || 0;
  const totalAssets = cashAsset + bankAsset + receivablesAsset + inventoryFoodAsset + inventoryPkgAsset + equipmentAsset;

  // Liabilities
  const payablesLiability = data.accounts.find(a => a.id === '201')?.balance || 0;
  const vatLiability = data.accounts.find(a => a.id === '203')?.balance || 0;
  const totalLiabilities = payablesLiability + vatLiability;

  // Equity
  const capitalEquity = data.accounts.find(a => a.id === '301')?.balance || 0;
  const retainedEarnings = capitalEquity + netIncome; // Capital + current period profit
  const totalEquityAndLiabilities = totalLiabilities + retainedEarnings;

  const bsDifference = Math.abs(totalAssets - totalEquityAndLiabilities);
  const bsIsBalanced = bsDifference < 1;

  return (
    <div id="financial_reports_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileBarChart className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'التقارير المالية المعتمدة والميزانيات العمومية' : 'Financial Statement Book & Ledger Audits'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'مراجعة فورية للقوائم المالية، ترحيل رصيد ميزان المراجعة، واحتساب الأرباح والخسائر والميزانية بالقرش' : 'Examine legal general ledgers, trial balances, overall profit performance (P&L), and double-entry balance sheets'}
          </p>
        </div>

        {/* Report Selector Buttons */}
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 self-start sm:self-center">
          <button 
            onClick={() => setActiveReport('trial_balance')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${activeReport === 'trial_balance' ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'}`}
          >
            {isAr ? 'ميزان المراجعة' : 'Trial Balance'}
          </button>
          <button 
            onClick={() => setActiveReport('income_statement')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${activeReport === 'income_statement' ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'}`}
          >
            {isAr ? 'قائمة الأرباح والخسائر (P&L)' : 'Income Statement'}
          </button>
          <button 
            onClick={() => setActiveReport('balance_sheet')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all ${activeReport === 'balance_sheet' ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'}`}
          >
            {isAr ? 'الميزانية العمومية' : 'Balance Sheet'}
          </button>
          <button 
            onClick={() => setActiveReport('tax_report')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeReport === 'tax_report' ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'}`}
          >
            <Calculator className="h-3.5 w-3.5" />
            {isAr ? 'الإقرار الضريبي' : 'VAT Tax'}
          </button>
          <button 
            onClick={() => setActiveReport('aging_report')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeReport === 'aging_report' ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'}`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {isAr ? 'أعمار الديون' : 'Aging'}
          </button>
        </div>
      </div>

      {/* REPORT VIEWER BOX */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
        
        {/* REPORT A: TRIAL BALANCE */}
        {activeReport === 'trial_balance' && (
          <div id="trial_balance_report" className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{isAr ? 'ميزان المراجعة بالأرصدة الدفترية' : 'Standard Trial Balance Ledger Report'}</h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">{isAr ? 'التأكد من تساوي الجانبين المدين والدائن في كل السندات والقيود' : 'Validating the integrity of active ledger debit/credit postings'}</span>
              </div>

              {/* Status validation badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                trialIsBalanced ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
              }`}>
                {trialIsBalanced ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>{isAr ? 'الميزان متوازن ومطابق بالقرش' : 'Balanced Perfect Audit'}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span>{isAr ? 'يوجد فارق تسوية!' : 'Adjustment Variance Found!'}</span>
                  </>
                )}
              </div>
            </div>

            {/* Trial Balance Table */}
            <div className="overflow-x-auto text-xs font-semibold">
              <table className="w-full text-start border-collapse" dir={isAr ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] uppercase bg-slate-50 dark:bg-slate-900/50">
                    <th className="py-2.5 px-4 text-start">{isAr ? 'كود الحساب' : 'Account Code'}</th>
                    <th className="py-2.5 px-4 text-start">{isAr ? 'اسم الحساب الجاري بالاستاد' : 'General Ledger Account'}</th>
                    <th className="py-2.5 px-4 text-start">{isAr ? 'تصنيف الحساب' : 'Group'}</th>
                    <th className="py-2.5 px-4 text-end">{isAr ? 'أرصدة مدينة (Dr)' : 'Debit Balance'}</th>
                    <th className="py-2.5 px-4 text-end">{isAr ? 'أرصدة دائنة (Cr)' : 'Credit Balance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {data.accounts.map(acc => {
                    const isDebitAcc = acc.type === AccountType.Asset || acc.type === AccountType.Expense || acc.type === AccountType.CostOfSales;
                    const displayDebit = isDebitAcc ? (acc.balance >= 0 ? acc.balance : 0) : (acc.balance < 0 ? -acc.balance : 0);
                    const displayCredit = isDebitAcc ? (acc.balance < 0 ? -acc.balance : 0) : (acc.balance >= 0 ? acc.balance : 0);
                    
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 text-start font-mono text-slate-500">{acc.code}</td>
                        <td className="py-2.5 px-4 text-start text-slate-950 dark:text-white font-bold">{isAr ? acc.nameAr : acc.nameEn}</td>
                        <td className="py-2.5 px-4 text-start text-slate-400 text-[10px]">{acc.type}</td>
                        <td className="py-2.5 px-4 text-end font-mono text-emerald-600">{displayDebit > 0 ? displayDebit.toFixed(0) : '—'}</td>
                        <td className="py-2.5 px-4 text-end font-mono text-slate-600 dark:text-slate-400">{displayCredit > 0 ? displayCredit.toFixed(0) : '—'}</td>
                      </tr>
                    );
                  })}

                  {/* Summary row */}
                  <tr className="border-t-2 border-slate-300 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 font-black text-sm text-slate-950 dark:text-white">
                    <td colSpan={3} className="py-3 px-4 text-start">{isAr ? 'مجموع أرصدة ميزان المراجعة' : 'Aggregate Trial Balance Totals'}</td>
                    <td className="py-3 px-4 text-end font-mono text-emerald-600">{trialDebitSum.toFixed(0)}</td>
                    <td className="py-3 px-4 text-end font-mono">{trialCreditSum.toFixed(0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT B: INCOME STATEMENT */}
        {activeReport === 'income_statement' && (
          <div id="income_statement_report" className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{isAr ? 'قائمة الأرباح والخسائر والتشغيل (P&L Statement)' : 'Income & Profitability Statement (P&L)'}</h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">{isAr ? 'احتساب هامش الربح الإجمالي وصافي عوائد مبيعات الصالة والدليفري' : 'Detailed summary of sales, COGS, labor payroll, and kitchen wastage'}</span>
              </div>

              <div className="text-xs font-bold text-slate-500 font-mono">
                {isAr ? 'الفترة المالية:' : 'Reporting Period:'} FY-2026
              </div>
            </div>

            {/* Income Statement sheet format */}
            <div className="space-y-4 max-w-2xl mx-auto border border-slate-100 dark:border-slate-800 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-900/40 text-xs font-bold">
              
              {/* Sales revenues */}
              <div className="flex justify-between items-center py-2.5 border-b border-slate-200">
                <span className="text-slate-800 dark:text-slate-200">{isAr ? 'إيرادات المبيعات والخدمات الغذائية' : 'Gross Sales & Catering Revenues'}</span>
                <span className="font-mono text-slate-950 dark:text-white">{formatCurrency(salesRevenue)}</span>
              </div>

              {/* COGS */}
              <div className="flex justify-between items-center py-2.5 border-b border-slate-200 text-rose-600">
                <span>{isAr ? 'يخصم: تكلفة البضاعة المباعة (COGS / خامات الأكل)' : 'Less: Cost of Goods Sold (Raw food ingredients)'}</span>
                <span className="font-mono">({formatCurrency(costOfSales)})</span>
              </div>

              {/* Gross Profit */}
              <div className="flex justify-between items-center py-3 border-b-2 border-slate-300 text-slate-950 dark:text-white text-sm font-black">
                <span>{isAr ? 'مجمل الربح التجاري للمطعم' : 'Total Gross Profit Margin'}</span>
                <span className="font-mono text-emerald-600">{formatCurrency(grossProfit)}</span>
              </div>

              {/* Expenses breakdown heading */}
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block pt-3">
                {isAr ? 'المصروفات التشغيلية والإدارية (OPEX)' : 'Operating Expenses (OPEX)'}
              </span>

              {/* Salaries */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-slate-600">
                <span>{isAr ? 'رواتب وأجور موظفي المطبخ والصالة' : 'Staff Salaries & Direct preparation wages'}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{formatCurrency(salariesExpense)}</span>
              </div>

              {/* Utilities */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-slate-600">
                <span>{isAr ? 'مصروفات استهلاك الغاز والمياه والكهرباء' : 'Kitchen Utilities (Gas, Power, Water)'}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{formatCurrency(utilitiesExpense)}</span>
              </div>

              {/* Rent */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-slate-600">
                <span>{isAr ? 'مصروفات الإيجار' : 'Rent Expense'}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{formatCurrency(rentExpense)}</span>
              </div>

              {/* Marketing */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-slate-600">
                <span>{isAr ? 'مصروفات التسويق والدعاية' : 'Marketing & Advertising'}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{formatCurrency(marketingExpense)}</span>
              </div>

              {/* Depreciation */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100 text-slate-600">
                <span>{isAr ? 'مصروف إهلاك الأصول الثابتة' : 'Depreciation Expense'}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{formatCurrency(depreciationExpense)}</span>
              </div>

              {/* Total Expenses */}
              <div className="flex justify-between items-center py-2.5 border-b-2 border-slate-300 text-rose-600 font-black">
                <span>{isAr ? 'إجمالي المصاريف التشغيلية' : 'Total General Expenses'}</span>
                <span className="font-mono">({formatCurrency(totalOperatingExpenses)})</span>
              </div>

              {/* Net Income/Profit */}
              <div className="flex justify-between items-center py-4 text-base font-black rounded-xl bg-slate-900 text-white px-4">
                <span>{isAr ? 'صافي أرباح الفترة المالية (Net Income)' : 'Net Profit / Retained Earning'}</span>
                <span className="font-mono text-emerald-400">{formatCurrency(netIncome)}</span>
              </div>

            </div>
          </div>
        )}

        {/* REPORT C: BALANCE SHEET */}
        {activeReport === 'balance_sheet' && (
          <div id="balance_sheet_report" className="space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{isAr ? 'الميزانية العمومية والمركز المالي' : 'Statement of Financial Position (Balance Sheet)'}</h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">{isAr ? 'تقرير الأصول والخصوم وحقوق الملكية متوازنة بالقرش' : 'Real-time double-entry proof: Assets = Liabilities + Owners Equity'}</span>
              </div>

              {/* Balanced Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                bsIsBalanced ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
              }`}>
                {bsIsBalanced ? (
                  <>
                    <ShieldCheck className="h-4 w-4 animate-pulse" />
                    <span>{isAr ? 'معادلة الميزانية متوازنة تماماً' : 'Immaculate Balance Proof Verified'}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span>{isAr ? 'فارق بالقرش!' : 'Imbalance in ledger equation!'}</span>
                  </>
                )}
              </div>
            </div>

            {/* Split view: Assets left vs Liabilities & Equity right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-bold">
              
              {/* ASSETS column */}
              <div className="space-y-4">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block pb-1 border-b border-slate-200">
                  {isAr ? 'الأصول والمدلكات الحالية والتابتة' : 'Assets Portfolio'}
                </span>

                {/* Current Assets */}
                <div className="space-y-2">
                  <p className="text-[10px] text-blue-600 font-extrabold uppercase">{isAr ? 'أصول متداولة (سائلة)' : 'Current Liquid Assets'}</p>
                  
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span>{isAr ? 'نقدية بالصناديق والخزائن' : 'Cash in Vaults'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(cashAsset)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span>{isAr ? 'حساب جاري البنك الأهلي المصري' : 'National Bank (NBE) Current'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(bankAsset)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span>{isAr ? 'حسابات مدينو مبيعات الكترونية' : 'Customer AR Receivables'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(receivablesAsset)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span>{isAr ? 'جرد خامات الأطعمة والمخازن' : 'Food Ingredient Stocks'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(inventoryFoodAsset)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span>{isAr ? 'مخزون مواد التعبئة والتغليف' : 'Packaging Inventory'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(inventoryPkgAsset)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-700 border-b border-slate-100">
                    <span>{isAr ? 'معدات وأصول ثابتة (صافي)' : 'Fixed Assets (Net Book Value)'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(equipmentAsset)}</span>
                  </div>
                </div>

                {/* Fixed Assets */}
                <div className="space-y-2">
                  <p className="text-[10px] text-blue-600 font-extrabold uppercase">{isAr ? 'أصول ثابتة (معدات)' : 'Long-Term Property & Equipments'}</p>
                  
                  <div className="flex justify-between py-1.5 text-slate-700 border-b border-slate-100">
                    <span>{isAr ? 'معدات وأفران المطبخ الصناعية' : 'Industrial Kitchen Equipment'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(equipmentAsset)}</span>
                  </div>
                </div>

                {/* Assets aggregate sum */}
                <div className="flex justify-between items-center py-3 bg-slate-900 text-white px-3.5 rounded-xl font-black text-sm">
                  <span>{isAr ? 'إجمالي الأصول الكلية (Assets)' : 'Aggregate Total Assets'}</span>
                  <span className="font-mono text-sky-400">{formatCurrency(totalAssets)}</span>
                </div>
              </div>

              {/* LIABILITIES AND EQUITY column */}
              <div className="space-y-4">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block pb-1 border-b border-slate-200">
                  {isAr ? 'الالتزامات وحقوق المساهمين' : 'Liabilities & Owner Equity'}
                </span>

                {/* Liabilities */}
                <div className="space-y-2">
                  <p className="text-[10px] text-amber-600 font-extrabold uppercase">{isAr ? 'التزامات قصيرة الأجل (دائنون)' : 'Current Liabilities'}</p>
                  
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span>{isAr ? 'أرصدة الموردين المستحقة (AP)' : 'Outstanding Supplier Payables'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(payablesLiability)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-700 border-b border-slate-100">
                    <span>{isAr ? 'مصلحة الضرائب - ضريبة القيمة المضافة 14%' : 'VAT Taxes Payable (14%)'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(vatLiability)}</span>
                  </div>
                </div>

                {/* Equity */}
                <div className="space-y-2">
                  <p className="text-[10px] text-amber-600 font-extrabold uppercase">{isAr ? 'رأس المال وحقوق الملاك' : 'Owner Equity & Earnings'}</p>
                  
                  <div className="flex justify-between py-1.5 text-slate-700">
                    <span>{isAr ? 'رأس مال المطعم التأسيسي' : 'Paid-In Founding Capital'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(capitalEquity)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-slate-700 border-b border-slate-100">
                    <span>{isAr ? 'أرباح الفترة الجارية غير الموزعة' : 'Current Period Net Income (Retained)'}</span>
                    <span className="font-mono text-emerald-600">{formatCurrency(netIncome)}</span>
                  </div>
                </div>

                {/* Equity & liabilities sum */}
                <div className="flex justify-between items-center py-3 bg-slate-900 text-white px-3.5 rounded-xl font-black text-sm">
                  <span>{isAr ? 'إجمالي الالتزامات وحقوق الملكية' : 'Total Liabilities & Equities'}</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(totalEquityAndLiabilities)}</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeReport === 'tax_report' && (
          <TaxReport data={data} lang={lang} />
        )}

        {activeReport === 'aging_report' && (
          <AgingReport data={data} lang={lang} />
        )}
      </div>

    </div>
  );
}
