import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Save, 
  Calendar, 
  Landmark, 
  DollarSign, 
  Wallet, 
  ShieldCheck, 
  HeartCrack, 
  FileSpreadsheet, 
  PlusCircle, 
  MinusCircle, 
  Clock, 
  ClipboardList, 
  Printer, 
  CheckCircle2, 
  X, 
  TrendingUp, 
  Percent, 
  UserPlus, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ERPData, Employee, EmployeeShift, Account, JournalEntry } from '../types';

interface HRProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdateEmployees: (employees: Employee[]) => void;
  onUpdateAccounts: (accounts: Account[]) => void;
  onUpdateEntries: (entries: JournalEntry[]) => void;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
}

export default function HRModule({ 
  data, 
  lang, 
  onUpdateEmployees,
  onUpdateAccounts,
  onUpdateEntries,
  onAddAuditLog 
}: HRProps) {
  const isAr = lang === 'ar';
  
  // Tab control matching Odoo's dynamic dashboard tabs
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'payroll' | 'adjustments'>('employees');
  
  // Modal / Form triggers
  const [showAddEmpForm, setShowAddEmpForm] = useState(false);
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState<Employee | null>(null);

  // New Employee state
  const [empNameAr, setEmpNameAr] = useState('');
  const [empNameEn, setEmpNameEn] = useState('');
  const [empRole, setEmpRole] = useState('شيف عمومي');
  const [empSalary, setEmpSalary] = useState(8000);
  const [empShift, setEmpShift] = useState<EmployeeShift>(EmployeeShift.Morning);
  const [empWorkingDays, setEmpWorkingDays] = useState(26);

  // Quick Payroll Adjustment Form State (Odoo dynamic entries)
  const [adjEmpId, setAdjEmpId] = useState('');
  const [adjType, setAdjType] = useState<'allowance' | 'deduction' | 'overtime' | 'loan'>('allowance');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjReason, setAdjReason] = useState('');

  // 1. AUTO-SEED Odoo demo employees if empty so the user is welcomed with gorgeous interactive data
  useEffect(() => {
    if (data.employees.length === 0) {
      const demoEmployees: Employee[] = [
        {
          id: 'emp-1',
          code: 'EMP-001',
          nameAr: 'أحمد الشناوي',
          nameEn: 'Ahmed El-Shenawy',
          role: 'الشيف العمومي (Executive Chef)',
          salary: 16000,
          shift: EmployeeShift.Morning,
          loanBalance: 1500,
          active: true,
          allowances: 1800,
          deductions: 300,
          overtimeHours: 12,
          workingDays: 26
        },
        {
          id: 'emp-2',
          code: 'EMP-002',
          nameAr: 'مروان يوسف',
          nameEn: 'Marwan Youssef',
          role: 'مدير الصالة (Floor Manager)',
          salary: 11000,
          shift: EmployeeShift.Evening,
          loanBalance: 0,
          active: true,
          allowances: 900,
          deductions: 0,
          overtimeHours: 6,
          workingDays: 28
        },
        {
          id: 'emp-3',
          code: 'EMP-003',
          nameAr: 'سامية علي',
          nameEn: 'Samia Ali',
          role: 'كاشير رئيسي (Head Cashier)',
          salary: 8500,
          shift: EmployeeShift.Morning,
          loanBalance: 500,
          active: true,
          allowances: 500,
          deductions: 200,
          overtimeHours: 16,
          workingDays: 27
        },
        {
          id: 'emp-4',
          code: 'EMP-004',
          nameAr: 'حسن رجب',
          nameEn: 'Hassan Ragab',
          role: 'مساعد شيف (Sous Chef)',
          salary: 9500,
          shift: EmployeeShift.Overnight,
          loanBalance: 0,
          active: true,
          allowances: 600,
          deductions: 400,
          overtimeHours: 0,
          workingDays: 24
        }
      ];
      onUpdateEmployees(demoEmployees);
      onAddAuditLog(
        'شحن بيانات الموظفين التجريبية بنمط Odoo',
        'Seeded Odoo demo employees data',
        'تم تهيئة بيانات الموظفين والورديات التجريبية بنمط نظام أودو العالمي تلقائياً لتسهيل تجربة التصفح والاختبار.'
      );
    }
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(val);
  };

  const getShiftLabel = (shift: EmployeeShift) => {
    switch (shift) {
      case EmployeeShift.Morning: return isAr ? 'وردية صباحية (AM)' : 'Morning Shift';
      case EmployeeShift.Evening: return isAr ? 'وردية مسائية (PM)' : 'Evening Shift';
      case EmployeeShift.Overnight: return isAr ? 'طوال الليل (Night)' : 'Overnight Shift';
      default: return shift;
    }
  };

  // 2. ADD NEW EMPLOYEE WITH ODOO EXTENDED PROPERTIES
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNameAr || !empNameEn) return;

    const code = `EMP-${String(data.employees.length + 1).padStart(3, '0')}`;
    const newEmp: Employee = {
      id: 'emp-' + Math.random().toString(36).substring(2, 9),
      code,
      nameAr: empNameAr,
      nameEn: empNameEn,
      role: empRole,
      salary: empSalary,
      shift: empShift,
      loanBalance: 0,
      active: true,
      allowances: 0,
      deductions: 0,
      overtimeHours: 0,
      workingDays: empWorkingDays
    };

    onUpdateEmployees([...data.employees, newEmp]);
    onAddAuditLog(
      `تسجيل موظف جديد: ${empNameAr}`,
      `Registered Employee: ${empNameEn}`,
      `تم تسجيل الموظف ${empNameAr} براتب أساسي ${empSalary} ج.م بوردية ${getShiftLabel(empShift)} في كشوف الموارد البشرية.`
    );

    setEmpNameAr('');
    setEmpNameEn('');
    setEmpSalary(8000);
    setEmpWorkingDays(26);
    setShowAddEmpForm(false);
  };

  // 3. APPLY ODOO PAYROLL ADJUSTMENT (Allowance, Deduction, Overtime, or Loan)
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjEmpId || adjAmount < 0) return;

    const emp = data.employees.find(e => e.id === adjEmpId);
    if (!emp) return;

    const updatedEmployees = data.employees.map(e => {
      if (e.id === adjEmpId) {
        switch (adjType) {
          case 'allowance':
            return { ...e, allowances: (e.allowances || 0) + adjAmount };
          case 'deduction':
            return { ...e, deductions: (e.deductions || 0) + adjAmount };
          case 'overtime':
            return { ...e, overtimeHours: (e.overtimeHours || 0) + adjAmount };
          case 'loan':
            return { ...e, loanBalance: (e.loanBalance || 0) + adjAmount };
          default:
            return e;
        }
      }
      return e;
    });

    onUpdateEmployees(updatedEmployees);

    // If it's a cash loan, we subtract cash from cashier treasury and generate double-entry
    if (adjType === 'loan' && adjAmount > 0) {
      // D/E entry: Debit Staff Advance Assets (Account 106 used for Employee loan assets in original config)
      // Credit Cash Box (Account 101)
      const year = new Date().getFullYear();
      const jvSerial = String(data.journalEntries.length + 1).padStart(3, '0');
      const jvNumber = `JV-${year}-${jvSerial}`;

      const loanJV: JournalEntry = {
        id: 'je-' + Math.random().toString(36).substring(2, 9),
        entryNumber: jvNumber,
        date: new Date().toISOString().split('T')[0],
        type: 'AUTO' as any,
        description: `صرف سلفة نقدية مستقطعة للموظف: ${isAr ? emp.nameAr : emp.nameEn} - السبب: ${adjReason || 'حالة طارئة'}`,
        approved: true,
        approvedBy: isAr ? 'المدير العام' : 'General Manager',
        lines: [
          { accountId: '106', debit: adjAmount, credit: 0 }, // Staff Advances increases (using 106 as asset account)
          { accountId: '101', debit: 0, credit: adjAmount }  // Cashbox Decreases
        ]
      };

      const updatedAccounts = data.accounts.map(acc => {
        if (acc.id === '106') return { ...acc, balance: acc.balance + adjAmount };
        if (acc.id === '101') return { ...acc, balance: acc.balance - adjAmount };
        return acc;
      });

      onUpdateAccounts(updatedAccounts);
      onUpdateEntries([loanJV, ...data.journalEntries]);
    }

    const typeLabelAr = adjType === 'allowance' ? 'مكافأة/بدل' : adjType === 'deduction' ? 'خصم/جزاء' : adjType === 'overtime' ? 'ساعات إضافي' : 'سلفة نقدية';
    const typeLabelEn = adjType === 'allowance' ? 'Allowance/Bonus' : adjType === 'deduction' ? 'Deduction/Penalty' : adjType === 'overtime' ? 'Overtime Hours' : 'Cash Advance';

    onAddAuditLog(
      `تسجيل تسوية راتب (${typeLabelAr}) للموظف: ${isAr ? emp.nameAr : emp.nameEn}`,
      `Recorded payroll adjustment (${typeLabelEn}) for: ${emp.nameEn}`,
      `تم إدخال ${typeLabelAr} بقيمة ${adjAmount} ${adjType === 'overtime' ? 'ساعة' : 'ج.م'} للموظف ${emp.nameAr}. السبب: ${adjReason || 'لا يوجد ملاحظات'}`
    );

    alert(isAr ? 'تم إدخال وتعديل بنود الراتب للموظف بنجاح!' : 'Payroll adjustment saved successfully!');
    setAdjEmpId('');
    setAdjAmount(0);
    setAdjReason('');
  };

  // 4. DISBURSE ALL MONTHLY SALARIES PAYROLL (BALANCED LEDGER POSTING & LOANS REDUCTION)
  // Debit: Salaries & Wages Expense (Account 601) with actual gross salary + allowances + overtime - deductions
  // Credit: Staff Advances Receivable (Account 106) with total loans deduction
  // Credit: Main Cash Box (Account 101) with net cash disbursed
  const handleDisburseAllPayroll = () => {
    if (data.employees.length === 0) return;

    let totalGrossBasic = 0;
    let totalAllowances = 0;
    let totalOvertimePay = 0;
    let totalDeductions = 0;
    let totalLoansDeduction = 0;

    data.employees.forEach(emp => {
      const basic = emp.salary;
      const allowance = emp.allowances || 0;
      const hourlyRate = basic / 240; // 30 days * 8 hours
      const overtimePay = (emp.overtimeHours || 0) * hourlyRate * 1.5;
      const deduction = emp.deductions || 0;
      const loan = emp.loanBalance || 0;

      totalGrossBasic += basic;
      totalAllowances += allowance;
      totalOvertimePay += overtimePay;
      totalDeductions += deduction;
      totalLoansDeduction += loan;
    });

    const totalNetPaid = (totalGrossBasic + totalAllowances + totalOvertimePay) - totalDeductions - totalLoansDeduction;

    if (totalNetPaid <= 0) {
      alert(isAr ? 'لا توجد مستحقات رواتب كافية للصرف حالياً!' : 'No net payroll balance available for disbursement!');
      return;
    }

    // Zero out outstanding employee loans, allowances, deductions, and overtime hours for the next period
    const updatedEmployees = data.employees.map(emp => ({
      ...emp,
      loanBalance: 0,
      allowances: 0,
      deductions: 0,
      overtimeHours: 0
    }));

    // Post double entry journal!
    const year = new Date().getFullYear();
    const jvSerial = String(data.journalEntries.length + 1).padStart(3, '0');
    const jvNumber = `JV-${year}-${jvSerial}`;

    // Debit: Salaries & Wages Expense (601)
    // Credit: Employee loans (106)
    // Credit: Cash Box (101)
    const grossExpenseDebited = totalGrossBasic + totalAllowances + totalOvertimePay - totalDeductions;

    const payrollJV: JournalEntry = {
      id: 'je-' + Math.random().toString(36).substring(2, 9),
      entryNumber: jvNumber,
      date: new Date().toISOString().split('T')[0],
      type: 'AUTO' as any,
      description: `صرف وإثبات مسيرات رواتب الموظفين الشهرية - إجمالي المستحق بنمط أودو`,
      approved: true,
      approvedBy: isAr ? 'المدير العام' : 'General Manager',
      lines: [
        { accountId: '601', debit: grossExpenseDebited, credit: 0 }, // Salaries expense increases
        ...(totalLoansDeduction > 0 ? [{ accountId: '106', debit: 0, credit: totalLoansDeduction }] : []), // Clear advances
        { accountId: '101', debit: 0, credit: totalNetPaid }       // Cashbox decreases by net paid
      ]
    };

    const updatedAccounts = data.accounts.map(acc => {
      if (acc.id === '601') return { ...acc, balance: acc.balance + grossExpenseDebited };
      if (acc.id === '106') return { ...acc, balance: Math.max(0, acc.balance - totalLoansDeduction) };
      if (acc.id === '101') return { ...acc, balance: acc.balance - totalNetPaid };
      return acc;
    });

    onUpdateEmployees(updatedEmployees);
    onUpdateAccounts(updatedAccounts);
    onUpdateEntries([payrollJV, ...data.journalEntries]);

    onAddAuditLog(
      `ترحيل كشف رواتب الموظفين (نمط أودو المالي)`,
      `Posted monthly payroll dispatch: ${jvNumber}`,
      `تم ترحيل مسير رواتب لـ ${data.employees.length} موظفين. راتب أساسي: ${totalGrossBasic} ج.م، بدلات ومكافآت: ${totalAllowances} ج.م، ساعات عمل إضافي: ${totalOvertimePay.toFixed(0)} ج.م، خصومات وجزاءات مقتطعة: ${totalDeductions} ج.م، استرداد سلف: ${totalLoansDeduction} ج.م. الصافي النقدي المنصرف: ${totalNetPaid.toFixed(0)} ج.م.`
    );

    alert(isAr 
      ? `تم ترحيل مسير رواتب أودو وصرف مبلغ ${formatCurrency(totalNetPaid)} نقداً من الخزينة بنجاح!` 
      : `Odoo-styled payroll processed! Disbursed net ${formatCurrency(totalNetPaid)} successfully!`);
  };

  // Helper calculation for an employee's net salary
  const calculateEmployeeNet = (emp: Employee) => {
    const basic = emp.salary;
    const allowances = emp.allowances || 0;
    const overtimeRate = basic / 240; // 30 days of 8 hours
    const overtimePay = (emp.overtimeHours || 0) * overtimeRate * 1.5;
    const deductions = emp.deductions || 0;
    const loans = emp.loanBalance || 0;
    return (basic + allowances + overtimePay) - deductions - loans;
  };

  // Quick stat aggregation
  const totalEmployeesCount = data.employees.length;
  const totalBasicSalariesSum = data.employees.reduce((sum, e) => sum + e.salary, 0);
  const totalActiveLoansSum = data.employees.reduce((sum, e) => sum + (e.loanBalance || 0), 0);
  const totalAllowancesSum = data.employees.reduce((sum, e) => sum + (e.allowances || 0), 0);
  const totalDeductionsSum = data.employees.reduce((sum, e) => sum + (e.deductions || 0), 0);

  return (
    <div id="hr_module_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      
      {/* Dynamic Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600 dark:text-sky-400" />
            <span>{isAr ? 'شؤون العاملين وإدارة الرواتب (Odoo HR Style)' : 'Odoo Human Resources & Payroll Dashboard'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-0.5">
            {isAr ? 'إدارة العقود والورديات، احتساب المكافآت والخصومات، العمل الإضافي، صرف قسائم الرواتب التفصيلية وترحيلها محاسبياً' : 'Streamlined contract wages, allowances, attendance deductions, overtime calculations, and printable payslip ledger entries.'}
          </p>
        </div>

        {/* Dynamic Navigation Sub-Tabs */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/50 dark:border-slate-800/40">
          <button 
            onClick={() => setActiveSubTab('employees')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'employees' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {isAr ? 'بطاقات الموظفين' : 'Employee Cards'}
          </button>
          <button 
            onClick={() => setActiveSubTab('adjustments')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'adjustments' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {isAr ? 'مستحقات وخصومات أودو' : 'Odoo Adjustments'}
          </button>
          <button 
            onClick={() => setActiveSubTab('payroll')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeSubTab === 'payroll' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {isAr ? 'مسيرات وقسائم الرواتب' : 'Salary Dispatch & Slips'}
          </button>
        </div>
      </div>

      {/* Modern Bento Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{isAr ? 'القوى العاملة' : 'Staff Size'}</span>
            <span className="text-base font-black text-slate-900 dark:text-white font-mono">{totalEmployeesCount} {isAr ? 'موظفين' : 'Staff'}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{isAr ? 'ميزانية الأجور الأساسية' : 'Base Salaries'}</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(totalBasicSalariesSum)}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{isAr ? 'سلف جارية معلقة' : 'Total Staff Loans'}</span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(totalActiveLoansSum)}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{isAr ? 'إجمالي البدلات النشطة' : 'Active Allowances'}</span>
            <span className="text-base font-black text-purple-600 dark:text-purple-400 font-mono">{formatCurrency(totalAllowancesSum)}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 shadow-xs flex items-center gap-3.5 col-span-2 lg:col-span-1">
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <MinusCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{isAr ? 'خصومات وجزاءات مضافة' : 'Active Deductions'}</span>
            <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(totalDeductionsSum)}</span>
          </div>
        </div>
      </div>

      {/* -------------------- SUB TAB: STAFF CARD ROSTER -------------------- */}
      {activeSubTab === 'employees' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
            <div>
              <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">{isAr ? 'دليل ملفات عمال المطبخ والخدمة' : 'Active Kitchen & Service Employee Profiles'}</h2>
              <span className="text-[10px] text-slate-400 block mt-0.5">{isAr ? 'بطاقات مفصلة لإدارة مواصفات عقود العمل ومستويات الرواتب' : 'Overview of current team and active job profiles.'}</span>
            </div>
            <button
              id="odoo_add_emp_btn"
              onClick={() => setShowAddEmpForm(!showAddEmpForm)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-blue-600/10 transition-all self-stretch md:self-auto justify-center"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'تسجيل موظف جديد' : 'Add Employee Contract'}</span>
            </button>
          </div>

          {/* Hire employee Form Drawer */}
          {showAddEmpForm && (
            <form onSubmit={handleAddEmployee} className="p-6 rounded-2xl bg-[#f4f8fe]/60 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'الاسم بالكامل (عربي)' : 'Full Name (Arabic)'}</label>
                <input
                  type="text"
                  required
                  value={empNameAr}
                  onChange={(e) => setEmpNameAr(e.target.value)}
                  placeholder="مثال: محمد علي عبد الرحيم"
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white border-slate-200 dark:border-slate-850"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'الاسم بالكامل (إنجليزي)' : 'Full Name (English)'}</label>
                <input
                  type="text"
                  required
                  value={empNameEn}
                  onChange={(e) => setEmpNameEn(e.target.value)}
                  placeholder="e.g., Mohamed Ali"
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white border-slate-200 dark:border-slate-850"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'المسمى الوظيفي' : 'Job Role / Designation'}</label>
                <input
                  type="text"
                  required
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  placeholder="شيف، كاشير، مضيف..."
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white border-slate-200 dark:border-slate-850"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'الراتب الأساسي' : 'Basic Monthly Contract'}</label>
                <input
                  type="number"
                  required
                  value={empSalary}
                  onChange={(e) => setEmpSalary(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white border-slate-200 dark:border-slate-850"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'الوردية التكليفية' : 'Assigned Logistics Shift'}</label>
                <select
                  value={empShift}
                  onChange={(e) => setEmpShift(e.target.value as EmployeeShift)}
                  className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white border-slate-200 dark:border-slate-850"
                >
                  <option value={EmployeeShift.Morning}>{isAr ? 'وردية صباحية' : 'Morning'}</option>
                  <option value={EmployeeShift.Evening}>{isAr ? 'وردية مسائية' : 'Evening'}</option>
                  <option value={EmployeeShift.Overnight}>{isAr ? 'طوال الليل (Night)' : 'Overnight'}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">{isAr ? 'أيام العمل المقررة' : 'Scheduled Workdays'}</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="31"
                  value={empWorkingDays}
                  onChange={(e) => setEmpWorkingDays(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white border-slate-200 dark:border-slate-850"
                />
              </div>

              <div className="md:col-span-3 flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-blue-700 transition-colors">
                  {isAr ? 'توقيع العقد وإعتماد الموظف' : 'Sign & Deploy Contract'}
                </button>
                <button type="button" onClick={() => setShowAddEmpForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 transition-colors">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          )}

          {/* Odoo Style Employee Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.employees.map(emp => {
              const netValue = calculateEmployeeNet(emp);
              return (
                <div 
                  key={emp.id} 
                  className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-5 shadow-xs hover:border-blue-200 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header profile info */}
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-xl bg-[#ebf4ff] dark:bg-slate-900 flex items-center justify-center font-bold text-blue-600 dark:text-sky-400 border border-[#b8d6fc] dark:border-slate-800 text-xs">
                        {emp.code}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide ${
                        emp.shift === EmployeeShift.Morning ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400' :
                        emp.shift === EmployeeShift.Evening ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-sky-400' :
                        'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400'
                      }`}>
                        {getShiftLabel(emp.shift)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? emp.nameAr : emp.nameEn}</h3>
                      <p className="text-[11px] text-slate-500 font-bold block mt-0.5">{emp.role}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-50 dark:border-slate-900/60 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold">{isAr ? 'الراتب الأساسي:' : 'Contract Wage:'}</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatCurrency(emp.salary)}</span>
                      </div>
                      
                      {/* Odoo style variables breakdown */}
                      {(emp.allowances || 0) > 0 && (
                        <div className="flex justify-between text-purple-600 dark:text-purple-400">
                          <span className="font-bold">{isAr ? 'بدلات ومكافآت مضافة:' : 'Active Allowances:'}</span>
                          <span className="font-mono font-bold">+{formatCurrency(emp.allowances || 0)}</span>
                        </div>
                      )}

                      {(emp.deductions || 0) > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span className="font-bold">{isAr ? 'خصومات وجزاءات:' : 'Deductions:'}</span>
                          <span className="font-mono font-bold">-{formatCurrency(emp.deductions || 0)}</span>
                        </div>
                      )}

                      {(emp.overtimeHours || 0) > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span className="font-bold">{isAr ? 'ساعات عمل إضافي:' : 'Overtime Hours:'}</span>
                          <span className="font-mono font-bold">{(emp.overtimeHours || 0)} {isAr ? 'ساعة' : 'Hrs'}</span>
                        </div>
                      )}

                      {(emp.loanBalance || 0) > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span className="font-bold">{isAr ? 'أقساط سلف مستحقة:' : 'Unpaid Loans:'}</span>
                          <span className="font-mono font-bold">-{formatCurrency(emp.loanBalance || 0)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer net value & Quick Odoo Payslip trigger */}
                  <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-900/60 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase block">{isAr ? 'صافي مستحق الراتب' : 'Net Salary Slip'}</span>
                      <span className="text-xs font-black text-blue-600 dark:text-sky-400 font-mono">{formatCurrency(netValue)}</span>
                    </div>

                    <button
                      onClick={() => setSelectedPayslipEmp(emp)}
                      className="flex items-center gap-1 bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-1.5 rounded-xl text-[10px] transition-all border border-slate-100 dark:border-slate-800/60"
                    >
                      <Printer className="h-3 w-3 text-blue-500" />
                      <span>{isAr ? 'عرض قسيمة الراتب' : 'View Payslip'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------- SUB TAB: ODOO PAYROLL ADJUSTMENTS MANAGER -------------------- */}
      {activeSubTab === 'adjustments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick interactive Form */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="h-4.5 w-4.5 text-blue-600" />
                <span>{isAr ? 'إدخال تسوية راتب (نمط أودو)' : 'Odoo Payroll Adjustment Tool'}</span>
              </h2>
              <p className="text-slate-400 text-[10px] mt-0.5">{isAr ? 'قم بإدخال الخصومات والبدلات والجزاءات مباشرة لتحديث بطاقة ومسير الموظف' : 'Easily log bonuses, deductions, penalties, loans, or overtime for the current period.'}</p>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">{isAr ? 'الموظف المستهدف:' : 'Target Employee:'}</label>
                <select
                  required
                  value={adjEmpId}
                  onChange={(e) => setAdjEmpId(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white border-slate-200 dark:border-slate-850"
                >
                  <option value="">{isAr ? '-- اختر موظف من الكشف --' : '-- Choose Employee --'}</option>
                  {data.employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{isAr ? `${emp.nameAr} (${emp.role})` : emp.nameEn}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">{isAr ? 'نوع التسوية المالية:' : 'Adjustment Category:'}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setAdjType('allowance'); if (adjAmount === 0) setAdjAmount(500); }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      adjType === 'allowance' ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-200' : 'bg-transparent border-slate-100 dark:border-slate-900 text-slate-500'
                    }`}
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>{isAr ? 'بدل / مكافأة' : 'Allowance'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAdjType('deduction'); if (adjAmount === 0) setAdjAmount(300); }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      adjType === 'deduction' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200' : 'bg-transparent border-slate-100 dark:border-slate-900 text-slate-500'
                    }`}
                  >
                    <MinusCircle className="h-3.5 w-3.5" />
                    <span>{isAr ? 'خصم / جزاء' : 'Deduction'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAdjType('overtime'); if (adjAmount === 0) setAdjAmount(4); }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      adjType === 'overtime' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200' : 'bg-transparent border-slate-100 dark:border-slate-900 text-slate-500'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>{isAr ? 'ساعات إضافي' : 'Overtime'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAdjType('loan'); if (adjAmount === 0) setAdjAmount(1000); }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      adjType === 'loan' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200' : 'bg-transparent border-slate-100 dark:border-slate-900 text-slate-500'
                    }`}
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>{isAr ? 'صرف سلفة' : 'Cash Advance'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  {adjType === 'overtime' ? (isAr ? 'عدد الساعات المضافة:' : 'Hours of Overtime:') : (isAr ? 'القيمة النقدية (ج.م):' : 'EGP Value amount:')}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjAmount || ''}
                  onChange={(e) => setAdjAmount(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white border-slate-200 dark:border-slate-850"
                />
                {adjType === 'overtime' && (
                  <span className="text-[10px] text-slate-400 font-bold block mt-1">{isAr ? 'يتم احتساب الساعة الإضافية بـ 1.5 من أجر الساعة الفعلي.' : 'Overtime is calculated at 1.5x regular wage.'}</span>
                )}
                {adjType === 'loan' && (
                  <span className="text-[10px] text-amber-600 font-bold block mt-1">{isAr ? 'صرف السلفة نقداً سيقوم بإنشاء قيد ترحيل آلي للخزينة.' : 'Disbursing advances creates automated accounting entries.'}</span>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">{isAr ? 'السبب / التفاصيل المبررة:' : 'Reason / Reference Description:'}</label>
                <textarea
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder={isAr ? 'اكتب مثلاً: غياب يوم، ساعات تغطية عجز وردية، مكافأة أداء...' : 'Describe the purpose or approval reference...'}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white border-slate-200 dark:border-slate-850 h-20"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Save className="h-4 w-4" />
                <span>{isAr ? 'اعتماد وحفظ التسوية ببطاقة الموظف' : 'Apply Payroll Adjustment'}</span>
              </button>
            </form>
          </div>

          {/* Current adjustments ledger log */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'ملخص بنود الرواتب والجزاءات والبدلات النشطة هذا الشهر' : 'Active Salaries & Deductions Summary Ledgers'}</h2>
              <p className="text-slate-400 text-[10px]">{isAr ? 'قائمة تفصيلية للمستحقات المضافة والخصومات المسجلة على الموظفين قبل اعتماد المسير النهائي' : 'Live balance sheet entries queued for final monthly payroll release.'}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse text-xs font-semibold" dir={isAr ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] uppercase bg-slate-50 dark:bg-slate-900/50">
                    <th className="py-2.5 px-4 text-start">{isAr ? 'الموظف وعقده' : 'Employee & Code'}</th>
                    <th className="py-2.5 px-4 text-end text-purple-600">{isAr ? 'إجمالي البدلات' : 'Allowances'}</th>
                    <th className="py-2.5 px-4 text-end text-emerald-600">{isAr ? 'أجر الإضافي' : 'Overtime Pay'}</th>
                    <th className="py-2.5 px-4 text-end text-rose-600">{isAr ? 'إجمالي الخصومات' : 'Deductions'}</th>
                    <th className="py-2.5 px-4 text-end text-amber-600">{isAr ? 'أقساط السلف' : 'Loan Deductions'}</th>
                    <th className="py-2.5 px-4 text-end">{isAr ? 'صافي المسير' : 'Net Estimate'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                  {data.employees.map(emp => {
                    const basic = emp.salary;
                    const allowances = emp.allowances || 0;
                    const overtimePay = (emp.overtimeHours || 0) * (basic / 240) * 1.5;
                    const deductions = emp.deductions || 0;
                    const loans = emp.loanBalance || 0;
                    const netEstimate = (basic + allowances + overtimePay) - deductions - loans;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-start font-bold text-slate-900 dark:text-white">{isAr ? emp.nameAr : emp.nameEn}</td>
                        <td className="py-3 px-4 text-end font-mono text-purple-600">{allowances > 0 ? `+${formatCurrency(allowances)}` : '—'}</td>
                        <td className="py-3 px-4 text-end font-mono text-emerald-600">{overtimePay > 0 ? `+${formatCurrency(overtimePay)}` : '—'}</td>
                        <td className="py-3 px-4 text-end font-mono text-rose-600">{deductions > 0 ? `-${formatCurrency(deductions)}` : '—'}</td>
                        <td className="py-3 px-4 text-end font-mono text-amber-600">{loans > 0 ? `-${formatCurrency(loans)}` : '—'}</td>
                        <td className="py-3 px-4 text-end font-mono font-black text-blue-600 dark:text-sky-400">{formatCurrency(netEstimate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- SUB TAB: MASTER MONTHLY PAYROLL DISPATCH RETAINED -------------------- */}
      {activeSubTab === 'payroll' && (
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-6">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">
                {isAr ? 'كشف الرواتب الشهري الموحد وإعتماد ترحيل قيد الأجور' : 'Odoo Monthly Payroll Consolidation & Ledger Release'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                {isAr ? 'عند صرف هذا الكشف، سيقوم النظام تلقائياً باسترداد السلف وتصفيرها بالدفاتر، وترحيل القيد المحاسبي المتوازن لمصروفات الأجور آلياً.' 
                     : 'Processing payroll logs wage expenses, zeroes outstanding staff loans, and credits Cash box (101) with clean double-entry.'}
              </span>
            </div>

            <button
              id="disburse_balanced_payroll_btn"
              onClick={handleDisburseAllPayroll}
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-colors"
            >
              <Wallet className="h-4 w-4" />
              <span>{isAr ? 'اعتماد كشف الرواتب وترحيل القيود نقداً' : 'Approve & Dispatch Odoo Payroll'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-xs font-semibold" dir={isAr ? 'rtl' : 'ltr'}>
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] uppercase bg-slate-50 dark:bg-slate-900/50">
                  <th className="py-3 px-4 text-start">{isAr ? 'كود الموظف' : 'Staff Code'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'اسم الموظف' : 'Employee Name'}</th>
                  <th className="py-3 px-4 text-end">{isAr ? 'الراتب الأساسي' : 'Base Contract'}</th>
                  <th className="py-3 px-4 text-end text-purple-600">{isAr ? 'البدلات والمكافآت' : 'Allowances'}</th>
                  <th className="py-3 px-4 text-end text-emerald-600">{isAr ? 'أجر الإضافي' : 'Overtime Pay'}</th>
                  <th className="py-3 px-4 text-end text-rose-600">{isAr ? 'الخصومات والجزاءات' : 'Deductions'}</th>
                  <th className="py-3 px-4 text-end text-amber-600">{isAr ? 'اقتطاع السلف' : 'Deducted Loans'}</th>
                  <th className="py-3 px-4 text-end text-blue-600">{isAr ? 'صافي المستحق للصرف' : 'Net Disbursed'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {data.employees.map(emp => {
                  const basic = emp.salary;
                  const allowances = emp.allowances || 0;
                  const overtimePay = (emp.overtimeHours || 0) * (basic / 240) * 1.5;
                  const deductions = emp.deductions || 0;
                  const loans = emp.loanBalance || 0;
                  const netSalary = (basic + allowances + overtimePay) - deductions - loans;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 text-start font-mono text-slate-500">{emp.code}</td>
                      <td className="py-3.5 px-4 text-start font-bold text-slate-900 dark:text-white">{isAr ? emp.nameAr : emp.nameEn}</td>
                      <td className="py-3.5 px-4 text-end font-mono text-slate-700 dark:text-slate-300">{formatCurrency(basic)}</td>
                      <td className="py-3.5 px-4 text-end font-mono text-purple-600">{formatCurrency(allowances)}</td>
                      <td className="py-3.5 px-4 text-end font-mono text-emerald-600">{formatCurrency(overtimePay)}</td>
                      <td className="py-3.5 px-4 text-end font-mono text-rose-600">{formatCurrency(deductions)}</td>
                      <td className="py-3.5 px-4 text-end font-mono text-amber-600">{formatCurrency(loans)}</td>
                      <td className="py-3.5 px-4 text-end font-mono font-black text-sm text-blue-600 dark:text-sky-400">{formatCurrency(netSalary)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedPayslipEmp(emp)}
                          className="text-xs bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 font-bold px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          {isAr ? 'عرض قسيمة الراتب' : 'Payslip Details'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- ODOO DETAILED PAYSLIP POPUP MODAL -------------------- */}
      {selectedPayslipEmp && (() => {
        const emp = selectedPayslipEmp;
        const basic = emp.salary;
        const allowances = emp.allowances || 0;
        const overtimeRate = basic / 240;
        const overtimePay = (emp.overtimeHours || 0) * overtimeRate * 1.5;
        const deductions = emp.deductions || 0;
        const loans = emp.loanBalance || 0;
        const totalEarnings = basic + allowances + overtimePay;
        const totalDeductionsAgg = deductions + loans;
        const netSal = totalEarnings - totalDeductionsAgg;

        return (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-850 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-[#f4f8fe]/60 dark:bg-slate-900/60 shrink-0">
                <div className="flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-blue-600" />
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{isAr ? 'قسيمة راتب تفصيلية - Odoo Payroll' : 'Employee Detailed Payslip'}</span>
                </div>
                <button 
                  onClick={() => setSelectedPayslipEmp(null)} 
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Printable invoice card contents */}
              <div id="printable-payslip" className="p-8 space-y-6 overflow-y-auto flex-1 font-sans text-slate-800 dark:text-slate-300">
                
                {/* Brand & ERP Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-black text-[#0056b3] dark:text-[#00c6ff] tracking-tight">LODing ERP</h2>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase block tracking-widest">{isAr ? 'نظام الموارد البشرية والرواتب المعتمد' : 'Verified Human Capital & Payroll Slip'}</span>
                  </div>
                  <div className="text-end font-mono text-[10px] text-slate-400 font-bold">
                    <div>SLIP NO: SLIP-{new Date().getFullYear()}-{emp.code}</div>
                    <div>DATE: {new Date().toISOString().split('T')[0]}</div>
                    <div>STATUS: {isAr ? 'معتمد مسودة' : 'APPROVED'}</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-150/40 dark:border-slate-800 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block">{isAr ? 'اسم الموظف:' : 'Employee Name:'}</span>
                    <span className="text-slate-900 dark:text-white font-black">{isAr ? emp.nameAr : emp.nameEn}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">{isAr ? 'كود الموظف وعقده:' : 'Staff Code & ID:'}</span>
                    <span className="text-slate-900 dark:text-white font-black font-mono">{emp.code}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">{isAr ? 'المسمى الوظيفي:' : 'Designation Role:'}</span>
                    <span className="text-slate-900 dark:text-white font-bold">{emp.role}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">{isAr ? 'الوردية المكلف بها:' : 'Assigned Shift Logistics:'}</span>
                    <span className="text-slate-900 dark:text-white font-bold">{getShiftLabel(emp.shift)}</span>
                  </div>
                </div>

                {/* Payslip Elements Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100 dark:border-slate-900">{isAr ? 'تفاصيل بنود الاستحقاقات والرواتب والخصومات' : 'Payslip Compensation Breakdown'}</h3>
                  
                  <div className="space-y-2 text-xs">
                    
                    {/* Basic */}
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900">
                      <span className="text-slate-500 font-bold">{isAr ? 'الراتب الأساسي المتعاقد عليه' : 'Contract Base Salary'}</span>
                      <span className="font-mono font-bold text-slate-950 dark:text-white">{formatCurrency(basic)}</span>
                    </div>

                    {/* Allowances */}
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900 text-purple-600 dark:text-purple-400">
                      <span className="font-bold">{isAr ? 'البدلات والمكافآت المضافة' : 'Active Allowances & Performance Bonuses'}</span>
                      <span className="font-mono font-bold">+{formatCurrency(allowances)}</span>
                    </div>

                    {/* Overtime */}
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900 text-emerald-600">
                      <div>
                        <span className="font-bold">{isAr ? 'أجر العمل الإضافي المعتمد' : 'Overtime Hours Work'}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">({emp.overtimeHours || 0} {isAr ? 'ساعة مضافة' : 'Hrs added'} × {formatCurrency(overtimeRate)} × 1.5)</span>
                      </div>
                      <span className="font-mono font-bold">+{formatCurrency(overtimePay)}</span>
                    </div>

                    {/* Deductions */}
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900 text-rose-600">
                      <span className="font-bold">{isAr ? 'جزاءات وخصومات الغياب واللائحة' : 'Absence & Attendance Deductions'}</span>
                      <span className="font-mono font-bold">-{formatCurrency(deductions)}</span>
                    </div>

                    {/* Loans */}
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-900 text-amber-600">
                      <span className="font-bold">{isAr ? 'اقتطاع أقساط سلف جارية مسحوبة' : 'Advance Loans Deduction'}</span>
                      <span className="font-mono font-bold">-{formatCurrency(loans)}</span>
                    </div>

                  </div>
                </div>

                {/* Sub totals aggregates */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-850 grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-bold block">{isAr ? 'إجمالي الاستحقاقات:' : 'Total Gross Earnings:'}</span>
                    <span className="text-slate-900 dark:text-white font-black font-mono">{formatCurrency(totalEarnings)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-bold block">{isAr ? 'إجمالي الاستقطاعات والخصومات:' : 'Total Deductions:'}</span>
                    <span className="text-rose-600 font-black font-mono">{formatCurrency(totalDeductionsAgg)}</span>
                  </div>
                </div>

                {/* Odoo grand net pay */}
                <div className="p-4 rounded-xl bg-blue-600 text-white flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-100 block">{isAr ? 'صافي الراتب المستحق للصرف النهائي' : 'NET DISBURSED PAYROLL VALUE'}</span>
                    <span className="text-sm font-bold text-white block mt-0.5">{isAr ? 'يرحل ويسلم نقداً للموظف بموجب هذا الكشف' : 'Transferred and verified under contract.'}</span>
                  </div>
                  <span className="text-xl font-black font-mono tracking-tight text-white">{formatCurrency(netSal)}</span>
                </div>

                {/* Authorization signatures */}
                <div className="pt-6 border-t border-dashed border-slate-200 dark:border-slate-800 flex justify-between text-[10px] font-bold text-slate-400">
                  <div className="space-y-1">
                    <div>{isAr ? 'إعداد قسم شؤون الموظفين والاتش ار' : 'Prepared by: Odoo Human Resources'}</div>
                    <div className="text-slate-300">________________________</div>
                  </div>
                  <div className="space-y-1 text-end">
                    <div>{isAr ? 'إعتماد المالك والمدير العام' : 'Authorized Signatory:'}</div>
                    <div className="text-slate-900 dark:text-white font-bold">{isAr ? 'المدير العام' : 'General Manager'}</div>
                    <div className="text-xs text-slate-500">CEO / General Manager</div>
                  </div>
                </div>

              </div>

              {/* Modal footer controls with Print */}
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-900 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
                <button
                  onClick={() => {
                    const printContents = document.getElementById('printable-payslip')?.innerHTML;
                    const originalContents = document.body.innerHTML;
                    if (printContents) {
                      const printWindow = window.open('', '', 'height=600,width=800');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>LODing ERP Payslip</title>
                              <style>
                                body { font-family: sans-serif; padding: 40px; color: #333; direction: ${isAr ? 'rtl' : 'ltr'}; }
                                .border { border: 1px solid #ccc; padding: 15px; border-radius: 8px; }
                                .flex { display: flex; justify-content: space-between; }
                                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                                .text-rose { color: #dc2626; }
                                .bg-blue { background-color: #2563eb; color: white; padding: 15px; border-radius: 8px; margin-top: 15px; }
                                .font-bold { font-weight: bold; }
                                .font-mono { font-family: monospace; }
                              </style>
                            </head>
                            <body>
                              ${printContents}
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                      }
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  <span>{isAr ? 'طباعة القسيمة التفصيلية' : 'Print Payslip'}</span>
                </button>
                <button 
                  onClick={() => setSelectedPayslipEmp(null)} 
                  className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-300 transition-colors"
                >
                  {isAr ? 'إغلاق النافذة' : 'Close'}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
