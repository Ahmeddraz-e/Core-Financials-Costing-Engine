import React, { useState, useMemo } from 'react';
import { Calculator, Calendar, Download, FileSpreadsheet } from 'lucide-react';
import { ERPData } from '../types';
import { printDocument, fmtCurrency, fmtDate, companyHeaderHTML, signaturesHTML, footerHTML, exportToCSV } from '../utils/printUtils';

interface TaxReportProps {
  data: ERPData;
  lang: 'ar' | 'en';
}

export default function TaxReport({ data, lang }: TaxReportProps) {
  const isAr = lang === 'ar';
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0); // Last day of current month
    return d.toISOString().split('T')[0];
  });

  const formatCurrency = (val: number) => {
    const formattedNum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val);
    return isAr ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
  }

  // Output VAT (Sales and Sales Returns)
  // Input VAT (Purchases and Purchase Returns)
  
  const taxData = useMemo(() => {
    // 1. Output VAT from General Sales Invoices
    const salesInvoices = (data.salesInvoices || []).filter(s => s.date >= startDate && s.date <= endDate);
    const totalInvBase = salesInvoices.reduce((sum, s) => sum + s.subtotal, 0);
    const totalInvTax = salesInvoices.reduce((sum, s) => sum + s.taxAmount, 0);

    // 2. Output VAT from POS Sales (daily cashier sales)
    const posSales = (data.sales || []).filter(s => s.date >= startDate && s.date <= endDate);
    const totalPOSBase = posSales.reduce((sum, s) => sum + (s.totalAmount - s.taxAmount), 0);
    const totalPOSTax = posSales.reduce((sum, s) => sum + s.taxAmount, 0);

    // 3. Output VAT adjustments from Purchase Returns (Credit to VAT)
    const purchaseReturns = (data.purchaseReturns || []).filter(pr => pr.date >= startDate && pr.date <= endDate);
    const totalPRBase = purchaseReturns.reduce((sum, pr) => sum + pr.subtotal, 0);
    const totalPRTax = purchaseReturns.reduce((sum, pr) => sum + pr.taxAmount, 0);

    const totalOutputTax = totalInvTax + totalPOSTax + totalPRTax;
    const totalOutputBase = totalInvBase + totalPOSBase + totalPRBase;

    // 4. Input VAT from Purchases
    const purchases = (data.purchases || []).filter(p => p.date >= startDate && p.date <= endDate);
    // Assuming standard 15% VAT on purchases for this report demo if not explicitly stored
    const totalPurchaseBase = purchases.reduce((sum, p) => sum + p.totalAmount / 1.15, 0);
    const totalPurchaseTax = purchases.reduce((sum, p) => sum + (p.totalAmount - (p.totalAmount / 1.15)), 0);

    // 5. Input VAT adjustments from Sales Returns (Debit to VAT)
    const salesReturns = (data.salesReturns || []).filter(sr => sr.date >= startDate && sr.date <= endDate);
    const totalSRBase = salesReturns.reduce((sum, sr) => sum + sr.subtotal, 0);
    const totalSRTax = salesReturns.reduce((sum, sr) => sum + sr.taxAmount, 0);

    const totalInputTax = totalPurchaseTax + totalSRTax;
    const totalInputBase = totalPurchaseBase + totalSRBase;

    const netVatPayable = totalOutputTax - totalInputTax;

    return {
      salesInvoicesCount: salesInvoices.length,
      totalInvBase,
      totalInvTax,
      posSalesCount: posSales.length,
      totalPOSBase,
      totalPOSTax,
      prCount: purchaseReturns.length,
      totalPRBase,
      totalPRTax,
      totalOutputBase,
      totalOutputTax,
      
      purchaseCount: purchases.length,
      totalPurchaseBase,
      totalPurchaseTax,
      srCount: salesReturns.length,
      totalSRBase,
      totalSRTax,
      totalInputBase,
      totalInputTax,
      
      netVatPayable
    };
  }, [data, startDate, endDate]);

  const handleExport = () => {
    const rows = [
      { 'البيان': isAr ? 'مبيعات الفواتير العامة الخاضعة للضريبة' : 'General Invoice Sales', 'القيمة الخاضعة': taxData.totalInvBase, 'معدل الضريبة': '14%', 'قيمة الضريبة': taxData.totalInvTax },
      { 'البيان': isAr ? 'مبيعات الكاشير (POS) الخاضعة للضريبة' : 'POS Sales', 'القيمة الخاضعة': taxData.totalPOSBase, 'معدل الضريبة': '14%', 'قيمة الضريبة': taxData.totalPOSTax },
      { 'البيان': isAr ? 'مرتجع المشتريات الخاضع للضريبة' : 'Taxable Purchase Returns', 'القيمة الخاضعة': taxData.totalPRBase, 'معدل الضريبة': '14%', 'قيمة الضريبة': taxData.totalPRTax },
      { 'البيان': isAr ? 'إجمالي ضريبة المخرجات' : 'Total Output VAT', 'القيمة الخاضعة': taxData.totalOutputBase, 'معدل الضريبة': '-', 'قيمة الضريبة': taxData.totalOutputTax },
      
      { 'البيان': isAr ? 'إجمالي المشتريات الخاضعة للضريبة' : 'Standard Rate Purchases', 'القيمة الخاضعة': taxData.totalPurchaseBase, 'معدل الضريبة': '14%', 'قيمة الضريبة': taxData.totalPurchaseTax },
      { 'البيان': isAr ? 'مرتجع المبيعات الخاضع للضريبة' : 'Taxable Sales Returns', 'القيمة الخاضعة': taxData.totalSRBase, 'معدل الضريبة': '14%', 'قيمة الضريبة': taxData.totalSRTax },
      { 'البيان': isAr ? 'إجمالي ضريبة المدخلات' : 'Total Input VAT', 'القيمة الخاضعة': taxData.totalInputBase, 'معدل الضريبة': '-', 'قيمة الضريبة': taxData.totalInputTax },
      
      { 'البيان': isAr ? 'صافي الضريبة المستحقة للدفع / (الاسترداد)' : 'Net VAT Payable / (Refundable)', 'القيمة الخاضعة': '-', 'معدل الضريبة': '-', 'قيمة الضريبة': taxData.netVatPayable }
    ];
    exportToCSV(rows, `VAT_Declaration_${startDate}_to_${endDate}`);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'الإقرار الضريبي (ضريبة القيمة المضافة)' : 'VAT Tax Declaration'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'احتساب ضريبة المخرجات والمدخلات وصافي الضريبة المستحقة' : 'Calculate output, input, and net VAT payable/refundable'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-lg cursor-pointer">
            <FileSpreadsheet className="h-4 w-4" />
            {isAr ? 'تصدير الإقرار إلى Excel' : 'Export Declaration'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'من تاريخ' : 'From Date'}</label>
          <div className="relative">
            <Calendar className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400`} />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className={`${isAr ? 'pr-3 pl-9' : 'pl-3 pr-9'} py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white`} />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'إلى تاريخ' : 'To Date'}</label>
          <div className="relative">
            <Calendar className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400`} />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className={`${isAr ? 'pr-3 pl-9' : 'pl-3 pr-9'} py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Output Tax */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'ضريبة المخرجات (المبيعات)' : 'Output VAT (Sales)'}</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-600 dark:text-slate-400">{isAr ? 'مبيعات الفواتير العامة' : 'General Invoice Sales'}</span>
              <span className="font-black text-slate-900 dark:text-white">{formatCurrency(taxData.totalInvTax)}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-600 dark:text-slate-400">{isAr ? 'مبيعات الكاشير (POS)' : 'POS Sales'}</span>
              <span className="font-black text-slate-900 dark:text-white">{formatCurrency(taxData.totalPOSTax)}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-600 dark:text-slate-400">{isAr ? 'مرتجعات المشتريات (تخفيض مدخلات)' : 'Purchase Returns'}</span>
              <span className="font-black text-slate-900 dark:text-white">{formatCurrency(taxData.totalPRTax)}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2">
              <span className="font-black text-slate-900 dark:text-white">{isAr ? 'إجمالي ضريبة المخرجات' : 'Total Output VAT'}</span>
              <span className="font-black text-slate-900 dark:text-white">{formatCurrency(taxData.totalOutputTax)}</span>
            </div>
          </div>
        </div>

        {/* Input Tax */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'ضريبة المدخلات (المشتريات)' : 'Input VAT (Purchases)'}</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-600 dark:text-slate-400">{isAr ? 'المشتريات' : 'Purchases'}</span>
              <span className="font-black text-slate-900 dark:text-white">{formatCurrency(taxData.totalPurchaseTax)}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-600 dark:text-slate-400">{isAr ? 'مرتجعات المبيعات (تخفيض مخرجات)' : 'Sales Returns'}</span>
              <span className="font-black text-slate-900 dark:text-white">{formatCurrency(taxData.totalSRTax)}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2">
              <span className="font-black text-slate-900 dark:text-white">{isAr ? 'إجمالي المدخلات' : 'Total Input'}</span>
              <span className="font-black text-slate-900 dark:text-white">{formatCurrency(taxData.totalInputTax)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`p-6 rounded-xl border ${taxData.netVatPayable >= 0 ? 'bg-slate-50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800/30' : 'bg-slate-50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800/30'} flex flex-col sm:flex-row justify-between items-center gap-4`}>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            {taxData.netVatPayable >= 0 ? (isAr ? 'صافي الضريبة المستحقة للدفع (هيئة الزكاة والدخل)' : 'Net VAT Payable') : (isAr ? 'صافي الضريبة القابلة للاسترداد' : 'Net VAT Refundable')}
          </h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            {isAr ? 'الفرق بين إجمالي ضريبة المخرجات وإجمالي ضريبة المدخلات خلال الفترة المحددة' : 'Difference between total output VAT and total input VAT'}
          </p>
        </div>
        <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {formatCurrency(Math.abs(taxData.netVatPayable))}
        </div>
      </div>
    </div>
  );
}
