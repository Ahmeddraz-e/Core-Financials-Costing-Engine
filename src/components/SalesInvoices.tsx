import React, { useState } from 'react';
import { FileText, Plus, Search, Printer, Eye, Check, X, Download, CreditCard, DollarSign } from 'lucide-react';
import { ERPData, SalesInvoice, SalesInvoiceItem, InvoiceStatus, Customer, Account, JournalEntry, JournalEntryType, AccountType, Voucher, VoucherType, InventoryItem } from '../types';
import { printDocument, fmtCurrency, fmtDate, numberToArabicWords, companyHeaderHTML, signaturesHTML, footerHTML, exportToCSV } from '../utils/printUtils';

interface SalesInvoicesProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdateSalesInvoices: (invoices: SalesInvoice[]) => void;
  onUpdateInventory: (items: InventoryItem[]) => void;
  onUpdateAccounts: (accounts: Account[]) => void;
  onUpdateEntries: (entries: JournalEntry[]) => void;
  onUpdateCustomers: (customers: Customer[]) => void;
  onUpdateTreasuries: (treasuries: any[]) => void;
  onUpdateVouchers: (vouchers: Voucher[]) => void;
  onAddAuditLog: (ar: string, en: string, d: string) => void;
}

export default function SalesInvoicesModule({
  data, lang,
  onUpdateSalesInvoices, onUpdateInventory, onUpdateAccounts, onUpdateEntries,
  onUpdateCustomers, onUpdateTreasuries, onUpdateVouchers, onAddAuditLog
}: SalesInvoicesProps) {
  const isAr = lang === 'ar';
  const [activeView, setActiveView] = useState<'list' | 'new'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SalesInvoiceItem[]>([]);
  const [newItemId, setNewItemId] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemDiscount, setNewItemDiscount] = useState(0);

  const TAX_RATE = 0.14;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(val);

  const getCustomerName = (id: string) => {
    const c = data.customers.find(c => c.id === id);
    return c ? (isAr ? c.nameAr : c.nameEn) : '';
  };

  const getNextInvoiceNumber = () => {
    const existing = data.salesInvoices || [];
    const num = existing.length + 1;
    return `INV-${new Date().getFullYear()}-${String(num).padStart(4, '0')}`;
  };

  // Add item to current invoice
  const handleAddItem = () => {
    if (!newItemId || newItemQty <= 0) return;
    const inv = data.inventory.find(i => i.id === newItemId);
    if (!inv) return;

    const price = newItemPrice > 0 ? newItemPrice : inv.cost * 1.5; // Default markup
    const total = (newItemQty * price) - newItemDiscount;

    setItems([...items, {
      itemId: inv.id,
      nameAr: inv.nameAr,
      nameEn: inv.nameEn,
      unitAr: inv.unitAr,
      unitEn: inv.unitEn,
      quantity: newItemQty,
      unitPrice: price,
      discount: newItemDiscount,
      total
    }]);

    setNewItemId('');
    setNewItemQty(1);
    setNewItemPrice(0);
    setNewItemDiscount(0);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  // Calculate totals
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const discountTotal = items.reduce((s, i) => s + i.discount, 0);
  const taxAmount = subtotal * TAX_RATE;
  const totalAmount = subtotal + taxAmount;

  // Create and save invoice
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      window.showAlert('يجب إضافة صنف واحد على الأقل', 'Add at least one item', 'warning');
      return;
    }

    // 1. Verify stock levels
    let hasStockIssue = false;
    let missingItemName = '';
    
    for (const item of items) {
      const invItem = data.inventory.find(i => i.id === item.itemId);
      if (invItem && invItem.quantity < item.quantity) {
        hasStockIssue = true;
        missingItemName = isAr 
          ? `${invItem.nameAr} (المتوفر في المخزن: ${invItem.quantity} ${invItem.unitAr})` 
          : `${invItem.nameEn} (Available in stock: ${invItem.quantity} ${invItem.unitEn})`;
        break;
      }
    }
    
    if (hasStockIssue) {
      window.showAlert(
        `خطأ في المستودع: الكمية المطلوبة من صنف (${missingItemName}) غير كافية لإتمام البيع!`,
        `Stock Error: Insufficient quantity for item (${missingItemName}) in inventory to complete sale!`,
        'danger'
      );
      return;
    }

    const invoiceNumber = getNextInvoiceNumber();
    const isCash = paymentMethod === 'CASH';

    const newInvoice: SalesInvoice = {
      id: 'sinv-' + Math.random().toString(36).substring(2, 9),
      invoiceNumber,
      date: invoiceDate,
      dueDate: dueDate || invoiceDate,
      customerId,
      items,
      subtotal,
      discountTotal,
      taxRate: TAX_RATE,
      taxAmount,
      totalAmount,
      paidAmount: isCash ? totalAmount : 0,
      status: isCash ? InvoiceStatus.Paid : InvoiceStatus.Issued,
      paymentMethod,
      notes
    };

    // 2. Deduct quantities from inventory
    const updatedInventory = data.inventory.map(i => {
      const soldItem = items.find(item => item.itemId === i.id);
      if (soldItem) {
        return { ...i, quantity: i.quantity - soldItem.quantity };
      }
      return i;
    });

    // 3. Calculate Cost of Goods Sold (COGS) and mapping to accounts
    let cogs501 = 0; // Cost of Food Used (F&B / Finished Plates)
    let cogs502 = 0; // Cost of Beverages Used (Beverage)
    let cogs503 = 0; // Cost of Packaging Used (Packaging)
    
    let inv104Credit = 0; // F&B Inventory credit (Asset)
    let inv105Credit = 0; // Packaging Inventory credit (Asset)
    
    for (const item of items) {
      const invItem = data.inventory.find(i => i.id === item.itemId);
      if (invItem) {
        const itemCogs = invItem.cost * item.quantity;
        if (invItem.category === 'BEVERAGE') {
          cogs502 += itemCogs;
          inv104Credit += itemCogs;
        } else if (invItem.category === 'PACKAGING') {
          cogs503 += itemCogs;
          inv105Credit += itemCogs;
        } else {
          cogs501 += itemCogs;
          inv104Credit += itemCogs;
        }
      }
    }

    // 4. Create journal entry
    const jeId = 'je-inv-' + Math.random().toString(36).substring(2, 9);
    const jeLines: any[] = [];

    if (isCash) {
      // Dr: Cash (101)  Cr: Revenue (411) + VAT (203)
      jeLines.push({ accountId: '101', debit: totalAmount, credit: 0 });
    } else {
      // Dr: Receivables (103)  Cr: Revenue + VAT
      jeLines.push({ accountId: '103', debit: totalAmount, credit: 0 });
    }
    jeLines.push({ accountId: '411', debit: 0, credit: subtotal });
    if (taxAmount > 0) {
      jeLines.push({ accountId: '203', debit: 0, credit: taxAmount });
    }

    // Add COGS double entry lines to the JV
    if (cogs501 > 0) {
      jeLines.push({ accountId: '501', debit: cogs501, credit: 0 });
    }
    if (cogs502 > 0) {
      jeLines.push({ accountId: '502', debit: cogs502, credit: 0 });
    }
    if (cogs503 > 0) {
      jeLines.push({ accountId: '503', debit: cogs503, credit: 0 });
    }
    if (inv104Credit > 0) {
      jeLines.push({ accountId: '104', debit: 0, credit: inv104Credit });
    }
    if (inv105Credit > 0) {
      jeLines.push({ accountId: '105', debit: 0, credit: inv105Credit });
    }

    const newJE: JournalEntry = {
      id: jeId,
      entryNumber: `JV-INV-${invoiceNumber}`,
      date: invoiceDate,
      type: JournalEntryType.Auto,
      description: isAr ? `قيد فاتورة مبيعات وخصم المخازن: ${invoiceNumber}` : `Sales Invoice & Stock deduction JV: ${invoiceNumber}`,
      lines: jeLines,
      approved: true,
      approvedBy: 'النظام'
    };

    newInvoice.journalEntryId = jeId;

    // 5. Update Accounts ledger balances
    const updatedAccounts = data.accounts.map(acc => {
      let balance = acc.balance;
      
      if (isCash && acc.id === '101') balance += totalAmount;
      if (!isCash && acc.id === '103') balance += totalAmount;
      if (acc.id === '411') balance += subtotal;
      if (acc.id === '203' && taxAmount > 0) balance += taxAmount;
      
      if (acc.id === '501') balance += cogs501;
      if (acc.id === '502') balance += cogs502;
      if (acc.id === '503') balance += cogs503;
      
      if (acc.id === '104') balance -= inv104Credit;
      if (acc.id === '105') balance -= inv105Credit;
      
      return { ...acc, balance };
    });

    // Update customer balance if credit
    if (!isCash && customerId) {
      const updatedCustomers = data.customers.map(c =>
        c.id === customerId ? { ...c, balance: c.balance + totalAmount } : c
      );
      onUpdateCustomers(updatedCustomers);
    }

    // Update treasury if cash
    if (isCash) {
      const updatedTreasuries = data.treasuries.map(t =>
        t.id === 'cb-1' ? { ...t, balance: t.balance + totalAmount } : t
      );
      onUpdateTreasuries(updatedTreasuries);

      // Auto-create receipt voucher
      const voucherNum = `RV-${new Date().getFullYear()}-${String((data.vouchers || []).length + 1).padStart(4, '0')}`;
      const newVoucher: Voucher = {
        id: 'v-' + Math.random().toString(36).substring(2, 9),
        voucherNumber: voucherNum,
        type: VoucherType.Receipt,
        date: invoiceDate,
        amount: totalAmount,
        partyType: 'CUSTOMER',
        partyId: customerId,
        partyName: getCustomerName(customerId) || 'عميل نقدي',
        paymentMethod: 'CASH',
        treasuryId: 'cb-1',
        description: isAr ? `تحصيل فاتورة مبيعات ${invoiceNumber}` : `Collection for invoice ${invoiceNumber}`,
        referenceNumber: invoiceNumber
      };
      onUpdateVouchers([...(data.vouchers || []), newVoucher]);
    }

    // Propagate all updates to the parent states
    onUpdateInventory(updatedInventory);
    onUpdateSalesInvoices([newInvoice, ...(data.salesInvoices || [])]);
    onUpdateAccounts(updatedAccounts);
    onUpdateEntries([newJE, ...data.journalEntries]);

    onAddAuditLog(
      `إصدار فاتورة مبيعات وصرف مخزني: ${invoiceNumber}`,
      `Issued Sales Invoice & Dispatched Stock: ${invoiceNumber}`,
      `قيمة الفاتورة: ${formatCurrency(totalAmount)} — تكلفة البضاعة المباعة: ${formatCurrency(cogs501 + cogs502 + cogs503)} — ${isCash ? 'نقدي' : 'آجل'}`
    );

    // Reset form
    setItems([]);
    setCustomerId('');
    setNotes('');
    setActiveView('list');
    window.showAlert('تم إصدار الفاتورة وخصم الكميات من المخزن بنجاح', 'Invoice issued and inventory levels updated successfully', 'success');
  };

  // Print invoice
  const handlePrintInvoice = (inv: SalesInvoice) => {
    const customer = data.customers.find(c => c.id === inv.customerId);
    const customerName = customer ? (isAr ? customer.nameAr : customer.nameEn) : 'عميل نقدي';

    const itemsHTML = inv.items.map((item, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${isAr ? item.nameAr : item.nameEn}${item.unitAr ? ` (${isAr ? item.unitAr : item.unitEn})` : ''}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:left">${fmtCurrency(item.unitPrice, lang)}</td>
        <td style="text-align:left">${fmtCurrency(item.discount, lang)}</td>
        <td style="text-align:left">${fmtCurrency(item.total, lang)}</td>
      </tr>
    `).join('');

    const statusText = inv.status === InvoiceStatus.Paid ? (isAr ? 'مسدد بالكامل' : 'Fully Paid')
      : inv.status === InvoiceStatus.Issued ? (isAr ? 'مستحق الدفع' : 'Due')
      : inv.status;

    const html = `
      <div class="print-page">
        ${companyHeaderHTML()}
        <div class="doc-title">
          <h2>${isAr ? 'فاتورة مبيعات' : 'Sales Invoice'}</h2>
          <div class="doc-number">${inv.invoiceNumber}</div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <div class="label">${isAr ? 'العميل' : 'Customer'}</div>
            <div class="value">${customerName}</div>
          </div>
          <div class="info-box">
            <div class="label">${isAr ? 'تاريخ الإصدار' : 'Issue Date'}</div>
            <div class="value">${fmtDate(inv.date, lang)}</div>
          </div>
          <div class="info-box">
            <div class="label">${isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</div>
            <div class="value">${fmtDate(inv.dueDate, lang)}</div>
          </div>
          <div class="info-box">
            <div class="label">${isAr ? 'حالة الفاتورة' : 'Status'}</div>
            <div class="value">${statusText}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:40px">#</th>
              <th>${isAr ? 'الصنف' : 'Item'}</th>
              <th style="width:60px">${isAr ? 'الكمية' : 'Qty'}</th>
              <th style="width:100px">${isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
              <th style="width:80px">${isAr ? 'الخصم' : 'Discount'}</th>
              <th style="width:100px">${isAr ? 'الإجمالي' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="totals-box">
            <div class="totals-row">
              <span>${isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
              <span>${fmtCurrency(inv.subtotal, lang)}</span>
            </div>
            ${inv.discountTotal > 0 ? `<div class="totals-row">
              <span>${isAr ? 'إجمالي الخصم' : 'Total Discount'}</span>
              <span style="color:#ef4444">-${fmtCurrency(inv.discountTotal, lang)}</span>
            </div>` : ''}
            <div class="totals-row">
              <span>${isAr ? 'ضريبة القيمة المضافة' : 'VAT'} (${(inv.taxRate * 100).toFixed(0)}%)</span>
              <span>${fmtCurrency(inv.taxAmount, lang)}</span>
            </div>
            <div class="totals-row grand">
              <span>${isAr ? 'الإجمالي المستحق' : 'Total Due'}</span>
              <span>${fmtCurrency(inv.totalAmount, lang)}</span>
            </div>
          </div>
        </div>

        <div class="amount-words">
          ${isAr ? 'المبلغ كتابةً:' : 'Amount in words:'} ${numberToArabicWords(inv.totalAmount)}
        </div>

        ${inv.notes ? `<p style="font-size:10px; color:#64748b; margin-bottom:10px;"><strong>${isAr ? 'ملاحظات:' : 'Notes:'}</strong> ${inv.notes}</p>` : ''}

        ${signaturesHTML([
          isAr ? 'المحاسب' : 'Accountant',
          isAr ? 'المدير المالي' : 'Finance Manager',
          isAr ? 'العميل' : 'Customer'
        ])}

        ${footerHTML()}
      </div>
    `;

    printDocument(html, `${isAr ? 'فاتورة مبيعات' : 'Sales Invoice'} - ${inv.invoiceNumber}`);
  };

  // Mark as paid
  const handleMarkAsPaid = (inv: SalesInvoice) => {
    const updatedInvoices = (data.salesInvoices || []).map(i =>
      i.id === inv.id ? { ...i, status: InvoiceStatus.Paid, paidAmount: i.totalAmount } : i
    );
    onUpdateSalesInvoices(updatedInvoices);

    // Clear customer receivable
    if (inv.customerId) {
      const updatedCustomers = data.customers.map(c =>
        c.id === inv.customerId ? { ...c, balance: c.balance - inv.totalAmount } : c
      );
      onUpdateCustomers(updatedCustomers);
    }

    // Dr: Cash  Cr: Receivables
    const updatedAccounts = data.accounts.map(acc => {
      if (acc.id === '101') return { ...acc, balance: acc.balance + inv.totalAmount };
      if (acc.id === '103') return { ...acc, balance: acc.balance - inv.totalAmount };
      return acc;
    });
    onUpdateAccounts(updatedAccounts);

    // Update treasury
    const updatedTreasuries = data.treasuries.map(t =>
      t.id === 'cb-1' ? { ...t, balance: t.balance + inv.totalAmount } : t
    );
    onUpdateTreasuries(updatedTreasuries);

    // Create receipt voucher
    const voucherNum = `RV-${new Date().getFullYear()}-${String((data.vouchers || []).length + 1).padStart(4, '0')}`;
    const newVoucher: Voucher = {
      id: 'v-' + Math.random().toString(36).substring(2, 9),
      voucherNumber: voucherNum,
      type: VoucherType.Receipt,
      date: new Date().toISOString().split('T')[0],
      amount: inv.totalAmount,
      partyType: 'CUSTOMER',
      partyId: inv.customerId,
      partyName: getCustomerName(inv.customerId),
      paymentMethod: 'CASH',
      treasuryId: 'cb-1',
      description: isAr ? `تحصيل فاتورة ${inv.invoiceNumber}` : `Payment for invoice ${inv.invoiceNumber}`,
      referenceNumber: inv.invoiceNumber
    };
    onUpdateVouchers([...(data.vouchers || []), newVoucher]);

    onAddAuditLog(
      `تحصيل فاتورة: ${inv.invoiceNumber}`,
      `Invoice Paid: ${inv.invoiceNumber}`,
      `تم تحصيل مبلغ ${formatCurrency(inv.totalAmount)}`
    );
    window.showAlert('تم تسجيل السداد بنجاح', 'Payment recorded successfully', 'success');
  };

  // Export to Excel
  const handleExportCSV = () => {
    const rows = (data.salesInvoices || []).map(inv => ({
      'رقم الفاتورة': inv.invoiceNumber,
      'التاريخ': inv.date,
      'العميل': getCustomerName(inv.customerId) || 'عميل نقدي',
      'المبلغ الفرعي': inv.subtotal,
      'الضريبة': inv.taxAmount,
      'الإجمالي': inv.totalAmount,
      'المسدد': inv.paidAmount,
      'الحالة': inv.status,
      'طريقة الدفع': inv.paymentMethod
    }));
    exportToCSV(rows, 'sales_invoices');
  };

  const invoices = data.salesInvoices || [];
  const filtered = invoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCustomerName(inv.customerId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.Draft: return { text: isAr ? 'مسودة' : 'Draft', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
      case InvoiceStatus.Issued: return { text: isAr ? 'مستحق' : 'Issued', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
      case InvoiceStatus.Paid: return { text: isAr ? 'مسدد' : 'Paid', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
      case InvoiceStatus.PartiallyPaid: return { text: isAr ? 'مسدد جزئياً' : 'Partial', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
      case InvoiceStatus.Cancelled: return { text: isAr ? 'ملغي' : 'Cancelled', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
      default: return { text: status, cls: 'bg-slate-100 text-slate-700' };
    }
  };

  // Summary stats
  const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalCollected = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalOutstanding = totalRevenue - totalCollected;

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'فواتير المبيعات' : 'Sales Invoices'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'إنشاء وإدارة وطباعة فواتير المبيعات والتحصيل' : 'Create, manage, and print sales invoices and collections'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 flex items-center gap-1">
            <Download className="h-3.5 w-3.5" /> Excel
          </button>
          <button onClick={() => setActiveView(activeView === 'new' ? 'list' : 'new')}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-lg">
            <Plus className="h-3.5 w-3.5" />
            {isAr ? 'فاتورة جديدة' : 'New Invoice'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{isAr ? 'إجمالي الفواتير' : 'Total Invoiced'}</p>
          <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4">
          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">{isAr ? 'إجمالي المحصل' : 'Total Collected'}</p>
          <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(totalCollected)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800/40 rounded-xl p-4">
          <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase">{isAr ? 'المتبقي المستحق' : 'Outstanding'}</p>
          <p className="text-lg font-black text-orange-700 dark:text-orange-400">{formatCurrency(totalOutstanding)}</p>
        </div>
      </div>

      {/* New Invoice Form */}
      {activeView === 'new' && (
        <form onSubmit={handleCreateInvoice} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'إنشاء فاتورة مبيعات جديدة' : 'Create New Sales Invoice'}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'العميل' : 'Customer'}</label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                <option value="">{isAr ? '— عميل نقدي (Walk-in) —' : '— Cash Customer —'}</option>
                {data.customers.map(c => <option key={c.id} value={c.id}>{isAr ? c.nameAr : c.nameEn}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'التاريخ' : 'Date'}</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'طريقة الدفع' : 'Payment Method'}</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                <option value="CASH">{isAr ? 'نقدي' : 'Cash'}</option>
                <option value="CREDIT">{isAr ? 'آجل' : 'Credit'}</option>
                <option value="BANK_TRANSFER">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                <option value="CHEQUE">{isAr ? 'شيك' : 'Cheque'}</option>
              </select>
            </div>
          </div>

          {/* Add items */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">{isAr ? 'بنود الفاتورة' : 'Invoice Items'}</h4>
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <label className="text-[9px] font-bold text-slate-400 block mb-0.5">{isAr ? 'الصنف' : 'Item'}</label>
                <select value={newItemId} onChange={e => setNewItemId(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  <option value="">{isAr ? '— اختر صنف —' : '— Select —'}</option>
                  {data.inventory.map(i =>
                    <option key={i.id} value={i.id}>{isAr ? `${i.nameAr} (${i.unitAr})` : `${i.nameEn} (${i.unitEn})`}</option>
                  )}
                </select>
              </div>
              <div className="w-16">
                <label className="text-[9px] font-bold text-slate-400 block mb-0.5">{isAr ? 'الكمية' : 'Qty'}</label>
                <input type="number" min={1} value={newItemQty} onChange={e => setNewItemQty(+e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
              </div>
              <div className="w-24">
                <label className="text-[9px] font-bold text-slate-400 block mb-0.5">{isAr ? 'السعر' : 'Price'}</label>
                <input type="number" min={0} step={0.5} value={newItemPrice} onChange={e => setNewItemPrice(+e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
              </div>
              <div className="w-20">
                <label className="text-[9px] font-bold text-slate-400 block mb-0.5">{isAr ? 'خصم' : 'Disc'}</label>
                <input type="number" min={0} step={0.5} value={newItemDiscount} onChange={e => setNewItemDiscount(+e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
              </div>
              <button type="button" onClick={handleAddItem}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {items.length > 0 && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-right py-1 font-bold text-slate-500">#</th>
                    <th className="text-right py-1 font-bold text-slate-500">{isAr ? 'الصنف' : 'Item'}</th>
                    <th className="text-center py-1 font-bold text-slate-500">{isAr ? 'الكمية' : 'Qty'}</th>
                    <th className="text-left py-1 font-bold text-slate-500">{isAr ? 'السعر' : 'Price'}</th>
                    <th className="text-left py-1 font-bold text-slate-500">{isAr ? 'الإجمالي' : 'Total'}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 font-bold text-slate-400">{i + 1}</td>
                      <td className="py-1.5 font-bold text-slate-900 dark:text-white">
                        {isAr ? item.nameAr : item.nameEn}
                        {item.unitAr ? ` (${isAr ? item.unitAr : item.unitEn})` : ''}
                      </td>
                      <td className="py-1.5 text-center font-bold">{item.quantity}</td>
                      <td className="py-1.5 font-bold">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-1.5 font-black text-blue-700 dark:text-blue-400">{formatCurrency(item.total)}</td>
                      <td className="py-1.5">
                        <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700"><X className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Totals */}
            {items.length > 0 && (
              <div className="flex justify-end">
                <div className="min-w-[220px] space-y-1 text-xs">
                  <div className="flex justify-between font-bold text-slate-600 dark:text-slate-400">
                    <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span><span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-600 dark:text-slate-400">
                    <span>{isAr ? 'ض.ق.م (14%):' : 'VAT (14%):'}</span><span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white border-t border-slate-300 dark:border-slate-600 pt-1">
                    <span>{isAr ? 'الإجمالي:' : 'Total:'}</span><span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'ملاحظات' : 'Notes'}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="px-5 py-2.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-lg">
              {isAr ? 'إصدار الفاتورة' : 'Issue Invoice'}
            </button>
            <button type="button" onClick={() => setActiveView('list')}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Invoice List */}
      {activeView === 'list' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder={isAr ? 'بحث بالرقم أو العميل...' : 'Search by number or customer...'}
                className="w-full pr-9 pl-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold">
              {isAr ? 'لا توجد فواتير مبيعات بعد. اضغط "فاتورة جديدة" للبدء.' : 'No invoices yet. Click "New Invoice" to start.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                    <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'العميل' : 'Customer'}</th>
                    <th className="text-left px-4 py-3 font-bold text-slate-500">{isAr ? 'الإجمالي' : 'Total'}</th>
                    <th className="text-center px-4 py-3 font-bold text-slate-500">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="text-center px-4 py-3 font-bold text-slate-500">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const badge = getStatusBadge(inv.status);
                    return (
                      <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-black text-blue-700 dark:text-blue-400">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">{inv.date}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{getCustomerName(inv.customerId) || (isAr ? 'عميل نقدي' : 'Cash')}</td>
                        <td className="px-4 py-3 font-black text-slate-900 dark:text-white">{formatCurrency(inv.totalAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.text}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handlePrintInvoice(inv)} title={isAr ? 'طباعة' : 'Print'}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            {inv.status === InvoiceStatus.Issued && (
                              <button onClick={() => handleMarkAsPaid(inv)} title={isAr ? 'تسجيل سداد' : 'Mark Paid'}
                                className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600">
                                <DollarSign className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
