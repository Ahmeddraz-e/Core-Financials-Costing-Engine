import React, { useState } from 'react';
import { ShoppingBag, Plus, Search, ChevronRight, FileCheck, Check, Truck, CreditCard, Users2, Save, Trash2, ShieldAlert, X, FileText } from 'lucide-react';
import { ERPData, PurchaseTransaction, PurchaseStatus, Supplier, InventoryItem, ItemCategory, TreasuryTransType } from '../types';
import { exportPurchaseTransactionsExcel, exportSuppliersExcel } from '../utils/excelExport';

interface PurchasesProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdatePurchases: (purchases: PurchaseTransaction[]) => void;
  onUpdateInventory: (items: InventoryItem[]) => void;
  onUpdateSuppliers: (suppliers: Supplier[]) => void;
  onUpdateAccounts: (accounts: any) => void;
  onAddMoneyTransaction: (tx: any) => void;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
  onUpdateERPState?: (updater: (prev: ERPData) => ERPData) => void;
}

export default function Purchases({ 
  data, 
  lang, 
  onUpdatePurchases, 
  onUpdateInventory, 
  onUpdateSuppliers,
  onUpdateAccounts,
  onAddMoneyTransaction,
  onAddAuditLog,
  onUpdateERPState
}: PurchasesProps) {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'transactions' | 'suppliers'>('transactions');
  const [showAddPRForm, setShowAddPRForm] = useState(false);
  const [showAddSupplierForm, setShowAddSupplierForm] = useState(false);

  // Custom alert & confirmation modal states
  const [alertModal, setAlertModal] = useState<{ show: boolean; title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }>({ show: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const [paymentModalTx, setPaymentModalTx] = useState<PurchaseTransaction | null>(null);
  const [paymentSourceId, setPaymentSourceId] = useState(data.treasuries[0]?.id || data.bankAccounts[0]?.id || '');

  const handleConfirmProcessPayment = () => {
    if (!paymentModalTx || !paymentSourceId) return;

    const tx = paymentModalTx;
    const isBank = data.bankAccounts.some(b => b.id === paymentSourceId);
    const selectedTreasury = data.treasuries.find(t => t.id === paymentSourceId);
    const selectedBank = data.bankAccounts.find(b => b.id === paymentSourceId);

    const sourceName = selectedTreasury 
      ? (isAr ? selectedTreasury.nameAr : selectedTreasury.nameEn)
      : selectedBank 
        ? (isAr ? selectedBank.bankNameAr : selectedBank.bankNameEn)
        : '';

    const sourceBalance = selectedTreasury ? selectedTreasury.balance : (selectedBank ? selectedBank.balance : 0);
    const targetAccountId = selectedTreasury ? selectedTreasury.accountId : (selectedBank ? selectedBank.accountId : '');

    if (sourceBalance < tx.totalAmount) {
      showAlert(
        isAr ? 'رصيد غير كافٍ' : 'Insufficient Funds',
        isAr 
          ? `⚠️ رصيد المصدر المختار (${sourceName}) غير كافٍ! الرصيد الحالي: ${sourceBalance.toLocaleString()} ج.م، القيمة المطلوبة: ${tx.totalAmount.toLocaleString()} ج.م.` 
          : `⚠️ Selected source (${sourceName}) has insufficient balance! Current: ${sourceBalance} EGP, Required: ${tx.totalAmount} EGP.`,
        'error'
      );
      return;
    }

    const pvNumber = tx.number.replace('PI', 'PV');

    // Deduct from Treasury or Bank
    const updatedTreasuries = data.treasuries.map(t => {
      if (t.id === paymentSourceId) {
        return { ...t, balance: t.balance - tx.totalAmount };
      }
      return t;
    });

    const updatedBankAccounts = data.bankAccounts.map(b => {
      if (b.id === paymentSourceId) {
        return { ...b, balance: b.balance - tx.totalAmount };
      }
      return b;
    });

    // Clear supplier payable
    const updatedSuppliers = data.suppliers.map(s => {
      if (s.id === tx.supplierId) {
        return { ...s, balance: Math.max(0, s.balance - tx.totalAmount) };
      }
      return s;
    });

    // Update GL Accounts
    const updatedAccounts = data.accounts.map(acc => {
      if (acc.id === targetAccountId) { // The selected Cashbox/Bank account
        return { ...acc, balance: acc.balance - tx.totalAmount };
      }
      if (acc.code === '2101001') { // Accounts Payable
        return { ...acc, balance: acc.balance - tx.totalAmount };
      }
      return acc;
    });

    const updatedPurchases = data.purchases.map(p => {
      if (p.id === tx.id) {
        return { ...p, number: pvNumber, status: PurchaseStatus.Paid };
      }
      return p;
    });

    // Money Transaction record
    const moneyTx = {
      id: 'mt-' + Math.random().toString(36).substring(2, 9),
      number: pvNumber,
      date: new Date().toISOString().split('T')[0],
      type: TreasuryTransType.Payment,
      amount: tx.totalAmount,
      sourceType: (selectedTreasury ? 'CASHBOX' : 'BANK') as 'CASHBOX' | 'BANK',
      sourceId: paymentSourceId,
      destType: 'SUPPLIER',
      destId: tx.supplierId,
      description: isAr 
        ? `سداد فاتورة المورد من ${sourceName} بقيمة ${tx.totalAmount} ج.م`
        : `Settled supplier invoice from ${sourceName} for ${tx.totalAmount} EGP`
    };

    // Balanced payment journal entry
    const paymentJV = {
      id: 'je-pv-' + Math.random().toString(36).substring(2, 9),
      entryNumber: `JV-${pvNumber}`,
      date: new Date().toISOString().split('T')[0],
      type: 'AUTO' as any,
      description: isAr 
        ? `سداد مديونية فاتورة المورد رقم ${tx.number} من حساب (${sourceName})`
        : `Payment of supplier invoice ${tx.number} from account (${sourceName})`,
      approved: true,
      approvedBy: 'مدير المشتريات المالي',
      lines: [
        { accountId: '201', debit: tx.totalAmount, credit: 0 }, // Accounts Payable
        { accountId: targetAccountId || '101', debit: 0, credit: tx.totalAmount } // selected source
      ]
    };

    if (onUpdateERPState) {
      onUpdateERPState(prev => ({
        ...prev,
        purchases: updatedPurchases,
        suppliers: updatedSuppliers,
        accounts: updatedAccounts,
        treasuries: updatedTreasuries,
        bankAccounts: updatedBankAccounts,
        moneyTransactions: [moneyTx, ...(prev.moneyTransactions || [])],
        journalEntries: [paymentJV, ...(prev.journalEntries || [])]
      }));
    } else {
      onUpdatePurchases(updatedPurchases);
      onUpdateSuppliers(updatedSuppliers);
      onUpdateAccounts(updatedAccounts);
      onAddMoneyTransaction(moneyTx);
    }

    onAddAuditLog(
      `سداد فاتورة المورد: ${pvNumber}`,
      `Settled Supplier Payable: ${pvNumber}`,
      `تم صرف مبلغ ${tx.totalAmount} ج.م من (${sourceName}) لتسوية مديونية المورد.`
    );

    showAlert(
      isAr ? 'تم السداد' : 'Payment Registered',
      isAr 
        ? `✅ تم سداد مبلغ ${tx.totalAmount.toLocaleString()} ج.م بنجاح من (${sourceName}).`
        : `✅ Successfully paid ${tx.totalAmount.toLocaleString()} EGP from (${sourceName}).`,
      'success'
    );

    setPaymentModalTx(null);
  };

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setAlertModal({ show: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  const handleDeleteSupplier = (id: string, name: string) => {
    showConfirm(
      isAr ? 'تأكيد حذف المورد' : 'Confirm Supplier Deletion',
      isAr ? `هل أنت متأكد من حذف المورد "${name}" نهائياً من سجلات النظام؟` : `Are you sure you want to permanently delete supplier "${name}"?`,
      () => {
        const updated = data.suppliers.filter(s => s.id !== id);
        onUpdateSuppliers(updated);
        onAddAuditLog(
          `حذف مورد: ${name}`,
          `Deleted Supplier: ${name}`,
          `تم حذف ملف المورد بالكامل من قاعدة البيانات.`
        );
        showAlert(
          isAr ? 'تم الحذف' : 'Deleted',
          isAr ? '👤 تم حذف المورد بنجاح!' : 'Supplier deleted successfully!',
          'success'
        );
      }
    );
  };

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
        return { text: isAr ? 'مسودة' : 'Draft', classes: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' };
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
      case PurchaseStatus.Returned:
        return { text: isAr ? 'مرتجع' : 'Returned', classes: 'bg-red-100 text-red-700' };
      default:
        return { text: status, classes: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' };
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
    const totalAmount = subtotal;

    const prNumber = `PR-2026-${String(data.purchases.length + 1).padStart(3, '0')}`;
    const newTx: PurchaseTransaction = {
      id: 'pur-' + Math.random().toString(36).substring(2, 9),
      number: prNumber,
      date: new Date().toISOString().split('T')[0],
      supplierId: selectedSupplierId,
      status: PurchaseStatus.Requested,
      items: [{ itemId: selectedItemId, quantity: orderQty, unitPrice: orderPrice, total: subtotal }],
      subtotal,
      taxAmount: 0,
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

          // Update Accounts Payable GL balance
          const updatedAccounts = data.accounts.map(acc => {
            if (acc.code === '2101001') { // Accounts Payable
              return { ...acc, balance: acc.balance + p.totalAmount };
            }
            if (acc.code === '1104001') { // Food Inventory
              return { ...acc, balance: acc.balance + p.subtotal };
            }
            return acc;
          });

          const supplier = data.suppliers.find(s => s.id === p.supplierId);
          const supplierName = supplier ? (isAr ? supplier.nameAr : supplier.nameEn) : '';
          const invoiceJV = {
            id: 'je-pi-' + Math.random().toString(36).substring(2, 9),
            entryNumber: `JV-${piNumber}`,
            date: new Date().toISOString().split('T')[0],
            type: 'AUTO' as any,
            description: isAr 
              ? `إثبات فاتورة شراء آجل رقم ${piNumber} من المورد ${supplierName}`
              : `AP Purchase Invoice ${piNumber} from supplier ${supplierName}`,
            approved: true,
            approvedBy: 'مدير المشتريات المالي',
            lines: [
              { accountId: '104', debit: p.subtotal, credit: 0 }, // F&B Inventory
              { accountId: '201', debit: 0, credit: p.totalAmount } // Accounts Payable
            ].filter(l => l.debit > 0 || l.credit > 0)
          };

          const nextPurchases = data.purchases.map(curr => curr.id === p.id ? { ...curr, number: piNumber, status: PurchaseStatus.Invoiced } : curr);

          if (onUpdateERPState) {
            onUpdateERPState(prev => ({
              ...prev,
              purchases: nextPurchases,
              suppliers: updatedSuppliers,
              accounts: updatedAccounts,
              journalEntries: [invoiceJV, ...(prev.journalEntries || [])]
            }));
          } else {
            onUpdatePurchases(nextPurchases);
            onUpdateSuppliers(updatedSuppliers);
            onUpdateAccounts(updatedAccounts);
          }

          onAddAuditLog(
            `إصدار فاتورة شراء آجل: ${piNumber}`,
            `AP Supplier Invoice: ${piNumber}`,
            `قيد مديونية للمورد بقيمة الفاتورة الإجمالية ${p.totalAmount} جنيه.`
          );
          return { ...p, number: piNumber, status: PurchaseStatus.Invoiced };
        }

        // Transition E: Invoiced -> Paid (Direct Cash/Bank PV)
        // Opens select source payment modal
        if (p.status === PurchaseStatus.Invoiced) {
          setPaymentModalTx(p);
          return p;
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

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const purchases = (data.purchases || []).map(p => ({
                    number: p.number,
                    date: p.date,
                    supplierName: (() => {
                      const s = data.suppliers.find(sp => sp.id === p.supplierId);
                      return s ? (isAr ? s.nameAr : s.nameEn) : '---';
                    })(),
                    status: (() => {
                      const m: Record<string, string> = {
                        DRAFT: isAr ? 'مسودة' : 'Draft',
                        REQUESTED: isAr ? 'طلب قيد الاعتماد' : 'PR Pending',
                        APPROVED: isAr ? 'معتمد للطلب' : 'PR Approved',
                        ORDERED: isAr ? 'أمر شراء' : 'PO Sent',
                        RECEIVED: isAr ? 'تم الاستلام' : 'Received',
                        INVOICED: isAr ? 'فاتورة' : 'Invoiced',
                        PAID: isAr ? 'تم السداد' : 'Paid',
                        RETURNED: isAr ? 'مرتجع' : 'Returned',
                      };
                      return m[p.status] || p.status;
                    })(),
                    itemsSummary: p.items.map(it => {
                      const item = data.inventory.find(i => i.id === it.itemId);
                      const name = item ? (isAr ? item.nameAr : item.nameEn) : '---';
                      return `${name} (${it.quantity} x ${it.unitPrice})`;
                    }).join('; '),
                    subtotal: p.subtotal,
                    taxAmount: p.taxAmount,
                    totalAmount: p.totalAmount,
                    type: p.type,
                  }));
                  await exportPurchaseTransactionsExcel(purchases, isAr ? 'ar' : 'en');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <span>{isAr ? 'تصدير إلى Excel' : 'Export to Excel'}</span>
              </button>
              <button
                id="new_pr_toggle_btn"
                onClick={() => setShowAddPRForm(!showAddPRForm)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'إنشاء طلب توريد خامات جديد' : 'Raise Purchase Request'}</span>
              </button>
            </div>
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
                          <p key={it.itemId}>
                            • {getInventoryItemName(it.itemId)} | {it.quantity} {isAr ? 'وحدات' : 'pcs'} x {it.unitPrice} ج.م = {it.total} ج.م
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Right: Balance and promoting controls */}
                    <div className="text-end space-y-3 shrink-0 w-full md:w-auto">
                      <div className="text-start md:text-end">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tight block">{isAr ? 'الإجمالي' : 'Total Value'}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{tx.totalAmount.toFixed(2)} ج.م</span>
                      </div>

                      {/* Promoted control workflow button */}
                      {tx.status !== PurchaseStatus.Paid && tx.status !== PurchaseStatus.Returned && (
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

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const suppliers = (data.suppliers || []).map(s => ({
                      code: s.code,
                      name: isAr ? s.nameAr : s.nameEn,
                      phone: s.phone,
                      balance: s.balance,
                    }));
                    await exportSuppliersExcel(suppliers, isAr ? 'ar' : 'en');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  <span>{isAr ? 'تصدير إلى Excel' : 'Export to Excel'}</span>
                </button>
                <button
                  id="new_supplier_toggle_btn"
                  onClick={() => setShowAddSupplierForm(!showAddSupplierForm)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isAr ? 'تسجيل مورد جديد' : 'Register Supplier'}</span>
                </button>
              </div>
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
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {data.suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="py-3.5 px-4 text-start font-mono text-slate-500">{s.code}</td>
                      <td className="py-3.5 px-4 text-start text-slate-950 dark:text-white">{isAr ? s.nameAr : s.nameEn}</td>
                      <td className="py-3.5 px-4 text-start text-slate-500">{s.phone || '-'}</td>
                      <td className={`py-3.5 px-4 text-end font-mono font-bold text-sm ${s.balance > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                        {isAr ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(s.balance)} ج.م` : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(s.balance)} EGP`}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteSupplier(s.id, s.nameAr)}
                          className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 cursor-pointer"
                          title={isAr ? 'حذف المورد' : 'Delete Supplier'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Custom Styled React Alert Modal */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-3xl shadow-2xl w-full max-w-sm text-start overflow-hidden flex flex-col text-xs font-semibold">
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
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 flex justify-end shrink-0">
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
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-3xl shadow-2xl w-full max-w-sm text-start overflow-hidden flex flex-col text-xs font-semibold">
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
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-2 shrink-0">
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

      {/* Payment Selection Modal */}
      {paymentModalTx && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-3xl shadow-2xl w-full max-w-sm text-start overflow-hidden flex flex-col text-xs font-semibold">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-855 flex justify-between items-center shrink-0">
              <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {isAr ? 'سداد فاتورة المشتريات' : 'Pay Supplier Invoice'}
              </span>
              <button onClick={() => setPaymentModalTx(null)} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="text-slate-500 font-bold mb-1">{isAr ? 'رقم الفاتورة:' : 'Invoice No:'}</p>
                <p className="text-sm font-black text-blue-600">{paymentModalTx.number}</p>
              </div>

              <div>
                <p className="text-slate-500 font-bold mb-1">{isAr ? 'المورد:' : 'Supplier:'}</p>
                <p className="text-sm font-black text-slate-800 dark:text-slate-200">{getSupplierName(paymentModalTx.supplierId)}</p>
              </div>

              <div>
                <p className="text-slate-500 font-bold mb-1">{isAr ? 'المبلغ المطلوب سداده:' : 'Amount Due:'}</p>
                <p className="text-base font-black text-slate-900 dark:text-white font-mono">{paymentModalTx.totalAmount.toLocaleString()} ج.م</p>
              </div>

              <div className="border-t pt-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'اختر حساب السداد (خزينة أو بنك):' : 'Select Payment Source (Treasury/Bank):'}
                </label>
                <select
                  value={paymentSourceId}
                  onChange={(e) => setPaymentSourceId(e.target.value)}
                  className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white"
                >
                  <optgroup label={isAr ? '💵 الخزن النقدية' : '💵 Cash Treasuries'}>
                    {data.treasuries.map(t => (
                      <option key={t.id} value={t.id}>
                        {isAr ? t.nameAr : t.nameEn} ({t.balance.toLocaleString()} ج.م)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={isAr ? '💳 الحسابات البنكية' : '💳 Bank Accounts'}>
                    {data.bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>
                        {isAr ? b.bankNameAr : b.bankNameEn} ({b.balance.toLocaleString()} ج.م)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-855 flex justify-end gap-2 shrink-0">
              <button 
                onClick={() => setPaymentModalTx(null)} 
                className="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                onClick={handleConfirmProcessPayment} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-xl cursor-pointer"
              >
                {isAr ? 'تأكيد ودفع' : 'Confirm & Pay'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
