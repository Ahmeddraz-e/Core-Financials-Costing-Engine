import React, { useState } from 'react';
import { Target, TrendingUp, TrendingDown, Percent, Settings, Save, AlertTriangle, Sparkles } from 'lucide-react';
import { ERPData, AccountType } from '../types';

interface BudgetsProps {
  data: ERPData;
  lang: 'ar' | 'en';
}

export default function Budgets({ data, lang }: BudgetsProps) {
  const isAr = lang === 'ar';
  
  // Local target budget parameters editable by user
  const [targetSales, setTargetSales] = useState(150000);
  const [targetCOGS, setTargetCOGS] = useState(50000);
  const [targetSalaries, setTargetSalaries] = useState(30000);
  const [targetUtilities, setTargetUtilities] = useState(10000);
  const [showEditTargets, setShowEditTargets] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(val);
  };

  // Get Actual values from Chart of Accounts
  const actualSales = data.accounts
    .filter(a => a.type === AccountType.Revenue)
    .reduce((sum, a) => sum + a.balance, 0);

  const actualCOGS = data.accounts
    .filter(a => a.type === AccountType.CostOfSales)
    .reduce((sum, a) => sum + a.balance, 0);

  const actualSalaries = data.accounts
    .filter(a => a.type === AccountType.Expense) // gross salaries is 501
    .reduce((sum, a) => sum + a.balance, 0);

  const actualUtilities = data.accounts.find(a => a.id === '503')?.balance || 0;

  // COMPUTE VARIANCE ANALYSIS
  // Formula: Variance = Actual - Budget for Revenue (positive is favorable)
  // Formula: Variance = Budget - Actual for Expense (positive is favorable)
  const budgetSpecs = [
    {
      id: 'sales',
      labelAr: 'إيرادات مبيعات المطعم الكلية',
      labelEn: 'Gross Dining & Delivery Sales',
      target: targetSales,
      actual: actualSales,
      isRevenue: true
    },
    {
      id: 'cogs',
      labelAr: 'تكلفة خامات الأكل المباشرة (COGS)',
      labelEn: 'Cost of Goods Sold (Raw food)',
      target: targetCOGS,
      actual: actualCOGS,
      isRevenue: false
    },
    {
      id: 'salaries',
      labelAr: 'رواتب وأجور الكاشير والتحضير',
      labelEn: 'Kitchen Staff & Service Payroll',
      target: targetSalaries,
      actual: actualSalaries,
      isRevenue: false
    },
    {
      id: 'utilities',
      labelAr: 'مصروفات الطاقة والغاز والمرافق',
      labelEn: 'Operational Gas & Utilities',
      target: targetUtilities,
      actual: actualUtilities,
      isRevenue: false
    }
  ];

  return (
    <div id="variance_budgets_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'تحليل الموازنات التقديرية والانحرافات المالية' : 'Target Budgets & Operational Variance Analysis'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'مقارنة مستهدفات المبيعات والمصروفات التقديرية بالأرصدة الفعلية للوقوف على الانحرافات الملائمة وغير الملائمة' : 'Measure corporate targets against direct G/L results to identify fiscal margins and cost leaks'}
          </p>
        </div>

        <button
          id="toggle_budget_targets"
          onClick={() => setShowEditTargets(!showEditTargets)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs"
        >
          <Settings className="h-4 w-4" />
          <span>{showEditTargets ? (isAr ? 'إخفاء الأهداف' : 'Hide Targets') : (isAr ? 'تعديل مستهدفات الموازنة' : 'Modify Budget Targets')}</span>
        </button>
      </div>

      {/* EDIT TARGETS PANEL */}
      {showEditTargets && (
        <div id="budget_targets_panel" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl space-y-4">
          <h3 className="text-xs font-extrabold text-slate-700 block uppercase tracking-widest">{isAr ? 'تحديث مستهدفات الربع المالي الجاري' : 'Modify Active Fiscal Quarter Target Allocations'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">{isAr ? 'مستهدف المبيعات' : 'Sales Target'}</label>
              <input
                id="target_sales_input"
                type="number"
                value={targetSales}
                onChange={(e) => setTargetSales(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">{isAr ? 'سقف خامات الأكل (COGS)' : 'COGS Expense Limit'}</label>
              <input
                id="target_cogs_input"
                type="number"
                value={targetCOGS}
                onChange={(e) => setTargetCOGS(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">{isAr ? 'سقف بند رواتب العمالة' : 'Payroll Expense Limit'}</label>
              <input
                id="target_salaries_input"
                type="number"
                value={targetSalaries}
                onChange={(e) => setTargetSalaries(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">{isAr ? 'سقف مصروف الطاقة والغاز' : 'Utilities Expense Limit'}</label>
              <input
                id="target_utilities_input"
                type="number"
                value={targetUtilities}
                onChange={(e) => setTargetUtilities(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950"
              />
            </div>
          </div>
        </div>
      )}

      {/* DETAILED VARIANCE CARDS GRID */}
      <div className="grid grid-cols-1 gap-4">
        {budgetSpecs.map(spec => {
          
          // Variance calc
          const rawVariance = spec.isRevenue 
            ? spec.actual - spec.target 
            : spec.target - spec.actual; // positive is favorable

          const variancePercent = spec.target > 0 ? (rawVariance / spec.target) * 100 : 0;
          const isFavorable = rawVariance >= 0;

          // Progress bar percentage
          const pctOfTarget = spec.target > 0 ? (spec.actual / spec.target) * 100 : 0;
          const clippedPct = Math.min(100, Math.max(0, pctOfTarget));

          return (
            <div key={spec.id} className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
              
              {/* Header metrics */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {isAr ? spec.labelAr : spec.labelEn}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold block mt-0.5">
                    {isAr ? 'مستهدف الموازنة ربع السنوية:' : 'Corporate Fiscal Target Allocation:'} {formatCurrency(spec.target)}
                  </p>
                </div>

                <div className="text-end">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                    isFavorable ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {isFavorable ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    <span>
                      {isFavorable ? (isAr ? 'انحراف ملائم' : 'Favorable') : (isAr ? 'انحراف غير ملائم' : 'Unfavorable')} 
                      ({variancePercent.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </div>

              {/* Metrics split values */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl text-center font-semibold text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'القيمة المستهدفة' : 'Target Goal'}</span>
                  <span className="text-slate-800 dark:text-slate-200 mt-1 block font-mono">{formatCurrency(spec.target)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'القيمة الفعلية (G/L)' : 'Actual G/L Balance'}</span>
                  <span className="text-slate-800 dark:text-slate-200 mt-1 block font-mono font-black">{formatCurrency(spec.actual)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'فرق الانحراف ج.' : 'Variance (EGP)'}</span>
                  <span className={`mt-1 block font-mono font-black ${isFavorable ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isFavorable ? '+' : ''}{formatCurrency(rawVariance)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'نسبة الإنجاز المالي' : 'Target % Reached'}</span>
                  <span className="text-blue-600 mt-1 block font-mono font-black">{pctOfTarget.toFixed(1)}%</span>
                </div>
              </div>

              {/* Progress bar visualizer */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      spec.isRevenue 
                        ? (pctOfTarget >= 100 ? 'bg-emerald-500' : 'bg-blue-500')
                        : (pctOfTarget > 100 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500')
                    }`}
                    style={{ width: `${clippedPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>0%</span>
                  <span>{isAr ? 'مستهدف الموازنة المقدر' : 'Quarterly Budget Ceiling Goal'} (100%)</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
