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
      // 0. POS Sales (Debit to customer) - customerId stored in description JSON
      (data.sales || []).forEach(sale => {
        try {
          const metaMatch = sale.description?.match(/\[({.*})\]/);
          if (metaMatch) {
            const meta = JSON.parse(metaMatch[1]);
            if (meta.customer === partyId) {
              rawTx.push({
                date: sale.date,
                type: 'INVOICE',
                description: isAr ? 'مبيعات كاشير (POS)' : 'POS Sale',
                reference: sale.orderNumber,
                debit: sale.totalAmount,
                credit: 0
              });
            }
          }
        } catch (e) {}
      });

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

    // Sort by date ascending, then by reference for same-date entries
    rawTx.sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.reference.localeCompare(b.reference, undefined, { numeric: true });
    });

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

  // Compute actual balances from all transactions (not relying on stored balance field)
  const partyBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    (parties || []).forEach(p => { balances[p.id] = 0; });

    if (partyType === 'CUSTOMER') {
      (data.salesInvoices || []).forEach(inv => {
        if (balances[inv.customerId] !== undefined) balances[inv.customerId] += inv.totalAmount;
      });
      (data.sales || []).forEach(sale => {
        try {
          const metaMatch = sale.description?.match(/\[({.*})\]/);
          if (metaMatch) {
            const meta = JSON.parse(metaMatch[1]);
            if (balances[meta.customer] !== undefined) balances[meta.customer] += sale.totalAmount;
          }
        } catch (e) {}
      });
      (data.vouchers || []).forEach(v => {
        if (v.partyType === 'CUSTOMER' && balances[v.partyId] !== undefined) {
          if (v.type === VoucherType.Receipt) balances[v.partyId] -= v.amount;
          if (v.type === VoucherType.Payment) balances[v.partyId] += v.amount;
        }
      });
      (data.salesReturns || []).forEach(sr => {
        if (balances[sr.customerId] !== undefined) balances[sr.customerId] -= sr.totalAmount;
      });
    } else {
      (data.purchases || []).forEach(p => {
        if (balances[p.supplierId] !== undefined && (p.status === 'INVOICED' || p.status === 'PAID')) {
          balances[p.supplierId] += p.totalAmount;
        }
      });
      (data.vouchers || []).forEach(v => {
        if (v.partyType === 'SUPPLIER' && balances[v.partyId] !== undefined && v.type === VoucherType.Payment) {
          balances[v.partyId] -= v.amount;
        }
      });
      (data.moneyTransactions || []).forEach(mt => {
        if (mt.type === 'PAYMENT' && mt.destType === 'SUPPLIER' && balances[mt.destId] !== undefined) {
          balances[mt.destId] -= mt.amount;
        }
      });
      (data.purchaseReturns || []).forEach(pr => {
        if (balances[pr.supplierId] !== undefined) balances[pr.supplierId] -= pr.totalAmount;
      });
    }
    return balances;
  }, [partyType, data, parties]);

  const selectedParty = parties.find(p => p.id === partyId);
  const partyNameStr = selectedParty ? (isAr ? selectedParty.nameAr : selectedParty.nameEn) : '';
  const currentBalance = selectedParty ? (partyBalances[selectedParty.id] ?? selectedParty.balance) : 0;



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
            <button onClick={handleExport} className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-lg cursor-pointer">
              <FileSpreadsheet className="h-4 w-4" />
              {isAr ? 'تصدير كشف الحساب إلى Excel' : 'Export Statement to Excel'}
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

      {/* Summary of all parties with balances when none selected */}
      {!partyId && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="h-4 w-4 text-slate-400" />
              {isAr ? 'أرصدة جميع ' + (partyType === 'CUSTOMER' ? 'العملاء' : 'الموردين') : 'All ' + (partyType === 'CUSTOMER' ? 'Customers' : 'Suppliers') + ' Balances'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'الاسم' : 'Name'}</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'رقم الهاتف' : 'Phone'}</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500">{isAr ? 'الرصيد الحالي' : 'Current Balance'}</th>
                </tr>
              </thead>
              <tbody>
                {parties.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400 font-bold">
                      {isAr ? 'لا توجد جهات مسجلة' : 'No parties registered'}
                    </td>
                  </tr>
                ) : (
                  parties.map((p, idx) => {
                    const bal = partyBalances[p.id] ?? p.balance;
                    return (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer" onClick={() => setPartyId(p.id)}>
                      <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{isAr ? (p as any).nameAr : (p as any).nameEn}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-500">{(p as any).phone || '-'}</td>
                      <td className="px-4 py-2.5 font-black text-left text-slate-900 dark:text-white">
                        {fmtCurrency(bal, lang)}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {partyId && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <User className="h-5 w-5 text-slate-400" />
                {partyNameStr}
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-0.5">{isAr ? 'الرصيد الحالي:' : 'Current Balance:'} <span className="text-slate-900 dark:text-white">{fmtCurrency(currentBalance, lang)}</span></p>
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
                    <tr key={`tx-${idx}`} className={`border-b border-slate-100 dark:border-slate-800/50 ${tx.type === 'OPENING' ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}>
                      <td className="px-4 py-2.5 font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">{tx.date}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-500">{tx.reference}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{tx.description}</td>
                      <td className="px-4 py-2.5 font-black text-slate-900 dark:text-white text-left">{tx.debit > 0 ? fmtCurrency(tx.debit, lang) : '-'}</td>
                      <td className="px-4 py-2.5 font-black text-slate-900 dark:text-white text-left">{tx.credit > 0 ? fmtCurrency(tx.credit, lang) : '-'}</td>
                      <td className="px-4 py-2.5 font-black text-left bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white">
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
