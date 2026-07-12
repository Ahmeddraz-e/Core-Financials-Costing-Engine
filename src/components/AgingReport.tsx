import React, { useState, useMemo } from 'react';
import { Clock, Download, FileSpreadsheet, Users } from 'lucide-react';
import { ERPData, Customer, Supplier, SalesInvoice, PurchaseTransaction } from '../types';
import { printDocument, fmtCurrency, fmtDate, companyHeaderHTML, signaturesHTML, footerHTML, exportToCSV } from '../utils/printUtils';

interface AgingReportProps {
  data: ERPData;
  lang: 'ar' | 'en';
}

function daysOverdue(dateStr: string): number {
  const today = new Date();
  const due = new Date(dateStr);
  const diff = today.getTime() - due.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function bucketAmount(days: number, amount: number): [number, number, number, number] {
  if (days <= 30) return [amount, 0, 0, 0];
  if (days <= 60) return [0, amount, 0, 0];
  if (days <= 90) return [0, 0, amount, 0];
  return [0, 0, 0, amount];
}

export default function AgingReport({ data, lang }: AgingReportProps) {
  const isAr = lang === 'ar';
  
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'SUPPLIERS'>('CUSTOMERS');
  
  const formatCurrency = (val: number) => {
    const formattedNum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val);
    return isAr ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
  }

  const customersAging = useMemo(() => {
    const invoiceMap = new Map<string, { d0_30: number; d31_60: number; d61_90: number; d90_plus: number }>();

    for (const inv of (data.salesInvoices || [])) {
      const outstanding = inv.totalAmount - (inv.paidAmount || 0);
      if (outstanding <= 0) continue;
      const days = daysOverdue(inv.dueDate || inv.date);
      const [a, b, c, d] = bucketAmount(days, outstanding);
      const entry = invoiceMap.get(inv.customerId);
      if (entry) {
        entry.d0_30 += a;
        entry.d31_60 += b;
        entry.d61_90 += c;
        entry.d90_plus += d;
      } else {
        invoiceMap.set(inv.customerId, { d0_30: a, d31_60: b, d61_90: c, d90_plus: d });
      }
    }

    // Include POS sales (customerId in description metadata)
    for (const sale of (data.sales || [])) {
      try {
        const metaMatch = sale.description?.match(/\[({.*})\]/);
        if (metaMatch) {
          const meta = JSON.parse(metaMatch[1]);
          if (meta.customer) {
            const days = daysOverdue(sale.date);
            const [a, b, c, d] = bucketAmount(days, sale.totalAmount);
            const entry = invoiceMap.get(meta.customer);
            if (entry) {
              entry.d0_30 += a;
              entry.d31_60 += b;
              entry.d61_90 += c;
              entry.d90_plus += d;
            } else {
              invoiceMap.set(meta.customer, { d0_30: a, d31_60: b, d61_90: c, d90_plus: d });
            }
          }
        }
      } catch (e) {}
    }

    return data.customers
      .filter(c => (invoiceMap.get(c.id)?.d0_30 || 0) + (invoiceMap.get(c.id)?.d31_60 || 0) + (invoiceMap.get(c.id)?.d61_90 || 0) + (invoiceMap.get(c.id)?.d90_plus || 0) > 0)
      .map(c => {
        const inv = invoiceMap.get(c.id) || { d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
        return {
          id: c.id,
          name: isAr ? c.nameAr : c.nameEn,
          total: inv.d0_30 + inv.d31_60 + inv.d61_90 + inv.d90_plus,
          ...inv
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [data.customers, data.salesInvoices, data.sales, isAr]);

  const suppliersAging = useMemo(() => {
    const purchaseMap = new Map<string, { d0_30: number; d31_60: number; d61_90: number; d90_plus: number }>();

    for (const po of (data.purchases || [])) {
      if (po.status === 'PAID') continue;
      const outstanding = po.totalAmount;
      if (outstanding <= 0) continue;
      const days = daysOverdue(po.date);
      const [a, b, c, d] = bucketAmount(days, outstanding);
      const entry = purchaseMap.get(po.supplierId);
      if (entry) {
        entry.d0_30 += a;
        entry.d31_60 += b;
        entry.d61_90 += c;
        entry.d90_plus += d;
      } else {
        purchaseMap.set(po.supplierId, { d0_30: a, d31_60: b, d61_90: c, d90_plus: d });
      }
    }

    return data.suppliers
      .filter(s => (purchaseMap.get(s.id)?.d0_30 || 0) + (purchaseMap.get(s.id)?.d31_60 || 0) + (purchaseMap.get(s.id)?.d61_90 || 0) + (purchaseMap.get(s.id)?.d90_plus || 0) > 0)
      .map(s => {
        const po = purchaseMap.get(s.id) || { d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
        return {
          id: s.id,
          name: isAr ? s.nameAr : s.nameEn,
          total: po.d0_30 + po.d31_60 + po.d61_90 + po.d90_plus,
          ...po
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [data.suppliers, data.purchases, isAr]);

  const currentData = activeTab === 'CUSTOMERS' ? customersAging : suppliersAging;
  
  const totals = currentData.reduce((acc, curr) => ({
    total: acc.total + curr.total,
    d0_30: acc.d0_30 + curr.d0_30,
    d31_60: acc.d31_60 + curr.d31_60,
    d61_90: acc.d61_90 + curr.d61_90,
    d90_plus: acc.d90_plus + curr.d90_plus
  }), { total: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 });

  const handleExport = () => {
    const filename = activeTab === 'CUSTOMERS' ? 'AR_Aging_Report' : 'AP_Aging_Report';
    const rows = currentData.map(row => ({
      [isAr ? 'الاسم' : 'Name']: row.name,
      '1 - 30': row.d0_30,
      '31 - 60': row.d31_60,
      '61 - 90': row.d61_90,
      '+90': row.d90_plus,
      [isAr ? 'الإجمالي' : 'Total']: row.total
    }));
    rows.push({
      [isAr ? 'الاسم' : 'Name']: isAr ? 'الإجمالي العام' : 'Grand Total',
      '1 - 30': totals.d0_30,
      '31 - 60': totals.d31_60,
      '61 - 90': totals.d61_90,
      '+90': totals.d90_plus,
      [isAr ? 'الإجمالي' : 'Total']: totals.total
    });
    exportToCSV(rows, filename);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'تقارير أعمار الديون (Aging)' : 'Aging Reports'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'تحليل أعمار الأرصدة المستحقة للعملاء والموردين لتحديد الديون المتأخرة' : 'Analyze age of outstanding balances for receivables and payables'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-lg cursor-pointer">
            <FileSpreadsheet className="h-4 w-4" />
            {isAr ? 'تصدير التقرير إلى Excel' : 'Export Aging Report'}
          </button>
        </div>
      </div>

      <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 w-fit">
        <button onClick={() => setActiveTab('CUSTOMERS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'CUSTOMERS' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-slate-500'}`}>
          <Users className="h-3.5 w-3.5" />
          {isAr ? 'أعمار ديون العملاء (Receivables)' : 'AR Aging (Customers)'}
        </button>
        <button onClick={() => setActiveTab('SUPPLIERS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'SUPPLIERS' ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-400 shadow-xs' : 'text-slate-500'}`}>
          <Users className="h-3.5 w-3.5" />
          {isAr ? 'أعمار ديون الموردين (Payables)' : 'AP Aging (Suppliers)'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'الاسم' : 'Name'}</th>
                <th className="text-center px-4 py-3 font-bold text-slate-500">1 - 30 {isAr ? 'يوم' : 'Days'}</th>
                <th className="text-center px-4 py-3 font-bold text-slate-500">31 - 60 {isAr ? 'يوم' : 'Days'}</th>
                <th className="text-center px-4 py-3 font-bold text-slate-500">61 - 90 {isAr ? 'يوم' : 'Days'}</th>
                <th className="text-center px-4 py-3 font-bold text-slate-500 bg-slate-50/80 dark:bg-slate-800/20">+90 {isAr ? 'يوم' : 'Days'}</th>
                <th className="text-left px-4 py-3 font-black text-slate-900 dark:text-white">{isAr ? 'الإجمالي المستحق' : 'Total Due'}</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">{isAr ? 'لا توجد أرصدة مستحقة' : 'No outstanding balances'}</td></tr>
              ) : (
                currentData.map(row => (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{row.name}</td>
                    <td className="px-4 py-3 text-center">{fmtCurrency(row.d0_30)}</td>
                    <td className="px-4 py-3 text-center">{fmtCurrency(row.d31_60)}</td>
                    <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{fmtCurrency(row.d61_90)}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-white bg-slate-50/30 dark:bg-slate-800/5">{fmtCurrency(row.d90_plus)}</td>
                    <td className="px-4 py-3 font-black text-slate-900 dark:text-white text-left">{fmtCurrency(row.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {currentData.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 text-sm font-black">
                  <td className="px-4 py-4 text-slate-900 dark:text-white">{isAr ? 'الإجمالي العام' : 'Grand Total'}</td>
                  <td className="px-4 py-4 text-center">{formatCurrency(totals.d0_30)}</td>
                  <td className="px-4 py-4 text-center">{formatCurrency(totals.d31_60)}</td>
                  <td className="px-4 py-4 text-center text-slate-900 dark:text-white">{formatCurrency(totals.d61_90)}</td>
                  <td className="px-4 py-4 text-center text-slate-900 dark:text-white">{formatCurrency(totals.d90_plus)}</td>
                  <td className="px-4 py-4 text-left text-slate-900 dark:text-white">{formatCurrency(totals.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
