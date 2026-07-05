import React, { useState, useMemo } from 'react';
import { FileText, Search, Printer, Download, User, ArrowUpRight, ArrowDownRight, Calculator, FileSpreadsheet } from 'lucide-react';
import { ERPData, Customer, Supplier, Voucher, VoucherType, SalesInvoice, PurchaseTransaction, SalesReturn, PurchaseReturn } from '../types';
import { printDocument, fmtCurrency, fmtDate, companyHeaderHTML, signaturesHTML, footerHTML, exportToCSV } from '../utils/printUtils';

interface StatementOfAccountProps {
  data: ERPData;
  lang: 'ar' | 'en';
}

type PartyType = 'CUSTOMER' | 'SUPPLIER';

interface TransactionLine {
  date: string;
  type: string; // INVOICE, RECEIPT, PAYMENT, RETURN, etc.
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balanceAfter: number;
}

export default function StatementOfAccount({ data, lang }: StatementOfAccountProps) {
  const isAr = lang === 'ar';
  
  const [partyType, setPartyType] = useState<PartyType>('CUSTOMER');
  const [partyId, setPartyId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const parties = partyType === 'CUSTOMER' ? data.customers : data.suppliers;

  const generateStatement = (): TransactionLine[] => {
    if (!partyId) return [];

    let rawTx: Omit<TransactionLine, 'balanceAfter'>[] = [];

    if (partyType === 'CUSTOMER') {
      // 1. Sales Invoices (Debit to customer)
      (data.salesInvoices || []).filter(i => i.customerId === partyId).forEach(inv => {
        rawTx.push({
          date: inv.date,
          type: 'INVOICE',
          description: isAr ? 'فاتورة مبيعات' : 'Sales Invoice',
          reference: inv.invoiceNumber,
          debit: inv.totalAmount,
          credit: 0
        });
      });

      // 2. Receipts from Customer (Credit to customer)
      (data.vouchers || []).filter(v => v.partyType === 'CUSTOMER' && v.partyId === partyId && v.type === VoucherType.Receipt).forEach(v => {
        rawTx.push({
          date: v.date,
          type: 'RECEIPT',
          description: isAr ? `سند قبض: ${v.description}` : `Receipt: ${v.description}`,
          reference: v.voucherNumber,
          debit: 0,
          credit: v.amount
        });
      });

      // 3. Payments to Customer (Refunds - Debit to customer)
      (data.vouchers || []).filter(v => v.partyType === 'CUSTOMER' && v.partyId === partyId && v.type === VoucherType.Payment).forEach(v => {
        rawTx.push({
          date: v.date,
          type: 'REFUND',
          description: isAr ? `سند صرف/مرتجع: ${v.description}` : `Refund Payment: ${v.description}`,
          reference: v.voucherNumber,
          debit: v.amount,
          credit: 0
        });
      });

      // 4. Sales Returns (Credit to customer)
      (data.salesReturns || []).filter(sr => sr.customerId === partyId).forEach(sr => {
        rawTx.push({
          date: sr.date,
          type: 'RETURN',
          description: isAr ? `مرتجع مبيعات - فاتورة ${sr.originalInvoiceId}` : `Sales Return - Inv ${sr.originalInvoiceId}`,
          reference: sr.returnNumber,
          debit: 0,
          credit: sr.totalAmount
        });
      });
    } else {
      // SUPPLIER LOGIC
      // 1. Purchase Invoices (Credit to supplier)
      data.purchases.filter(p => p.supplierId === partyId && p.status === 'INVOICED' || p.status === 'PAID').forEach(p => {
        rawTx.push({
          date: p.date,
          type: 'PURCHASE',
          description: isAr ? 'فاتورة مشتريات آجل' : 'Purchase Invoice',
          reference: p.number,
          debit: 0,
          credit: p.totalAmount
        });
      });

      // 2. Payments to Supplier (Debit to supplier)
      (data.vouchers || []).filter(v => v.partyType === 'SUPPLIER' && v.partyId === partyId && v.type === VoucherType.Payment).forEach(v => {
        rawTx.push({
          date: v.date,
          type: 'PAYMENT',
          description: isAr ? `سند صرف: ${v.description}` : `Payment: ${v.description}`,
          reference: v.voucherNumber,
          debit: v.amount,
          credit: 0
        });
      });
      
      // Also check old money_transactions for payments just in case
      data.moneyTransactions.filter(mt => mt.type === 'PAYMENT' && mt.destType === 'SUPPLIER' && mt.destId === partyId).forEach(mt => {
         rawTx.push({
          date: mt.date,
          type: 'PAYMENT',
          description: isAr ? `سداد للمورد: ${mt.description}` : `Supplier Payment: ${mt.description}`,
          reference: mt.number,
          debit: mt.amount,
          credit: 0
        });
      });

      // 3. Purchase Returns (Debit to supplier)
      (data.purchaseReturns || []).filter(pr => pr.supplierId === partyId).forEach(pr => {
        rawTx.push({
          date: pr.date,
          type: 'RETURN',
          description: isAr ? `مرتجع مشتريات` : `Purchase Return`,
          reference: pr.returnNumber,
          debit: pr.totalAmount,
          credit: 0
        });
      });
    }

    // Sort chronologically
    rawTx.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter by date range and calculate rolling balance
    let runningBalance = 0;
    let openingBalance = 0;

    const filtered: TransactionLine[] = [];

    rawTx.forEach(tx => {
      const txDate = new Date(tx.date);
      const isBeforeStart = startDate ? txDate < new Date(startDate) : false;
      const isAfterEnd = endDate ? txDate > new Date(endDate) : false;

      // For customers, debit increases balance, credit decreases.
      // For suppliers, credit increases balance, debit decreases.
      const impact = partyType === 'CUSTOMER' ? (tx.debit - tx.credit) : (tx.credit - tx.debit);

      if (isBeforeStart) {
        openingBalance += impact;
      }

      runningBalance += impact;

      if (!isBeforeStart && !isAfterEnd) {
        filtered.push({
          ...tx,
          balanceAfter: runningBalance
        });
      }
    });

    // Add opening balance as first row if there's a start date
    if (startDate) {
      filtered.unshift({
        date: startDate,
        type: 'OPENING',
        description: isAr ? 'رصيد افتتاحي للفترة' : 'Opening Balance',
        reference: '-',
        debit: partyType === 'CUSTOMER' && openingBalance > 0 ? openingBalance : (partyType === 'SUPPLIER' && openingBalance < 0 ? Math.abs(openingBalance) : 0),
        credit: partyType === 'CUSTOMER' && openingBalance < 0 ? Math.abs(openingBalance) : (partyType === 'SUPPLIER' && openingBalance > 0 ? openingBalance : 0),
        balanceAfter: openingBalance
      });
    }

    return filtered;
  };

  const statement = useMemo(() => generateStatement(), [partyType, partyId, startDate, endDate, data]);

  const selectedParty = parties.find(p => p.id === partyId);
  const partyNameStr = selectedParty ? (isAr ? selectedParty.nameAr : selectedParty.nameEn) : '';
  const currentBalance = selectedParty ? selectedParty.balance : 0;

  const handlePrint = () => {
    if (!selectedParty || statement.length === 0) return;

    const rowsHTML = statement.map(tx => `
      <tr>
        <td style="white-space:nowrap">${fmtDate(tx.date, lang)}</td>
        <td>${tx.reference}</td>
        <td>${tx.description}</td>
        <td style="text-align:left; color:#ef4444">${tx.debit > 0 ? fmtCurrency(tx.debit, lang) : '-'}</td>
        <td style="text-align:left; color:#22c55e">${tx.credit > 0 ? fmtCurrency(tx.credit, lang) : '-'}</td>
        <td style="text-align:left; font-weight:800; background:#f8fafc">${fmtCurrency(tx.balanceAfter, lang)}</td>
      </tr>
    `).join('');

    const totalDebit = statement.reduce((sum, tx) => sum + tx.debit, 0);
    const totalCredit = statement.reduce((sum, tx) => sum + tx.credit, 0);
    
    // Balance indicators
    const isCustomer = partyType === 'CUSTOMER';
    const isDebtor = currentBalance > 0;
    const balanceStatusText = isDebtor ? (isAr ? 'مدين لنا (عليه)' : 'Debtor (Owes us)') : (currentBalance < 0 ? (isAr ? 'دائن لنا (له)' : 'Creditor (We owe)') : (isAr ? 'رصيد صفري' : 'Zero Balance'));

    const html = `
      <div class="print-page">
        ${companyHeaderHTML()}
        <div class="doc-title">
          <h2>${isAr ? 'كشف حساب تفصيلي' : 'Detailed Statement of Account'}</h2>
          <div class="doc-number">${partyType === 'CUSTOMER' ? (isAr ? 'العميل' : 'Customer') : (isAr ? 'المورد' : 'Supplier')}: ${partyNameStr}</div>
        </div>

        <div class="info-grid">
          <div class="info-box"><div class="label">${isAr ? 'الفترة من' : 'Period From'}</div><div class="value">${startDate ? fmtDate(startDate, lang) : '-'}</div></div>
          <div class="info-box"><div class="label">${isAr ? 'الفترة إلى' : 'Period To'}</div><div class="value">${endDate ? fmtDate(endDate, lang) : '-'}</div></div>
          <div class="info-box"><div class="label">${isAr ? 'تاريخ الطباعة' : 'Print Date'}</div><div class="value">${fmtDate(new Date().toISOString(), lang)}</div></div>
          <div class="info-box"><div class="label">${isAr ? 'حالة الرصيد' : 'Balance Status'}</div><div class="value" style="color:${isDebtor ? '#ef4444' : '#22c55e'}">${balanceStatusText}</div></div>
        </div>

        <div class="balance-summary">
          <div class="balance-card debit">
            <div class="card-label">${isAr ? 'إجمالي المدين' : 'Total Debit'}</div>
            <div class="amount text-red-600">${fmtCurrency(totalDebit, lang)}</div>
          </div>
          <div class="balance-card credit">
            <div class="card-label">${isAr ? 'إجمالي الدائن' : 'Total Credit'}</div>
            <div class="amount text-green-600">${fmtCurrency(totalCredit, lang)}</div>
          </div>
          <div class="balance-card net">
            <div class="card-label">${isAr ? 'الرصيد الختامي' : 'Closing Balance'}</div>
            <div class="amount text-blue-600">${fmtCurrency(currentBalance, lang)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:15%">${isAr ? 'التاريخ' : 'Date'}</th>
              <th style="width:15%">${isAr ? 'رقم المرجع' : 'Ref #'}</th>
              <th style="width:30%">${isAr ? 'البيان' : 'Description'}</th>
              <th style="width:13%">${isAr ? 'مدين' : 'Debit'}</th>
              <th style="width:13%">${isAr ? 'دائن' : 'Credit'}</th>
              <th style="width:14%">${isAr ? 'الرصيد' : 'Balance'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>

        ${signaturesHTML([
          isAr ? 'أعد بواسطة' : 'Prepared By',
          isAr ? 'المراجع' : 'Audited By',
          isAr ? 'اعتماد الإدارة' : 'Approved By'
        ])}

        ${footerHTML()}
      </div>
    `;

    printDocument(html, `${isAr ? 'كشف حساب' : 'Statement'} - ${partyNameStr}`);
  };

  const handleExport = () => {
    if (statement.length === 0) return;
    const rows = statement.map(tx => ({
      'التاريخ': tx.date,
      'المرجع': tx.reference,
      'البيان': tx.description,
      'مدين': tx.debit,
      'دائن': tx.credit,
      'الرصيد المتراكم': tx.balanceAfter
    }));
    exportToCSV(rows, `Statement_${partyNameStr}`);
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'كشوف الحسابات' : 'Statements of Account'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'استخراج كشوف الحساب التفصيلية للعملاء والموردين وطباعتها' : 'Generate and print detailed account statements for customers and suppliers'}
          </p>
        </div>
        {statement.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1">
              <Download className="h-3.5 w-3.5" /> Excel
            </button>
            <button onClick={handlePrint} className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-700 flex items-center gap-1.5 shadow-lg">
              <Printer className="h-3.5 w-3.5" />
              {isAr ? 'طباعة الكشف' : 'Print Statement'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'نوع الجهة' : 'Party Type'}</label>
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              <button onClick={() => { setPartyType('CUSTOMER'); setPartyId(''); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${partyType === 'CUSTOMER' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-xs' : 'text-slate-500'}`}>
                {isAr ? 'عميل' : 'Customer'}
              </button>
              <button onClick={() => { setPartyType('SUPPLIER'); setPartyId(''); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${partyType === 'SUPPLIER' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-xs' : 'text-slate-500'}`}>
                {isAr ? 'مورد' : 'Supplier'}
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'الجهة' : 'Party'}</label>
            <select value={partyId} onChange={e => setPartyId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
              <option value="">{isAr ? '— اختر جهة —' : '— Select Party —'}</option>
              {parties.map(p => <option key={p.id} value={p.id}>{isAr ? p.nameAr : p.nameEn}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'من تاريخ' : 'From Date'}</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'إلى تاريخ' : 'To Date'}</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>
        </div>
      </div>

      {partyId && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <User className="h-5 w-5 text-slate-400" />
                {partyNameStr}
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-0.5">{isAr ? 'الرصيد الحالي:' : 'Current Balance:'} <span className={currentBalance > 0 ? 'text-red-500' : currentBalance < 0 ? 'text-emerald-500' : ''}>{fmtCurrency(currentBalance, lang)}</span></p>
            </div>
            <div className="flex gap-4 mt-4 sm:mt-0 text-sm font-bold">
              <div className="text-center">
                <span className="block text-[10px] text-slate-400 uppercase">{isAr ? 'إجمالي الحركات' : 'Total Txs'}</span>
                <span className="text-slate-700 dark:text-slate-300">{statement.length}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'المرجع' : 'Ref #'}</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'البيان' : 'Description'}</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500">{isAr ? 'مدين (عليه)' : 'Debit'}</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500">{isAr ? 'دائن (له)' : 'Credit'}</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500">{isAr ? 'الرصيد المتراكم' : 'Balance'}</th>
                </tr>
              </thead>
              <tbody>
                {statement.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                      {isAr ? 'لا توجد حركات مالية في هذه الفترة' : 'No transactions in this period'}
                    </td>
                  </tr>
                ) : (
                  statement.map((tx, idx) => (
                    <tr key={idx} className={`border-b border-slate-100 dark:border-slate-800/50 ${tx.type === 'OPENING' ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                      <td className="px-4 py-2.5 font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">{tx.date}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-500">{tx.reference}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{tx.description}</td>
                      <td className="px-4 py-2.5 font-black text-red-500 text-left">{tx.debit > 0 ? fmtCurrency(tx.debit, lang) : '-'}</td>
                      <td className="px-4 py-2.5 font-black text-emerald-500 text-left">{tx.credit > 0 ? fmtCurrency(tx.credit, lang) : '-'}</td>
                      <td className={`px-4 py-2.5 font-black text-left bg-slate-50 dark:bg-slate-800/40 ${tx.balanceAfter > 0 ? 'text-red-600' : tx.balanceAfter < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {fmtCurrency(tx.balanceAfter, lang)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
