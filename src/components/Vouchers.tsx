import React, { useState } from 'react';
import { Receipt, Plus, Search, Printer, Download, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { ERPData, Voucher, VoucherType } from '../types';
import { printDocument, fmtCurrency, fmtDate, numberToArabicWords, companyHeaderHTML, signaturesHTML, footerHTML, exportToCSV } from '../utils/printUtils';

interface VouchersProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdateVouchers: (vouchers: Voucher[]) => void;
  onUpdateTreasuries: (t: any[]) => void;
  onUpdateAccounts: (a: any[]) => void;
  onUpdateCustomers: (c: any[]) => void;
  onUpdateSuppliers: (s: any[]) => void;
  onAddAuditLog: (ar: string, en: string, d: string) => void;
}

export default function VouchersModule({
  data, lang,
  onUpdateVouchers, onUpdateTreasuries, onUpdateAccounts,
  onUpdateCustomers, onUpdateSuppliers, onAddAuditLog
}: VouchersProps) {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'RECEIPT' | 'PAYMENT'>('RECEIPT');
  const [showForm, setShowForm] = useState(false);

  // Form
  const [vType, setVType] = useState<VoucherType>(VoucherType.Receipt);
  const [amount, setAmount] = useState(0);
  const [partyType, setPartyType] = useState<'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'OTHER'>('CUSTOMER');
  const [partyId, setPartyId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [desc, setDesc] = useState('');
  const [vDate, setVDate] = useState(new Date().toISOString().split('T')[0]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(val);

  const getPartyDisplayName = (v: Voucher) => {
    if (v.partyName) return v.partyName;
    if (v.partyType === 'CUSTOMER') {
      const c = data.customers.find(c => c.id === v.partyId);
      return c ? (isAr ? c.nameAr : c.nameEn) : '';
    }
    if (v.partyType === 'SUPPLIER') {
      const s = data.suppliers.find(s => s.id === v.partyId);
      return s ? (isAr ? s.nameAr : s.nameEn) : '';
    }
    return v.partyId;
  };

  const getNextNumber = (type: VoucherType) => {
    const prefix = type === VoucherType.Receipt ? 'RV' : 'PV';
    const existing = (data.vouchers || []).filter(v => v.type === type);
    return `${prefix}-${new Date().getFullYear()}-${String(existing.length + 1).padStart(4, '0')}`;
  };

  const resolvePartyName = (): string => {
    if (partyName) return partyName;
    if (partyType === 'CUSTOMER') {
      const c = data.customers.find(c => c.id === partyId);
      return c ? (isAr ? c.nameAr : c.nameEn) : '';
    }
    if (partyType === 'SUPPLIER') {
      const s = data.suppliers.find(s => s.id === partyId);
      return s ? (isAr ? s.nameAr : s.nameEn) : '';
    }
    return partyName;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) { window.showAlert('المبلغ يجب أن يكون أكبر من صفر', 'Amount must be greater than zero', 'warning'); return; }

    const voucherNumber = getNextNumber(vType);
    const resolvedName = resolvePartyName();

    const newVoucher: Voucher = {
      id: 'v-' + Math.random().toString(36).substring(2, 9),
      voucherNumber,
      type: vType,
      date: vDate,
      amount,
      partyType,
      partyId,
      partyName: resolvedName,
      paymentMethod: payMethod,
      treasuryId: payMethod === 'CASH' ? 'cb-1' : undefined,
      description: desc
    };

    // Financial effects
    if (vType === VoucherType.Receipt) {
      // Receipt: Dr Cash/Bank, Cr Receivables/Revenue
      if (payMethod === 'CASH') {
        onUpdateTreasuries(data.treasuries.map(t => t.id === 'cb-1' ? { ...t, balance: t.balance + amount } : t));
        onUpdateAccounts(data.accounts.map(a => {
          if (a.id === '101') return { ...a, balance: a.balance + amount };
          if (a.id === '103') return { ...a, balance: a.balance - amount };
          return a;
        }));
      }
      // Reduce customer balance
      if (partyType === 'CUSTOMER' && partyId) {
        onUpdateCustomers(data.customers.map(c => c.id === partyId ? { ...c, balance: c.balance - amount } : c));
      }
    } else {
      // Payment: Dr Payables, Cr Cash/Bank
      if (payMethod === 'CASH') {
        onUpdateTreasuries(data.treasuries.map(t => t.id === 'cb-1' ? { ...t, balance: t.balance - amount } : t));
        onUpdateAccounts(data.accounts.map(a => {
          if (a.id === '101') return { ...a, balance: a.balance - amount };
          if (a.id === '201') return { ...a, balance: a.balance - amount };
          return a;
        }));
      }
      // Reduce supplier balance
      if (partyType === 'SUPPLIER' && partyId) {
        onUpdateSuppliers(data.suppliers.map(s => s.id === partyId ? { ...s, balance: s.balance - amount } : s));
      }
    }

    onUpdateVouchers([newVoucher, ...(data.vouchers || [])]);
    onAddAuditLog(
      `إصدار ${vType === VoucherType.Receipt ? 'سند قبض' : 'سند صرف'}: ${voucherNumber}`,
      `Issued ${vType === VoucherType.Receipt ? 'Receipt' : 'Payment'} Voucher: ${voucherNumber}`,
      `مبلغ: ${formatCurrency(amount)} — ${resolvedName}`
    );

    setAmount(0); setPartyId(''); setPartyName(''); setDesc('');
    setShowForm(false);
    window.showAlert(
      `تم إصدار ${vType === VoucherType.Receipt ? 'سند القبض' : 'سند الصرف'} بنجاح`,
      `${vType === VoucherType.Receipt ? 'Receipt' : 'Payment'} voucher issued successfully`,
      'success'
    );
  };

  const handlePrint = (v: Voucher) => {
    const isReceipt = v.type === VoucherType.Receipt;
    const title = isReceipt ? (isAr ? 'سند قبض' : 'Receipt Voucher') : (isAr ? 'سند صرف' : 'Payment Voucher');

    const html = `
      <div class="print-page">
        ${companyHeaderHTML()}
        <div class="doc-title" style="background:${isReceipt ? '#f0fdf4' : '#fef2f2'}; border-color:${isReceipt ? '#86efac' : '#fca5a5'}">
          <h2 style="color:${isReceipt ? '#15803d' : '#dc2626'}">${title}</h2>
          <div class="doc-number">${v.voucherNumber}</div>
        </div>

        <div class="info-grid">
          <div class="info-box"><div class="label">${isAr ? 'التاريخ' : 'Date'}</div><div class="value">${fmtDate(v.date, lang)}</div></div>
          <div class="info-box"><div class="label">${isAr ? (isReceipt ? 'استلمنا من' : 'صُرف إلى') : (isReceipt ? 'Received From' : 'Paid To')}</div><div class="value">${v.partyName}</div></div>
          <div class="info-box"><div class="label">${isAr ? 'طريقة الدفع' : 'Payment Method'}</div><div class="value">${v.paymentMethod === 'CASH' ? (isAr ? 'نقدي' : 'Cash') : v.paymentMethod === 'BANK_TRANSFER' ? (isAr ? 'تحويل بنكي' : 'Bank Transfer') : (isAr ? 'شيك' : 'Cheque')}</div></div>
          <div class="info-box"><div class="label">${isAr ? 'المرجع' : 'Reference'}</div><div class="value">${v.referenceNumber || '-'}</div></div>
        </div>

        <div class="voucher-amount" style="border-color:${isReceipt ? '#22c55e' : '#ef4444'}; color:${isReceipt ? '#15803d' : '#dc2626'}; background:${isReceipt ? '#f0fdf4' : '#fef2f2'}">
          ${fmtCurrency(v.amount, lang)}
        </div>

        <div class="amount-words">
          ${isAr ? 'المبلغ كتابةً:' : 'Amount in words:'} ${numberToArabicWords(v.amount)}
        </div>

        ${v.description ? `<div style="margin-bottom:15px;"><strong style="font-size:10px; color:#64748b;">${isAr ? 'وذلك عن:' : 'Description:'}</strong><p style="font-size:12px; font-weight:700; color:#0f172a;">${v.description}</p></div>` : ''}

        ${signaturesHTML([
          isAr ? 'أمين الصندوق' : 'Cashier',
          isAr ? 'المحاسب' : 'Accountant',
          isAr ? (isReceipt ? 'المُسلِّم' : 'المستلم') : (isReceipt ? 'Payer' : 'Payee')
        ])}

        ${footerHTML()}
      </div>
    `;
    printDocument(html, `${title} - ${v.voucherNumber}`);
  };

  const handleExport = () => {
    const rows = (data.vouchers || []).map(v => ({
      'الرقم': v.voucherNumber,
      'النوع': v.type === VoucherType.Receipt ? 'سند قبض' : 'سند صرف',
      'التاريخ': v.date,
      'المبلغ': v.amount,
      'الجهة': v.partyName,
      'طريقة الدفع': v.paymentMethod,
      'البيان': v.description
    }));
    exportToCSV(rows, 'vouchers');
  };

  const vouchers = (data.vouchers || []).filter(v => v.type === (activeTab === 'RECEIPT' ? VoucherType.Receipt : VoucherType.Payment));
  const totalReceipts = (data.vouchers || []).filter(v => v.type === VoucherType.Receipt).reduce((s, v) => s + v.amount, 0);
  const totalPayments = (data.vouchers || []).filter(v => v.type === VoucherType.Payment).reduce((s, v) => s + v.amount, 0);

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'سندات القبض والصرف' : 'Receipt & Payment Vouchers'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'إصدار وطباعة سندات القبض والصرف الرسمية' : 'Issue and print official receipt and payment vouchers'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 flex items-center gap-1">
            <Download className="h-3.5 w-3.5" /> Excel
          </button>
          <button onClick={() => { setVType(activeTab === 'RECEIPT' ? VoucherType.Receipt : VoucherType.Payment); setShowForm(true); }}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-lg">
            <Plus className="h-3.5 w-3.5" />
            {isAr ? (activeTab === 'RECEIPT' ? 'سند قبض جديد' : 'سند صرف جديد') : (activeTab === 'RECEIPT' ? 'New Receipt' : 'New Payment')}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 flex items-center gap-3">
          <ArrowDownCircle className="h-8 w-8 text-emerald-500" />
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase">{isAr ? 'إجمالي المقبوضات' : 'Total Receipts'}</p>
            <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(totalReceipts)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/40 rounded-xl p-4 flex items-center gap-3">
          <ArrowUpCircle className="h-8 w-8 text-red-500" />
          <div>
            <p className="text-[10px] font-bold text-red-600 uppercase">{isAr ? 'إجمالي المصروفات' : 'Total Payments'}</p>
            <p className="text-lg font-black text-red-700 dark:text-red-400">{formatCurrency(totalPayments)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 w-fit">
        <button onClick={() => setActiveTab('RECEIPT')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'RECEIPT' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-slate-500'}`}>
          {isAr ? 'سندات القبض' : 'Receipt Vouchers'}
        </button>
        <button onClick={() => setActiveTab('PAYMENT')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'PAYMENT' ? 'bg-white dark:bg-slate-700 text-red-700 dark:text-red-400 shadow-xs' : 'text-slate-500'}`}>
          {isAr ? 'سندات الصرف' : 'Payment Vouchers'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            {vType === VoucherType.Receipt ? (isAr ? 'إصدار سند قبض' : 'Issue Receipt Voucher') : (isAr ? 'إصدار سند صرف' : 'Issue Payment Voucher')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'التاريخ' : 'Date'}</label>
              <input type="date" value={vDate} onChange={e => setVDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'المبلغ' : 'Amount'}</label>
              <input type="number" min={0} step={0.5} value={amount} onChange={e => setAmount(+e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'نوع الجهة' : 'Party Type'}</label>
              <select value={partyType} onChange={e => { setPartyType(e.target.value as any); setPartyId(''); }}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                <option value="CUSTOMER">{isAr ? 'عميل' : 'Customer'}</option>
                <option value="SUPPLIER">{isAr ? 'مورد' : 'Supplier'}</option>
                <option value="EMPLOYEE">{isAr ? 'موظف' : 'Employee'}</option>
                <option value="OTHER">{isAr ? 'أخرى' : 'Other'}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'الجهة' : 'Party'}</label>
              {partyType === 'CUSTOMER' ? (
                <select value={partyId} onChange={e => setPartyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                  <option value="">{isAr ? '— اختر عميل —' : '— Select Customer —'}</option>
                  {data.customers.map(c => <option key={c.id} value={c.id}>{isAr ? c.nameAr : c.nameEn}</option>)}
                </select>
              ) : partyType === 'SUPPLIER' ? (
                <select value={partyId} onChange={e => setPartyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                  <option value="">{isAr ? '— اختر مورد —' : '— Select Supplier —'}</option>
                  {data.suppliers.map(s => <option key={s.id} value={s.id}>{isAr ? s.nameAr : s.nameEn}</option>)}
                </select>
              ) : (
                <input type="text" value={partyName} onChange={e => setPartyName(e.target.value)} placeholder={isAr ? 'اسم الجهة' : 'Party name'}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'طريقة الدفع' : 'Payment Method'}</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                <option value="CASH">{isAr ? 'نقدي' : 'Cash'}</option>
                <option value="BANK_TRANSFER">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                <option value="CHEQUE">{isAr ? 'شيك' : 'Cheque'}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'البيان / وذلك عن' : 'Description'}</label>
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-5 py-2.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-lg">
              {isAr ? 'إصدار السند' : 'Issue Voucher'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Voucher List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {vouchers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold">
            {isAr ? 'لا توجد سندات بعد' : 'No vouchers yet'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'الرقم' : '#'}</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'الجهة' : 'Party'}</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500">{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'البيان' : 'Description'}</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-500">{isAr ? 'طباعة' : 'Print'}</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map(v => (
                  <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-black text-blue-700 dark:text-blue-400">{v.voucherNumber}</td>
                    <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">{v.date}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{getPartyDisplayName(v)}</td>
                    <td className="px-4 py-3 font-black text-slate-900 dark:text-white">{formatCurrency(v.amount)}</td>
                    <td className="px-4 py-3 font-bold text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{v.description}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handlePrint(v)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
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
    </div>
  );
}
