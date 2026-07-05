import React, { useState } from 'react';
import { Landmark, Plus, Trash2, Calendar, ShieldCheck, DollarSign, RefreshCw, Calculator } from 'lucide-react';
import { ERPData, FixedAsset, Account, JournalEntry } from '../types';

interface FixedAssetsProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdateFixedAssets: (assets: FixedAsset[]) => void;
  onUpdateAccounts: (accounts: Account[]) => void;
  onUpdateEntries: (entries: JournalEntry[]) => void;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
}

export default function FixedAssets({ 
  data, 
  lang, 
  onUpdateFixedAssets,
  onUpdateAccounts,
  onUpdateEntries,
  onAddAuditLog
}: FixedAssetsProps) {
  const isAr = lang === 'ar';
  const [showAddAssetForm, setShowAddAssetForm] = useState(false);

  // New Asset form state
  const [assetNameAr, setAssetNameAr] = useState('');
  const [assetNameEn, setAssetNameEn] = useState('');
  const [purchaseValue, setPurchaseValue] = useState(0);
  const [salvageValue, setSalvageValue] = useState(0);
  const [lifeYears, setLifeYears] = useState(5);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(val);
  };

  // 1. ADD NEW FIXED ASSET
  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetNameAr || !assetNameEn || purchaseValue <= 0) return;

    const code = `AST-${String(data.fixedAssets.length + 1).padStart(3, '0')}`;
    const newAsset: FixedAsset = {
      id: 'ast-' + Math.random().toString(36).substring(2, 9),
      code,
      nameAr: assetNameAr,
      nameEn: assetNameEn,
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseValue,
      salvageValue,
      usefulLifeYears: lifeYears,
      accumulatedDepreciation: 0,
      currentBookValue: purchaseValue
    };

    onUpdateFixedAssets([...data.fixedAssets, newAsset]);
    onAddAuditLog(
      `تسجيل أصل ثابت جديد: ${assetNameAr}`,
      `Registered Fixed Asset: ${assetNameEn}`,
      `تم تسجيل الأصل الكودي ${code} بقيمة شراء ${purchaseValue} جنيه وعمر افتراضي ${lifeYears} سنوات.`
    );

    setAssetNameAr('');
    setAssetNameEn('');
    setPurchaseValue(0);
    setSalvageValue(0);
    setLifeYears(5);
    setShowAddAssetForm(false);
  };

  // 2. RUN MONTHLY STRAIGHT LINE DEPRECIATION CALCULATION & AUTO POST JV
  // Monthly Depreciation = (PurchaseValue - SalvageValue) / (UsefulLifeYears * 12)
  // Debit: Depreciation Expense (503) | Credit: Accumulated Depreciation Contra-Asset (105 is Equipment, we decrease net Equipment)
  const handleRunMonthlyDepreciation = () => {
    if (data.fixedAssets.length === 0) return;

    let totalDepreciationSum = 0;

    // Calculate straight line for each active asset
    const updatedAssets = data.fixedAssets.map(asset => {
      const monthlyDep = (asset.purchaseValue - asset.salvageValue) / (asset.usefulLifeYears * 12);
      const newAccumulated = asset.accumulatedDepreciation + monthlyDep;
      const newBookValue = Math.max(asset.salvageValue, asset.purchaseValue - newAccumulated);
      
      totalDepreciationSum += monthlyDep;

      return {
        ...asset,
        accumulatedDepreciation: newAccumulated,
        currentBookValue: newBookValue
      };
    });

    if (totalDepreciationSum <= 0) return;

    // Post Double Entry Depreciation JV!
    // Debit: Depreciation Expense (Account 605)
    // Credit: Kitchen Equipments Asset (Account 106)
    const year = new Date().getFullYear();
    const jvSerial = String(data.journalEntries.length + 1).padStart(3, '0');
    const jvNumber = `JV-${year}-${jvSerial}`;

    const depreciationJV: JournalEntry = {
      id: 'je-' + Math.random().toString(36).substring(2, 9),
      entryNumber: jvNumber,
      date: new Date().toISOString().split('T')[0],
      type: 'ADJUSTMENT' as any,
      description: `قيد تسوية إهلاك الأصول الثابتة الشهري لـ معدات المطبخ والأفران`,
      approved: true,
      approvedBy: isAr ? 'المدير العام' : 'General Manager',
      lines: [
        { accountId: '605', debit: totalDepreciationSum, credit: 0 }, // Depreciation Expense Increases
        { accountId: '106', debit: 0, credit: totalDepreciationSum }  // Equipment Asset decreases
      ]
    };

    const updatedAccounts = data.accounts.map(acc => {
      if (acc.id === '605') return { ...acc, balance: acc.balance + totalDepreciationSum };
      if (acc.id === '106') return { ...acc, balance: acc.balance - totalDepreciationSum };
      return acc;
    });

    onUpdateFixedAssets(updatedAssets);
    onUpdateAccounts(updatedAccounts);
    onUpdateEntries([depreciationJV, ...data.journalEntries]);

    onAddAuditLog(
      `حساب وإهلاك الأصول الثابتة دورياً`,
      `Executed Monthly straight line depreciation: ${jvNumber}`,
      `تم احتساب إهلاك المطبخ والمعدات بقيمة مجمعة ${totalDepreciationSum.toFixed(2)} ج.م وترحيل قيد اليومية الخاص بها.`
    );

    alert(isAr 
      ? `تم احتساب الإهلاك الشهري بقيمة ${totalDepreciationSum.toFixed(2)} ج.م وترحيل قيد الإهلاك بنجاح!` 
      : `Monthly straight line depreciation of ${totalDepreciationSum.toFixed(2)} EGP generated and posted successfully!`);
  };

  return (
    <div id="fixed_assets_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'الأصول الثابتة وجداول الإهلاك المالي' : 'Fixed Asset Registry & Depreciation Engines'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'تسجيل الأفران، الثلاجات والمعدات الصناعية، حساب نسب الاستهلاك القسط الثابت، وترحيل قيد الاستهلاك المخفض للأرباح' : 'Register kitchen ovens and industrial coolers, calculate straight-line wear rates, and auto-post depreciation expenses'}
          </p>
        </div>

        <button
          id="depreciation_run_btn"
          onClick={handleRunMonthlyDepreciation}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-emerald-500/15"
        >
          <RefreshCw className="h-4 w-4" />
          <span>{isAr ? 'حساب وترحيل الإهلاك الشهري للأصول' : 'Run Monthly Depreciation'}</span>
        </button>
      </div>

      {/* QUICK KPI CARD SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs font-semibold">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">{isAr ? 'أرصدة الأصول الإجمالية بالتكلفة التاريخية' : 'Total Acquisition Cost'}</span>
          <span className="text-lg font-black text-slate-900 dark:text-white mt-1.5 block font-mono">
            {formatCurrency(data.fixedAssets.reduce((sum, a) => sum + a.purchaseValue, 0))}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs font-semibold">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">{isAr ? 'مجمع الإهلاك المتراكم' : 'Accumulated Depreciation'}</span>
          <span className="text-lg font-black text-rose-600 mt-1.5 block font-mono">
            {formatCurrency(data.fixedAssets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0))}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs font-semibold">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">{isAr ? 'صافي القيمة الدفترية للأصول' : 'Net Book Value (NBV)'}</span>
          <span className="text-lg font-black text-blue-600 mt-1.5 block font-mono">
            {formatCurrency(data.fixedAssets.reduce((sum, a) => sum + a.currentBookValue, 0))}
          </span>
        </div>
      </div>

      {/* FIXED ASSETS CONTROLS TOOLBAR */}
      <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">
          {isAr ? 'سجل الأصول والمنشآت المسجلة' : 'Registered Physical Infrastructure Assets'}
        </span>

        <button
          id="add_asset_toggle_btn"
          onClick={() => setShowAddAssetForm(!showAddAssetForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs"
        >
          {isAr ? 'تسجيل أصل ومعدات جديدة' : 'Add New Asset'}
        </button>
      </div>

      {/* NEW ASSET REGISTRATION FORM PANEL */}
      {showAddAssetForm && (
        <form onSubmit={handleAddAsset} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block">{isAr ? 'اسم الأصل بالعربية' : 'Asset Arabic Name'}</label>
            <input
              id="asset_name_ar"
              type="text"
              required
              value={assetNameAr}
              onChange={(e) => setAssetNameAr(e.target.value)}
              placeholder="مثال: فرن هيدروليكي"
              className="w-full text-xs font-semibold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block">{isAr ? 'اسم الأصل بالإنجليزية' : 'Asset English Name'}</label>
            <input
              id="asset_name_en"
              type="text"
              required
              value={assetNameEn}
              onChange={(e) => setAssetNameEn(e.target.value)}
              placeholder="e.g., Hydraulic Oven"
              className="w-full text-xs font-semibold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block">{isAr ? 'قيمة شراء الأصل (التكلفة التاريخية)' : 'Original Purchase Cost'}</label>
            <input
              id="asset_purchase_val"
              type="number"
              required
              min="1"
              value={purchaseValue || ''}
              onChange={(e) => setPurchaseValue(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block">{isAr ? 'القيمة التخريدية المتوقعة (الخردة)' : 'Estimated Salvage Value'}</label>
            <input
              id="asset_salvage_val"
              type="number"
              required
              value={salvageValue || ''}
              onChange={(e) => setSalvageValue(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block">{isAr ? 'العمر الافتراضي (سنوات)' : 'Useful Life (Years)'}</label>
            <input
              id="asset_life_years"
              type="number"
              required
              min="1"
              max="20"
              value={lifeYears}
              onChange={(e) => setLifeYears(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"
            />
          </div>

          <div className="md:col-span-3 flex justify-end gap-3">
            <button type="submit" className="bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-xl text-xs">
              {isAr ? 'حفظ وتسجيل الأصل' : 'Register Asset'}
            </button>
            <button type="button" onClick={() => setShowAddAssetForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold">
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* FIXED ASSETS REGISTRY LIST DISPLAY */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 overflow-x-auto text-xs font-semibold">
        <table className="w-full text-start border-collapse" dir={isAr ? 'rtl' : 'ltr'}>
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
              <th className="py-3 px-4 text-start">{isAr ? 'رقم الأصل الكودي' : 'Asset Code'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'بيان المعدات والمطابخ' : 'Asset Description'}</th>
              <th className="py-3 px-4 text-start">{isAr ? 'تاريخ الاقتناء والشراء' : 'Acquisition Date'}</th>
              <th className="py-3 px-4 text-end">{isAr ? 'التكلفة التاريخية' : 'Acquisition Sum'}</th>
              <th className="py-3 px-4 text-end">{isAr ? 'الإهلاك المتراكم' : 'Accumulated Wear'}</th>
              <th className="py-3 px-4 text-end">{isAr ? 'القيمة الدفترية الحالية (NBV)' : 'Book value (NBV)'}</th>
              <th className="py-3 px-4 text-center">{isAr ? 'معدل العمر المقدر' : 'Lifespan'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
            {data.fixedAssets.map(asset => (
              <tr key={asset.id} className="hover:bg-slate-50/40">
                <td className="py-3.5 px-4 text-start font-mono text-slate-500">{asset.code}</td>
                <td className="py-3.5 px-4 text-start text-slate-900 dark:text-white font-bold">{isAr ? asset.nameAr : asset.nameEn}</td>
                <td className="py-3.5 px-4 text-start font-mono text-slate-500">{asset.purchaseDate}</td>
                <td className="py-3.5 px-4 text-end font-mono text-slate-900 dark:text-white">{formatCurrency(asset.purchaseValue)}</td>
                <td className="py-3.5 px-4 text-end font-mono text-rose-600">{formatCurrency(asset.accumulatedDepreciation)}</td>
                <td className="py-3.5 px-4 text-end font-mono text-blue-600 font-bold">{formatCurrency(asset.currentBookValue)}</td>
                <td className="py-3.5 px-4 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-600">
                    {asset.usefulLifeYears} {isAr ? 'سنوات' : 'years'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
