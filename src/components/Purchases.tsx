import React, { useState } from 'react';
import { ShoppingBag, Plus, Search, ChevronRight, FileCheck, Check, Truck, CreditCard, Users2, Save, Trash2, ShieldAlert } from 'lucide-react';
import { ERPData, PurchaseTransaction, PurchaseStatus, Supplier, InventoryItem, ItemCategory } from '../types';

interface PurchasesProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdatePurchases: (purchases: PurchaseTransaction[]) => void;
  onUpdateInventory: (items: InventoryItem[]) => void;
  onUpdateSuppliers: (suppliers: Supplier[]) => void;
  onUpdateAccounts: (accounts: any) => void;
  onAddMoneyTransaction: (tx: any) => void;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
}

export default function Purchases({ 
  data, 
  lang, 
  onUpdatePurchases, 
  onUpdateInventory, 
  onUpdateSuppliers,
  onUpdateAccounts,
  onAddMoneyTransaction,
  onAddAuditLog
}: PurchasesProps) {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'transactions' | 'suppliers'>('transactions');
  const [showAddPRForm, setShowAddPRForm] = useState(false);
  const [showAddSupplierForm, setShowAddSupplierForm] = useState(false);

  // New Supplier form state
  const [supNameAr, setSupNameAr] = useState('');
  const [supNameEn, setSupNameEn] = useState('');
  const [supPhone, setSupPhone] = useState('');

  // New Purchase Request Form states
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [orderQty, setOrderQty] = useState(10);
  const [orderPrice, setOrderPrice] = useState(10.0);

  const getSupplierName = (id: string) => {
    const s = data.suppliers.find(sup => sup.id === id);
    return s ? (isAr ? s.nameAr : s.nameEn) : 'Unknown Supplier';
  };

  const getInventoryItemName = (id: string) => {
    const i = data.inventory.find(item => item.id === id);
    return i ? (isAr ? i.nameAr : i.nameEn) : 'Unknown Material';
  };

  // Convert status to readable text
  const getStatusBadge = (status: PurchaseStatus) => {
    switch (status) {
      case PurchaseStatus.Draft:
        return { text: isAr ? 'مسودة' : 'Draft', classes: 'bg-slate-100 text-slate-700' };
      case PurchaseStatus.Requested:
        return { text: isAr ? 'طلب قيد الاعتماد' : 'PR Pending Approval', classes: 'bg-blue-100 text-blue-700' };
      case PurchaseStatus.Approved:
        return { text: isAr ? 'طلب معتمد للطلب' : 'PR Approved', classes: 'bg-indigo-100 text-indigo-700' };
      case PurchaseStatus.Ordered:
        return { text: isAr ? 'أمر شراء نشط' : 'PO Sent', classes: 'bg-yellow-100 text-yellow-700' };
      case PurchaseStatus.Received:
        return { text: isAr ? 'تم الاستلام المخزني' : 'Goods Received', classes: 'bg-emerald-100 text-emerald-700' };
      case PurchaseStatus.Invoiced:
        return { text: isAr ? 'فاتورة مستحقة' : 'AP Invoiced', classes: 'bg-orange-100 text-orange-700' };
      case PurchaseStatus.Paid:
        return { text: isAr ? 'تم السداد بالكامل' : 'Paid & Settled', classes: 'bg-green-100 text-green-700' };
      default:
        return { text: status, classes: 'bg-slate-100 text-slate-700' };
    }
  };

  // 1. ADD NEW SUPPLIER
  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supNameAr || !supNameEn) return;

    const code = `SUP-${String(data.suppliers.length + 1).padStart(3, '0')}`;
    const newSup: Supplier = {
      id: 'sup-' + Math.random().toString(36).substring(2, 9),
      code,
      nameAr: supNameAr,
      nameEn: supNameEn,
      phone: supPhone,
      balance: 0
    };

    onUpdateSuppliers([...data.suppliers, newSup]);
    onAddAuditLog(
      `تسجيل مورد جديد: ${supNameAr}`,
      `Registered Supplier: ${supNameEn}`,
      `تم تسجيل المورد الكودي ${code} في دليل الموردين والجهات الموردة للأغذية.`
    );

    setSupNameAr('');
    setSupNameEn('');
    setSupPhone('');
    setShowAddSupplierForm(false);
  };

  // 2. CREATE PURCHASE REQUEST (PR)
  const handleCreatePR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !selectedItemId) return;

    const subtotal = orderQty * orderPrice;
    const taxAmount = subtotal * 0.14; // 14% standard VAT in Egypt
    const totalAmount = subtotal + taxAmount;

    const prNumber = `PR-2026-${String(data.purchases.length + 1).padStart(3, '0')}`;
    const newTx: PurchaseTransaction = {
      id: 'pur-' + Math.random().toString(36).substring(2, 9),
      number: prNumber,
      date: new Date().toISOString().split('T')[0],
      supplierId: selectedSupplierId,
      status: PurchaseStatus.Requested,
      items: [{ itemId: selectedItemId, quantity: orderQty, unitPrice: orderPrice, total: subtotal }],
      subtotal,
      taxAmount,
      totalAmount,
      type: 'REQUEST'
    };

    onUpdatePurchases([newTx, ...data.purchases]);
    onAddAuditLog(
      `إنشاء طلب شراء خامات: ${prNumber}`,
      `Created Purchase Request: ${prNumber}`,
      `طلب شراء المواد الغذائية بقيمة إجمالية ${totalAmount} جنيه.`
    );

    setSelectedSupplierId('');
    setSelectedItemId('');
    setOrderQty(10);
    setOrderPrice(10);
    setShowAddPRForm(false);
  };

  // 3. COMPLETE ENTERPRISE WORKFLOW TRANSITIONS
  const handlePromotePurchase = (tx: PurchaseTransaction) => {
    const updatedPurchases = data.purchases.map(p => {
      if (p.id === tx.id) {
        
        // Transition A: PR requested -> Approved
        if (p.status === PurchaseStatus.Requested) {
          onAddAuditLog(
            `اعتماد طلب شراء: ${p.number}`,
            `Approved Purchase Request: ${p.number}`,
            `تم ترقية طلب الشراء واعتماده للمراسلة.`
          );
          return { ...p, status: PurchaseStatus.Approved };
        }

        // Transition B: Approved -> Ordered (PO Sent)
        if (p.status === PurchaseStatus.Approved) {
          const poNumber = p.number.replace('PR', 'PO');
          onAddAuditLog(
            `إرسال أمر شراء: ${poNumber}`,
            `Issued Purchase Order: ${poNumber}`,
            `تم إصدار أمر الشراء الرسمي وإرساله للمورد المعتمد.`
          );
          return { ...p, number: poNumber, status: PurchaseStatus.Ordered };
        }

        // Transition C: Ordered -> Received (GRN)
        // ** CRITICAL DYNAMIC EFFECT: INCREASES ACTUAL INVENTORY LEVEL! **
        if (p.status === PurchaseStatus.Ordered) {
          const grnNumber = p.number.replace('PO', 'GRN');
          
          // Dynamic increase in raw stock!
          const updatedInventory = data.inventory.map(item => {
            const purchaseLine = p.items.find(pi => pi.itemId === item.id);
            if (purchaseLine) {
              return {
                ...item,
                quantity: item.quantity + purchaseLine.quantity,
                // Proportional recalculation of weighted average cost
                cost: ((item.cost * item.quantity) + (purchaseLine.unitPrice * purchaseLine.quantity)) / (item.quantity + purchaseLine.quantity)
              };
            }
            return item;
          });
          onUpdateInventory(updatedInventory);

          onAddAuditLog(
            `استلام بضائع مخزنياً: ${grnNumber}`,
            `Goods Receipt: ${grnNumber}`,
            `استلام خامات الطعام والوزن بالمخازن ودخول البضاعة فعلياً للثلاجات.`
          );
          return { ...p, number: grnNumber, status: PurchaseStatus.Received };
        }

        // Transition D: Received -> Invoiced (AP Invoice)
        // ** CRITICAL DYNAMIC EFFECT: INCREASES SUPPLIER PAYABLE LIABILITY! **
        if (p.status === PurchaseStatus.Received) {
          const piNumber = p.number.replace('GRN', 'PI');

          // Dynamic increase supplier balance (Accounts Payable liability)
          const updatedSuppliers = data.suppliers.map(s => {
            if (s.id === p.supplierId) {
              return { ...s, balance: s.balance + p.totalAmount };
            }
            return s;
          });
          onUpdateSuppliers(updatedSuppliers);

          // Update Accounts Payable GL balance
          const updatedAccounts = data.accounts.map(acc => {
            if (acc.code === '2101001') { // Accounts Payable
              return { ...acc, balance: acc.balance + p.totalAmount };
            }
            if (acc.code === '1104001') { // Food Inventory
              return { ...acc, balance: acc.balance + p.subtotal };
            }
            if (acc.code === '2103001') { // VAT Payable
              return { ...acc, balance: acc.balance + p.taxAmount };
            }
            return acc;
          });
          onUpdateAccounts(updatedAccounts);

          onAddAuditLog(
            `إصدار فاتورة شراء آجل: ${piNumber}`,
            `AP Supplier Invoice: ${piNumber}`,
            `قيد مديونية للمورد بقيمة الفاتورة الإجمالية ${p.totalAmount} جنيه.`
          );
          return { ...p, number: piNumber, status: PurchaseStatus.Invoiced };
        }

        // Transition E: Invoiced -> Paid (Direct Cash/Bank PV)
        // ** CRITICAL DYNAMIC EFFECT: CASH DEDUCTIONS AND LIABILITY CLEARANCE! **
        if (p.status === PurchaseStatus.Invoiced) {
          const pvNumber = p.number.replace('PI', 'PV');

          // Subtract cash from Main Treasury (CB-1)
          const updatedTreasuries = data.treasuries.map(t => {
            if (t.id === 'cb-1') {
              return { ...t, balance: t.balance - p.totalAmount };
            }
            return t;
          });
          
          // Clear supplier payable
          const updatedSuppliers = data.suppliers.map(s => {
            if (s.id === p.supplierId) {
              return { ...s, balance: s.balance - p.totalAmount };
            }
            return s;
          });
          onUpdateSuppliers(updatedSuppliers);

          // Update general ledger accounts
          const updatedAccounts = data.accounts.map(acc => {
            if (acc.code === '101') { // Main Cash Box
              return { ...acc, balance: acc.balance - p.totalAmount };
            }
            if (acc.code === '2101001') { // Accounts Payable
              return { ...acc, balance: acc.balance - p.totalAmount };
            }
            return acc;
          });
          onUpdateAccounts(updatedAccounts);

          onAddMoneyTransaction({
            id: 'mt-' + Math.random().toString(36).substring(2, 9),
            number: pvNumber,
            date: new Date().toISOString().split('T')[0],
            type: 'PAYMENT',
            amount: p.totalAmount,
            sourceType: 'CASHBOX',
            sourceId: 'cb-1',
            destType: 'SUPPLIER',
            destId: p.supplierId,
            description: `سداد كامل الفاتورة المستحقة رقم ${p.number} نقداً`
          });

          onAddAuditLog(
            `سداد فاتورة المورد نقداً: ${pvNumber}`,
            `Settled Supplier Payable: ${pvNumber}`,
            `تم صرف مبلغ ${p.totalAmount} ج.م نقداً من الخزينة الرئيسية لتسوية الحساب.`
          );
          return { ...p, number: pvNumber, status: PurchaseStatus.Paid };
        }

      }
      return p;
    });

    onUpdatePurchases(updatedPurchases);
  };

  return (
    <div id="purchases_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      
      {/* Top bar controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'دورة المشتريات والمدفوعات والموردين' : 'Purchasing & Supply Chain Logistics'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'إدارة علاقات الموردين، رفع طلبات التوريد، ومتابعة استلام الخامات وتأثيرها اللحظي على جرد المخازن' : 'Manage supply networks, draft material requests, monitor inventories, and reconcile accounts payable'}
          </p>
        </div>

        {/* Tab Selector inside Purchases */}
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
          <button 
            onClick={() => setActiveSubTab('transactions')}
            className={`px-4 py-2 text-xs font-bold rounded-lg ${activeSubTab === 'transactions' ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'}`}
          >
            {isAr ? 'حركات وسندات الشراء' : 'Purchase Workflows'}
          </button>
          <button 
            onClick={() => setActiveSubTab('suppliers')}
            className={`px-4 py-2 text-xs font-bold rounded-lg ${activeSubTab === 'suppliers' ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'}`}
          >
            {isAr ? 'شبكة الموردين المسجلين' : 'Supplier Network'} ({data.suppliers.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'transactions' ? (
        <>
          {/* PURCHASING TRANSACTIONS ACTION ROW */}
          <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
              {isAr ? 'قائمة الفواتير وسندات الدورة التشغيلية' : 'Procurement Cycle Tracker'}
            </span>

            <button
              id="new_pr_toggle_btn"
              onClick={() => setShowAddPRForm(!showAddPRForm)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'إنشاء طلب توريد خامات جديد' : 'Raise Purchase Request'}</span>
            </button>
          </div>

          {/* DRAFT PR FORM PANEL */}
          {showAddPRForm && (
            <div id="add_pr_panel" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4">
                {isAr ? 'تفاصيل طلب التوريد والخامات المراد شراؤها' : 'Draft New Purchase Request (PR)'}
              </h3>

              <form onSubmit={handleCreatePR} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                {/* Supplier Select */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'المورد المراد الشراء منه' : 'Target Supplier'}</label>
                  <select
                    id="pr_supplier_select"
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                  >
                    <option value="">{isAr ? '-- اختر مورد من القائمة --' : '-- Choose Supplier --'}</option>
                    {data.suppliers.map(s => (
                      <option key={s.id} value={s.id}>{isAr ? s.nameAr : s.nameEn}</option>
                    ))}
                  </select>
                </div>

                {/* Raw Item Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'الخامة الغذائية المطلوبة' : 'Raw Ingredient'}</label>
                  <select
                    id="pr_item_select"
                    required
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                  >
                    <option value="">{isAr ? '-- اختر خامة --' : '-- Choose Raw --'}</option>
                    {data.inventory
                      .filter(i => i.category !== ItemCategory.FinishedProduct)
                      .map(i => (
                        <option key={i.id} value={i.id}>{isAr ? `${i.nameAr} (${i.unitAr})` : `${i.nameEn} (${i.unitEn})`}</option>
                      ))}
                  </select>
                </div>

                {/* Purchase Quantity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'الكمية المطلوبة' : 'Quantity Needed'}</label>
                  <input
                    id="pr_qty_input"
                    type="number"
                    required
                    min="1"
                    value={orderQty}
                    onChange={(e) => setOrderQty(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                  />
                </div>

                {/* Unit purchase price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'سعر الشراء المتوقع للوحدة' : 'Unit Contract Price'}</label>
                  <input
                    id="pr_price_input"
                    type="number"
                    required
                    min="0.1"
                    step="any"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="md:col-span-2 flex gap-3">
                  <button
                    id="pr_save_btn"
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs"
                  >
                    {isAr ? 'حفظ وإرسال الطلب للاعتماد' : 'Submit PR'}
                  </button>
                  <button
                    id="pr_cancel_btn"
                    type="button"
                    onClick={() => setShowAddPRForm(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ACTIVE TRANSACTIONS FLOW CARDS */}
          <div className="space-y-4">
            {data.purchases.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-950 rounded-2xl border">
                {isAr ? 'لا توجد حركات شراء مدخلة حالياً.' : 'No procurement documents recorded.'}
              </div>
            ) : (
              data.purchases.map((tx) => {
                const badge = getStatusBadge(tx.status);
                return (
                  <div 
                    key={tx.id} 
                    className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-xs transition-shadow"
                  >
                    
                    {/* Left: Metadata info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-extrabold text-blue-600 bg-blue-500/5 px-2.5 py-1 rounded border border-blue-500/10">
                          {tx.number}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.classes}`}>
                          {badge.text}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {isAr ? 'مستهدف التوريد من:' : 'Source Supplier:'} <span className="text-slate-900 dark:text-white">{getSupplierName(tx.supplierId)}</span>
                      </p>
                      <div className="text-[10px] text-slate-400 font-bold space-y-0.5">
                        <p>{isAr ? 'تاريخ السند:' : 'Value Date:'} {tx.date}</p>
                        {tx.items.map((it, idx) => (
                          <p key={idx}>
                            • {getInventoryItemName(it.itemId)} | {it.quantity} {isAr ? 'وحدات' : 'pcs'} x {it.unitPrice} ج.م = {it.total} ج.م
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Right: Balance and promoting controls */}
                    <div className="text-end space-y-3 shrink-0 w-full md:w-auto">
                      <div className="text-start md:text-end">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tight block">{isAr ? 'القيمة الشاملة للضريبة' : 'Value (inc. 14% VAT)'}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{tx.totalAmount.toFixed(2)} ج.م</span>
                      </div>

                      {/* Promoted control workflow button */}
                      {tx.status !== PurchaseStatus.Paid && (
                        <button
                          id={`promote_purchase_btn_${tx.id}`}
                          onClick={() => handlePromotePurchase(tx)}
                          className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-slate-900 dark:bg-slate-800 text-white hover:bg-blue-600 px-4 py-2 rounded-xl text-[11px] font-bold transition-all"
                        >
                          {tx.status === PurchaseStatus.Requested && (
                            <>
                              <FileCheck className="h-3.5 w-3.5" />
                              <span>{isAr ? 'موافقة واعتماد كـ أمر شراء (Promote to PO)' : 'Approve Request (PR ➔ PO)'}</span>
                            </>
                          )}
                          {tx.status === PurchaseStatus.Approved && (
                            <>
                              <Truck className="h-3.5 w-3.5" />
                              <span>{isAr ? 'إرسال أمر الشراء (PO Sent)' : 'Issue PO (PO ➔ Sent)'}</span>
                            </>
                          )}
                          {tx.status === PurchaseStatus.Ordered && (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>{isAr ? 'استلام بضائع المخزن (Goods Received)' : 'Receive Goods (PO ➔ Stock)'}</span>
                            </>
                          )}
                          {tx.status === PurchaseStatus.Received && (
                            <>
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>{isAr ? 'إصدار فاتورة شراء آجل (AP Invoice)' : 'Generate AP Invoice (GRN ➔ Invoice)'}</span>
                            </>
                          )}
                          {tx.status === PurchaseStatus.Invoiced && (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>{isAr ? 'سداد فاتورة نقداً (Pay Supplier)' : 'Settle Invoice (AP ➔ Paid)'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          {/* SUPPLIERS REGISTER SUB-TAB */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">
                {isAr ? 'جهات توريد خامات المطعم' : 'Supplier Address Book & Ledgers'}
              </span>

              <button
                id="new_supplier_toggle_btn"
                onClick={() => setShowAddSupplierForm(!showAddSupplierForm)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'تسجيل مورد جديد' : 'Register Supplier'}</span>
              </button>
            </div>

            {/* ADD SUPPLIER FORM DRAWER */}
            {showAddSupplierForm && (
              <form onSubmit={handleAddSupplier} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">{isAr ? 'اسم المورد بالعربية' : 'Supplier Arabic Name'}</label>
                  <input
                    id="new_sup_name_ar"
                    type="text"
                    required
                    value={supNameAr}
                    onChange={(e) => setSupNameAr(e.target.value)}
                    className="w-full text-xs font-semibold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">{isAr ? 'اسم المورد بالإنجليزية' : 'Supplier English Name'}</label>
                  <input
                    id="new_sup_name_en"
                    type="text"
                    required
                    value={supNameEn}
                    onChange={(e) => setSupNameEn(e.target.value)}
                    className="w-full text-xs font-semibold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">{isAr ? 'رقم الهاتف' : 'Contact Phone'}</label>
                  <input
                    id="new_sup_phone"
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full text-xs font-semibold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs">
                    {isAr ? 'حفظ' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setShowAddSupplierForm(false)} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold">
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}

            {/* SUPPLIERS TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse text-xs font-semibold" dir={isAr ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
                    <th className="py-3 px-4 text-start">{isAr ? 'كود المورد' : 'Supplier Code'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'الاسم التجاري للمؤسسة' : 'Trading Name'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'رقم الاتصال السريع' : 'Phone Contact'}</th>
                    <th className="py-3 px-4 text-end">{isAr ? 'حساب مديونية آجل (المستحق)' : 'Outstanding Payable Balance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {data.suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="py-3.5 px-4 text-start font-mono text-slate-500">{s.code}</td>
                      <td className="py-3.5 px-4 text-start text-slate-950 dark:text-white">{isAr ? s.nameAr : s.nameEn}</td>
                      <td className="py-3.5 px-4 text-start text-slate-500">{s.phone || '-'}</td>
                      <td className={`py-3.5 px-4 text-end font-mono font-bold text-sm ${s.balance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(s.balance)}
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
