import React, { useState } from 'react';
import { Landmark, Plus, Trash2, Calendar, ShieldCheck, DollarSign, RefreshCw, Calculator, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { ERPData, FixedAsset, Account, JournalEntry } from '../types';

interface FixedAssetsProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdateFixedAssets: (assets: FixedAsset[]) => void;
  onUpdateAccounts: (accounts: Account[]) => void;
  onUpdateEntries: (entries: JournalEntry[]) => void;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
  onUpdateERPState?: (updater: (prev: ERPData) => ERPData) => void;
}

export default function FixedAssets({ 
  data, 
  lang, 
  onUpdateFixedAssets,
  onUpdateAccounts,
  onUpdateEntries,
  onAddAuditLog,
  onUpdateERPState
}: FixedAssetsProps) {
  const isAr = lang === 'ar';
  const [showAddAssetForm, setShowAddAssetForm] = useState(false);

  // New Asset form state
  const [assetNameAr, setAssetNameAr] = useState('');
  const [assetNameEn, setAssetNameEn] = useState('');
  const [purchaseValue, setPurchaseValue] = useState(0);
  const [salvageValue, setSalvageValue] = useState(0);
  const [lifeYears, setLifeYears] = useState(5);
  const [paymentSourceId, setPaymentSourceId] = useState<string>(() => {
    // C-4 FIX: Default was 'treasury-1' which never matched the real treasury prefix 'treasury-cb-1'
    // Now derive the default dynamically from the first available treasury or bank account
    if (data.treasuries && data.treasuries.length > 0) return `treasury-${data.treasuries[0].id}`;
    if (data.bankAccounts && data.bankAccounts.length > 0) return `bank-${data.bankAccounts[0].id}`;
    return '';
  });

  // Custom alert & confirmation modal states
  const [alertModal, setAlertModal] = useState<{ show: boolean; title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }>({ show: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setAlertModal({ show: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  const paymentSources = [
    ...(data.treasuries || []).map(t => ({ id: `treasury-${t.id}`, nameAr: t.nameAr, nameEn: t.nameEn, balance: t.balance, accountId: t.accountId })),
    ...(data.bankAccounts || []).map(b => ({ id: `bank-${b.id}`, nameAr: b.bankNameAr, nameEn: b.bankNameEn, balance: b.balance, accountId: b.accountId }))
  ];

  const handleDeleteAsset = (id: string, name: string) => {
    showConfirm(
      isAr ? 'تأكيد حذف سجل الأصل' : 'Confirm Asset Deletion',
      isAr ? `هل أنت متأكد من حذف سجل الأصل "${name}" نهائياً من الدفاتر؟` : `Are you sure you want to permanently delete asset "${name}"?`,
      () => {
        const updated = data.fixedAssets.filter(a => a.id !== id);
        onUpdateFixedAssets(updated);
        onAddAuditLog(
          `حذف سجل أصل ثابت: ${name}`,
          `Deleted Fixed Asset: ${name}`,
          `تم حذف سجل الأصل بالكامل من النظام.`
        );
        showAlert(
          isAr ? 'تم الحذف' : 'Deleted',
          isAr ? '👤 تم حذف سجل الأصل بنجاح!' : 'Fixed asset record deleted successfully!',
          'success'
        );
      }
    );
  };

  const formatCurrency = (val: number) => {
    const formattedNum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);
    return isAr ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
  };

  // 1. ADD NEW FIXED ASSET
  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetNameAr || !assetNameEn || purchaseValue <= 0) return;

    const source = paymentSources.find(s => s.id === paymentSourceId);
    if (!source) {
      showAlert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'برجاء تحديد خزينة أو بنك صالح للدفع منه!' : 'Please select a valid payment source!',
        'error'
      );
      return;
    }

    if (source.balance < purchaseValue) {
      showAlert(
        isAr ? 'تنبيه - رصيد غير كافٍ' : 'Warning - Insufficient Funds',
        isAr ? `رصيد المصدر المالي المختار (${source.balance} ج.م) أقل من قيمة شراء الأصل (${purchaseValue} ج.م)!` : `Selected source balance (${source.balance} EGP) is less than asset purchase price (${purchaseValue} EGP)!`,
        'warning'
      );
      return;
    }

    if (purchaseValue <= salvageValue) {
      showAlert(
        isAr ? 'تنبيه - القيمة التخريدية' : 'Warning - Salvage Value',
        isAr ? 'يجب أن تكون قيمة الشراء أكبر من القيمة التخريدية للأصل!' : 'Purchase price must be greater than salvage value!',
        'warning'
      );
      return;
    }

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

    // Post double entry JV
    // Debit: Fixed Assets - Kitchen Equipment (Account 106)
    // Credit: Selected payment source account (e.g. cash 101 or bank 102)
    const year = new Date().getFullYear();
    const jvSerial = String(data.journalEntries.length + 1).padStart(3, '0');
    const jvNumber = `JV-${year}-${jvSerial}`;

    const purchaseJV: JournalEntry = {
      id: 'je-' + Math.random().toString(36).substring(2, 9),
      entryNumber: jvNumber,
      date: new Date().toISOString().split('T')[0],
      type: 'PAYMENT' as any,
      description: isAr ? `شراء أصل ثابت جديد: ${assetNameAr}` : `Purchase of fixed asset: ${assetNameEn}`,
      approved: true,
      approvedBy: isAr ? 'المدير العام' : 'General Manager',
      lines: [
        { accountId: '106', debit: purchaseValue, credit: 0 },
        { accountId: source.accountId, debit: 0, credit: purchaseValue }
      ]
    };

    const updatedAccounts = data.accounts.map(acc => {
      if (acc.id === '106') return { ...acc, balance: acc.balance + purchaseValue };
      if (acc.id === source.accountId) return { ...acc, balance: acc.balance - purchaseValue };
      return acc;
    });

    const nextTreasuries = data.treasuries.map(t => {
      if (`treasury-${t.id}` === source.id) {
        return { ...t, balance: t.balance - purchaseValue };
      }
      return t;
    });

    const nextBankAccounts = data.bankAccounts.map(b => {
      if (`bank-${b.id}` === source.id) {
        return { ...b, balance: b.balance - purchaseValue };
      }
      return b;
    });

    if (onUpdateERPState) {
      onUpdateERPState(prev => ({
        ...prev,
        fixedAssets: [...prev.fixedAssets, newAsset],
        accounts: updatedAccounts,
        journalEntries: [purchaseJV, ...prev.journalEntries],
        treasuries: nextTreasuries,
        bankAccounts: nextBankAccounts
      }));
    } else {
      onUpdateFixedAssets([...data.fixedAssets, newAsset]);
      onUpdateAccounts(updatedAccounts);
      onUpdateEntries([purchaseJV, ...data.journalEntries]);
    }

    onAddAuditLog(
      `شراء أصل ثابت جديد: ${assetNameAr}`,
      `Purchased Fixed Asset: ${assetNameEn}`,
      `تم شراء الأصل الكودي ${code} بقيمة ${purchaseValue} ج.م أخصماً من ${isAr ? source.nameAr : source.nameEn} وتم ترحيل القيد المحاسبي ${jvNumber}.`
    );

    setAssetNameAr('');
    setAssetNameEn('');
    setPurchaseValue(0);
    setSalvageValue(0);
    setLifeYears(5);
    setShowAddAssetForm(false);
    showAlert(
      isAr ? 'تمت إضافة الأصل' : 'Asset Registered',
      isAr ? `✅ تم تسجيل الأصل وشراؤه بقيمة ${purchaseValue} ج.م بنجاح وترحيل قيده المحاسبي!` : `Fixed asset registered and purchased for ${purchaseValue} EGP!`,
      'success'
    );
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

    showAlert(
      isAr ? 'نجاح' : 'Success',
      isAr 
        ? `تم احتساب الإهلاك الشهري بقيمة ${totalDepreciationSum.toFixed(2)} ج.م وترحيل قيد الإهلاك بنجاح!` 
        : `Monthly straight line depreciation of ${totalDepreciationSum.toFixed(2)} EGP generated and posted successfully!`,
      'success'
    );
  };

  return (
    <div id="fixed_assets_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="h-5.5 w-5.5 text-slate-900 dark:text-white" />
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
          <span className="text-lg font-black text-slate-900 dark:text-white mt-1.5 block font-mono">
            {formatCurrency(data.fixedAssets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0))}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs font-semibold">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">{isAr ? 'صافي القيمة الدفترية للأصول' : 'Net Book Value (NBV)'}</span>
          <span className="text-lg font-black text-slate-900 dark:text-white mt-1.5 block font-mono">
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

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block">{isAr ? 'طريقة الدفع (الخزينة/البنك):' : 'Payment Source:'}</label>
            <select
              value={paymentSourceId}
              onChange={(e) => setPaymentSourceId(e.target.value)}
              className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"
            >
              {paymentSources.map(src => (
                <option key={src.id} value={src.id}>
                  {isAr ? src.nameAr : src.nameEn} ({src.balance.toLocaleString()} ج.م)
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex justify-end gap-3 pt-3 border-t">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-8 rounded-xl text-xs cursor-pointer">
              {isAr ? 'شراء وتسجيل الأصل' : 'Purchase & Register'}
            </button>
            <button type="button" onClick={() => setShowAddAssetForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 text-slate-700 dark:text-slate-355 text-xs font-bold cursor-pointer">
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
              <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
            {data.fixedAssets.map(asset => (
              <tr key={asset.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40">
                <td className="py-3.5 px-4 text-start font-mono text-slate-500">{asset.code}</td>
                <td className="py-3.5 px-4 text-start text-slate-900 dark:text-white font-bold">{isAr ? asset.nameAr : asset.nameEn}</td>
                <td className="py-3.5 px-4 text-start font-mono text-slate-500">{asset.purchaseDate}</td>
                <td className="py-3.5 px-4 text-end font-mono text-slate-900 dark:text-white">{formatCurrency(asset.purchaseValue)}</td>
                <td className="py-3.5 px-4 text-end font-mono text-slate-900 dark:text-white">{formatCurrency(asset.accumulatedDepreciation)}</td>
                <td className="py-3.5 px-4 text-end font-mono text-slate-900 dark:text-white font-bold">{formatCurrency(asset.currentBookValue)}</td>
                <td className="py-3.5 px-4 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-600">
                    {asset.usefulLifeYears} {isAr ? 'سنوات' : 'years'}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <button
                    onClick={() => handleDeleteAsset(asset.id, asset.nameAr)}
                    className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-600 hover:text-white text-slate-900 dark:text-white dark:text-rose-400 cursor-pointer animate-none transition-colors"
                    title={isAr ? 'حذف سجل الأصل' : 'Delete Asset Record'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
