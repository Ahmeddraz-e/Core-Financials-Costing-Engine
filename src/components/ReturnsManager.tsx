import React, { useState } from 'react';
import { RotateCcw, Plus, Search, Printer, Download, ArrowLeftRight, CreditCard, ShoppingCart } from 'lucide-react';
import { ERPData, SalesReturn, PurchaseReturn, JournalEntry, JournalEntryType } from '../types';
import { printDocument, fmtCurrency, fmtDate, numberToArabicWords, companyHeaderHTML, signaturesHTML, footerHTML, exportToCSV } from '../utils/printUtils';

interface ReturnsManagerProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdateSalesReturns: (sr: SalesReturn[]) => void;
  onUpdatePurchaseReturns: (pr: PurchaseReturn[]) => void;
  onUpdateAccounts: (a: any[]) => void;
  onUpdateEntries: (je: JournalEntry[]) => void;
  onUpdateCustomers: (c: any[]) => void;
  onUpdateSuppliers: (s: any[]) => void;
  onUpdateTreasuries: (t: any[]) => void;
  onUpdateInventory: (i: any[]) => void;
  onAddAuditLog: (ar: string, en: string, d: string) => void;
}

export default function ReturnsManager({
  data, lang,
  onUpdateSalesReturns, onUpdatePurchaseReturns, onUpdateAccounts,
  onUpdateEntries, onUpdateCustomers, onUpdateSuppliers, onUpdateTreasuries, onUpdateInventory, onAddAuditLog
}: ReturnsManagerProps) {
  const isAr = lang === 'ar';
  
  const [activeTab, setActiveTab] = useState<'SALES' | 'PURCHASE'>('SALES');
  const [activeView, setActiveView] = useState<'list' | 'new'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [partyId, setPartyId] = useState('');
  const [originalInvoice, setOriginalInvoice] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'CREDIT'>('CREDIT');
  
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(val);

  const getPartyName = (id: string, type: 'SALES' | 'PURCHASE') => {
    if (type === 'SALES') {
      const c = data.customers.find(c => c.id === id);
      return c ? (isAr ? c.nameAr : c.nameEn) : (isAr ? 'عميل نقدي' : 'Cash Customer');
    } else {
      const s = data.suppliers.find(s => s.id === id);
      return s ? (isAr ? s.nameAr : s.nameEn) : (isAr ? 'مورد نقدي' : 'Cash Supplier');
    }
  };

  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      window.showAlert('المبلغ يجب أن يكون أكبر من صفر', 'Amount must be greater than zero', 'warning');
      return;
    }

    const isSales = activeTab === 'SALES';
    const totalAmount = amount + taxAmount;
    
    // JE Logic
    const jeId = 'je-ret-' + Math.random().toString(36).substring(2, 9);
    const jeLines: any[] = [];
    
    if (isSales) {
      // Sales Return (Credit Note to Customer)
      // Dr: Sales Returns (412) - amount
      // Dr: VAT (203) - taxAmount
      // Cr: Accounts Receivable (103) OR Cash (101) - totalAmount
      jeLines.push({ accountId: '412', debit: amount, credit: 0 }); // Assuming 412 is Sales Returns
      if (taxAmount > 0) jeLines.push({ accountId: '203', debit: taxAmount, credit: 0 });
      
      if (refundMethod === 'CASH') {
        jeLines.push({ accountId: '101', debit: 0, credit: totalAmount });
        onUpdateTreasuries(data.treasuries.map(t => t.id === 'cb-1' ? { ...t, balance: t.balance - totalAmount } : t));
      } else {
        jeLines.push({ accountId: '103', debit: 0, credit: totalAmount });
        if (partyId) {
          onUpdateCustomers(data.customers.map(c => c.id === partyId ? { ...c, balance: c.balance - totalAmount } : c));
        }
      }
      
      const newReturn: SalesReturn = {
        id: 'sr-' + Math.random().toString(36).substring(2, 9),
        returnNumber: `SR-${new Date().getFullYear()}-${String((data.salesReturns || []).length + 1).padStart(4, '0')}`,
        date: returnDate,
        originalInvoiceId: originalInvoice || '-',
        customerId: partyId,
        items: [], // Simplified for now
        subtotal: amount,
        taxAmount,
        totalAmount,
        reason,
        journalEntryId: jeId
      };
      onUpdateSalesReturns([newReturn, ...(data.salesReturns || [])]);

    } else {
      // Purchase Return (Debit Note to Supplier)
      // Dr: Accounts Payable (201) OR Cash (101) - totalAmount
      // Cr: Purchase Returns (512) - amount
      // Cr: VAT (203) - taxAmount
      if (refundMethod === 'CASH') {
        jeLines.push({ accountId: '101', debit: totalAmount, credit: 0 });
        onUpdateTreasuries(data.treasuries.map(t => t.id === 'cb-1' ? { ...t, balance: t.balance + totalAmount } : t));
      } else {
        jeLines.push({ accountId: '201', debit: totalAmount, credit: 0 });
        if (partyId) {
          onUpdateSuppliers(data.suppliers.map(s => s.id === partyId ? { ...s, balance: s.balance - totalAmount } : s));
        }
      }
      
      jeLines.push({ accountId: '512', debit: 0, credit: amount }); // Assuming 512 is Purchase Returns
      if (taxAmount > 0) jeLines.push({ accountId: '203', debit: 0, credit: taxAmount });

      const newReturn: PurchaseReturn = {
        id: 'pr-' + Math.random().toString(36).substring(2, 9),
        returnNumber: `PR-${new Date().getFullYear()}-${String((data.purchaseReturns || []).length + 1).padStart(4, '0')}`,
        date: returnDate,
        originalPurchaseId: originalInvoice || '-',
        supplierId: partyId,
        items: [], // Simplified for now
        subtotal: amount,
        taxAmount,
        totalAmount,
        reason,
        journalEntryId: jeId
      };
      onUpdatePurchaseReturns([newReturn, ...(data.purchaseReturns || [])]);
    }

    const newJE: JournalEntry = {
      id: jeId,
      entryNumber: `JV-RET-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}`,
      date: returnDate,
      type: JournalEntryType.Auto,
      description: isAr ? `قيد ${isSales ? 'مرتجع مبيعات' : 'مرتجع مشتريات'} للفاتورة: ${originalInvoice || 'بدون مرجع'}` : `Return JE for Invoice: ${originalInvoice || '-'}`,
      lines: jeLines,
      approved: true,
      approvedBy: 'النظام'
    };

    // Update Accounts
    const updatedAccounts = data.accounts.map(acc => {
      // Find matches in jeLines
      const line = jeLines.find(l => l.accountId === acc.id);
      if (line) {
        return { ...acc, balance: acc.balance + (line.debit - line.credit) }; // Very simplified, relies on normal balances
      }
      return acc;
    });

    onUpdateEntries([newJE, ...data.journalEntries]);
    onUpdateAccounts(updatedAccounts); // This is risky due to normal balances. Better to apply specific logic.
    
    // Actually, let's fix Account Update to be robust based on ID
    const safeAccountsUpdate = data.accounts.map(acc => {
      if (isSales) {
        if (acc.id === '412') return { ...acc, balance: acc.balance + amount };
        if (acc.id === '203') return { ...acc, balance: acc.balance + taxAmount };
        if (acc.id === '101' && refundMethod === 'CASH') return { ...acc, balance: acc.balance - totalAmount };
        if (acc.id === '103' && refundMethod === 'CREDIT') return { ...acc, balance: acc.balance - totalAmount };
      } else {
        if (acc.id === '101' && refundMethod === 'CASH') return { ...acc, balance: acc.balance + totalAmount };
        if (acc.id === '201' && refundMethod === 'CREDIT') return { ...acc, balance: acc.balance - totalAmount };
        if (acc.id === '512') return { ...acc, balance: acc.balance + amount };
        if (acc.id === '203') return { ...acc, balance: acc.balance - taxAmount };
      }
      return acc;
    });
    onUpdateAccounts(safeAccountsUpdate);

    onAddAuditLog(
      `إصدار مرتجع ${isSales ? 'مبيعات' : 'مشتريات'} بقيمة ${totalAmount}`,
      `Issued ${isSales ? 'Sales' : 'Purchase'} Return of ${totalAmount}`,
      `سبب المرتجع: ${reason}`
    );

    setActiveView('list');
    setPartyId(''); setOriginalInvoice(''); setAmount(0); setTaxAmount(0); setReason('');
    window.showAlert('تم إنشاء المرتجع بنجاح', 'Return created successfully', 'success');
  };

  const handlePrint = (ret: any, type: 'SALES' | 'PURCHASE') => {
    const isSales = type === 'SALES';
    const title = isSales ? (isAr ? 'إشعار دائن (مرتجع مبيعات)' : 'Credit Note (Sales Return)') : (isAr ? 'إشعار مدين (مرتجع مشتريات)' : 'Debit Note (Purchase Return)');
    const partyLabel = isSales ? (isAr ? 'العميل' : 'Customer') : (isAr ? 'المورد' : 'Supplier');
    
    const html = `
      <div class="print-page">
        ${companyHeaderHTML()}
        <div class="doc-title" style="background:#fef2f2; border-color:#fca5a5">
          <h2 style="color:#dc2626">${title}</h2>
          <div class="doc-number">${ret.returnNumber}</div>
        </div>

        <div class="info-grid">
          <div class="info-box"><div class="label">${isAr ? 'التاريخ' : 'Date'}</div><div class="value">${fmtDate(ret.date, lang)}</div></div>
          <div class="info-box"><div class="label">${partyLabel}</div><div class="value">${getPartyName(isSales ? ret.customerId : ret.supplierId, type)}</div></div>
          <div class="info-box"><div class="label">${isAr ? 'الفاتورة الأصلية' : 'Original Invoice'}</div><div class="value">${ret.originalInvoiceId}</div></div>
          <div class="info-box"><div class="label">${isAr ? 'سبب الاسترجاع' : 'Return Reason'}</div><div class="value">${ret.reason || '-'}</div></div>
        </div>

        <div style="margin-top:20px; border:1px solid #e2e8f0; border-radius:8px; padding:15px;">
          <table style="width:100%; border:none;">
            <tr><td style="padding:5px; border:none;">${isAr ? 'المبلغ الفرعي:' : 'Subtotal:'}</td><td style="text-align:left; font-weight:bold; border:none;">${fmtCurrency(ret.subtotal, lang)}</td></tr>
            <tr><td style="padding:5px; border:none;">${isAr ? 'ضريبة القيمة المضافة:' : 'VAT:'}</td><td style="text-align:left; font-weight:bold; border:none;">${fmtCurrency(ret.taxAmount, lang)}</td></tr>
            <tr style="font-size:18px; border-top:2px solid #cbd5e1;"><td style="padding:10px 5px; border:none; font-weight:900;">${isAr ? 'الإجمالي:' : 'Total:'}</td><td style="text-align:left; font-weight:900; color:#dc2626; border:none;">${fmtCurrency(ret.totalAmount, lang)}</td></tr>
          </table>
        </div>
        
        <div class="amount-words">
          ${isAr ? 'المبلغ كتابةً:' : 'Amount in words:'} ${numberToArabicWords(ret.totalAmount)}
        </div>

        ${signaturesHTML([
          isAr ? 'أمين المخزن' : 'Storekeeper',
          isAr ? 'المحاسب' : 'Accountant',
          isAr ? 'المدير المالي' : 'Finance Manager'
        ])}

        ${footerHTML()}
      </div>
    `;
    printDocument(html, `${title} - ${ret.returnNumber}`);
  };

  const getList = () => {
    const list = activeTab === 'SALES' ? (data.salesReturns || []) : (data.purchaseReturns || []);
    return list.filter((r: any) => 
      r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.originalInvoiceId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'إدارة المرتجعات والإشعارات' : 'Returns & Notes Management'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'تسجيل وطباعة مرتجعات المبيعات (إشعار دائن) ومرتجعات المشتريات (إشعار مدين)' : 'Record and print Sales Returns (Credit Notes) and Purchase Returns (Debit Notes)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeView === 'list' ? (
            <button onClick={() => setActiveView('new')}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-1.5 shadow-lg">
              <Plus className="h-3.5 w-3.5" />
              {isAr ? 'تسجيل مرتجع جديد' : 'New Return'}
            </button>
          ) : (
            <button onClick={() => setActiveView('list')}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {isAr ? 'رجوع للقائمة' : 'Back to List'}
            </button>
          )}
        </div>
      </div>

      {activeView === 'list' && (
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 w-fit mb-4">
          <button onClick={() => setActiveTab('SALES')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'SALES' ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-400 shadow-xs' : 'text-slate-500'}`}>
            <ShoppingCart className="h-3.5 w-3.5" />
            {isAr ? 'مرتجعات المبيعات' : 'Sales Returns'}
          </button>
          <button onClick={() => setActiveTab('PURCHASE')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'PURCHASE' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-xs' : 'text-slate-500'}`}>
            <ShoppingCart className="h-3.5 w-3.5" />
            {isAr ? 'مرتجعات المشتريات' : 'Purchase Returns'}
          </button>
        </div>
      )}

      {activeView === 'new' && (
        <form onSubmit={handleCreateReturn} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'تسجيل مرتجع جديد' : 'Record New Return'}</span>
            <select value={activeTab} onChange={e => setActiveTab(e.target.value as any)}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none outline-none">
              <option value="SALES">{isAr ? 'مرتجع مبيعات (إشعار دائن)' : 'Sales Return (Credit Note)'}</option>
              <option value="PURCHASE">{isAr ? 'مرتجع مشتريات (إشعار مدين)' : 'Purchase Return (Debit Note)'}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'التاريخ' : 'Date'}</label>
              <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{activeTab === 'SALES' ? (isAr ? 'العميل' : 'Customer') : (isAr ? 'المورد' : 'Supplier')}</label>
              {activeTab === 'SALES' ? (
                <select value={partyId} onChange={e => setPartyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                  <option value="">{isAr ? '— عميل نقدي —' : '— Cash Customer —'}</option>
                  {data.customers.map(c => <option key={c.id} value={c.id}>{isAr ? c.nameAr : c.nameEn}</option>)}
                </select>
              ) : (
                <select value={partyId} onChange={e => setPartyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                  <option value="">{isAr ? '— مورد نقدي —' : '— Cash Supplier —'}</option>
                  {data.suppliers.map(s => <option key={s.id} value={s.id}>{isAr ? s.nameAr : s.nameEn}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'رقم الفاتورة الأصلية' : 'Original Invoice #'}</label>
              <input type="text" value={originalInvoice} onChange={e => setOriginalInvoice(e.target.value)} placeholder="INV-..."
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'طريقة التسوية' : 'Settlement Method'}</label>
              <select value={refundMethod} onChange={e => setRefundMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                <option value="CREDIT">{isAr ? 'تسوية من الرصيد (آجل)' : 'Credit to Balance'}</option>
                <option value="CASH">{isAr ? 'دفع/استرداد نقدي' : 'Cash Refund'}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'المبلغ الفرعي' : 'Subtotal Amount'}</label>
              <input type="number" min={0} step={0.5} value={amount} onChange={e => setAmount(+e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'مبلغ الضريبة' : 'VAT Amount'}</label>
              <input type="number" min={0} step={0.5} value={taxAmount} onChange={e => setTaxAmount(+e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'سبب الاسترجاع' : 'Reason'}</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          </div>

          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex justify-between items-center text-sm">
            <span className="font-bold text-red-800 dark:text-red-400">{isAr ? 'الإجمالي النهائي:' : 'Grand Total:'}</span>
            <span className="font-black text-red-600 dark:text-red-500">{formatCurrency(amount + taxAmount)}</span>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="submit" className="px-5 py-2.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-lg">
              {isAr ? 'اعتماد المرتجع' : 'Confirm Return'}
            </button>
          </div>
        </form>
      )}

      {activeView === 'list' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder={isAr ? 'بحث...' : 'Search...'}
                className="w-full pr-9 pl-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          </div>

          {getList().length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold">
              {isAr ? 'لا توجد مرتجعات في هذا القسم' : 'No returns found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'رقم المرتجع' : 'Return #'}</th>
                    <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="text-right px-4 py-3 font-bold text-slate-500">{activeTab === 'SALES' ? (isAr ? 'العميل' : 'Customer') : (isAr ? 'المورد' : 'Supplier')}</th>
                    <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'الفاتورة الأصلية' : 'Orig. Invoice'}</th>
                    <th className="text-left px-4 py-3 font-bold text-slate-500">{isAr ? 'الإجمالي' : 'Total'}</th>
                    <th className="text-center px-4 py-3 font-bold text-slate-500">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {getList().map((ret: any) => (
                    <tr key={ret.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-black text-red-600 dark:text-red-500">{ret.returnNumber}</td>
                      <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">{ret.date}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{getPartyName(activeTab === 'SALES' ? ret.customerId : ret.supplierId, activeTab)}</td>
                      <td className="px-4 py-3 font-bold text-slate-500">{ret.originalInvoiceId}</td>
                      <td className="px-4 py-3 font-black text-slate-900 dark:text-white text-left">{formatCurrency(ret.totalAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handlePrint(ret, activeTab)} title={isAr ? 'طباعة إشعار' : 'Print Note'}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
