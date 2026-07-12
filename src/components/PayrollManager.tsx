import React, { useState, useMemo } from 'react';
import { Users, Plus, FileSpreadsheet, Check, X, Download, FileText, Search, CreditCard, Clock } from 'lucide-react';
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
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  
  const showPMAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 3000);
  };
  
  // New Run Form State
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [runDate, setRunDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tempLines, setTempLines] = useState<PayslipLine[]>([]);

  // Helper: Calculate approved leave days for an employee in a given month (excluding official holidays)
  const getLeaveDaysInMonth = (empId: string, month: number, year: number): number => {
    const leaves = data.hrLeaves || [];
    const holidaySet = new Set<string>(
      (data.hrEvents || [])
        .filter((e: any) => e.type === 'holiday')
        .map((e: any) => e.date)
    );
    let totalDays = 0;
    const approvedLeaves = leaves.filter((l: any) => 
      l.employeeId === empId && l.status === 'APPROVED' && l.type === 'UNPAID'
    );
    for (const leave of approvedLeaves) {
      const from = new Date(leave.from);
      const to = new Date(leave.to);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const overlapStart = from > monthStart ? from : monthStart;
      const overlapEnd = to < monthEnd ? to : monthEnd;
      if (overlapStart <= overlapEnd) {
        const cursor = new Date(overlapStart);
        while (cursor <= overlapEnd) {
          const ds = cursor.toISOString().split('T')[0];
          if (!holidaySet.has(ds)) totalDays++;
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }
    return totalDays;
  };
  
  // Initialize lines when opening new view
  const handleStartNewRun = () => {
    const existingRun = (data.payrollRuns || []).find(r => r.month === selectedMonth && r.year === selectedYear);
    if (existingRun) {
      showPMAlert(isAr ? `تم إصدار رواتب شهر ${selectedMonth}/${selectedYear} مسبقاً` : `Payroll for ${selectedMonth}/${selectedYear} has already been generated`);
      return;
    }

    const activeEmployees = data.employees.filter(e => e.active);
    
    const initialLines: PayslipLine[] = activeEmployees.map(emp => {
      const basic = emp.salary || 0;
      const wDays = emp.workingDays || 30;
      const leaveDays = getLeaveDaysInMonth(emp.id, selectedMonth, selectedYear);
      const actualDays = Math.max(0, wDays - leaveDays);
      return {
        employeeId: emp.id,
        basicSalary: basic,
        workingDays: wDays,
        actualDays: actualDays,
        overtime: emp.overtimeHours || 0,
        overtimeAmount: ((emp.overtimeHours || 0) * (basic / (wDays * (emp.workingHours || 8))) * 1.5),
        allowances: emp.allowances || 0,
        grossPay: 0, // calc later
        deductions: emp.deductions || 0,
        loanInstallment: emp.loanBalance > 0 ? Math.min(emp.loanBalance, basic * 0.1) : 0,
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
    const totalAllowances = tempLines.reduce((s, l) => s + l.allowances, 0);
    const totalDeductionsOnly = tempLines.reduce((s, l) => s + l.deductions, 0);
    const totalBasicAndOvertime = totalGross - totalAllowances;
    
    const jeLines = [];
    // Dr Basic Salary & Overtime (601)
    jeLines.push({ accountId: '601', debit: totalBasicAndOvertime, credit: 0 });
    // Dr Allowances Expense (606) if applicable
    if (totalAllowances > 0) {
      jeLines.push({ accountId: '606', debit: totalAllowances, credit: 0 });
    }
    // Cr Employee Penalties Income (405) if applicable
    if (totalDeductionsOnly > 0) {
      jeLines.push({ accountId: '405', debit: 0, credit: totalDeductionsOnly });
    }
    // Cr Cash/Bank (101) for Net
    jeLines.push({ accountId: '101', debit: 0, credit: totalNet });
    // Cr Employee Loans (107) if applicable
    if (totalLoansRecovered > 0) {
      jeLines.push({ accountId: '107', debit: 0, credit: totalLoansRecovered });
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
      if (acc.id === '601') return { ...acc, balance: acc.balance + totalBasicAndOvertime };
      if (acc.id === '606') return { ...acc, balance: acc.balance + totalAllowances };
      if (acc.id === '405') return { ...acc, balance: acc.balance + totalDeductionsOnly };
      if (acc.id === '101') return { ...acc, balance: acc.balance - totalNet };
      if (acc.id === '107') return { ...acc, balance: acc.balance - totalLoansRecovered };
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
    showPMAlert(isAr ? 'تم اعتماد الرواتب بنجاح' : 'Payroll approved successfully');
  };

  const formatCurrency = (val: number) => {
    const formattedNum = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val);
    return isAr ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
  }

  // Export single payslip to Excel
  const handleExportPayslip = (run: PayrollRun, line: PayslipLine) => {
    const rows = [{
      [isAr ? 'الموظف' : 'Employee']: getEmpName(line.employeeId),
      [isAr ? 'الوظيفة' : 'Role']: getEmpRole(line.employeeId),
      [isAr ? 'أيام العمل الفعالة' : 'Worked Days']: line.actualDays,
      [isAr ? 'الراتب الأساسي' : 'Basic Salary']: line.basicSalary,
      [isAr ? 'البدلات' : 'Allowances']: line.allowances,
      [isAr ? 'الإضافي' : 'Overtime']: line.overtimeAmount,
      [isAr ? 'الاستحقاقات الكلية' : 'Gross Pay']: line.grossPay,
      [isAr ? 'الخصومات' : 'Deductions']: line.deductions,
      [isAr ? 'السلف' : 'Loans']: line.loanInstallment,
      [isAr ? 'التأمينات' : 'Social Ins']: line.socialInsurance,
      [isAr ? 'الضرائب' : 'Tax']: line.tax,
      [isAr ? 'صافي الراتب' : 'Net Pay']: line.netPay
    }];
    exportToCSV(rows, `payslip_${getEmpName(line.employeeId).replace(/\s+/g, '_')}_${run.month}_${run.year}`);
  };

  // Export Full Payroll Report to Excel
  const handleExportRun = (run: PayrollRun) => {
    const rows = run.lines.map((line, i) => ({
      '#': i + 1,
      [isAr ? 'الموظف' : 'Employee']: getEmpName(line.employeeId),
      [isAr ? 'أيام العمل' : 'Worked Days']: line.actualDays,
      [isAr ? 'الراتب الأساسي' : 'Basic Salary']: line.basicSalary,
      [isAr ? 'البدلات والإضافي' : 'Allowances & OT']: line.allowances + line.overtimeAmount,
      [isAr ? 'إجمالي الاستحقاق' : 'Gross Pay']: line.grossPay,
      [isAr ? 'الاستقطاعات والضرائب' : 'Deductions & Taxes']: line.deductions + line.tax + line.socialInsurance,
      [isAr ? 'السلف' : 'Loans']: line.loanInstallment,
      [isAr ? 'صافي الراتب' : 'Net Pay']: line.netPay
    }));
    // Append grand total row
    rows.push({
      '#': 0,
      [isAr ? 'الموظف' : 'Employee']: isAr ? 'الإجمالي العام' : 'Grand Total',
      [isAr ? 'أيام العمل' : 'Worked Days']: 0,
      [isAr ? 'الراتب الأساسي' : 'Basic Salary']: run.lines.reduce((s, l) => s + l.basicSalary, 0),
      [isAr ? 'البدلات والإضافي' : 'Allowances & OT']: run.lines.reduce((s, l) => s + (l.allowances + l.overtimeAmount), 0),
      [isAr ? 'إجمالي الاستحقاق' : 'Gross Pay']: run.totalGross,
      [isAr ? 'الاستقطاعات والضرائب' : 'Deductions & Taxes']: run.lines.reduce((s, l) => s + (l.deductions + l.tax + l.socialInsurance), 0),
      [isAr ? 'السلف' : 'Loans']: run.lines.reduce((s, l) => s + l.loanInstallment, 0),
      [isAr ? 'صافي الراتب' : 'Net Pay']: run.totalNet
    });
    exportToCSV(rows, `payroll_${run.month}_${run.year}`);
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
                  <th className="text-left px-2 py-3 font-bold text-slate-600">{isAr ? 'إجمالي الاستحقاق' : 'Gross Pay'}</th>
                  <th className="text-left px-2 py-3 font-bold text-slate-500 w-24">{isAr ? 'خصومات' : 'Deduct.'}</th>
                  <th className="text-left px-2 py-3 font-bold text-slate-500 w-24">{isAr ? 'سلف/قروض' : 'Loans'}</th>
                  <th className="text-left px-2 py-3 font-bold text-slate-500 w-24">{isAr ? 'تأمينات/ضرائب' : 'Taxes/Ins.'}</th>
                  <th className="text-left px-2 py-3 font-bold text-blue-600">{isAr ? 'الصافي' : 'Net Pay'}</th>
                </tr>
              </thead>
              <tbody>
                {tempLines.map((line, i) => (
                  <tr key={line.employeeId} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-2 font-bold text-slate-900 dark:text-white">{getEmpName(line.employeeId)}</td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <input type="number" min={0} max={line.workingDays} value={line.actualDays} onChange={e => updateLine(line.employeeId, 'actualDays', +e.target.value)}
                          className={`w-16 text-center px-1 py-1 text-xs rounded border ${
                            line.actualDays < line.workingDays 
                              ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700' 
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                          }`} />
                        <span className="text-[9px] text-slate-400">/{line.workingDays}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 font-bold">{formatCurrency(line.basicSalary)}</td>
                    <td className="px-2 py-2">
                      <input type="number" min={0} value={line.allowances + line.overtimeAmount} onChange={e => updateLine(line.employeeId, 'allowances', +e.target.value)}
                        className="w-full px-1 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                    </td>
                    <td className="px-2 py-2 font-black text-slate-900 dark:text-white bg-emerald-50/50 dark:bg-emerald-900/5">{formatCurrency(line.grossPay)}</td>
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
                    <td className="px-2 py-2 font-black text-slate-900 dark:text-white bg-blue-50/50 dark:bg-blue-900/5 text-lg">{formatCurrency(line.netPay)}</td>
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
              <Search className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400`} />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder={isAr ? 'بحث...' : 'Search...'}
                className={`w-full ${isAr ? 'pl-9 pr-3' : 'pr-9 pl-3'} py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white`} />
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
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white text-left">{formatCurrency(run.totalGross)}</td>
                      <td className="px-4 py-3 font-black text-slate-900 dark:text-white text-left">{formatCurrency(run.totalNet)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleExportRun(run)} title={isAr ? 'تصدير كشف مجمع' : 'Export Payroll Sheet'}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white cursor-pointer">
                            <FileSpreadsheet className="h-4 w-4" />
                          </button>
                          <div className="relative group inline-block">
                            <button className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600">
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                            <div className={`absolute ${isAr ? 'left-0' : 'right-0'} mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10`}>
                              <div className="p-2 text-[10px] font-bold text-slate-400 border-b border-slate-100 dark:border-slate-700">{isAr ? 'تصدير قسيمة فردية' : 'Export individual payslip'}</div>
                              <ul className="max-h-40 overflow-y-auto">
                                {run.lines.map(line => (
                                  <li key={line.employeeId}>
                                    <button onClick={() => handleExportPayslip(run, line)} className="w-full text-right px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 font-bold truncate cursor-pointer">
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

      {alertMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-3 rounded-xl shadow-2xl text-xs font-bold animate-bounce">
          {alertMsg}
        </div>
      )}
    </div>
  );
}
