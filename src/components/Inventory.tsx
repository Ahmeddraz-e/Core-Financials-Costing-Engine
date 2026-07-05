import React, { useState } from 'react';
import { Boxes, Plus, Trash2, Search, AlertTriangle, ShieldAlert, FileText, ArrowRightLeft, Save } from 'lucide-react';
import { ERPData, InventoryItem, ItemCategory, WastageLog, Account, JournalEntry } from '../types';

interface InventoryProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdateInventory: (items: InventoryItem[]) => void;
  onUpdateWastage: (logs: WastageLog[]) => void;
  onUpdateAccounts: (accounts: Account[]) => void;
  onUpdateEntries: (entries: JournalEntry[]) => void;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
}

const PREDEFINED_UNITS = [
  { ar: 'كجم', en: 'kg' },
  { ar: 'جرام', en: 'g' },
  { ar: 'لتر', en: 'L' },
  { ar: 'مل', en: 'ml' },
  { ar: 'قطعة', en: 'Piece' },
  { ar: 'علبة', en: 'Box' },
  { ar: 'كرتونة', en: 'Carton' },
  { ar: 'كيس', en: 'Bag' },
  { ar: 'زجاجة', en: 'Bottle' },
  { ar: 'متر', en: 'Meter' }
];

export default function Inventory({ 
  data, 
  lang, 
  onUpdateInventory, 
  onUpdateWastage,
  onUpdateAccounts,
  onUpdateEntries,
  onAddAuditLog
}: InventoryProps) {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'stocks' | 'wastage' | 'additem'>('stocks');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'ALL'>('ALL');

  // New Item form state
  const [newCode, setNewCode] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newCategory, setNewCategory] = useState<ItemCategory>(ItemCategory.FoodRaw);
  const [newUnitAr, setNewUnitAr] = useState('كجم');
  const [newUnitEn, setNewUnitEn] = useState('kg');
  const [unitOption, setUnitOption] = useState('0');

  const handleUnitOptionChange = (val: string) => {
    setUnitOption(val);
    if (val !== 'custom') {
      const unit = PREDEFINED_UNITS[Number(val)];
      setNewUnitAr(unit.ar);
      setNewUnitEn(unit.en);
    } else {
      setNewUnitAr('');
      setNewUnitEn('');
    }
  };

  const [newCost, setNewCost] = useState(0);
  const [newQuantity, setNewQuantity] = useState(0);
  const [newReorderPoint, setNewReorderPoint] = useState(0);
  const [newYieldPercent, setNewYieldPercent] = useState<number | undefined>(undefined);

  // New Wastage form state
  const [showWastageForm, setShowWastageForm] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [wasteQty, setWasteQty] = useState(0);
  const [wasteReason, setWasteReason] = useState('');

  // Category translations
  const catLabels: Record<ItemCategory, { ar: string; en: string }> = {
    [ItemCategory.FoodRaw]: { ar: 'خامات غذائية طازجة', en: 'Fresh Raw Foods' },
    [ItemCategory.Beverage]: { ar: 'مشروبات وبودر', en: 'Beverages & Syrups' },
    [ItemCategory.Packaging]: { ar: 'مواد التعبئة والتغليف', en: 'Packaging Materials' },
    [ItemCategory.Cleaning]: { ar: 'منظفات كيماوية', en: 'Cleaning Chemicals' },
    [ItemCategory.OperatingSupply]: { ar: 'مستلزمات تشغيل وصيانة', en: 'Operating Supplies' },
    [ItemCategory.SemiFinished]: { ar: 'منتجات نصف مصنعة (تحضيرات)', en: 'Semi-Finished Prep' },
    [ItemCategory.FinishedProduct]: { ar: 'وجبات نهائية جاهزة للبيع', en: 'Finished Plates' }
  };

  const getInventoryItemName = (id: string) => {
    const i = data.inventory.find(item => item.id === id);
    return i ? (isAr ? i.nameAr : i.nameEn) : 'Unknown SKU';
  };

  // REGISTER AND POST FOOD WASTAGE
  const handleRegisterWastage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || wasteQty <= 0 || !wasteReason) return;

    const item = data.inventory.find(i => i.id === selectedItemId);
    if (!item) return;

    if (item.quantity < wasteQty) {
      alert(isAr ? 'الكمية التالفة أكبر من رصيد المخزن الحالي!' : 'Wastage quantity exceeds current store levels!');
      return;
    }

    const costVal = wasteQty * item.cost;

    // 1. Log Wastage entry
    const newLog: WastageLog = {
      id: 'w-' + Math.random().toString(36).substring(2, 9),
      itemId: selectedItemId,
      quantity: wasteQty,
      date: new Date().toISOString().split('T')[0],
      reason: wasteReason,
      cost: costVal
    };

    // 2. Dynamic decrease inventory stock level
    const updatedInventory = data.inventory.map(i => {
      if (i.id === selectedItemId) {
        return { ...i, quantity: i.quantity - wasteQty };
      }
      return i;
    });

    // 3. AUTO-POST DOUBLE-ENTRY ACCOUNTING JOURNAL!
    // Debit: Food Wastage Expense (Account 504)
    // Credit: Food Inventory Assets (Account 104)
    const year = new Date().getFullYear();
    const jvSerial = String(data.journalEntries.length + 1).padStart(3, '0');
    const jvNumber = `JV-${year}-${jvSerial}`;

    const wastageJV: JournalEntry = {
      id: 'je-' + Math.random().toString(36).substring(2, 9),
      entryNumber: jvNumber,
      date: new Date().toISOString().split('T')[0],
      type: 'ADJUSTMENT' as any,
      description: `تسوية وإثبات هالك مخزني تلقائي لـ (${isAr ? item.nameAr : item.nameEn}) - سبب: ${wasteReason}`,
      approved: true,
      approvedBy: 'مراقب التكاليف (محمود)',
      lines: [
        { accountId: '504', debit: costVal, credit: 0 }, // Cost of Food Wastage
        { accountId: '104', debit: 0, credit: costVal }  // Food Inventory
      ]
    };

    // Update GL balances
    const updatedAccounts = data.accounts.map(acc => {
      if (acc.id === '104') { // Food Inventory Asset decreases on credit
        return { ...acc, balance: acc.balance - costVal };
      }
      if (acc.id === '504') { // Wastage expense increases on debit
        return { ...acc, balance: acc.balance + costVal };
      }
      return acc;
    });

    onUpdateInventory(updatedInventory);
    onUpdateWastage([newLog, ...data.wastage]);
    onUpdateAccounts(updatedAccounts);
    onUpdateEntries([wastageJV, ...data.journalEntries]);

    onAddAuditLog(
      `تسجيل هالك مخزني: ${isAr ? item.nameAr : item.nameEn}`,
      `Registered stock spoilage: ${isAr ? item.nameAr : item.nameEn}`,
      `تم شطب ${wasteQty} وحدات من المخازن بقيمة تالف ${costVal} ج.م وترحيل القيد ${jvNumber} تلقائياً.`
    );

    // Reset Form
    setSelectedItemId('');
    setWasteQty(0);
    setWasteReason('');
    setShowWastageForm(false);
  };

  // ADD NEW INVENTORY ITEM
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newNameAr || !newNameEn || !newUnitAr || !newUnitEn || newCost <= 0) return;

    if (data.inventory.some(i => i.code === newCode)) {
      alert(isAr ? 'كود الصنف مسجل مسبقاً!' : 'Item code already exists!');
      return;
    }

    const newItem: InventoryItem = {
      id: 'inv-' + Math.random().toString(36).substring(2, 9),
      code: newCode,
      nameAr: newNameAr,
      nameEn: newNameEn,
      category: newCategory,
      unitAr: newUnitAr,
      unitEn: newUnitEn,
      cost: newCost,
      quantity: newQuantity,
      reorderPoint: newReorderPoint,
      yieldPercent: newYieldPercent
    };

    onUpdateInventory([...data.inventory, newItem]);

    onAddAuditLog(
      `إضافة صنف مخزني جديد: ${newNameAr}`,
      `New inventory item: ${newNameEn}`,
      `تم إدراج الصنف ${newNameAr} (${newCode}) بتكلفة ${newCost} ج.م وكمية ${newQuantity} تحت تصنيف ${newCategory}.`
    );

    setNewCode('');
    setNewNameAr('');
    setNewNameEn('');
    setUnitOption('0');
    setNewUnitAr('كجم');
    setNewUnitEn('kg');
    setNewCost(0);
    setNewQuantity(0);
    setNewReorderPoint(0);
    setNewYieldPercent(undefined);
    setActiveSubTab('stocks');
  };

  // Filter items
  const filteredItems = data.inventory.filter(item => {
    const matchesSearch = 
      item.code.includes(searchTerm) || 
      item.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.nameEn.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="inventory_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'إدارة المخزون والتحكم بالفاقد والهالك' : 'Inventory Ledger & Spoilage Control'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'مراقبة كميات الخامات بالثلاجات والمخازن، تحديد نقاط إعادة الطلب، وتسجيل جرد الهالك والتسويات الجردية' : 'Monitor storage volumes, establish alert levels, audit waste logs, and auto-post double-entry adjustments'}
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
          <button 
            onClick={() => setActiveSubTab('stocks')}
            className={`px-4 py-2 text-xs font-bold rounded-lg ${activeSubTab === 'stocks' ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'}`}
          >
            {isAr ? 'أرصدة الخامات والمستودعات' : 'Storage Balances'}
          </button>
          <button 
            onClick={() => setActiveSubTab('wastage')}
            className={`px-4 py-2 text-xs font-bold rounded-lg ${activeSubTab === 'wastage' ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'}`}
          >
            {isAr ? 'سجل تالف المطبخ (Wastage)' : 'Spoilage & Wastage'} ({data.wastage.length})
          </button>
          <button 
            onClick={() => setActiveSubTab('additem')}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1 ${activeSubTab === 'additem' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-600'}`}
          >
            <Plus className="h-3 w-3" />
            {isAr ? 'إضافة صنف جديد' : 'Add Item'}
          </button>
        </div>
      </div>

      {activeSubTab === 'additem' && (
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              {isAr ? 'إضافة صنف جديد للمخزون' : 'Add New Inventory Item'}
            </span>
          </div>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">{isAr ? 'كود الصنف' : 'Item Code'} *</label>
              <input type="text" required value={newCode} onChange={(e) => setNewCode(e.target.value)}
                placeholder="e.g. VEG-TOMATO-001"
                className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">{isAr ? 'الاسم عربي' : 'Arabic Name'} *</label>
              <input type="text" required value={newNameAr} onChange={(e) => setNewNameAr(e.target.value)}
                placeholder="طماطم"
                className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">{isAr ? 'الاسم إنجليزي' : 'English Name'} *</label>
              <input type="text" required value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)}
                placeholder="Tomato"
                className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">{isAr ? 'التصنيف' : 'Category'} *</label>
              <select required value={newCategory} onChange={(e) => setNewCategory(e.target.value as ItemCategory)}
                className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white">
                {(Object.keys(catLabels) as ItemCategory[]).map(cat => (
                  <option key={cat} value={cat}>{isAr ? catLabels[cat].ar : catLabels[cat].en}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">{isAr ? 'وحدة القياس' : 'Unit of Measure'} *</label>
              <select
                value={unitOption}
                onChange={(e) => handleUnitOptionChange(e.target.value)}
                className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
              >
                {PREDEFINED_UNITS.map((u, idx) => (
                  <option key={idx} value={String(idx)}>
                    {isAr ? `${u.ar} (${u.en})` : `${u.en} (${u.ar})`}
                  </option>
                ))}
                <option value="custom">{isAr ? 'أخرى (تخصيص...)' : 'Other (Custom...)'}</option>
              </select>
            </div>
            {unitOption === 'custom' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">{isAr ? 'وحدة القياس (عربي)' : 'Unit (Arabic)'} *</label>
                  <input type="text" required value={newUnitAr} onChange={(e) => setNewUnitAr(e.target.value)}
                    placeholder="كجم"
                    className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"/>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">{isAr ? 'وحدة القياس (إنجليزي)' : 'Unit (English)'} *</label>
                  <input type="text" required value={newUnitEn} onChange={(e) => setNewUnitEn(e.target.value)}
                    placeholder="kg"
                    className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"/>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">{isAr ? 'تكلفة الوحدة' : 'Unit Cost'} *</label>
              <input type="number" required min="0.01" step="0.01" value={newCost || ''} onChange={(e) => setNewCost(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">{isAr ? 'الكمية الافتتاحية' : 'Opening Quantity'}</label>
              <input type="number" min="0" step="0.001" value={newQuantity || ''} onChange={(e) => setNewQuantity(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">{isAr ? 'حد إعادة الطلب' : 'Reorder Point'}</label>
              <input type="number" min="0" step="0.001" value={newReorderPoint || ''} onChange={(e) => setNewReorderPoint(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"/>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">{isAr ? 'نسبة الإنتاجية %' : 'Yield %'}</label>
              <input type="number" min="0" max="100" step="0.1" value={newYieldPercent ?? ''} onChange={(e) => setNewYieldPercent(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"/>
            </div>
            <div className="md:col-span-3 flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="submit" className="bg-emerald-600 text-white font-bold py-2.5 px-8 rounded-xl text-xs">
                {isAr ? 'إضافة الصنف للمخزون' : 'Add Item'}
              </button>
              <button type="button" onClick={() => setActiveSubTab('stocks')} className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold">
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeSubTab === 'stocks' && (
        <>
          {/* STOCKS SEARCH AND SELECTORS */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              
              {/* Search bar */}
              <div className="relative w-full md:w-80">
                <span className={`absolute inset-y-0 ${isAr ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-slate-400`}>
                  <Search className="h-4 w-4" />
                </span>
                <input
                  id="stock_search_input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isAr ? 'ابحث برمز الصنف أو الاسم المخزني...' : 'Search item SKU or name...'}
                  className={`w-full text-xs font-semibold py-2.5 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none`}
                />
              </div>

              {/* Category buttons filters */}
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setActiveCategory('ALL')}
                  className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg ${
                    activeCategory === 'ALL' 
                      ? 'bg-slate-900 dark:bg-slate-800 text-white' 
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {isAr ? 'عرض الجميع' : 'Show All'}
                </button>
                {(Object.keys(catLabels) as ItemCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg ${
                      activeCategory === cat 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {isAr ? catLabels[cat].ar.split(' ')[0] : catLabels[cat].en.split(' ')[0]}
                  </button>
                ))}
              </div>

            </div>

            {/* STOCKS DETAIL LIST */}
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse text-xs font-semibold" dir={isAr ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
                    <th className="py-3 px-4 text-start">{isAr ? 'كود الصنف' : 'Item SKU'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'البيان المخزني ووحدة القياس' : 'Material SKU Descriptor'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'المجموعة المخزنية' : 'Group category'}</th>
                    <th className="py-3 px-4 text-end">{isAr ? 'تكلفة الوحدة (متوسط مرجح)' : 'Weighted Avg Cost'}</th>
                    <th className="py-3 px-4 text-end">{isAr ? 'الكمية الفعلية بالثلاجات' : 'Physical Qty'}</th>
                    <th className="py-3 px-4 text-end">{isAr ? 'القيمة المالية للمخزون' : 'Asset Valuation'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'حالة التنبيه المخزني' : 'Safety Alert'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {filteredItems.map((item) => {
                    const isLow = item.quantity <= item.reorderPoint && item.category !== ItemCategory.FinishedProduct;
                    const valuation = item.cost * item.quantity;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="py-3.5 px-4 text-start font-mono text-slate-500">{item.code}</td>
                        <td className="py-3.5 px-4 text-start">
                          <div>
                            <p className="text-slate-950 dark:text-white font-bold">{isAr ? item.nameAr : item.nameEn}</p>
                            <span className="text-[10px] text-slate-400 font-bold">{isAr ? 'وحدة الشراء الأساسية:' : 'Purchasing unit:'} {isAr ? item.unitAr : item.unitEn}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-start">
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-slate-500">
                            {isAr ? catLabels[item.category].ar : catLabels[item.category].en}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-end font-mono text-slate-900 dark:text-white">
                          {item.cost.toFixed(2)} ج.م
                        </td>
                        <td className={`py-3.5 px-4 text-end font-mono font-black ${isLow ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                          {item.quantity.toFixed(1)} {isAr ? item.unitAr : item.unitEn}
                        </td>
                        <td className="py-3.5 px-4 text-end font-mono font-bold text-slate-900 dark:text-white">
                          {valuation > 0 ? (new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(valuation)) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.category === ItemCategory.FinishedProduct ? (
                            <span className="text-[10px] text-slate-400 font-bold">—</span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{isAr ? 'تحت حد إعادة الطلب!' : 'Order raw stocks!'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              <span>{isAr ? 'آمن ومتوفر' : 'Safe'}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </>
        )}

      {activeSubTab === 'wastage' && (
        <>
          {/* WASTAGE SPOILAGE REGISTRATION SUB-TAB */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-6">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">
                  {isAr ? 'سجل هدر وتالف المطبخ والتشغيل' : 'Kitchen Food Spoilage & Wastage Ledger'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isAr ? 'تسجيل إعدام الخامات يرحل قيد خسائر الهالك تلقائياً' : 'Logging expired goods auto-posts structural waste expense JVs'}
                </span>
              </div>

              <button
                id="new_waste_toggle_btn"
                onClick={() => setShowWastageForm(!showWastageForm)}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-rose-500/15"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'تسجيل وإعدام خامة غذائية تالفة' : 'Log Raw Spoilage'}</span>
              </button>
            </div>

            {/* REGISTER WASTAGE FORM PANEL */}
            {showWastageForm && (
              <form onSubmit={handleRegisterWastage} className="p-5 rounded-xl bg-rose-500/5 border border-rose-100 dark:border-rose-950/20 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                
                {/* Select item */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'الخامة التالفة' : 'Wasted Raw Material'}</label>
                  <select
                    id="waste_item_select"
                    required
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                  >
                    <option value="">{isAr ? '-- اختر خامة مخزنية --' : '-- Choose Raw material --'}</option>
                    {data.inventory
                      .filter(i => i.category !== ItemCategory.FinishedProduct && i.quantity > 0)
                      .map(i => (
                        <option key={i.id} value={i.id}>
                          {isAr ? `${i.nameAr} (${i.unitAr})` : `${i.nameEn} (${i.unitEn})`} - {isAr ? `المتوفر: ${i.quantity}` : `In stock: ${i.quantity}`}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Waste Quantity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'الكمية التالفة لإعدامها' : 'Quantity spoiled'}</label>
                  <input
                    id="waste_qty_input"
                    type="number"
                    required
                    step="any"
                    min="0.01"
                    value={wasteQty || ''}
                    onChange={(e) => setWasteQty(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                  />
                </div>

                {/* Wastage Reason */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'سبب التلف / الإعدام' : 'Reason for wastage'}</label>
                  <input
                    id="waste_reason_input"
                    type="text"
                    required
                    value={wasteReason}
                    onChange={(e) => setWasteReason(e.target.value)}
                    placeholder={isAr ? 'مثال: ذبول، عطل بالتبريد، انتهاء تاريخ...' : 'e.g., cooling breakdown, spoilage...'}
                    className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                  />
                </div>

                {/* Action submit */}
                <div className="flex gap-2 w-full">
                  <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs">
                    {isAr ? 'تسجيل وشطب تلقائي' : 'Authorize Spoilage & Auto JV'}
                  </button>
                  <button type="button" onClick={() => setShowWastageForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold">
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>

              </form>
            )}

            {/* WASTAGE JOURNAL HISTORY TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse text-xs font-semibold" dir={isAr ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
                    <th className="py-3 px-4 text-start">{isAr ? 'تاريخ الإعدام' : 'Value Date'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'الخامة التالفة المشطوبة' : 'Spoiled Raw SKU'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الكمية المشطوبة' : 'Quantity lost'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'مسببات التلف والتقرير' : 'Spoilage report details'}</th>
                    <th className="py-3 px-4 text-end">{isAr ? 'الخسارة المالية المترتبة' : 'Spoilage Loss Expense'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {data.wastage.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="py-3 px-4 text-start font-mono text-slate-500">{w.date}</td>
                      <td className="py-3 px-4 text-start text-slate-900 dark:text-white font-bold">{getInventoryItemName(w.itemId)}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">{w.quantity.toFixed(1)}</td>
                      <td className="py-3 px-4 text-start text-slate-500">{w.reason}</td>
                      <td className="py-3 px-4 text-end font-mono font-bold text-rose-600">
                        {new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(w.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
