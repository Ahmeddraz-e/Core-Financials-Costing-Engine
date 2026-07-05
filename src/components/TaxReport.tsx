import React, { useState, useMemo } from 'react';
import { Calculator, Calendar, Download, Printer } from 'lucide-react';
import { ERPData } from '../types';
import { printDocument, fmtCurrency, fmtDate, companyHeaderHTML, signaturesHTML, footerHTML } from '../utils/printUtils';

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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(val);

  // Output VAT (Sales and Sales Returns)
  // Input VAT (Purchases and Purchase Returns)
  
  const taxData = useMemo(() => {
    // 1. Output VAT from Sales
    const sales = (data.salesInvoices || []).filter(s => s.date >= startDate && s.date <= endDate);
    const totalSalesBase = sales.reduce((sum, s) => sum + s.subtotal, 0);
    const totalSalesTax = sales.reduce((sum, s) => sum + s.taxAmount, 0);

    // 2. Output VAT adjustments from Purchase Returns (Credit to VAT)
    const purchaseReturns = (data.purchaseReturns || []).filter(pr => pr.date >= startDate && pr.date <= endDate);
    const totalPRBase = purchaseReturns.reduce((sum, pr) => sum + pr.subtotal, 0);
    const totalPRTax = purchaseReturns.reduce((sum, pr) => sum + pr.taxAmount, 0);

    const totalOutputTax = totalSalesTax + totalPRTax;

    // 3. Input VAT from Purchases
    const purchases = (data.purchases || []).filter(p => p.date >= startDate && p.date <= endDate);
    // Assuming standard 15% VAT on purchases for this report demo if not explicitly stored
    const totalPurchaseBase = purchases.reduce((sum, p) => sum + p.totalAmount / 1.15, 0); // Approx base if tax wasn't separated in earlier model
    const totalPurchaseTax = purchases.reduce((sum, p) => sum + (p.totalAmount - (p.totalAmount / 1.15)), 0);

    // 4. Input VAT adjustments from Sales Returns (Debit to VAT)
    const salesReturns = (data.salesReturns || []).filter(sr => sr.date >= startDate && sr.date <= endDate);
    const totalSRBase = salesReturns.reduce((sum, sr) => sum + sr.subtotal, 0);
    const totalSRTax = salesReturns.reduce((sum, sr) => sum + sr.taxAmount, 0);

    const totalInputTax = totalPurchaseTax + totalSRTax;

    const netVatPayable = totalOutputTax - totalInputTax;

    return {
      salesCount: sales.length,
      totalSalesBase,
      totalSalesTax,
      prCount: purchaseReturns.length,
      totalPRBase,
      totalPRTax,
      totalOutputTax,
      
      purchaseCount: purchases.length,
      totalPurchaseBase,
      totalPurchaseTax,
      srCount: salesReturns.length,
      totalSRBase,
      totalSRTax,
      totalInputTax,
      
      netVatPayable
    };
  }, [data, startDate, endDate]);

  const handlePrint = () => {
    const html = `
      <div class="print-page" style="max-width:297mm; padding:15mm;">
        ${companyHeaderHTML()}
        <div class="doc-title">
          <h2>${isAr ? 'الإقرار الضريبي (ضريبة القيمة المضافة)' : 'VAT Declaration Report'}</h2>
          <div class="doc-number">${isAr ? 'من:' : 'From:'} ${fmtDate(startDate, lang)} ${isAr ? 'إلى:' : 'To:'} ${fmtDate(endDate, lang)}</div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-top:20px;">
          <thead>
            <tr>
              <th colspan="3" style="background:#1e40af; color:white; text-align:center; font-size:16px; padding:10px;">
                ${isAr ? 'ضريبة المخرجات (المبيعات وما في حكمها)' : 'Output VAT (Sales & Equivalents)'}
              </th>
            </tr>
            <tr style="background:#f1f5f9;">
              <th style="width:50%; text-align:${isAr ? 'right' : 'left'}; padding:8px;">${isAr ? 'البيان' : 'Description'}</th>
              <th style="text-align:center; padding:8px;">${isAr ? 'المبلغ الخاضع (غير شامل الضريبة)' : 'Taxable Amount (Excl. VAT)'}</th>
              <th style="text-align:center; padding:8px;">${isAr ? 'قيمة الضريبة' : 'VAT Amount'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${isAr ? 'المبيعات الخاضعة للنسبة الأساسية' : 'Standard Rated Sales'} (${taxData.salesCount})</td>
              <td style="text-align:center; padding:8px; border-bottom:1px solid #e2e8f0;">${fmtCurrency(taxData.totalSalesBase, lang)}</td>
              <td style="text-align:center; padding:8px; border-bottom:1px solid #e2e8f0;">${fmtCurrency(taxData.totalSalesTax, lang)}</td>
            </tr>
            <tr>
              <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${isAr ? 'مرتجعات المشتريات (تخفيض المدخلات)' : 'Purchase Returns (Input Adj.)'} (${taxData.prCount})</td>
              <td style="text-align:center; padding:8px; border-bottom:1px solid #e2e8f0;">${fmtCurrency(taxData.totalPRBase, lang)}</td>
              <td style="text-align:center; padding:8px; border-bottom:1px solid #e2e8f0;">${fmtCurrency(taxData.totalPRTax, lang)}</td>
            </tr>
            <tr style="background:#f8fafc; font-weight:bold;">
              <td style="padding:10px; border-bottom:2px solid #cbd5e1; color:#0f172a;">${isAr ? 'إجمالي ضريبة المخرجات' : 'Total Output VAT'}</td>
              <td style="text-align:center; padding:10px; border-bottom:2px solid #cbd5e1;">${fmtCurrency(taxData.totalSalesBase + taxData.totalPRBase, lang)}</td>
              <td style="text-align:center; padding:10px; border-bottom:2px solid #cbd5e1; color:#dc2626;">${fmtCurrency(taxData.totalOutputTax, lang)}</td>
            </tr>
          </tbody>

          <thead>
            <tr>
              <th colspan="3" style="background:#166534; color:white; text-align:center; font-size:16px; padding:10px; margin-top:20px;">
                ${isAr ? 'ضريبة المدخلات (المشتريات وما في حكمها)' : 'Input VAT (Purchases & Equivalents)'}
              </th>
            </tr>
            <tr style="background:#f1f5f9;">
              <th style="width:50%; text-align:${isAr ? 'right' : 'left'}; padding:8px;">${isAr ? 'البيان' : 'Description'}</th>
              <th style="text-align:center; padding:8px;">${isAr ? 'المبلغ الخاضع (غير شامل الضريبة)' : 'Taxable Amount (Excl. VAT)'}</th>
              <th style="text-align:center; padding:8px;">${isAr ? 'قيمة الضريبة' : 'VAT Amount'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${isAr ? 'المشتريات الخاضعة للنسبة الأساسية' : 'Standard Rated Purchases'} (${taxData.purchaseCount})</td>
              <td style="text-align:center; padding:8px; border-bottom:1px solid #e2e8f0;">${fmtCurrency(taxData.totalPurchaseBase, lang)}</td>
              <td style="text-align:center; padding:8px; border-bottom:1px solid #e2e8f0;">${fmtCurrency(taxData.totalPurchaseTax, lang)}</td>
            </tr>
            <tr>
              <td style="padding:8px; border-bottom:1px solid #e2e8f0;">${isAr ? 'مرتجعات المبيعات (تخفيض المخرجات)' : 'Sales Returns (Output Adj.)'} (${taxData.srCount})</td>
              <td style="text-align:center; padding:8px; border-bottom:1px solid #e2e8f0;">${fmtCurrency(taxData.totalSRBase, lang)}</td>
              <td style="text-align:center; padding:8px; border-bottom:1px solid #e2e8f0;">${fmtCurrency(taxData.totalSRTax, lang)}</td>
            </tr>
            <tr style="background:#f8fafc; font-weight:bold;">
              <td style="padding:10px; border-bottom:2px solid #cbd5e1; color:#0f172a;">${isAr ? 'إجمالي ضريبة المدخلات' : 'Total Input VAT'}</td>
              <td style="text-align:center; padding:10px; border-bottom:2px solid #cbd5e1;">${fmtCurrency(taxData.totalPurchaseBase + taxData.totalSRBase, lang)}</td>
              <td style="text-align:center; padding:10px; border-bottom:2px solid #cbd5e1; color:#166534;">${fmtCurrency(taxData.totalInputTax, lang)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:30px; padding:20px; background:${taxData.netVatPayable >= 0 ? '#fef2f2' : '#f0fdf4'}; border:2px solid ${taxData.netVatPayable >= 0 ? '#fca5a5' : '#bbf7d0'}; border-radius:8px; text-align:center;">
          <h3 style="margin:0; font-size:18px; color:${taxData.netVatPayable >= 0 ? '#991b1b' : '#166534'};">
            ${taxData.netVatPayable >= 0 ? (isAr ? 'صافي الضريبة المستحقة للدفع' : 'Net VAT Payable') : (isAr ? 'صافي الضريبة القابلة للاسترداد/الترحيل' : 'Net VAT Refundable')}
          </h3>
          <div style="font-size:32px; font-weight:900; color:#0f172a; margin-top:10px;">
            ${fmtCurrency(Math.abs(taxData.netVatPayable), lang)}
          </div>
        </div>

        ${signaturesHTML([
          isAr ? 'إعداد (المحاسب المالي)' : 'Prepared By (Accountant)',
          isAr ? 'مراجعة (مدير الحسابات)' : 'Reviewed By (Chief Acc.)',
          isAr ? 'اعتماد (المدير المالي)' : 'Approved By (CFO)'
        ])}
      </div>
    `;
    printDocument(html, `${isAr ? 'الإقرار الضريبي' : 'VAT Declaration'} ${startDate} - ${endDate}`);
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
          <button onClick={handlePrint} className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-lg">
            <Printer className="h-4 w-4" />
            {isAr ? 'طباعة الإقرار' : 'Print Declaration'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'من تاريخ' : 'From Date'}</label>
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="pl-3 pr-9 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'إلى تاريخ' : 'To Date'}</label>
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="pl-3 pr-9 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
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
              <span className="font-bold text-slate-600 dark:text-slate-400">{isAr ? 'المبيعات' : 'Sales'}</span>
              <span className="font-black text-slate-900 dark:text-white">{formatCurrency(taxData.totalSalesTax)}</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-600 dark:text-slate-400">{isAr ? 'مرتجعات المشتريات (تخفيض مدخلات)' : 'Purchase Returns'}</span>
              <span className="font-black text-slate-900 dark:text-white">{formatCurrency(taxData.totalPRTax)}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2">
              <span className="font-black text-slate-900 dark:text-white">{isAr ? 'إجمالي المخرجات' : 'Total Output'}</span>
              <span className="font-black text-red-600 dark:text-red-500">{formatCurrency(taxData.totalOutputTax)}</span>
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
              <span className="font-black text-emerald-600 dark:text-emerald-500">{formatCurrency(taxData.totalInputTax)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`p-6 rounded-xl border ${taxData.netVatPayable >= 0 ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30' : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30'} flex flex-col sm:flex-row justify-between items-center gap-4`}>
        <div>
          <h3 className={`text-lg font-black ${taxData.netVatPayable >= 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {taxData.netVatPayable >= 0 ? (isAr ? 'صافي الضريبة المستحقة للدفع (هيئة الزكاة والدخل)' : 'Net VAT Payable') : (isAr ? 'صافي الضريبة القابلة للاسترداد' : 'Net VAT Refundable')}
          </h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            {isAr ? 'الفرق بين إجمالي ضريبة المخرجات وإجمالي ضريبة المدخلات خلال الفترة المحددة' : 'Difference between total output VAT and total input VAT'}
          </p>
        </div>
        <div className={`text-3xl font-black tracking-tight ${taxData.netVatPayable >= 0 ? 'text-red-600 dark:text-red-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
          {formatCurrency(Math.abs(taxData.netVatPayable))}
        </div>
      </div>
    </div>
  );
}
