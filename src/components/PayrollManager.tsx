import React, { useState, useMemo } from 'react';
import { Users, Plus, Printer, Check, X, Download, FileText, Search, CreditCard, Clock } from 'lucide-react';
import { ERPData, Employee, PayrollRun, PayslipLine, JournalEntry, JournalEntryType } from '../types';
import { printDocument, fmtCurrency, fmtDate, numberToArabicWords, companyHeaderHTML, signaturesHTML, footerHTML, exportToCSV } from '../utils/printUtils';

interface PayrollManagerProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdatePayrollRuns: (runs: PayrollRun[]) => void;
  onUpdateEmployees: (emp: Employee[]) => void;
  onUpdateAccounts: (acc: any[]) => void;
  onUpdateEntries: (je: JournalEntry[]) => void;
  onUpdateTreasuries: (t: any[]) => void;
  onAddAuditLog: (ar: string, en: string, d: string) => void;
}

export default function PayrollManager({
  data, lang,
  onUpdatePayrollRuns, onUpdateEmployees, onUpdateAccounts,
  onUpdateEntries, onUpdateTreasuries, onAddAuditLog
}: PayrollManagerProps) {
  const isAr = lang === 'ar';
  
  const [activeView, setActiveView] = useState<'list' | 'new'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Run Form State
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [runDate, setRunDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tempLines, setTempLines] = useState<PayslipLine[]>([]);
  
  // Initialize lines when opening new view
  const handleStartNewRun = () => {
    const existingRun = (data.payrollRuns || []).find(r => r.month === selectedMonth && r.year === selectedYear);
    if (existingRun) {
      window.showAlert(
        `تم إصدار رواتب شهر ${selectedMonth}/${selectedYear} مسبقاً`,
        `Payroll for ${selectedMonth}/${selectedYear} has already been generated`,
        'warning'
      );
      return;
    }

    const activeEmployees = data.employees.filter(e => e.active);
    
    const initialLines: PayslipLine[] = activeEmployees.map(emp => {
      const basic = emp.salary || 0;
      const wDays = emp.workingDays || 30;
      return {
        employeeId: emp.id,
        basicSalary: basic,
        workingDays: wDays,
        actualDays: wDays,
        overtime: emp.overtimeHours || 0,
        overtimeAmount: ((emp.overtimeHours || 0) * (basic / (wDays * 8))), // Approx per hour rate
        allowances: emp.allowances || 0,
        grossPay: 0, // calc later
        deductions: emp.deductions || 0,
        loanInstallment: emp.loanBalance > 0 ? Math.min(emp.loanBalance, basic * 0.1) : 0, // Auto deduct 10% or remaining
        socialInsurance: 0,
        tax: 0,
        netPay: 0 // calc later
      };
    });

    setTempLines(initialLines.map(calcTotals));
    setActiveView('new');
  };

  const calcTotals = (line: PayslipLine): PayslipLine => {
    // Basic ratio by days worked
    const dailyRate = line.basicSalary / line.workingDays;
    const earnedBasic = dailyRate * line.actualDays;
    
    const grossPay = earnedBasic + line.overtimeAmount + line.allowances;
    const netPay = grossPay - line.deductions - line.loanInstallment - line.socialInsurance - line.tax;

    return { ...line, grossPay, netPay };
  };

  const updateLine = (employeeId: string, field: keyof PayslipLine, value: number) => {
    setTempLines(lines => lines.map(line => {
      if (line.employeeId === employeeId) {
        return calcTotals({ ...line, [field]: value });
      }
      return line;
    }));
  };

  const getEmpName = (id: string) => {
    const e = data.employees.find(x => x.id === id);
    return e ? (isAr ? e.nameAr : e.nameEn) : '';
  };

  const getEmpRole = (id: string) => {
    const e = data.employees.find(x => x.id === id);
    return e ? e.role : '';
  };

  // Submit Payroll
  const handleApprovePayroll = () => {
    if (tempLines.length === 0) return;
    
    const totalGross = tempLines.reduce((s, l) => s + l.grossPay, 0);
    const totalDeductions = tempLines.reduce((s, l) => s + (l.deductions + l.loanInstallment + l.socialInsurance + l.tax), 0);
    const totalNet = tempLines.reduce((s, l) => s + l.netPay, 0);
    
    const runNum = `PR-${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    
    // Create Journal Entry
    const jeId = 'je-pr-' + Math.random().toString(36).substring(2, 9);
    const totalLoansRecovered = tempLines.reduce((s, l) => s + l.loanInstallment, 0);
    
    const jeLines = [];
    // Dr Salaries Expense (501)
    jeLines.push({ accountId: '501', debit: totalGross, credit: 0 });
    // Cr Cash/Bank (101) for Net
    jeLines.push({ accountId: '101', debit: 0, credit: totalNet });
    // Cr Employee Loans (104) if applicable
    if (totalLoansRecovered > 0) {
      jeLines.push({ accountId: '104', debit: 0, credit: totalLoansRecovered });
    }
    // Cr Other deductions/insurance/taxes (204) - simplifying for now
    const otherDeductions = totalDeductions - totalLoansRecovered;
    if (otherDeductions > 0) {
      jeLines.push({ accountId: '204', debit: 0, credit: otherDeductions });
    }
    
    const newJE: JournalEntry = {
      id: jeId,
      entryNumber: `JV-${runNum}`,
      date: runDate,
      type: JournalEntryType.Auto,
      description: isAr ? `قيد استحقاق وصرف رواتب ${selectedMonth}/${selectedYear}` : `Payroll JE for ${selectedMonth}/${selectedYear}`,
      lines: jeLines,
      approved: true,
      approvedBy: 'النظام'
    };

    const newRun: PayrollRun = {
      id: 'pr-' + Math.random().toString(36).substring(2, 9),
      runNumber: runNum,
      month: selectedMonth,
      year: selectedYear,
      date: runDate,
      status: 'PAID',
      lines: tempLines,
      totalGross,
      totalDeductions,
      totalNet,
      journalEntryId: jeId
    };

    // Update Employee Loan Balances
    const updatedEmployees = data.employees.map(emp => {
      const line = tempLines.find(l => l.employeeId === emp.id);
      if (line && line.loanInstallment > 0) {
        return { ...emp, loanBalance: Math.max(0, emp.loanBalance - line.loanInstallment) };
      }
      return emp;
    });

    // Update Accounts
    const updatedAccounts = data.accounts.map(acc => {
      if (acc.id === '501') return { ...acc, balance: acc.balance + totalGross };
      if (acc.id === '101') return { ...acc, balance: acc.balance - totalNet };
      if (acc.id === '104') return { ...acc, balance: acc.balance - totalLoansRecovered };
      if (acc.id === '204') return { ...acc, balance: acc.balance + otherDeductions };
      return acc;
    });
    
    // Update Treasury
    const updatedTreasuries = data.treasuries.map(t => 
      t.id === 'cb-1' ? { ...t, balance: t.balance - totalNet } : t
    );

    onUpdatePayrollRuns([newRun, ...(data.payrollRuns || [])]);
    onUpdateEmployees(updatedEmployees);
    onUpdateEntries([newJE, ...data.journalEntries]);
    onUpdateAccounts(updatedAccounts);
    onUpdateTreasuries(updatedTreasuries);
    
    onAddAuditLog(
      `اعتماد وصرف رواتب شهر ${selectedMonth}/${selectedYear}`,
      `Approved and paid payroll for ${selectedMonth}/${selectedYear}`,
      `بإجمالي صافي: ${formatCurrency(totalNet)}`
    );

    setActiveView('list');
    window.showAlert('تم اعتماد الرواتب بنجاح', 'Payroll approved successfully', 'success');
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(val);

  // Print single payslip
  const handlePrintPayslip = (run: PayrollRun, line: PayslipLine) => {
    const html = `
      <div class="print-page">
        ${companyHeaderHTML()}
        <div class="doc-title">
          <h2>${isAr ? 'قسيمة راتب (مفردات مرتب)' : 'Payslip'}</h2>
          <div class="doc-number">${isAr ? 'شهر' : 'Month'} ${run.month}/${run.year}</div>
        </div>

        <div class="info-grid">
          <div class="info-box"><div class="label">${isAr ? 'اسم الموظف' : 'Employee Name'}</div><div class="value">${getEmpName(line.employeeId)}</div></div>
          <div class="info-box"><div class="label">${isAr ? 'الوظيفة' : 'Role'}</div><div class="value">${getEmpRole(line.employeeId)}</div></div>
          <div class="info-box"><div class="label">${isAr ? 'أيام العمل' : 'Days Worked'}</div><div class="value">${line.actualDays} / ${line.workingDays}</div></div>
          <div class="info-box"><div class="label">${isAr ? 'تاريخ الصرف' : 'Pay Date'}</div><div class="value">${fmtDate(run.date, lang)}</div></div>
        </div>

        <table style="margin-top:20px; width:100%;">
          <thead>
            <tr>
              <th colspan="2" style="background:#f0fdf4; color:#166534">${isAr ? 'الاستحقاقات' : 'Earnings'}</th>
              <th colspan="2" style="background:#fef2f2; color:#991b1b">${isAr ? 'الاستقطاعات' : 'Deductions'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${isAr ? 'الراتب الأساسي' : 'Basic Salary'}</td>
              <td style="text-align:left; font-weight:bold">${fmtCurrency(line.basicSalary, lang)}</td>
              <td>${isAr ? 'خصومات/غياب' : 'Absence/Penalties'}</td>
              <td style="text-align:left; font-weight:bold">${fmtCurrency(line.deductions, lang)}</td>
            </tr>
            <tr>
              <td>${isAr ? 'بدلات' : 'Allowances'}</td>
              <td style="text-align:left; font-weight:bold">${fmtCurrency(line.allowances, lang)}</td>
              <td>${isAr ? 'قسط سلفة' : 'Loan Installment'}</td>
              <td style="text-align:left; font-weight:bold">${fmtCurrency(line.loanInstallment, lang)}</td>
            </tr>
            <tr>
              <td>${isAr ? 'إضافي/عمل ساعات إضافية' : 'Overtime'}</td>
              <td style="text-align:left; font-weight:bold">${fmtCurrency(line.overtimeAmount, lang)}</td>
              <td>${isAr ? 'تأمينات اجتماعية' : 'Social Insurance'}</td>
              <td style="text-align:left; font-weight:bold">${fmtCurrency(line.socialInsurance, lang)}</td>
            </tr>
            <tr>
              <td></td>
              <td></td>
              <td>${isAr ? 'ضرائب' : 'Taxes'}</td>
              <td style="text-align:left; font-weight:bold">${fmtCurrency(line.tax, lang)}</td>
            </tr>
            <tr style="background:#f8fafc; font-size:14px;">
              <td style="font-weight:900; color:#166534">${isAr ? 'إجمالي الاستحقاقات' : 'Gross Pay'}</td>
              <td style="text-align:left; font-weight:900; color:#166534">${fmtCurrency(line.grossPay, lang)}</td>
              <td style="font-weight:900; color:#991b1b">${isAr ? 'إجمالي الاستقطاعات' : 'Total Deductions'}</td>
              <td style="text-align:left; font-weight:900; color:#991b1b">${fmtCurrency(line.deductions + line.loanInstallment + line.socialInsurance + line.tax, lang)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:20px; border:2px solid #0f172a; padding:15px; border-radius:8px; text-align:center; background:#f8fafc">
          <div style="font-size:12px; font-weight:bold; color:#64748b; margin-bottom:5px;">${isAr ? 'صافي الراتب المستحق' : 'Net Pay'}</div>
          <div style="font-size:24px; font-weight:900; color:#0f172a;">${fmtCurrency(line.netPay, lang)}</div>
          <div style="font-size:12px; margin-top:5px; color:#475569;">${numberToArabicWords(line.netPay)}</div>
        </div>

        ${signaturesHTML([
          isAr ? 'مدير الموارد البشرية' : 'HR Manager',
          isAr ? 'المدير المالي' : 'Finance Manager',
          isAr ? 'توقيع الموظف بالاستلام' : 'Employee Signature'
        ])}
        
        ${footerHTML()}
      </div>
    `;
    printDocument(html, `${isAr ? 'قسيمة راتب' : 'Payslip'} - ${getEmpName(line.employeeId)}`);
  };

  // Print Full Payroll Report
  const handlePrintRun = (run: PayrollRun) => {
    const rowsHTML = run.lines.map((line, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${getEmpName(line.employeeId)}</td>
        <td style="text-align:center">${line.actualDays}</td>
        <td style="text-align:left">${fmtCurrency(line.basicSalary, lang)}</td>
        <td style="text-align:left">${fmtCurrency(line.allowances + line.overtimeAmount, lang)}</td>
        <td style="text-align:left; color:#166534; font-weight:bold">${fmtCurrency(line.grossPay, lang)}</td>
        <td style="text-align:left">${fmtCurrency(line.deductions + line.tax + line.socialInsurance, lang)}</td>
        <td style="text-align:left">${fmtCurrency(line.loanInstallment, lang)}</td>
        <td style="text-align:left; color:#0f172a; font-weight:900">${fmtCurrency(line.netPay, lang)}</td>
      </tr>
    `).join('');

    const html = `
      <div class="print-page" style="max-width:297mm; padding:15mm;">
        ${companyHeaderHTML()}
        <div class="doc-title">
          <h2>${isAr ? 'كشف رواتب الموظفين' : 'Payroll Sheet'}</h2>
          <div class="doc-number">${isAr ? 'شهر' : 'Month'} ${run.month}/${run.year} - ${run.runNumber}</div>
        </div>

        <div class="info-grid">
          <div class="info-box"><div class="label">${isAr ? 'تاريخ الإصدار' : 'Issue Date'}</div><div class="value">${fmtDate(run.date, lang)}</div></div>
          <div class="info-box"><div class="label">${isAr ? 'حالة الكشف' : 'Status'}</div><div class="value">${isAr ? 'معتمد ومصروف' : 'Approved & Paid'}</div></div>
          <div class="info-box"><div class="label">${isAr ? 'عدد الموظفين' : 'Employees Count'}</div><div class="value">${run.lines.length}</div></div>
          <div class="info-box"><div class="label">${isAr ? 'إجمالي الصافي' : 'Total Net Pay'}</div><div class="value" style="color:#0f172a; font-weight:bold">${fmtCurrency(run.totalNet, lang)}</div></div>
        </div>

        <table style="font-size:10px;">
          <thead>
            <tr>
              <th style="width:30px">#</th>
              <th>${isAr ? 'اسم الموظف' : 'Employee'}</th>
              <th style="width:40px">${isAr ? 'أيام' : 'Days'}</th>
              <th style="width:70px">${isAr ? 'أساسي' : 'Basic'}</th>
              <th style="width:70px">${isAr ? 'إضافي/بدلات' : 'Allowances'}</th>
              <th style="width:80px; background:#f0fdf4">${isAr ? 'إجمالي الاستحقاق' : 'Gross Pay'}</th>
              <th style="width:70px">${isAr ? 'استقطاعات' : 'Deductions'}</th>
              <th style="width:60px">${isAr ? 'سلف' : 'Loans'}</th>
              <th style="width:90px; background:#f8fafc">${isAr ? 'الصافي' : 'Net Pay'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
            <tr style="background:#1e40af; color:#fff; font-weight:bold; font-size:12px;">
              <td colspan="5" style="text-align:left">${isAr ? 'الإجمالي العام' : 'Grand Total'}</td>
              <td style="text-align:left">${fmtCurrency(run.totalGross, lang)}</td>
              <td style="text-align:left" colspan="2">${fmtCurrency(run.totalDeductions, lang)}</td>
              <td style="text-align:left">${fmtCurrency(run.totalNet, lang)}</td>
            </tr>
          </tbody>
        </table>

        ${signaturesHTML([
          isAr ? 'إعداد (الموارد البشرية)' : 'Prepared By (HR)',
          isAr ? 'مراجعة (الحسابات)' : 'Reviewed By (Finance)',
          isAr ? 'اعتماد (المدير العام)' : 'Approved By (GM)'
        ])}
      </div>
    `;
    printDocument(html, `${isAr ? 'كشف رواتب' : 'Payroll Sheet'} - ${run.month}-${run.year}`);
  };

  const runs = data.payrollRuns || [];
  const filteredRuns = runs.filter(r => r.runNumber.includes(searchTerm) || `${r.month}/${r.year}`.includes(searchTerm));

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'إدارة مسيرات الرواتب' : 'Payroll Management'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'إصدار الرواتب الشهرية، قسائم الراتب، والخصم التلقائي للسلف' : 'Generate monthly payrolls, payslips, and auto-deduct loans'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeView === 'list' ? (
            <button onClick={() => {
              const d = new Date();
              setSelectedMonth(d.getMonth() + 1);
              setSelectedYear(d.getFullYear());
              handleStartNewRun();
            }}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-lg">
              <Plus className="h-3.5 w-3.5" />
              {isAr ? 'إصدار رواتب شهرية' : 'New Payroll Run'}
            </button>
          ) : (
            <button onClick={() => setActiveView('list')}
              className="px-4 py-2.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {isAr ? 'رجوع للقائمة' : 'Back to List'}
            </button>
          )}
        </div>
      </div>

      {activeView === 'new' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap gap-4 items-center border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'الشهر' : 'Month'}</label>
              <select value={selectedMonth} onChange={e => {setSelectedMonth(+e.target.value); handleStartNewRun();}}
                className="w-24 px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white">
                {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'السنة' : 'Year'}</label>
              <input type="number" value={selectedYear} onChange={e => {setSelectedYear(+e.target.value); handleStartNewRun();}}
                className="w-24 px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'تاريخ الصرف' : 'Pay Date'}</label>
              <input type="date" value={runDate} onChange={e => setRunDate(e.target.value)}
                className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
            <div className="flex-1 flex justify-end">
              <button onClick={handleApprovePayroll} className="px-5 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg flex items-center gap-2">
                <Check className="h-4 w-4" /> {isAr ? 'اعتماد وصرف الرواتب' : 'Approve & Pay Payroll'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-right px-2 py-3 font-bold text-slate-500">{isAr ? 'الموظف' : 'Employee'}</th>
                  <th className="text-center px-2 py-3 font-bold text-slate-500 w-16">{isAr ? 'أيام عمل' : 'Days'}</th>
                  <th className="text-left px-2 py-3 font-bold text-slate-500">{isAr ? 'أساسي' : 'Basic'}</th>
                  <th className="text-left px-2 py-3 font-bold text-slate-500 w-24">{isAr ? 'بدلات/إضافي' : 'Allowances'}</th>
                  <th className="text-left px-2 py-3 font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10">{isAr ? 'إجمالي الاستحقاق' : 'Gross Pay'}</th>
                  <th className="text-left px-2 py-3 font-bold text-slate-500 w-24">{isAr ? 'خصومات' : 'Deduct.'}</th>
                  <th className="text-left px-2 py-3 font-bold text-slate-500 w-24">{isAr ? 'سلف/قروض' : 'Loans'}</th>
                  <th className="text-left px-2 py-3 font-bold text-slate-500 w-24">{isAr ? 'تأمينات/ضرائب' : 'Taxes/Ins.'}</th>
                  <th className="text-left px-2 py-3 font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/10">{isAr ? 'الصافي' : 'Net Pay'}</th>
                </tr>
              </thead>
              <tbody>
                {tempLines.map((line, i) => (
                  <tr key={line.employeeId} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-2 font-bold text-slate-900 dark:text-white">{getEmpName(line.employeeId)}</td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} max={line.workingDays} value={line.actualDays} onChange={e => updateLine(line.employeeId, 'actualDays', +e.target.value)}
                        className="w-full text-center px-1 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                    </td>
                    <td className="px-2 py-2 font-bold">{formatCurrency(line.basicSalary)}</td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} value={line.allowances + line.overtimeAmount} onChange={e => updateLine(line.employeeId, 'allowances', +e.target.value)}
                        className="w-full px-1 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                    </td>
                    <td className="px-2 py-2 font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/5">{formatCurrency(line.grossPay)}</td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} value={line.deductions} onChange={e => updateLine(line.employeeId, 'deductions', +e.target.value)}
                        className="w-full px-1 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} value={line.loanInstallment} onChange={e => updateLine(line.employeeId, 'loanInstallment', +e.target.value)}
                        title={isAr ? `الرصيد المتبقي للسلفة: ${data.employees.find(e => e.id === line.employeeId)?.loanBalance}` : `Remaining loan: ${data.employees.find(e => e.id === line.employeeId)?.loanBalance}`}
                        className={`w-full px-1 py-1 text-xs rounded border ${line.loanInstallment > 0 ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`} />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} value={line.socialInsurance + line.tax} onChange={e => updateLine(line.employeeId, 'tax', +e.target.value)}
                        className="w-full px-1 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                    </td>
                    <td className="px-2 py-2 font-black text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/5 text-lg">{formatCurrency(line.netPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'list' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div className="relative max-w-xs w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder={isAr ? 'بحث...' : 'Search...'}
                className="w-full pr-9 pl-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white" />
            </div>
          </div>

          {filteredRuns.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold">
              {isAr ? 'لا توجد مسيرات رواتب مصدرة بعد' : 'No payroll runs generated yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'الشهر/السنة' : 'Month/Year'}</th>
                    <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'رقم الكشف' : 'Run #'}</th>
                    <th className="text-right px-4 py-3 font-bold text-slate-500">{isAr ? 'تاريخ الصرف' : 'Pay Date'}</th>
                    <th className="text-center px-4 py-3 font-bold text-slate-500">{isAr ? 'الموظفين' : 'Employees'}</th>
                    <th className="text-left px-4 py-3 font-bold text-slate-500">{isAr ? 'إجمالي الاستحقاق' : 'Total Gross'}</th>
                    <th className="text-left px-4 py-3 font-bold text-slate-500">{isAr ? 'إجمالي الصافي' : 'Total Net'}</th>
                    <th className="text-center px-4 py-3 font-bold text-slate-500">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns.map(run => (
                    <tr key={run.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-black text-slate-900 dark:text-white">{run.month} / {run.year}</td>
                      <td className="px-4 py-3 font-bold text-blue-600">{run.runNumber}</td>
                      <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400">{run.date}</td>
                      <td className="px-4 py-3 font-bold text-center">{run.lines.length}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600 text-left">{formatCurrency(run.totalGross)}</td>
                      <td className="px-4 py-3 font-black text-slate-900 dark:text-white text-left">{formatCurrency(run.totalNet)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handlePrintRun(run)} title={isAr ? 'طباعة كشف مجمع' : 'Print Payroll Sheet'}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <div className="relative group inline-block">
                            <button className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600">
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                              <div className="p-2 text-[10px] font-bold text-slate-400 border-b border-slate-100 dark:border-slate-700">{isAr ? 'طباعة قسيمة فردية' : 'Print individual payslip'}</div>
                              <ul className="max-h-40 overflow-y-auto">
                                {run.lines.map(line => (
                                  <li key={line.employeeId}>
                                    <button onClick={() => handlePrintPayslip(run, line)} className="w-full text-right px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 font-bold truncate">
                                      {getEmpName(line.employeeId)}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
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
