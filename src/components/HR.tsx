import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { 
  Users, 
  Plus, 
  Save, 
  Calendar as CalendarIcon, 
  Landmark, 
  DollarSign, 
  Wallet, 
  PlusCircle, 
  MinusCircle, 
  Clock, 
  Printer, 
  X, 
  TrendingUp, 
  Percent, 
  UserPlus, 
  ChevronRight,
  Sparkles,
  Layers,
  FileText,
  BarChart2,
  Trash2,
  Edit,
  Search,
  Folder,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldX,
  Activity,
  Award,
  Building2,
  Phone,
  Mail,
  BadgeCheck,
  TrendingDown,
  Briefcase,
  Star,
  AlertTriangle,
  CheckCheck,
  ClipboardList
} from 'lucide-react';
import { ERPData, Employee, EmployeeShift, Account, JournalEntry, PayrollRun, PayslipLine } from '../types';
import { printElementById } from '../utils/printUtils';
import { exportHRLeavesExcel, exportHRLoansExcel, exportHRPayrollExcel, exportHRDepartmentsExcel } from '../utils/excelExport';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';

interface HRProps {
  data: ERPData;
  lang: 'ar' | 'en';
  userRole?: string;
  onUpdateEmployees: (employees: Employee[]) => void;
  onUpdateAccounts: (accounts: Account[]) => void;
  onUpdateEntries: (entries: JournalEntry[]) => void;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
  onUpdateERPState?: (updater: (prev: ERPData) => ERPData) => void;
}

export default function HRModule({ 
  data, 
  lang, 
  userRole,
  onUpdateEmployees,
  onUpdateAccounts,
  onUpdateEntries,
  onAddAuditLog,
  onUpdateERPState
}: HRProps) {
  const isAr = lang === 'ar';
  const isAdmin = !userRole || userRole.toLowerCase() === 'admin';

  // Sub tab navigation
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'monthly_procedures' | 'employees' | 'departments' | 'contracts' | 'leaves' | 'holidays' | 'loans' | 'payroll' | 'reports'>('dashboard');

  // Employee CRUD Modal/Form states
  const [showAddEmpForm, setShowAddEmpForm] = useState(false);
  const [showEditEmpForm, setShowEditEmpForm] = useState<Employee | null>(null);
  const [selectedProfileEmp, setSelectedProfileEmp] = useState<Employee | null>(null);
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState<Employee | null>(null);

  // Static color classes for Tailwind (must appear as literal strings for purging)
  const colorCard = { blue: 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30', emerald: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30', violet: 'bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/30', amber: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30', rose: 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30' } as Record<string, string>;
  const colorText = { blue: 'text-slate-900 dark:text-white', emerald: 'text-slate-900 dark:text-white', violet: 'text-violet-600', amber: 'text-slate-900 dark:text-white', rose: 'text-slate-900 dark:text-white' } as Record<string, string>;
  const colorTextDark = { blue: 'text-blue-700 dark:text-blue-400', emerald: 'text-slate-900 dark:text-white', violet: 'text-violet-700 dark:text-violet-400', amber: 'text-amber-700 dark:text-amber-400', rose: 'text-rose-700 dark:text-slate-900 dark:text-white' } as Record<string, string>;
  const colorBg = { blue: 'bg-blue-100 dark:bg-blue-900/40', emerald: 'bg-emerald-100 dark:bg-emerald-900/40', violet: 'bg-violet-100 dark:bg-violet-900/40', amber: 'bg-amber-100 dark:bg-amber-900/40', rose: 'bg-rose-100 dark:bg-rose-900/40' } as Record<string, string>;
  const colorBadge = { blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400', emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-slate-900 dark:text-white', violet: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400', amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400', rose: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-slate-900 dark:text-white' } as Record<string, string>;
  const colorDeptCard = ['bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30', 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30', 'bg-violet-50/50 dark:bg-violet-950/10 border-violet-100 dark:border-violet-900/30', 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30'];
  const colorDeptBadge = ['bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400', 'bg-emerald-100 dark:bg-emerald-900/40 text-slate-900 dark:text-white', 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400', 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'];
  const deptGradBg = ['from-blue-500 to-blue-600', 'from-emerald-500 to-emerald-600', 'from-violet-500 to-violet-600', 'from-amber-500 to-amber-600'];
  const deptGradBar = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500'];

  // Custom alert & confirmation modal states
  const [alertModal, setAlertModal] = useState<{ show: boolean; title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }>({ show: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setAlertModal({ show: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  // Add Employee fields
  const [empNameAr, setEmpNameAr] = useState('');
  const [empNameEn, setEmpNameEn] = useState('');
  const [empRole, setEmpRole] = useState('شيف عمومي');
  const [empSalary, setEmpSalary] = useState(8000);
  const [empShift, setEmpShift] = useState<EmployeeShift>(EmployeeShift.Morning);
  const [empWorkingDays, setEmpWorkingDays] = useState(26);
  const [empWorkingHours, setEmpWorkingHours] = useState(8);
  const [empAnnualLeaveBalance, setEmpAnnualLeaveBalance] = useState(20);
  const [empNationalId, setEmpNationalId] = useState('');
  const [empDept, setEmpDept] = useState('المطبخ والإنتاج');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empHireDate, setEmpHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [empContractType, setEmpContractType] = useState('دوام كامل');
  const [empManager, setEmpManager] = useState('مروان يوسف');
  const [empContractStart, setEmpContractStart] = useState('');
  const [empContractEnd, setEmpContractEnd] = useState('');

  // Edit Employee fields
  const [editNameAr, setEditNameAr] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editSalary, setEditSalary] = useState(0);
  const [editShift, setEditShift] = useState<EmployeeShift>(EmployeeShift.Morning);
  const [editWorkingDays, setEditWorkingDays] = useState(26);
  const [editWorkingHours, setEditWorkingHours] = useState(8);
  const [editAnnualLeaveBalance, setEditAnnualLeaveBalance] = useState(20);
  const [editNationalId, setEditNationalId] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editHireDate, setEditHireDate] = useState('');
  const [editContractType, setEditContractType] = useState('دوام كامل');
  const [editManager, setEditManager] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editContractStart, setEditContractStart] = useState('');
  const [editContractEnd, setEditContractEnd] = useState('');

  // Monthly procedures inline edit state
  const [monthlyEdits, setMonthlyEdits] = useState<Record<string, {allowances: number; deductions: number; overtime: number}>>({});

  // Custom HR state hooks backed by app_state (directly pointing to ERPData source of truth to avoid sync overwrites)
  const leaveRequests = data.hrLeaves || [];
  const loansList = data.hrLoans || [];
  const departmentsList = data.hrDepartments || [];
  const calendarEvents = data.hrEvents || [];
  const getHolidayDates = (): Set<string> => new Set(
    (data.hrEvents || [])
      .filter((e: any) => e.type === 'holiday')
      .map((e: any) => e.date)
  );
  const [holidayMonth, setHolidayMonth] = useState(() => new Date().getMonth());
  const [holidayYear, setHolidayYear] = useState(() => new Date().getFullYear());
  // Dynamic department list (computed from hrDepartments + employees)
  const allDepts = (data.hrDepartments && data.hrDepartments.length > 0 ? data.hrDepartments : [
    { id: 'dept-default-1', nameAr: 'المطبخ والإنتاج', nameEn: 'Kitchen & Production', manager: 'أحمد الشناوي', budget: 350000 },
    { id: 'dept-default-2', nameAr: 'الصالة والخدمة', nameEn: 'Floor & Service', manager: 'مروان يوسف', budget: 180000 },
    { id: 'dept-default-3', nameAr: 'المالية والحسابات', nameEn: 'Finance & Accounts', manager: 'سامية علي', budget: 75000 },
    { id: 'dept-default-4', nameAr: 'الموارد البشرية', nameEn: 'Human Resources', manager: 'نورة عبدالله', budget: 50000 },
  ]);

  // Department manager and budget edit states
  const [showEditDeptModal, setShowEditDeptModal] = useState<any | null>(null);
  const [editDeptManager, setEditDeptManager] = useState('');
  const [editDeptBudget, setEditDeptBudget] = useState(0);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptNameAr, setNewDeptNameAr] = useState('');
  const [newDeptNameEn, setNewDeptNameEn] = useState('');
  const [newDeptManager, setNewDeptManager] = useState('');
  const [newDeptBudget, setNewDeptBudget] = useState(100000);

  // Manual loan repayment modal states
  const [showManualRepayModal, setShowManualRepayModal] = useState<any | null>(null);
  const [repayAmount, setRepayAmount] = useState(0);

  // Modals for adding sub-tab entries
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventTitleAr, setNewEventTitleAr] = useState('');
  const [newEventTitleEn, setNewEventTitleEn] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventType, setNewEventType] = useState<'holiday' | 'event' | 'meeting'>('event');

  const [showAddLeaveModal, setShowAddLeaveModal] = useState(false);
  const [newLeaveEmp, setNewLeaveEmp] = useState('');
  const [newLeaveType, setNewLeaveType] = useState('ANNUAL');
  const [newLeaveStart, setNewLeaveStart] = useState('');
  const [newLeaveEnd, setNewLeaveEnd] = useState('');
  const [newLeaveReason, setNewLeaveReason] = useState('');

  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [newLoanEmp, setNewLoanEmp] = useState('');
  const [newLoanAmount, setNewLoanAmount] = useState(1000);
  const [newLoanInstallmentMonths, setNewLoanInstallmentMonths] = useState(5);
  const [newLoanInstallment, setNewLoanInstallment] = useState(200);
  const [newLoanReason, setNewLoanReason] = useState('');

  // View specific department details
  const [selectedDeptDetails, setSelectedDeptDetails] = useState<any | null>(null);

  // Payroll disburse state
  const [paymentSourceId, setPaymentSourceId] = useState('treasury-1'); // default
  const [showPayrollConfirmModal, setShowPayrollConfirmModal] = useState(false);

  // Synchronizer helper
  const syncHRCollection = (key: string, nextVal: any) => {
    if (onUpdateERPState) {
      onUpdateERPState(prev => ({
        ...prev,
        [key]: nextVal
      }));
    }
  };

  const exportToCSV = (tableData: any[], filename: string, headers: { key: string; label: string }[]) => {
    const csvContent = [
      headers.map(h => h.label).join(','),
      ...tableData.map(row => headers.map(h => {
        let val = row[h.key];
        if (val === undefined || val === null) return '""';
        if (typeof val === 'number') return val;
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportEmployeesExcel = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Loding ERP';
    wb.created = new Date();

    // ── Colors ──
    const primary = 'FF1E3A8A';
    const accent = 'FF10B981';
    const headerBg = 'FF1E3A8A';
    const headerFg = 'FFFFFFFF';
    const altRow = 'FFF1F5F9';
    const border = 'FFE2E8F0';

    // ── Styles ──
    const titleFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 20, bold: true, color: { argb: primary } };
    const subtitleFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 14, color: { argb: 'FF64748B' } };
    const headerFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10, bold: true, color: { argb: headerFg } };
    const dataFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
    const moneyFmt = '#,##0.00 "ج.م"';

    // ════════════════════════════════════════════
    // SHEET 1: EXECUTIVE SUMMARY
    // ════════════════════════════════════════════
    const summary = wb.addWorksheet(isAr ? 'الملخص التنفيذي' : 'Executive Summary', { properties: { tabColor: { argb: primary } } });

    const deptMap: Record<string, Employee[]> = {};
    data.employees.forEach(e => {
      const d = e.department || (isAr ? 'عام' : 'General');
      if (!deptMap[d]) deptMap[d] = [];
      deptMap[d].push(e);
    });
    const activeEmps = data.employees.filter(e => e.status === 'ACTIVE');
    const archivedEmps = data.employees.filter(e => e.status !== 'ACTIVE');
    const totalSalary = activeEmps.reduce((s, e) => s + (e.salary || 0), 0);
    const avgSalary = activeEmps.length ? Math.round(totalSalary / activeEmps.length) : 0;

    // Row 1: Company title
    const r1 = summary.addRow([isAr ? 'مطعم لودنج' : 'Loding Restaurant']);
    summary.mergeCells(`A${r1.number}:H${r1.number}`);
    r1.font = titleFont;
    r1.alignment = { horizontal: 'center', vertical: 'middle' };
    r1.height = 36;

    // Row 2: Subtitle
    const r2 = summary.addRow([isAr ? 'سجل الموظفين الشامل' : 'Comprehensive Employee Ledger']);
    summary.mergeCells(`A${r2.number}:H${r2.number}`);
    r2.font = subtitleFont;
    r2.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 3: Date
    const r3 = summary.addRow([`${isAr ? 'تاريخ التصدير' : 'Export Date'}: ${new Date().toLocaleDateString('en-CA')}`]);
    summary.mergeCells(`A${r3.number}:H${r3.number}`);
    r3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF94A3B8' } };
    r3.alignment = { horizontal: 'center' };

    // Row 5: Stats header
    summary.addRow([]);
    const statHeader = summary.addRow([isAr ? 'ملخص إحصائي' : 'Statistical Summary']);
    summary.mergeCells(`A${statHeader.number}:H${statHeader.number}`);
    statHeader.font = { name: 'Calibri', size: 12, bold: true, color: { argb: primary } };

    const statLabels = [
      [isAr ? 'إجمالي الموظفين' : 'Total Employees', data.employees.length],
      [isAr ? 'الموظفون النشطون' : 'Active Employees', activeEmps.length],
      [isAr ? 'الموظفون المؤرشفون' : 'Archived Employees', archivedEmps.length],
      [isAr ? 'عدد الإدارات' : 'Departments', Object.keys(deptMap).length],
      [isAr ? 'إجمالي الرواتب الشهرية' : 'Total Monthly Salaries', totalSalary],
      [isAr ? 'متوسط الرواتب' : 'Average Salary', avgSalary],
    ];
    statLabels.forEach(([label, val], i) => {
      const row = summary.addRow([label, val]);
      row.getCell(1).font = { ...dataFont, bold: true };
      row.getCell(2).font = dataFont;
      row.getCell(2).alignment = { horizontal: 'center' };
      if (typeof val === 'number' && val > 1000) {
        row.getCell(2).numFmt = '#,##0';
      }
      // Color rows
      const colorIdx = i % 2 === 0 ? altRow : 'FFFFFFFF';
      row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorIdx } }; });
    });

    // Department breakdown
    summary.addRow([]);
    const deptHeader = summary.addRow([isAr ? 'توزيع الموظفين حسب الإدارات' : 'Department-wise Distribution']);
    summary.mergeCells(`A${deptHeader.number}:H${deptHeader.number}`);
    deptHeader.font = { name: 'Calibri', size: 12, bold: true, color: { argb: primary } };

    const deptTableHeader = summary.addRow([
      isAr ? 'الإدارة' : 'Department',
      isAr ? 'عدد الموظفين' : 'Staff Count',
      isAr ? 'إجمالي الرواتب' : 'Total Salary',
      isAr ? 'متوسط الراتب' : 'Avg Salary',
    ]);
    deptTableHeader.height = 22;
    deptTableHeader.eachCell(c => {
      c.font = headerFont;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = { top: { style: 'thin', color: { argb: border } }, bottom: { style: 'thin', color: { argb: border } }, left: { style: 'thin', color: { argb: border } }, right: { style: 'thin', color: { argb: border } } };
    });

    let deptTotalStaff = 0;
    let deptTotalSalary = 0;
    Object.entries(deptMap).forEach(([dept, emps], idx) => {
      const deptSalary = emps.reduce((s, e) => s + (e.salary || 0), 0);
      const deptAvg = emps.length ? Math.round(deptSalary / emps.length) : 0;
      deptTotalStaff += emps.length;
      deptTotalSalary += deptSalary;
      const row = summary.addRow([dept, emps.length, deptSalary, deptAvg]);
      row.eachCell(c => {
        c.font = dataFont;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = { top: { style: 'thin', color: { argb: border } }, bottom: { style: 'thin', color: { argb: border } }, left: { style: 'thin', color: { argb: border } }, right: { style: 'thin', color: { argb: border } } };
        if (idx % 2 === 0) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: altRow } };
      });
      row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(3).numFmt = moneyFmt;
      row.getCell(4).numFmt = moneyFmt;
    });

    // Totals row
    const totalRow = summary.addRow([
      isAr ? 'الإجمالي الكلي' : 'Grand Total',
      deptTotalStaff,
      deptTotalSalary,
      activeEmps.length ? Math.round(deptTotalSalary / activeEmps.length) : 0,
    ]);
    totalRow.eachCell(c => {
      c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerFg } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accent } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = { top: { style: 'thin', color: { argb: border } }, bottom: { style: 'thin', color: { argb: border } }, left: { style: 'thin', color: { argb: border } }, right: { style: 'thin', color: { argb: border } } };
    });
    totalRow.getCell(3).numFmt = moneyFmt;
    totalRow.getCell(4).numFmt = moneyFmt;

    // Column widths for summary
    summary.getColumn(1).width = 32;
    summary.getColumn(2).width = 20;
    summary.getColumn(3).width = 22;
    summary.getColumn(4).width = 20;

    // ════════════════════════════════════════════
    // SHEET 2: EMPLOYEE DETAILED LIST
    // ════════════════════════════════════════════
    const detail = wb.addWorksheet(isAr ? 'سجل الموظفين' : 'Employee Ledger', { properties: { tabColor: { argb: accent } } });

    const columns = [
      isAr ? 'الكود' : 'Code',
      isAr ? 'الاسم (عربي)' : 'Name (Ar)',
      'Name (EN)',
      isAr ? 'المسمى الوظيفي' : 'Role',
      isAr ? 'القسم' : 'Department',
      isAr ? 'الوردية' : 'Shift',
      isAr ? 'نوع التعاقد' : 'Contract Type',
      isAr ? 'المدير المباشر' : 'Manager',
      isAr ? 'الرقم القومي' : 'National ID',
      isAr ? 'الهاتف' : 'Phone',
      isAr ? 'البريد الإلكتروني' : 'Email',
      isAr ? 'تاريخ التعيين' : 'Hire Date',
      isAr ? 'الراتب الأساسي' : 'Base Salary',
      isAr ? 'البدلات' : 'Allowances',
      isAr ? 'الخصومات' : 'Deductions',
      isAr ? 'ساعات إضافية' : 'Overtime',
      isAr ? 'رصيد السلف' : 'Loan Balance',
      isAr ? 'الحالة' : 'Status',
      isAr ? 'بداية العقد' : 'Contract Start',
      isAr ? 'نهاية العقد' : 'Contract End',
    ];

    // Header row
    const headerRow = detail.addRow(columns);
    headerRow.height = 28;
    headerRow.eachCell(c => {
      c.font = headerFont;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = { top: { style: 'thin', color: { argb: border } }, bottom: { style: 'thin', color: { argb: border } }, left: { style: 'thin', color: { argb: border } }, right: { style: 'thin', color: { argb: border } } };
    });

    // Freeze header row
    detail.views = [{ state: 'frozen', ySplit: 1 }];

    // Data rows
    const employees = data.employees.filter(e => e.status === 'ACTIVE');
    employees.forEach((emp, idx) => {
      const row = detail.addRow([
        emp.code,
        emp.nameAr,
        emp.nameEn,
        emp.role,
        emp.department || (isAr ? 'عام' : 'General'),
        getShiftLabel(emp.shift as EmployeeShift),
        emp.contractType || '',
        emp.manager || '',
        emp.nationalId || '',
        emp.phone || '',
        emp.email || '',
        emp.hireDate || '',
        emp.salary || 0,
        emp.allowances || 0,
        emp.deductions || 0,
        emp.overtimeHours || 0,
        emp.loanBalance || 0,
        emp.status === 'ACTIVE' ? (isAr ? 'نشط' : 'Active') : (isAr ? 'مؤرشف' : 'Archived'),
        emp.contractStartDate || '',
        emp.contractEndDate || '',
      ]);
      row.height = 20;

      row.eachCell((c, colIdx) => {
        c.font = dataFont;
        c.alignment = { horizontal: colIdx <= 2 ? (isAr ? 'right' : 'left') : 'center', vertical: 'middle' };
        c.border = { top: { style: 'thin', color: { argb: border } }, bottom: { style: 'thin', color: { argb: border } }, left: { style: 'thin', color: { argb: border } }, right: { style: 'thin', color: { argb: border } } };

        // Alternate row color
        if (idx % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: altRow } };

        // Currency format for money columns (13-17)
        if (colIdx >= 13 && colIdx <= 17) c.numFmt = moneyFmt;
      });
    });

    // Auto-filter on header
    detail.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };

    // Column widths for detail
    const colWidths = [10, 22, 22, 20, 16, 16, 14, 18, 18, 16, 26, 14, 16, 14, 14, 14, 16, 12, 14, 14];
    colWidths.forEach((w, i) => { detail.getColumn(i + 1).width = w; });

    // ── Generate & download ──
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Employees_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (val: number) => {
    const num = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val);
    return isAr ? `${num} ج.م` : `${num} EGP`;
  };

  const getShiftLabel = (shift: EmployeeShift) => {
    switch (shift) {
      case EmployeeShift.Morning: return isAr ? 'وردية صباحية (AM)' : 'Morning Shift';
      case EmployeeShift.Evening: return isAr ? 'وردية مسائية (PM)' : 'Evening Shift';
      case EmployeeShift.Overnight: return isAr ? 'طوال الليل (Night)' : 'Overnight Shift';
      default: return shift;
    }
  };

  // 1. ADD NEW EMPLOYEE WITH ODOO EXTENDED PROPERTIES
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNameAr || !empNameEn) return;

    const code = `EMP-${String(data.employees.length + 1).padStart(3, '0')}`;
    const timeline = [
      { date: empHireDate, time: '09:00', action: 'تعيين الموظف وتوقيع العقد وإسناد الحساب بنجاح', user: 'admin' }
    ];

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
      workingDays: empWorkingDays,
      workingHours: empWorkingHours,
      annualLeaveBalance: empAnnualLeaveBalance,
      nationalId: empNationalId,
      department: empDept,
      email: empEmail,
      phone: empPhone,
      hireDate: empHireDate,
      contractType: empContractType,
      manager: empManager,
      status: 'ACTIVE',
      timelineJson: JSON.stringify(timeline),
      contractStartDate: empContractStart,
      contractEndDate: empContractEnd
    };

    onUpdateEmployees([...data.employees, newEmp]);

    // Update corresponding department count in static if any
    const nextDepts = departmentsList.map((d: any) => {
      if (d.nameAr === empDept || d.nameEn === empDept) {
        return { ...d, employeesCount: (d.employeesCount || 0) + 1 };
      }
      return d;
    });
    syncHRCollection('hrDepartments', nextDepts);

    onAddAuditLog(
      `تسجيل موظف جديد: ${empNameAr}`,
      `Registered Employee: ${empNameEn}`,
      `تم تسجيل الموظف ${empNameAr} برقم قومي ${empNationalId} بقسم ${empDept} وبراتب ${empSalary} جنيه مع ربطه آلياً بصلاحيات النظام.`
    );

    // Reset Form
    setEmpNameAr('');
    setEmpNameEn('');
    setEmpRole('شيف عمومي');
    setEmpSalary(8000);
    setEmpShift(EmployeeShift.Morning);
    setEmpWorkingDays(26);
    setEmpWorkingHours(8);
    setEmpNationalId('');
    setEmpDept('المطبخ والإنتاج');
    setEmpEmail('');
    setEmpPhone('');
    setEmpHireDate(new Date().toISOString().split('T')[0]);
    setEmpContractType('دوام كامل');
    setEmpManager('مروان يوسف');
    setEmpContractStart('');
    setEmpContractEnd('');
    setShowAddEmpForm(false);
  };

  // 2. EDIT EMPLOYEE
  const handleEditEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditEmpForm) return;

    const currentTimeline = showEditEmpForm.timelineJson 
      ? JSON.parse(showEditEmpForm.timelineJson) 
      : [];

    const updatedTimeline = [
      ...currentTimeline,
      { date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().split(' ')[0].substring(0, 5), action: 'تعديل البيانات الشخصية والوظيفية للموظف بواسطة الإدارة', user: 'admin' }
    ];

    const updated = data.employees.map(emp => {
      if (emp.id === showEditEmpForm.id) {
        return {
          ...emp,
          nameAr: editNameAr,
          nameEn: editNameEn,
          role: editRole,
          salary: Number(editSalary),
          shift: editShift,
          workingDays: Number(editWorkingDays),
          workingHours: Number(editWorkingHours),
          annualLeaveBalance: editAnnualLeaveBalance,
          nationalId: editNationalId,
          department: editDept,
          email: editEmail,
          phone: editPhone,
          hireDate: editHireDate,
          contractType: editContractType,
          manager: editManager,
          status: editStatus,
          active: editStatus === 'ACTIVE',
          timelineJson: JSON.stringify(updatedTimeline),
          contractStartDate: editContractStart,
          contractEndDate: editContractEnd
        };
      }
      return emp;
    });

    onUpdateEmployees(updated);
    
    if (selectedProfileEmp?.id === showEditEmpForm.id) {
      setSelectedProfileEmp(updated.find(x => x.id === showEditEmpForm.id) || null);
    }

    onAddAuditLog(
      `تعديل بيانات الموظف: ${editNameAr}`,
      `Updated Employee: ${editNameEn}`,
      `تم تعديل الملف الشخصي والمالي للموظف ${editNameAr} بواسطة الإدارة مع تحديث الهوية الوظيفية.`
    );

    setShowEditEmpForm(null);
  };

  const openEditModal = (emp: Employee) => {
    setShowEditEmpForm(emp);
    setEditNameAr(emp.nameAr || '');
    setEditNameEn(emp.nameEn || '');
    setEditRole(emp.role || '');
    setEditSalary(emp.salary || 0);
    setEditShift(emp.shift || EmployeeShift.Morning);
    setEditWorkingDays(emp.workingDays || 26);
    setEditWorkingHours(emp.workingHours || 8);
    setEditAnnualLeaveBalance(emp.annualLeaveBalance ?? 20);
    setEditNationalId(emp.nationalId || '');
    setEditDept(emp.department || 'المطبخ والإنتاج');
    setEditEmail(emp.email || '');
    setEditPhone(emp.phone || '');
    setEditHireDate(emp.hireDate || '');
    setEditContractType(emp.contractType || 'دوام كامل');
    setEditManager(emp.manager || 'مروان يوسف');
    setEditStatus(emp.status || 'ACTIVE');
    setEditContractStart(emp.contractStartDate || '');
    setEditContractEnd(emp.contractEndDate || '');
  };

  // 3. DELETE EMPLOYEE
  const handleDeleteEmployee = (id: string, name: string) => {
    showConfirm(
      isAr ? 'تأكيد الحذف' : 'Confirm Deletion',
      isAr ? `هل أنت متأكد من حذف الموظف "${name}" نهائياً من سجلات النظام وقاعدة البيانات؟` : `Are you sure you want to permanently delete employee "${name}"?`,
      () => {
        const updated = data.employees.filter(e => e.id !== id);
        onUpdateEmployees(updated);
        setSelectedProfileEmp(null);
        onAddAuditLog(
          `حذف موظف: ${name}`,
          `Deleted Employee: ${name}`,
          `تم حذف ملف الموظف بالكامل نهائياً من قاعدة البيانات.`
        );
        showAlert(
          isAr ? 'تم الحذف' : 'Deleted Successfully',
          isAr ? 'تم حذف الموظف بنجاح!' : 'Employee deleted successfully!',
          'success'
        );
      }
    );
  };

  // 4. LEAVE APPLICATION DURATION MATH
  const calculateDaysDuration = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeaveEmp || !newLeaveStart || !newLeaveEnd) return;

    const emp = data.employees.find(x => x.id === newLeaveEmp);
    if (!emp) return;

    const days = calculateDaysDuration(newLeaveStart, newLeaveEnd);

    // Validate annual leave balance
    if (newLeaveType === 'ANNUAL' && (emp.annualLeaveBalance ?? 20) < days) {
      showAlert(
        isAr ? 'رصيد غير كافٍ' : 'Insufficient Balance',
        isAr ? `رصيد الإجازات السنوية للموظف ${emp.nameAr} غير كافٍ. الرصيد المتبقي: ${emp.annualLeaveBalance ?? 20} يوم، والمطلوب: ${days} يوم.` : `Annual leave balance for ${emp.nameEn} is insufficient. Remaining: ${emp.annualLeaveBalance ?? 20} days, requested: ${days} days.`,
        'error'
      );
      return;
    }

    const newRequest = {
      id: 'lr-' + Math.random().toString(36).substring(2, 9),
      employeeId: emp.id,
      employeeName: isAr ? emp.nameAr : emp.nameEn,
      employeeNameAr: emp.nameAr,
      employeeNameEn: emp.nameEn,
      role: emp.role,
      department: emp.department || '',
      type: newLeaveType,
      duration: `${days} ${isAr ? 'أيام' : 'Days'}`,
      durationDays: days,
      from: newLeaveStart,
      to: newLeaveEnd,
      status: 'PENDING',
      reason: newLeaveReason,
      requestedAt: new Date().toISOString()
    };

    const nextLeaves = [newRequest, ...leaveRequests];
    syncHRCollection('hrLeaves', nextLeaves);

    onAddAuditLog(
      `تقديم طلب إجازة للموظف: ${emp.nameAr}`,
      `Requested leave for: ${emp.nameEn}`,
      `نوع الإجازة: ${newLeaveType}، من تاريخ: ${newLeaveStart} إلى: ${newLeaveEnd}. السبب: ${newLeaveReason}`
    );

    setNewLeaveEmp('');
    setNewLeaveReason('');
    setShowAddLeaveModal(false);
  };

  // ═══ LEAVE APPROVAL & DELETION (Admin Only) ═══
  const handleApproveLeave = (leaveId: string) => {
    if (!isAdmin) return;
    const leave = leaveRequests.find(l => l.id === leaveId);
    if (!leave) return;

    const nextLeaves = leaveRequests.map(l =>
      l.id === leaveId
        ? { ...l, status: 'APPROVED', approvedBy: 'admin', approvedAt: new Date().toISOString() }
        : l
    );
    syncHRCollection('hrLeaves', nextLeaves);

    // Deduct annual leave balance if ANNUAL type (excluding official holidays)
    if (leave.type === 'ANNUAL') {
      const holidayDates = getHolidayDates();
      const from = new Date(leave.from);
      const to = new Date(leave.to);
      let holidayOverlap = 0;
      const cursor = new Date(from);
      while (cursor <= to) {
        const ds = cursor.toISOString().split('T')[0];
        if (holidayDates.has(ds)) holidayOverlap++;
        cursor.setDate(cursor.getDate() + 1);
      }
      const days = Math.max(0, (leave.durationDays || 0) - holidayOverlap);
      const nextEmployees = data.employees.map(e =>
        e.id === leave.employeeId
          ? { ...e, annualLeaveBalance: Math.max(0, (e.annualLeaveBalance ?? 20) - days) }
          : e
      );
      onUpdateEmployees(nextEmployees);
    }

    onAddAuditLog(
      `اعتماد طلب إجازة: ${leave.employeeNameAr || leave.employeeName}`,
      `Approved leave request for: ${leave.employeeNameEn || leave.employeeName}`,
      `تمت الموافقة على إجازة من ${leave.from} إلى ${leave.to} (${leave.duration}).`
    );

    showAlert(
      isAr ? 'تم الاعتماد' : 'Leave Approved',
      isAr ? `تمت الموافقة على إجازة ${leave.employeeNameAr || leave.employeeName} بنجاح.` : `Leave for ${leave.employeeNameEn || leave.employeeName} approved successfully.`,
      'success'
    );
  };

  const handleRejectLeave = (leaveId: string) => {
    if (!isAdmin) return;
    const leave = leaveRequests.find(l => l.id === leaveId);
    if (!leave) return;

    showConfirm(
      isAr ? 'تأكيد رفض الإجازة' : 'Reject Leave Request',
      isAr ? `هل تريد رفض طلب إجازة الموظف "${leave.employeeNameAr || leave.employeeName}"؟` : `Reject leave request for "${leave.employeeNameEn || leave.employeeName}"?`,
      () => {
        const nextLeaves = leaveRequests.map(l =>
          l.id === leaveId
            ? { ...l, status: 'REJECTED', rejectedBy: 'admin', rejectedAt: new Date().toISOString() }
            : l
        );
        syncHRCollection('hrLeaves', nextLeaves);

        onAddAuditLog(
          `رفض طلب إجازة: ${leave.employeeNameAr || leave.employeeName}`,
          `Rejected leave request for: ${leave.employeeNameEn || leave.employeeName}`,
          `تم رفض الإجازة من ${leave.from} إلى ${leave.to}.`
        );
      }
    );
  };

  const handleDeleteLeave = (leaveId: string) => {
    if (!isAdmin) return;
    const leave = leaveRequests.find(l => l.id === leaveId);
    if (!leave) return;

    showConfirm(
      isAr ? 'تأكيد حذف الإجازة' : 'Confirm Deletion of Leave Request',
      isAr ? `هل تريد حذف سجل طلب الإجازة للموظف "${leave.employeeNameAr || leave.employeeName}" نهائياً من النظام؟` : `Delete leave request record for "${leave.employeeNameEn || leave.employeeName}" permanently from the database?`,
      () => {
        const nextLeaves = leaveRequests.filter(l => l.id !== leaveId);
        syncHRCollection('hrLeaves', nextLeaves);

        onAddAuditLog(
          `حذف طلب إجازة: ${leave.employeeNameAr || leave.employeeName}`,
          `Deleted leave request for: ${leave.employeeNameEn || leave.employeeName}`,
          `تم حذف سجل طلب الإجازة نهائياً.`
        );

        showAlert(
          isAr ? 'تم الحذف' : 'Deleted Successfully',
          isAr ? 'تم حذف سجل طلب الإجازة بنجاح.' : 'Leave request record deleted successfully.',
          'success'
        );
      }
    );
  };

  // 5. LOAN APPLICATION INSTALLMENT MATH
  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoanEmp || newLoanAmount <= 0 || newLoanInstallmentMonths <= 0 || newLoanInstallment <= 0) return;

    const emp = data.employees.find(x => x.id === newLoanEmp);
    if (!emp) return;

    const newLoan = {
      id: 'ln-' + Math.random().toString(36).substring(2, 9),
      empId: emp.id,
      empName: isAr ? emp.nameAr : emp.nameEn,
      amount: newLoanAmount,
      installment: newLoanInstallment,
      months: newLoanInstallmentMonths,
      paid: 0,
      remaining: newLoanAmount,
      date: new Date().toISOString().split('T')[0],
      reason: newLoanReason
    };

    const nextLoans = [newLoan, ...loansList];
    syncHRCollection('hrLoans', nextLoans);

    // Update employee loanBalance
    const nextEmployees = data.employees.map(x => {
      if (x.id === emp.id) {
        return { ...x, loanBalance: (x.loanBalance || 0) + newLoanAmount };
      }
      return x;
    });
    onUpdateEmployees(nextEmployees);

    // D/E Journal Entry: Debit Staff Advances (106), Credit Cash Box (101)
    const year = new Date().getFullYear();
    const jvSerial = String(data.journalEntries.length + 1).padStart(3, '0');
    const jvNumber = `JV-${year}-${jvSerial}`;

    const loanJV: JournalEntry = {
      id: 'je-' + Math.random().toString(36).substring(2, 9),
      entryNumber: jvNumber,
      date: new Date().toISOString().split('T')[0],
      type: 'AUTO' as any,
      description: `صرف سلفة لموظف: ${isAr ? emp.nameAr : emp.nameEn} بقسط شهري ${newLoanInstallment} ج.م لمدة ${newLoanInstallmentMonths} أشهر`,
      approved: true,
      approvedBy: isAr ? 'المدير العام' : 'General Manager',
      lines: [
        { accountId: '107', debit: newLoanAmount, credit: 0 },
        { accountId: '101', debit: 0, credit: newLoanAmount }
      ]
    };

    const nextAccounts = data.accounts.map(acc => {
      if (acc.id === '107') return { ...acc, balance: acc.balance + newLoanAmount };
      if (acc.id === '101') return { ...acc, balance: acc.balance - newLoanAmount };
      return acc;
    });

    onUpdateAccounts(nextAccounts);
    onUpdateEntries([loanJV, ...data.journalEntries]);

    onAddAuditLog(
      `منح سلفة للموظف: ${emp.nameAr}`,
      `Disbursed loan to employee: ${emp.nameEn}`,
      `مبلغ السلفة: ${newLoanAmount} ج.م، القسط: ${newLoanInstallment} ج.م/شهر، المدة: ${newLoanInstallmentMonths} أشهر.`
    );

    setNewLoanEmp('');
    setNewLoanAmount(1000);
    setNewLoanInstallmentMonths(5);
    setNewLoanInstallment(200);
    setNewLoanReason('');
    setShowAddLoanModal(false);
  };

  const handleManualLoanRepay = (loanId: string, amount: number) => {
    if (!isAdmin || amount <= 0) return;
    const loan = loansList.find((l: any) => l.id === loanId);
    if (!loan) return;
    const remaining = loan.remaining !== undefined ? loan.remaining : (loan.amount - (loan.paid || 0));
    if (amount > remaining) {
      showAlert(isAr ? 'خطأ' : 'Error', isAr ? 'مبلغ السداد أكبر من المتبقي!' : 'Repayment exceeds remaining balance!', 'error');
      return;
    }

    const nextLoans = loansList.map((l: any) => {
      if (l.id === loanId) {
        return {
          ...l,
          paid: (l.paid || 0) + amount,
          remaining: Math.max(0, remaining - amount)
        };
      }
      return l;
    });

    // Update employee loanBalance
    const emp = data.employees.find(e => e.id === loan.empId);
    if (emp) {
      const nextEmployees = data.employees.map(x => {
        if (x.id === emp.id) {
          return { ...x, loanBalance: Math.max(0, (x.loanBalance || 0) - amount) };
        }
        return x;
      });
      onUpdateEmployees(nextEmployees);
    }

    // Register JV (Debit Cash Box 101, Credit Staff Advances 106)
    const year = new Date().getFullYear();
    const jvSerial = String(data.journalEntries.length + 1).padStart(3, '0');
    const jvNumber = `JV-${year}-${jvSerial}`;
    const repaymentJV: JournalEntry = {
      id: 'je-' + Math.random().toString(36).substring(2, 9),
      entryNumber: jvNumber,
      date: new Date().toISOString().split('T')[0],
      type: 'AUTO' as any,
      description: `سداد يدوي لنظام سلف الموظفين - الموظف: ${loan.empName} بقيمة ${amount} ج.م`,
      approved: true,
      approvedBy: isAr ? 'المدير العام' : 'General Manager',
      lines: [
        { accountId: '101', debit: amount, credit: 0 },
        { accountId: '107', debit: 0, credit: amount }
      ]
    };

    const nextAccounts = data.accounts.map(acc => {
      if (acc.id === '101') return { ...acc, balance: acc.balance + amount };
      if (acc.id === '107') return { ...acc, balance: Math.max(0, acc.balance - amount) };
      return acc;
    });

    onUpdateAccounts(nextAccounts);
    onUpdateEntries([repaymentJV, ...data.journalEntries]);
    syncHRCollection('hrLoans', nextLoans);

    onAddAuditLog(
      `سداد يدوي لسلفة الموظف: ${loan.empName}`,
      `Recorded manual repayment for loan: ${loan.empName}`,
      `المبلغ المسترد: ${amount} ج.م، رصيد السلفة المتبقي: ${remaining - amount} ج.م`
    );

    showAlert(
      isAr ? 'تم تسجيل السداد' : 'Repayment Saved',
        isAr ? `تم سداد مبلغ ${amount} ج.م يدوياً بنجاح وترحيل القيد للدفاتر المحاسبية.` : `Successfully recorded repayment of ${amount} EGP.`,
      'success'
    );
  };

  const handleDeleteLoan = (loanId: string) => {
    if (!isAdmin) return;
    const loan = loansList.find((l: any) => l.id === loanId);
    if (!loan) return;

    showConfirm(
      isAr ? 'تأكيد حذف السلفة' : 'Confirm Loan Deletion',
      isAr ? `هل أنت متأكد من حذف سجل سلفة الموظف "${loan.empName}" بالكامل؟ لن يتم حذف القيود المحاسبية السابقة تلقائياً.` : `Delete loan record for "${loan.empName}" permanently? Past JVs won't be deleted automatically.`,
      () => {
        const nextLoans = loansList.filter((l: any) => l.id !== loanId);

        // Deduct employee loan balance
        const emp = data.employees.find(e => e.id === loan.empId);
        if (emp) {
          const nextEmployees = data.employees.map(x => {
            if (x.id === emp.id) {
              return { ...x, loanBalance: Math.max(0, (x.loanBalance || 0) - loan.remaining) };
            }
            return x;
          });
          onUpdateEmployees(nextEmployees);
        }

        syncHRCollection('hrLoans', nextLoans);

        onAddAuditLog(
          `حذف سجل سلفة: ${loan.empName}`,
          `Deleted loan record: ${loan.empName}`,
          `تم حذف السلفة برصيد متبقي ${loan.remaining} ج.م`
        );

        showAlert(
          isAr ? 'تم الحذف' : 'Deleted Successfully',
          isAr ? 'تم حذف سجل السلفة بنجاح.' : 'Loan record deleted successfully.',
          'success'
        );
      }
    );
  };

  // 6. DEPARTMENTS DYNAMIC BINDING
  const getDynamicDepartments = () => {
    return allDepts.map(d => {
      const deptStaff = data.employees.filter(emp => emp.department === d.nameAr || emp.department === d.nameEn);
      return {
        id: d.id,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
        manager: d.manager || '',
        employeesCount: deptStaff.length,
        budget: d.budget || 0,
        staff: deptStaff
      };
    });
  };

  const handleEditDepartmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditDeptModal) return;
    if (!isAdmin) {
      showAlert(isAr ? 'تنبيه' : 'Alert', isAr ? 'هذا الإجراء مخصص للأدمن فقط!' : 'This action is Admin-only!', 'warning');
      return;
    }

    const currentDepts = allDepts;
    const nextDepts = currentDepts.map((d: any) => {
      if (d.id === showEditDeptModal.id) {
        return { ...d, manager: editDeptManager, budget: Number(editDeptBudget) };
      }
      return d;
    });

    syncHRCollection('hrDepartments', nextDepts);

    onAddAuditLog(
      `تعديل بيانات قسم: ${showEditDeptModal.nameAr}`,
      `Modified department: ${showEditDeptModal.nameEn}`,
      `تحديث المدير المسؤول إلى: ${editDeptManager} والميزانية السنوية للأجور إلى: ${editDeptBudget} ج.م`
    );

    setShowEditDeptModal(null);
    showAlert(isAr ? 'تم الحفظ' : 'Saved',       isAr ? 'تم تحديث بيانات القسم المسؤول والميزانية بنجاح.' : 'Department updated successfully.', 'success');
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!newDeptNameAr || !newDeptNameEn) return;

    const newDept = {
      id: 'dept-' + Math.random().toString(36).substring(2, 9),
      nameAr: newDeptNameAr,
      nameEn: newDeptNameEn,
      manager: newDeptManager,
      budget: Number(newDeptBudget),
    };

    const nextDepts = [...allDepts, newDept];
    syncHRCollection('hrDepartments', nextDepts);

    onAddAuditLog(
      `إضافة قسم جديد: ${newDeptNameAr}`,
      `Added department: ${newDeptNameEn}`,
      `تمت إضافة القسم ${newDeptNameAr} بمدير ${newDeptManager} وميزانية ${newDeptBudget} ج.م`
    );

    setNewDeptNameAr('');
    setNewDeptNameEn('');
    setNewDeptManager('');
    setNewDeptBudget(100000);
    setShowAddDeptModal(false);
    showAlert(isAr ? 'تمت الإضافة' : 'Added',       isAr ? 'تم إضافة القسم الجديد بنجاح.' : 'New department added successfully.', 'success');
  };

  const handleDeleteDepartment = (dept: any) => {
    if (!isAdmin) return;
    showConfirm(
      isAr ? 'تأكيد حذف القسم' : 'Confirm Department Deletion',
      isAr ? `هل أنت متأكد من حذف القسم "${dept.nameAr}" نهائياً؟ (الموظفون المرتبطون به لن يتأثروا)` : `Delete department "${dept.nameEn}" permanently? (Linked employees won't be affected)`,
      () => {
        const nextDepts = allDepts.filter((d: any) => d.id !== dept.id);
        syncHRCollection('hrDepartments', nextDepts);
        onAddAuditLog(
          `حذف قسم: ${dept.nameAr}`,
          `Deleted department: ${dept.nameEn}`,
          `تم حذف القسم ${dept.nameAr} من النظام.`
        );
        showAlert(isAr ? 'تم الحذف' : 'Deleted',       isAr ? 'تم حذف القسم بنجاح.' : 'Department deleted successfully.', 'success');
      }
    );
  };

  // 7. EXPIRING CONTRACTS
  const getExpiringContracts = () => {
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    return data.employees.filter(emp => {
      if (!emp.contractEndDate || emp.status !== 'ACTIVE') return false;
      const end = new Date(emp.contractEndDate);
      return end >= today && end <= thirtyDaysLater;
    });
  };

  // 8. DYNAMIC CALENDAR GENERATOR
  const getDaysInMonthGrid = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const daysGrid: (Date | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      daysGrid.push(null);
    }
    for (let day = 1; day <= totalDays; day++) {
      daysGrid.push(new Date(year, month, day));
    }
    return daysGrid;
  };

  const handleAddCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitleAr || !newEventTitleEn || !newEventDate) return;

    const newEvent = {
      id: 'ev-' + Math.random().toString(36).substring(2, 9),
      titleAr: newEventTitleAr,
      titleEn: newEventTitleEn,
      date: newEventDate,
      type: newEventType
    };

    const nextEvents = [newEvent, ...calendarEvents];
    syncHRCollection('hrEvents', nextEvents);

    onAddAuditLog(
      `إضافة فعالية جديدة للتقويم: ${newEventTitleAr}`,
      `Created calendar event: ${newEventTitleEn}`,
      `تاريخ الفعالية: ${newEventDate}، النوع: ${newEventType}`
    );

    setNewEventTitleAr('');
    setNewEventTitleEn('');
    setShowAddEventModal(false);
  };

  // 9. DYNAMIC PAYMENT SOURCES (TREASURY / BANKS)
  const paymentSources = [
    ...data.treasuries.map(t => ({ id: `treasury-${t.id}`, accountId: t.accountId || '101', nameAr: t.nameAr, nameEn: t.nameEn, balance: t.balance, type: 'treasury' })),
    ...data.bankAccounts.map(b => ({ id: `bank-${b.id}`, accountId: b.accountId || '102', nameAr: b.bankNameAr, nameEn: b.bankNameEn, balance: b.balance, type: 'bank' }))
  ];

  // Helper: Calculate approved leave days for an employee in a given month
  const getLeaveDaysInMonth = (empId: string, month: number, year: number): number => {
    const holidayDates = getHolidayDates();
    let totalDays = 0;
    const approvedLeaves = leaveRequests.filter(l => 
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
          if (!holidayDates.has(ds)) totalDays++;
          cursor.setDate(cursor.getDate() + 1);
        }
      }
    }
    return totalDays;
  };

  const getEmployeeInstallment = (emp: Employee) => {
    if (!emp.loanBalance || emp.loanBalance <= 0) return 0;
    const activeLoan = loansList.find((l: any) => 
      l.empId === emp.id || 
      l.employeeId === emp.id || 
      (l.empName && (l.empName === emp.nameAr || l.empName === emp.nameEn)) ||
      (l.employeeName && (l.employeeName === emp.nameAr || l.employeeName === emp.nameEn))
    );
    if (activeLoan) {
      const remaining = activeLoan.remaining !== undefined ? activeLoan.remaining : (activeLoan.amount - (activeLoan.paid || 0));
      if (remaining > 0) {
        return Math.min(emp.loanBalance, activeLoan.installment || 0);
      }
    }
    // If no matching configured loan is found, do not deduct anything (do not assume a default percentage)
    return 0;
  };

  // Calculated payroll totals
  const getPayrollAggregates = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    let totalGrossBasic = 0;
    let totalAllowances = 0;
    let totalOvertimePay = 0;
    let totalDeductions = 0;
    let totalLoansDeduction = 0;
    let activeStaffCount = 0;

    data.employees.forEach(emp => {
      if (emp.status !== 'ACTIVE') return;
      activeStaffCount++;
      const wDays = emp.workingDays || 30;
      const leaveDays = getLeaveDaysInMonth(emp.id, currentMonth, currentYear);
      const actualDays = Math.max(0, wDays - leaveDays);
      const basic = emp.salary;
      const wh = emp.workingHours || 8;
      const dailyRate = basic / wDays;
      const earnedBasic = dailyRate * actualDays;
      const allowance = emp.allowances || 0;
      const hourlyRate = basic / (wDays * wh);
      const overtimePay = (emp.overtimeHours || 0) * hourlyRate * 1.5;
      const deduction = emp.deductions || 0;
      const loan = getEmployeeInstallment(emp);

      totalGrossBasic += earnedBasic;
      totalAllowances += allowance;
      totalOvertimePay += overtimePay;
      totalDeductions += deduction;
      totalLoansDeduction += loan;
    });

    const totalNetPaid = (totalGrossBasic + totalAllowances + totalOvertimePay) - totalDeductions - totalLoansDeduction;
    const grossExpenseDebited = totalGrossBasic + totalAllowances + totalOvertimePay;

    return {
      totalGrossBasic,
      totalAllowances,
      totalOvertimePay,
      totalDeductions,
      totalLoansDeduction,
      totalNetPaid,
      grossExpenseDebited,
      activeStaffCount
    };
  };

  const handleDisbursePayrollAction = () => {
    const { totalGrossBasic, totalAllowances, totalOvertimePay, totalDeductions, totalLoansDeduction, totalNetPaid, grossExpenseDebited, activeStaffCount } = getPayrollAggregates();

    if (totalNetPaid <= 0) {
      showAlert(
        isAr ? 'تنبيه' : 'Alert',
        isAr ? 'لا توجد مستحقات رواتب كافية للصرف حالياً!' : 'No net payroll balance available for disbursement!',
        'warning'
      );
      return;
    }

    const source = paymentSources.find(s => s.id === paymentSourceId);
    if (!source) {
      showAlert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'من فضلك اختر خزينة أو بنك صالح للصرف!' : 'Please select a valid payment source!',
        'error'
      );
      return;
    }

    // Balance check before deduction
    if (source.balance < totalNetPaid) {
      showAlert(
        isAr ? 'رصيد غير كافٍ' : 'Insufficient Balance',
        isAr ? `المبلغ غير متوفر في المصدر المالي (${source.nameAr}). الرصيد الحالي: ${source.balance.toLocaleString()} ج.م، المطلوب: ${totalNetPaid.toLocaleString()} ج.م` : `Insufficient funds in payment source (${source.nameEn}). Current balance: ${source.balance.toLocaleString()} EGP, required: ${totalNetPaid.toLocaleString()} EGP`,
        'error'
      );
      return;
    }

    // C-2 FIX: Update matching loan records' paid and remaining balances
    const updatedLoans = loansList.map((l: any) => {
      const matchingEmp = data.employees.find(emp => 
        l.empId === emp.id || 
        l.employeeId === emp.id || 
        (l.empName && (l.empName === emp.nameAr || l.empName === emp.nameEn)) ||
        (l.employeeName && (l.employeeName === emp.nameAr || l.employeeName === emp.nameEn))
      );
      if (matchingEmp && matchingEmp.status === 'ACTIVE' && matchingEmp.loanBalance > 0) {
        const remaining = l.remaining !== undefined ? l.remaining : (l.amount - (l.paid || 0));
        const installment = getEmployeeInstallment(matchingEmp);
        const paidThisMonth = Math.min(remaining, installment);
        return {
          ...l,
          paid: (l.paid || 0) + paidThisMonth,
          remaining: Math.max(0, remaining - paidThisMonth)
        };
      }
      return l;
    });

    // 1. Update employees status log (clear allowances, deductions, overtime for next month)
    const updatedEmployees = data.employees.map(emp => {
      if (emp.status === 'ACTIVE') {
        const installment = getEmployeeInstallment(emp);
        return {
          ...emp,
          loanBalance: Math.max(0, (emp.loanBalance || 0) - installment),
          allowances: 0,
          deductions: 0,
          overtimeHours: 0
        };
      }
      return emp;
    });

    // 2. Subtract from selected treasury/bank account
    const nextTreasuries = data.treasuries.map(t => {
      if (`treasury-${t.id}` === source.id) {
        return { ...t, balance: t.balance - totalNetPaid };
      }
      return t;
    });

    const nextBankAccounts = data.bankAccounts.map(b => {
      if (`bank-${b.id}` === source.id) {
        return { ...b, balance: b.balance - totalNetPaid };
      }
      return b;
    });

    // 3. Post Balanced General Ledger JV
    const year = new Date().getFullYear();
    const jvSerial = String(data.journalEntries.length + 1).padStart(3, '0');
    const jvNumber = `JV-${year}-${jvSerial}`;

    const payrollJV: JournalEntry = {
      id: 'je-' + Math.random().toString(36).substring(2, 9),
      entryNumber: jvNumber,
      date: new Date().toISOString().split('T')[0],
      type: 'AUTO' as any,
      description: `صرف مسيرات رواتب الموظفين الشهرية - المصدر المالي: ${isAr ? source.nameAr : source.nameEn}`,
      approved: true,
      approvedBy: isAr ? 'المدير العام' : 'General Manager',
      lines: [
        { accountId: '601', debit: totalGrossBasic + totalOvertimePay, credit: 0 },
        ...(totalAllowances > 0 ? [{ accountId: '606', debit: totalAllowances, credit: 0 }] : []),
        ...(totalDeductions > 0 ? [{ accountId: '405', debit: 0, credit: totalDeductions }] : []),
        ...(totalLoansDeduction > 0 ? [{ accountId: '107', debit: 0, credit: totalLoansDeduction }] : []),
        { accountId: source.accountId, debit: 0, credit: totalNetPaid }
      ]
    };

    const nextAccounts = data.accounts.map(acc => {
      if (acc.id === '601') return { ...acc, balance: acc.balance + totalGrossBasic + totalOvertimePay };
      if (acc.id === '606') return { ...acc, balance: acc.balance + totalAllowances };
      if (acc.id === '405') return { ...acc, balance: acc.balance + totalDeductions };
      if (acc.id === '107') return { ...acc, balance: Math.max(0, acc.balance - totalLoansDeduction) };
      if (acc.id === source.accountId) return { ...acc, balance: acc.balance - totalNetPaid };
      return acc;
    });

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const payrollLines: PayslipLine[] = data.employees
      .filter(emp => emp.status === 'ACTIVE')
      .map(emp => {
        const basic = emp.salary;
        const wDays = emp.workingDays || 30;
        const leaveDays = getLeaveDaysInMonth(emp.id, currentMonth, currentYear);
        const actualDays = Math.max(0, wDays - leaveDays);
        const dailyRate = basic / wDays;
        const earnedBasic = dailyRate * actualDays;
        const allowance = emp.allowances || 0;
        const wh = emp.workingHours || 8;
        const hourlyRate = basic / (wDays * wh);
        const overtimePay = (emp.overtimeHours || 0) * hourlyRate * 1.5;
        const deduction = emp.deductions || 0;
        const loan = getEmployeeInstallment(emp);
        const grossPay = earnedBasic + allowance + overtimePay;
        const netPay = grossPay - deduction - loan;

        return {
          employeeId: emp.id,
          basicSalary: basic,
          workingDays: wDays,
          actualDays: actualDays,
          overtime: emp.overtimeHours || 0,
          overtimeAmount: overtimePay,
          allowances: allowance,
          grossPay: grossPay,
          deductions: deduction,
          loanInstallment: loan,
          socialInsurance: 0,
          tax: 0,
          netPay: netPay
        };
      });

    const newPayrollRun: PayrollRun = {
      id: 'pr-' + Math.random().toString(36).substring(2, 9),
      runNumber: jvNumber,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      date: new Date().toISOString().split('T')[0],
      status: 'PAID',
      lines: payrollLines,
      totalGross: totalGrossBasic + totalAllowances + totalOvertimePay,
      totalDeductions: totalDeductions + totalLoansDeduction,
      totalNet: totalNetPaid,
      journalEntryId: payrollJV.id,
      // Extra fields kept for safety
      paymentSource: isAr ? source.nameAr : source.nameEn,
      grossExpense: grossExpenseDebited,
      runDate: new Date().toISOString().split('T')[0],
      netPaid: totalNetPaid,
      loansCleared: totalLoansDeduction,
      staffCount: activeStaffCount
    } as any;

    if (onUpdateERPState) {
      onUpdateERPState(prev => ({
        ...prev,
        employees: updatedEmployees,
        accounts: nextAccounts,
        journalEntries: [payrollJV, ...prev.journalEntries],
        treasuries: nextTreasuries,
        bankAccounts: nextBankAccounts,
        payrollRuns: [newPayrollRun, ...(prev.payrollRuns || [])],
        hrLoans: updatedLoans
      }));
    }

    onAddAuditLog(
      `اعتماد كشف الرواتب الشهري وترحيل القيود`,
      `Released payroll run: ${jvNumber}`,
      `إجمالي المنصرف الصافي: ${totalNetPaid} ج.م خصماً من ${isAr ? source.nameAr : source.nameEn}`
    );

    setShowPayrollConfirmModal(false);
    showAlert(
      isAr ? 'نجاح' : 'Success',
      isAr ? 'تم ترحيل رواتب الشهر بالكامل بنجاح وتأثيرها على حسابات الخزينة/البنك والقيود اليومية!' : 'Salaries disbursed and general ledger updated successfully!',
      'success'
    );
  };

  // Helper values for stat widgets
  const stats = {
    totalCount: data.employees.length,
    baseSum: data.employees.reduce((sum, e) => sum + e.salary, 0),
    activeLoans: data.employees.reduce((sum, e) => sum + (e.loanBalance || 0), 0)
  };

  return (
    <div id="hr_module_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1 text-slate-805 dark:text-slate-200">
      
      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
            <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {isAr ? 'إدارة رأس المال البشري' : 'Human Capital Management'}
              </h1>
              <p className="text-[11px] font-medium text-slate-400">{isAr ? 'الموظفين، العقود، الرواتب، والإجازات' : 'Employees, contracts, payroll & leaves'}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/50 dark:border-slate-800/60 text-xs font-bold">
          {([
            { id: 'dashboard', label: isAr ? 'الرئيسية' : 'Dashboard', icon: LayoutDashboard },
            { id: 'monthly_procedures', label: isAr ? 'الإجراءات الشهرية' : 'Monthly Procedures', icon: ClipboardList },
            { id: 'employees', label: isAr ? 'الموظفون' : 'Employees', icon: Users },
            { id: 'departments', label: isAr ? 'الأقسام' : 'Departments', icon: Layers },
            { id: 'contracts', label: isAr ? 'العقود' : 'Contracts', icon: FileText },
            { id: 'leaves', label: isAr ? 'الإجازات' : 'Leaves', icon: CalendarIcon },
            { id: 'holidays', label: isAr ? 'الإجازات الرسمية' : 'Holidays', icon: Sparkles },
            { id: 'loans', label: isAr ? 'السلف' : 'Loans', icon: Wallet },
            { id: 'payroll', label: isAr ? 'الرواتب' : 'Payroll', icon: Landmark },
            { id: 'reports', label: isAr ? 'التقارير' : 'Reports', icon: BarChart2 }
          ] as { id: typeof activeSubTab; label: string; icon: any }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                setSelectedProfileEmp(null);
                setSelectedDeptDetails(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeSubTab === tab.id 
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.substring(0, 2)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          BENTO SUB-TAB: DASHBOARD
          ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'dashboard' && (() => {
        const onLeaveEmpIds = new Set(leaveRequests.filter(l => l.status === 'APPROVED' && new Date(l.from) <= new Date() && new Date(l.to) >= new Date()).map(l => l.employeeId));
        const activeCount = data.employees.filter(e => e.status === 'ACTIVE' && !onLeaveEmpIds.has(e.id)).length;
        const onLeaveCount = onLeaveEmpIds.size;
        const pendingLeaves = leaveRequests.filter(l => l.status === 'PENDING').length;
        const payrollAgg = getPayrollAggregates();
        const depts = getDynamicDepartments();
        const expiringContracts = getExpiringContracts();

        // Top salary earners
        const topEarners = [...data.employees]
          .filter(e => e.status === 'ACTIVE')
          .sort((a, b) => b.salary - a.salary)
          .slice(0, 5);

        // Department chart data
        const deptChartData = depts.map(d => ({
          name: isAr ? d.nameAr : d.nameEn,
          staff: d.employeesCount,
          budget: Math.round(d.budget / 1000)
        }));

        // Shift distribution
        const shiftData = [
          { name: isAr ? 'صباحي' : 'Morning', value: data.employees.filter(e => e.shift === EmployeeShift.Morning).length, color: '#2563eb' },
          { name: isAr ? 'مسائي' : 'Evening', value: data.employees.filter(e => e.shift === EmployeeShift.Evening).length, color: '#10b981' },
          { name: isAr ? 'ليلي' : 'Night', value: data.employees.filter(e => e.shift === EmployeeShift.Overnight).length, color: '#f59e0b' }
        ].filter(s => s.value > 0);

        return (
        <div className="space-y-5">

          {/* ── ROW 1: KPI BENTO GRID ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">

            {/* Card: Total Employees */}
            <div className="col-span-1 relative overflow-hidden bg-blue-600 text-white p-5 rounded-3xl shadow-lg flex flex-col justify-between min-h-[120px]">
              <div className="h-10 w-10 rounded-2xl bg-white/15 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-3xl font-black font-mono block leading-none tracking-tight">{data.employees.length}</span>
                <span className="text-[10px] font-bold text-blue-100/80 uppercase tracking-wide">{isAr ? 'إجمالي الموظفين' : 'Total Staff'}</span>
              </div>
            </div>

            {/* Card: Active */}
            <div className="col-span-1 relative overflow-hidden bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-3xl flex flex-col justify-between min-h-[120px]">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white flex items-center justify-center">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white block leading-none tracking-tight">{activeCount}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{isAr ? 'نشطون فعلياً' : 'Active Staff'}</span>
              </div>
            </div>

            {/* Card: On Leave */}
            <div className="col-span-1 relative overflow-hidden bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 p-5 rounded-3xl flex flex-col justify-between min-h-[120px]">
              <div className="h-10 w-10 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <span className="text-2xl font-black font-mono text-violet-600 block leading-none tracking-tight">{onLeaveCount}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{isAr ? 'في إجازة الآن' : 'On Leave Now'}</span>
              </div>
            </div>

            {/* Card: Pending Leaves */}
            <div className={`col-span-1 relative overflow-hidden p-5 rounded-3xl flex flex-col justify-between min-h-[120px] border ${
              pendingLeaves > 0 
                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50' 
                : 'bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-800/80'
            }`}>
              <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                pendingLeaves > 0 ? 'bg-amber-100 dark:bg-amber-950 text-slate-900 dark:text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'
              }`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className={`text-2xl font-black font-mono block leading-none tracking-tight ${pendingLeaves > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{pendingLeaves}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{isAr ? 'بانتظار الموافقة' : 'Pending Approval'}</span>
              </div>
            </div>

            {/* Card: Monthly Payroll */}
            <div className="col-span-1 md:col-span-2 relative overflow-hidden bg-slate-900 dark:bg-slate-800 text-white p-5 rounded-3xl shadow-lg flex flex-col justify-between min-h-[120px]">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Landmark className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{isAr ? 'هذا الشهر' : 'THIS MONTH'}</span>
              </div>
              <div>
                <span className="text-xl font-black font-mono text-white block leading-none tracking-tight">{formatCurrency(payrollAgg.totalNetPaid)}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{isAr ? 'صافي الرواتب المستحقة' : 'Net Payroll Due'}</span>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-[9px] text-slate-900 dark:text-white font-bold">+{formatCurrency(payrollAgg.totalAllowances)} {isAr ? 'بدلات' : 'Allow'}</span>
                  <span className="text-[9px] text-slate-900 dark:text-white font-bold">-{formatCurrency(payrollAgg.totalDeductions)} {isAr ? 'خصومات' : 'Deduct'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── ROW 2: MAIN CONTENT GRID ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-start">

            {/* LEFT: Department Overview + Charts */}
            <div className="lg:col-span-2 space-y-5">

              {/* Departments Quick Overview */}
              <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-900 dark:text-white" />
                      {isAr ? 'الأقسام' : 'Departments'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{isAr ? 'توزيع الموظفين والميزانيات' : 'Staff & budget distribution'}</p>
                  </div>
                  <button onClick={() => setActiveSubTab('departments')} className="text-[10px] text-slate-900 dark:text-white font-bold hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1">
                    {isAr ? 'عرض الكل' : 'View All'} <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {depts.map((dept, i) => {
                    const ci = i % 4;
                    return (
                      <div key={dept.id} className={`p-4 rounded-2xl border ${colorDeptCard[ci]} hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer`}
                        onClick={() => setActiveSubTab('departments')}>
                        <div className="flex items-start justify-between mb-3">
                          <span className={`text-xs font-black text-slate-900 dark:text-white leading-tight`}>{isAr ? dept.nameAr : dept.nameEn}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${colorDeptBadge[ci]}`}>
                            {dept.employeesCount} {isAr ? 'موظف' : 'staff'}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">{isAr ? 'مدير القسم:' : 'Manager:'}</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{dept.manager}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">{isAr ? 'الميزانية:' : 'Budget:'}</span>
                            <span className="font-bold font-mono text-slate-900 dark:text-white">{formatCurrency(dept.budget)}</span>
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 bg-slate-200/60 dark:bg-slate-800/60 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${deptGradBar[ci]} rounded-full transition-all`}
                            style={{ width: `${Math.min(100, (dept.employeesCount / Math.max(data.employees.length, 1)) * 100 * 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Dept Salary Bar Chart */}
                <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-slate-900 dark:text-white" />
                    {isAr ? 'الميزانية بالألف (ج.م)' : 'Budget (K EGP)'}
                  </h4>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <Tooltip
                          formatter={(value: any) => [`${value}K ج.م`, isAr ? 'الأجور' : 'Budget']}
                          contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0' }}
                        />
                        <Bar dataKey="budget" radius={[8, 8, 0, 0]}>
                          {deptChartData.map((_, index) => (
                            <Cell key={`dept-${index}`} fill={['#2563eb', '#10b981', '#7c3aed', '#f59e0b'][index % 4]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Shift Pie Chart */}
                <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-violet-600" />
                    {isAr ? 'توزيع الورديات' : 'Shift Distribution'}
                  </h4>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={shiftData}
                          cx="40%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={62}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {shiftData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => <span style={{ fontSize: '10px', fontWeight: 700 }}>{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Sidebar panels */}
            <div className="space-y-5">

              {/* Pending Leaves — Admin Action Panel */}
              {isAdmin && pendingLeaves > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 p-5 rounded-3xl shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-xl bg-amber-500 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 dark:text-white">{isAr ? 'طلبات إجازة بانتظارك' : 'Leaves Awaiting Approval'}</h3>
                      <span className="text-[9px] text-slate-900 dark:text-white font-bold">{pendingLeaves} {isAr ? 'طلب معلق — يستلزم موافقة الأدمن' : 'requests pending admin approval'}</span>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {leaveRequests.filter(l => l.status === 'PENDING').slice(0, 4).map(leave => (
                      <div key={leave.id} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white block">{isAr ? (leave.employeeNameAr || leave.employeeName) : (leave.employeeNameEn || leave.employeeName)}</span>
                            <span className="text-[9px] text-slate-400">{leave.type} · {leave.duration}</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400">{leave.from}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleApproveLeave(leave.id)}
                            className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1.5 rounded-xl cursor-pointer transition-all"
                          >
                            <CheckCheck className="h-3 w-3" />
                            {isAr ? 'قبول' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleRejectLeave(leave.id)}
                            className="flex-1 flex items-center justify-center gap-1 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-600 hover:text-white text-slate-900 dark:text-white dark:text-slate-900 dark:text-white font-bold text-[10px] py-1.5 rounded-xl cursor-pointer border border-rose-200 dark:border-rose-800/50 transition-all"
                          >
                            <X className="h-3 w-3" />
                            {isAr ? 'رفض' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {pendingLeaves > 4 && (
                    <button onClick={() => setActiveSubTab('leaves')} className="w-full mt-2 text-[10px] text-slate-900 dark:text-white font-bold hover:underline cursor-pointer text-center">
                      {isAr ? `+ عرض ${pendingLeaves - 4} طلبات أخرى` : `+ View ${pendingLeaves - 4} more requests`}
                    </button>
                  )}
                </div>
              )}

              {/* Top Earners */}
              <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Award className="h-4 w-4 text-amber-500" />
                  {isAr ? 'أعلى الرواتب' : 'Top Earners'}
                </h3>
                <div className="space-y-2.5">
                  {topEarners.map((emp, i) => (
                    <div key={emp.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 p-2 rounded-xl -mx-2 transition-all"
                      onClick={() => setSelectedProfileEmp(emp)}>
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 ${
                        i === 0 ? 'bg-blue-600' : i === 1 ? 'bg-slate-500' : i === 2 ? 'bg-slate-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {emp.nameEn.substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-black text-slate-900 dark:text-white block truncate">{isAr ? emp.nameAr : emp.nameEn}</span>
                        <span className="text-[9px] text-slate-400 block truncate">{emp.role}</span>
                      </div>
                      <span className="text-xs font-black font-mono text-slate-900 dark:text-white shrink-0">{formatCurrency(emp.salary)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contract Expiry Alerts */}
              {expiringContracts.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 p-5 rounded-3xl">
                  <h3 className="text-xs font-black text-rose-700 dark:text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4" />
                    {isAr ? `${expiringContracts.length} عقود تنتهي قريباً` : `${expiringContracts.length} Expiring Contracts`}
                  </h3>
                  <div className="space-y-2">
                    {expiringContracts.slice(0, 3).map(emp => (
                      <div key={emp.id} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-slate-900 rounded-xl">
                        <span className="font-bold text-slate-800 dark:text-white truncate">{isAr ? emp.nameAr : emp.nameEn}</span>
                        <span className="text-slate-900 dark:text-white font-mono font-bold shrink-0 ml-2">{emp.contractEndDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calendar Events */}
              <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-slate-900 dark:text-white" />
                    {isAr ? 'الأجندة القادمة' : 'Upcoming Events'}
                  </h3>
                  <button onClick={() => setShowAddEventModal(true)} className="text-[10px] text-slate-900 dark:text-white font-bold hover:underline cursor-pointer">
                    {isAr ? '+ إضافة' : '+ Add'}
                  </button>
                </div>
                {calendarEvents.length === 0 ? (
                  <div className="text-center text-[10px] text-slate-400 py-4">{isAr ? 'لا توجد فعاليات مجدولة' : 'No events scheduled'}</div>
                ) : (
                  <div className="space-y-2">
                    {calendarEvents.slice(0, 4).map(e => (
                      <div key={e.id} className="flex gap-3 items-start">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          e.type === 'holiday' ? 'bg-rose-500' : e.type === 'meeting' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">{isAr ? e.titleAr : e.titleEn}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{e.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── ROW 3: RECENT EMPLOYEES ── */}
          <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-900 dark:text-white" />
                {isAr ? 'الموظفون' : 'Employee Roster'}
              </h3>
              <button onClick={() => setActiveSubTab('employees')} className="text-[10px] text-slate-900 dark:text-white font-bold hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1">
                {isAr ? 'عرض الجميع' : 'View All'} <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {data.employees.slice(0, 8).map(emp => {
                const empLeave = leaveRequests.find(l => 
                  (l.employeeId === emp.id) && 
                  l.status === 'APPROVED' && 
                  new Date(l.to) >= new Date() && 
                  new Date(l.from) <= new Date()
                );
                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedProfileEmp(emp)}
                    className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-blue-200 dark:hover:border-blue-700/50 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm">
                        {emp.nameEn.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-black text-slate-900 dark:text-white block truncate group-hover:text-slate-900 dark:text-white transition-colors">{isAr ? emp.nameAr : emp.nameEn}</span>
                        <span className="text-[9px] text-slate-400 block truncate">{emp.role}</span>
                      </div>
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        empLeave ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600' :
                        emp.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-slate-900 dark:text-white' : 
                        'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {empLeave ? (isAr ? 'إجازة' : 'Leave') : emp.status === 'ACTIVE' ? (isAr ? 'نشط' : 'Active') : (isAr ? 'موقوف' : 'Inactive')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">{emp.department || (isAr ? 'عام' : 'General')}</span>
                      <span className="font-black font-mono text-slate-900 dark:text-white">{formatCurrency(emp.salary)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-[9px] text-slate-400">
                      <Clock className="h-2.5 w-2.5" />
                      {emp.shift === EmployeeShift.Morning ? (isAr ? 'صباحي' : 'Morning') : 
                       emp.shift === EmployeeShift.Evening ? (isAr ? 'مسائي' : 'Evening') : (isAr ? 'ليلي' : 'Night')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ────────────────────────────────────────────────────────
          SUB-TAB: MONTHLY PROCEDURES (البدلات والخصومات والساعات الإضافية)
          ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'monthly_procedures' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-950 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm text-start">
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white">{isAr ? 'الإجراءات الشهرية' : 'Monthly Procedures'}</h3>
              <p className="text-[10px] text-slate-400 font-medium">{isAr ? 'إدارة البدلات والإضافات والخصومات والجزاءات والساعات الإضافية لجميع الموظفين' : 'Manage allowances, deductions, and overtime for all employees'}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden text-xs font-semibold">
            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                    <th className="px-4 py-3 text-start">{isAr ? 'الموظف' : 'Employee'}</th>
                    <th className="px-4 py-3 text-center">{isAr ? 'البدلات والإضافات' : 'Allowances'}</th>
                    <th className="px-4 py-3 text-center">{isAr ? 'الخصومات والجزاءات' : 'Deductions'}</th>
                    <th className="px-4 py-3 text-center">{isAr ? 'ساعات إضافية' : 'Overtime'}</th>
                    <th className="px-4 py-3 text-center">{isAr ? 'معتمد حالياً' : 'Current'}</th>
                    <th className="px-4 py-3 text-center">{isAr ? 'حفظ' : 'Save'}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees.filter(e => e.status === 'ACTIVE').map((emp) => {
                    const editVal = monthlyEdits[emp.id] || { allowances: emp.allowances || 0, deductions: emp.deductions || 0, overtime: 0 };
                    return (
                      <tr key={emp.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 font-black text-xs">{emp.nameEn.substring(0, 2)}</div>
                            <div>
                              <span className="text-slate-900 dark:text-white font-bold text-[11px] block">{isAr ? emp.nameAr : emp.nameEn}</span>
                              <span className="text-[9px] text-slate-400">{emp.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input type="number" value={editVal.allowances}
                            onChange={(e) => setMonthlyEdits(prev => ({ ...prev, [emp.id]: { ...prev[emp.id] || { allowances: emp.allowances || 0, deductions: emp.deductions || 0, overtime: 0 }, allowances: Number(e.target.value) } }))}
                            className="w-24 py-1.5 px-2 border rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-center text-[11px] font-bold" />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input type="number" value={editVal.deductions}
                            onChange={(e) => setMonthlyEdits(prev => ({ ...prev, [emp.id]: { ...prev[emp.id] || { allowances: emp.allowances || 0, deductions: emp.deductions || 0, overtime: 0 }, deductions: Number(e.target.value) } }))}
                            className="w-24 py-1.5 px-2 border rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white dark:text-slate-900 dark:text-white text-center text-[11px] font-bold" />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input type="number" value={editVal.overtime}
                            onChange={(e) => setMonthlyEdits(prev => ({ ...prev, [emp.id]: { ...prev[emp.id] || { allowances: emp.allowances || 0, deductions: emp.deductions || 0, overtime: 0 }, overtime: Number(e.target.value) } }))}
                            className="w-24 py-1.5 px-2 border rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white dark:text-slate-900 dark:text-white text-center text-[11px] font-bold" />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`font-mono text-[11px] font-bold ${(emp.overtimeHours ?? 0) > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {emp.overtimeHours ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {monthlyEdits[emp.id] && (
                            <button onClick={() => {
                              const vals = monthlyEdits[emp.id];
                              const updated = data.employees.map(e => e.id === emp.id ? { ...e, allowances: vals.allowances, deductions: vals.deductions, overtimeHours: (e.overtimeHours || 0) + vals.overtime } : e);
                              onUpdateEmployees(updated);
                              onAddAuditLog(`تحديث الإجراءات الشهرية للموظف ${emp.nameAr}`, `Updated monthly procedures for ${emp.nameEn}`, `تم تعديل البدلات والخصومات والساعات الإضافية للموظف ${emp.nameAr}`);
                              setMonthlyEdits(prev => { const n = { ...prev }; delete n[emp.id]; return n; });
                            }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer">{isAr ? 'حفظ' : 'Save'}</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {data.employees.filter(e => e.status === 'ACTIVE').length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">{isAr ? 'لا يوجد موظفون نشطون' : 'No active employees'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          SUB-TAB: EMPLOYEES LIST
          ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'employees' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-950 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm text-start">
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white">{isAr ? 'سجل الموظفين' : 'Employee Ledger'}</h3>
              <p className="text-[10px] text-slate-400 font-medium">{isAr ? 'إدارة بطاقات الموظفين وعقود العمل والرواتب' : 'Manage employee profiles, contracts & salaries'}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportEmployeesExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
              >
                <FileText className="h-4 w-4" />
                <span>{isAr ? 'تصدير Excel احترافي' : 'Export Pro Excel'}</span>
              </button>
              <button
                onClick={() => {
                  if (!isAdmin) {
                    showAlert(isAr ? 'تنبيه' : 'Alert', isAr ? 'تسجيل الموظفين مخصص للأدمن فقط!' : 'Registering employees is Admin-only!', 'warning');
                    return;
                  }
                  setEmpNameAr('');
                  setEmpNameEn('');
                  setEmpSalary(8000);
                  setEmpNationalId('');
                  setEmpEmail('');
                  setEmpPhone('');
                  setEmpContractStart('');
                  setEmpContractEnd('');
                  setShowAddEmpForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'إدراج موظف' : 'New Employee'}</span>
              </button>
            </div>
          </div>

          {/* Add Employee Form Drawer */}
          {showAddEmpForm && (
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl text-start overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white">{isAr ? 'تسجيل موظف جديد' : 'New Employee'}</span>
                  <button onClick={() => setShowAddEmpForm(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleAddEmployee} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'الاسم بالكامل (عربي)' : 'Full Name (AR)'} *</label>
                      <input type="text" required value={empNameAr} onChange={(e) => setEmpNameAr(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'الاسم بالكامل (إنجليزي)' : 'Full Name (EN)'} *</label>
                      <input type="text" required value={empNameEn} onChange={(e) => setEmpNameEn(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'المسمى الوظيفي' : 'Job Title'} *</label>
                      <input type="text" required value={empRole} onChange={(e) => setEmpRole(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'القسم' : 'Department'}</label>
                      <select value={empDept} onChange={(e) => setEmpDept(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all">
                        {allDepts.map(d => (
                          <option key={d.id} value={d.nameAr}>{isAr ? d.nameAr : d.nameEn}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'الراتب الأساسي (ج.م)' : 'Base Salary (EGP)'} *</label>
                      <input type="number" required value={empSalary} onChange={(e) => setEmpSalary(Number(e.target.value))} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'الوردية' : 'Shift'}</label>
                      <select value={empShift} onChange={(e) => setEmpShift(e.target.value as EmployeeShift)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all">
                        <option value={EmployeeShift.Morning}>{isAr ? 'صباحية' : 'Morning'}</option>
                        <option value={EmployeeShift.Evening}>{isAr ? 'مسائية' : 'Evening'}</option>
                        <option value={EmployeeShift.Overnight}>{isAr ? 'ليلية' : 'Overnight'}</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'نوع التعاقد' : 'Contract Type'}</label>
                      <select value={empContractType} onChange={(e) => setEmpContractType(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all">
                        <option value="دوام كامل">{isAr ? 'دوام كامل' : 'Full Time'}</option>
                        <option value="عقد مؤقت">{isAr ? 'عقد مؤقت' : 'Temporary'}</option>
                        <option value="فترة تجريبية">{isAr ? 'فترة تجريبية' : 'Probationary'}</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'الرقم القومي' : 'National ID'} *</label>
                      <input type="text" required value={empNationalId} onChange={(e) => setEmpNationalId(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'البريد الإلكتروني' : 'Email'} *</label>
                      <input type="email" required value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="name@loding.com" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'رقم الهاتف' : 'Phone'} *</label>
                      <input type="text" required value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="+20 1..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'المدير المباشر' : 'Direct Manager'} *</label>
                      <input type="text" required value={empManager} onChange={(e) => setEmpManager(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'بداية العقد' : 'Contract Start'} *</label>
                      <input type="date" required value={empContractStart} onChange={(e) => setEmpContractStart(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'نهاية العقد' : 'Contract End'} *</label>
                      <input type="date" required value={empContractEnd} onChange={(e) => setEmpContractEnd(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'رصيد الإجازات السنوية (أيام)' : 'Annual Leave Balance (Days)'}</label>
                      <input type="number" value={empAnnualLeaveBalance} onChange={(e) => setEmpAnnualLeaveBalance(Number(e.target.value))} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'أيام العمل الشهرية' : 'Monthly Work Days'}</label>
                      <input type="number" min="1" max="31" value={empWorkingDays} onChange={(e) => setEmpWorkingDays(Math.min(31, Math.max(1, Number(e.target.value))))} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'ساعات العمل اليومية' : 'Daily Working Hours'}</label>
                      <input type="number" value={empWorkingHours} onChange={(e) => setEmpWorkingHours(Number(e.target.value))} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={() => setShowAddEmpForm(false)} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all text-[11px]">{isAr ? 'إلغاء' : 'Cancel'}</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm text-[11px]">{isAr ? 'تسجيل الموظف' : 'Save Employee'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── EMPLOYEES CARD GRID ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.employees.map(emp => {
              const now = new Date();
              const activeLeave = leaveRequests.find(l =>
                l.employeeId === emp.id && l.status === 'APPROVED' &&
                new Date(l.from) <= now && new Date(l.to) >= now
              );
              const pendingLeave = leaveRequests.find(l => l.employeeId === emp.id && l.status === 'PENDING');
              const empLoan = loansList.find(l => l.empId === emp.id && l.remaining > 0);
              const isExpiring = getExpiringContracts().some(x => x.id === emp.id);
              const daysToContractEnd = emp.contractEndDate
                ? Math.ceil((new Date(emp.contractEndDate).getTime() - now.getTime()) / 86400000)
                : null;
              const loanPct = empLoan ? Math.round(((empLoan.amount - empLoan.remaining) / empLoan.amount) * 100) : 0;

              return (
                <div key={emp.id} className={`bg-white dark:bg-slate-950 border rounded-3xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 group ${
                  activeLeave ? 'border-violet-200 dark:border-violet-800/40' :
                  isExpiring ? 'border-rose-200 dark:border-rose-800/40' :
                  'border-slate-200/80 dark:border-slate-800/80'
                }`}>
                  {/* Card Header */}
                  <div className={`p-4 flex items-center gap-3 ${
                    activeLeave ? 'bg-violet-50/50 dark:bg-violet-950/10 border-b border-violet-100 dark:border-violet-900/30' :
                    isExpiring ? 'bg-rose-50/50 dark:bg-rose-950/10 border-b border-rose-100 dark:border-rose-900/30' :
                    'border-b border-slate-100 dark:border-slate-800/50'
                  }`}>
                    <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm">
                      {emp.nameEn.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-slate-900 dark:text-white transition-colors">{isAr ? emp.nameAr : emp.nameEn}</h4>
                      <p className="text-[9px] text-slate-400 truncate">{emp.role}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[8px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{emp.code}</span>
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-md ${
                        activeLeave ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600' :
                        emp.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-slate-900 dark:text-white' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {activeLeave ? (isAr ? 'إجازة' : 'Leave') :
                         emp.status === 'ACTIVE' ? (isAr ? 'نشط' : 'Active') : (isAr ? 'موقوف' : 'Inactive')}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-50 dark:border-slate-800/30">
                      <span className="text-[9px] text-slate-400 font-bold">{isAr ? 'الراتب الأساسي' : 'Base Salary'}</span>
                      <span className="text-sm font-black font-mono text-slate-900 dark:text-white">{formatCurrency(emp.salary)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="flex-1 flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl py-1.5 font-bold">
                        {emp.shift === EmployeeShift.Morning ? (isAr ? 'صباحي' : 'Morning') :
                         emp.shift === EmployeeShift.Evening ? (isAr ? 'مسائي' : 'Evening') : (isAr ? 'ليلي' : 'Night')}
                      </span>
                      <span className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl py-1.5 font-bold">
                        {emp.department || (isAr ? 'عام' : 'General')}
                      </span>
                      <span className="flex-1 flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl py-1.5 font-bold text-slate-900 dark:text-white">
                        {(emp.workingHours ?? 8) * (emp.workingDays || 26)}{isAr ? ' س/شهر' : 'h/m'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] px-1">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-bold">{isAr ? 'أيام العمل:' : 'Work Days:'}</span>
                        <span className="font-black font-mono text-slate-700 dark:text-slate-300">{emp.workingDays || 26} {isAr ? 'يوم' : 'd'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-bold">{isAr ? 'ساعات العمل:' : 'Work Hours:'}</span>
                        <span className="font-black font-mono text-slate-900 dark:text-white">{emp.workingHours ?? 8} {isAr ? 'س/يوم' : 'h/d'}</span>
                      </div>
                      {(emp.overtimeHours ?? 0) > 0 && (
                        <span className="font-black font-mono text-slate-900 dark:text-white">+{emp.overtimeHours} {isAr ? 'س' : 'h'}</span>
                      )}
                    </div>

                    {daysToContractEnd !== null && daysToContractEnd <= 60 && (
                      <div className={`flex items-center gap-2 p-2.5 rounded-xl text-[9px] font-bold ${
                        daysToContractEnd <= 14 ? 'bg-rose-50 dark:bg-rose-950/20 text-slate-900 dark:text-white' :
                        daysToContractEnd <= 30 ? 'bg-amber-50 dark:bg-amber-950/20 text-slate-900 dark:text-white' :
                        'bg-blue-50 dark:bg-blue-950/20 text-slate-900 dark:text-white'
                      }`}>
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {isAr ? `العقد ينتهي خلال ${daysToContractEnd} يوم` : `Contract expires in ${daysToContractEnd}d`}
                      </div>
                    )}

                    {pendingLeave && !activeLeave && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-slate-900 dark:text-white text-[9px] font-bold">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        {isAr ? 'طلب إجازة معلق' : 'Pending leave request'}
                      </div>
                    )}

                    {empLoan && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-slate-400 font-bold">{isAr ? 'سلفة جارية' : 'Active Loan'}</span>
                          <span className="text-slate-900 dark:text-white font-black font-mono">{formatCurrency(empLoan.remaining)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all" style={{ width: `${loanPct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="px-4 pb-4 flex gap-2">
                    <button
                      onClick={() => setSelectedProfileEmp(emp)}
                      className="flex-1 py-2 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer"
                    >
                      {isAr ? 'الملف الكامل' : 'Profile'}
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => openEditModal(emp)} className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-600 hover:text-white text-slate-900 dark:text-white transition-all cursor-pointer">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDeleteEmployee(emp.id, emp.nameAr)} className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-600 hover:text-white text-slate-900 dark:text-white transition-all cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          SUB-TAB: DEPARTMENTS
          ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'departments' && (() => {
        const depts = getDynamicDepartments();
        const deptColors = [
          { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-100 dark:border-blue-900/30', text: 'text-slate-900 dark:text-white', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
          { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-100 dark:border-emerald-900/30', text: 'text-slate-900 dark:text-white', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-slate-900 dark:text-white' },
          { bg: 'from-violet-500 to-violet-600', light: 'bg-violet-50 dark:bg-violet-950/20', border: 'border-violet-100 dark:border-violet-900/30', text: 'text-violet-600', badge: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400' },
          { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-100 dark:border-amber-900/30', text: 'text-slate-900 dark:text-white', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' },
        ];
        const totalBudget = depts.reduce((s, d) => s + d.budget, 0);

        return (
          <div className="space-y-5">
            {/* Departments Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-950 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs text-start">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{isAr ? 'إدارة الأقسام' : 'Departments Management'}</h3>
                <p className="text-[10px] text-slate-400 font-bold">{isAr ? 'إضافة وتعديل وحذف الأقسام التنظيمية' : 'Add, edit, and delete organizational departments'}</p>
              </div>
              {isAdmin && (
                <button onClick={() => setShowAddDeptModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer">
                  <Plus className="h-4 w-4" />
                  <span>{isAr ? 'إضافة قسم جديد' : 'New Department'}</span>
                </button>
              )}
            </div>
            {/* Header KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {depts.map((dept, i) => {
                const c = deptColors[i % deptColors.length];
                const deptLeaves = leaveRequests.filter(l =>
                  dept.staff.some((s: any) => s.id === l.employeeId) && l.status === 'APPROVED' &&
                  new Date(l.to) >= new Date()
                ).length;
                const deptLoans = loansList.filter(l =>
                  dept.staff.some((s: any) => s.id === l.empId) && l.remaining > 0
                ).length;
                return (
                  <div key={dept.id} className={`bg-slate-700 text-white p-5 rounded-3xl shadow-lg flex flex-col justify-between min-h-[130px]`}>
                    <div className="flex items-start justify-between">
                      <div className="h-9 w-9 rounded-2xl bg-white/20 flex items-center justify-center">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <span className="text-[8px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{dept.employeesCount} {isAr ? 'موظف' : 'staff'}</span>
                    </div>
                    <div>
                      <h3 className="text-xs font-black leading-tight">{isAr ? dept.nameAr : dept.nameEn}</h3>
                      <p className="text-[9px] text-white/70 mt-0.5">{isAr ? `مدير: ${dept.manager}` : `Mgr: ${dept.manager}`}</p>
                      <div className="flex gap-3 mt-2">
                        {deptLeaves > 0 && <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded">{deptLeaves} {isAr ? 'في إجازة' : 'on leave'}</span>}
                        {deptLoans > 0 && <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded">{deptLoans} {isAr ? 'لديه سلفة' : 'loans'}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Department Detail Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {depts.map((dept, i) => {
                const c = deptColors[i % deptColors.length];
                const pct = totalBudget > 0 ? Math.round((dept.budget / totalBudget) * 100) : 0;
                const activeStaff = dept.staff.filter((s: any) => s.status === 'ACTIVE');
                const deptPendingLeaves = leaveRequests.filter(l =>
                  dept.staff.some((s: any) => s.id === l.employeeId) && l.status === 'PENDING'
                );

                return (
                  <div key={dept.id} className={`bg-white dark:bg-slate-950 border ${c.border} rounded-3xl overflow-hidden shadow-xs`}>
                    {/* Dept Header */}
                    <div className={`${c.light} border-b ${c.border} p-5 flex justify-between items-start`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-black ${c.text}`}>{isAr ? dept.nameAr : dept.nameEn}</h3>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setShowEditDeptModal(dept);
                                  setEditDeptManager(dept.manager);
                                  setEditDeptBudget(dept.budget);
                                }}
                                title={isAr ? 'تعديل بيانات القسم' : 'Edit Department Info'}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:text-white hover:bg-blue-50 dark:hover:bg-slate-900 transition-all cursor-pointer"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteDepartment(dept)}
                                title={isAr ? 'حذف القسم' : 'Delete Department'}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:text-white hover:bg-rose-50 dark:hover:bg-slate-900 transition-all cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{dept.nameEn}</p>
                      </div>
                      <div className="text-end">
                        <span className="text-lg font-black font-mono text-slate-900 dark:text-white block">{formatCurrency(dept.budget)}</span>
                        <span className="text-[9px] text-slate-400">{isAr ? 'أجور سنوية' : 'Annual labor cost'}</span>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Budget share bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-slate-400 font-bold">{isAr ? 'حصة الميزانية' : 'Budget share'}</span>
                          <span className={`font-black ${c.text}`}>{pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${c.bg} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className={`p-2 ${c.light} rounded-xl border ${c.border}`}>
                          <span className={`text-sm font-black font-mono ${c.text} block`}>{dept.employeesCount}</span>
                          <span className="text-[8px] text-slate-400">{isAr ? 'إجمالي' : 'Total'}</span>
                        </div>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                          <span className="text-sm font-black font-mono text-slate-900 dark:text-white block">{activeStaff.length}</span>
                          <span className="text-[8px] text-slate-400">{isAr ? 'نشط' : 'Active'}</span>
                        </div>
                        <div className={`p-2 rounded-xl border ${deptPendingLeaves.length > 0 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                          <span className={`text-sm font-black font-mono block ${deptPendingLeaves.length > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{deptPendingLeaves.length}</span>
                          <span className="text-[8px] text-slate-400">{isAr ? 'إجازات معلقة' : 'Pending'}</span>
                        </div>
                      </div>

                      {/* Staff list */}
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                        {dept.staff.slice(0, 5).map((s: any) => {
                          const sLeave = leaveRequests.find(l => l.employeeId === s.id && l.status === 'APPROVED' && new Date(l.to) >= new Date());
                          const sLoan = loansList.find(l => l.empId === s.id && l.remaining > 0);
                          return (
                            <div key={s.id} onClick={() => setSelectedProfileEmp(s)} className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-all">
                              <div className={`h-7 w-7 rounded-xl bg-slate-600 flex items-center justify-center text-white font-black text-[9px] shrink-0`}>
                                {s.nameEn.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-black text-slate-900 dark:text-white block truncate">{isAr ? s.nameAr : s.nameEn}</span>
                                <span className="text-[8px] text-slate-400 truncate block">{s.role}</span>
                              </div>
                              <div className="flex gap-1">
                                {sLeave && <span className="text-[7px] bg-violet-100 text-violet-600 px-1 py-0.5 rounded font-bold">{isAr ? 'إجازة' : 'Leave'}</span>}
                                {sLoan && <span className="text-[7px] bg-amber-100 text-slate-900 dark:text-white px-1 py-0.5 rounded font-bold">{isAr ? 'سلفة' : 'Loan'}</span>}
                                <span className="text-[10px] font-mono font-black text-slate-900 dark:text-white">{formatCurrency(s.salary)}</span>
                              </div>
                            </div>
                          );
                        })}
                        {dept.staff.length > 5 && (
                          <button onClick={() => setSelectedDeptDetails(dept)} className={`w-full text-[9px] font-bold ${c.text} text-center py-1 hover:underline cursor-pointer`}>
                            +{dept.staff.length - 5} {isAr ? 'موظفين آخرين' : 'more staff'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ────────────────────────────────────────────────────────
          SUB-TAB: CONTRACTS OVERVIEW
          ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'contracts' && (() => {
        const now = new Date();
        const contractEmps = [...data.employees].map(emp => {
          const days = emp.contractEndDate
            ? Math.ceil((new Date(emp.contractEndDate).getTime() - now.getTime()) / 86400000)
            : null;
          const totalDays = emp.contractStartDate && emp.contractEndDate
            ? Math.ceil((new Date(emp.contractEndDate).getTime() - new Date(emp.contractStartDate).getTime()) / 86400000)
            : null;
          const elapsed = totalDays && days !== null ? Math.max(0, totalDays - days) : null;
          const pct = totalDays && elapsed !== null ? Math.min(100, Math.round((elapsed / totalDays) * 100)) : null;
          return { ...emp, daysLeft: days, totalDays, pct };
        }).sort((a, b) => {
          if (a.daysLeft === null) return 1;
          if (b.daysLeft === null) return -1;
          return a.daysLeft - b.daysLeft;
        });

        const expiring14 = contractEmps.filter(e => e.daysLeft !== null && e.daysLeft <= 14).length;
        const expiring30 = contractEmps.filter(e => e.daysLeft !== null && e.daysLeft > 14 && e.daysLeft <= 30).length;
        const expiring60 = contractEmps.filter(e => e.daysLeft !== null && e.daysLeft > 30 && e.daysLeft <= 60).length;
        const safe = contractEmps.filter(e => e.daysLeft === null || e.daysLeft > 60).length;

        return (
          <div className="space-y-5 text-start">
            {/* Urgency KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: isAr ? 'حرج — أقل من 14 يوم' : 'Critical < 14d', value: expiring14, color: 'rose' },
                { label: isAr ? 'عاجل — 14 إلى 30 يوم' : 'Urgent 14-30d', value: expiring30, color: 'amber' },
                { label: isAr ? 'تنبيه — 30 إلى 60 يوم' : 'Alert 30-60d', value: expiring60, color: 'blue' },
                { label: isAr ? 'آمن — أكثر من 60 يوم' : 'Safe > 60d', value: safe, color: 'emerald' },
              ].map(s => (
                <div key={s.label} className={`p-5 rounded-3xl border ${colorCard[s.color]} flex flex-col justify-between min-h-[90px]`}>
                  <span className={`text-3xl font-black font-mono ${colorText[s.color]} block`}>{s.value}</span>
                  <span className={`text-[9px] font-bold ${colorTextDark[s.color]}`}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Contract Timeline Cards */}
            <div className="space-y-3">
              {contractEmps.map(emp => {
                const urgency = emp.daysLeft === null ? 'none'
                  : emp.daysLeft <= 14 ? 'critical'
                  : emp.daysLeft <= 30 ? 'urgent'
                  : emp.daysLeft <= 60 ? 'alert' : 'safe';
                const styles: Record<string, {border: string, bg: string, badge: string, bar: string}> = {
                  critical: { border: 'border-rose-200 dark:border-rose-800/40', bg: 'bg-rose-50 dark:bg-rose-950/10', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-slate-900 dark:text-white', bar: 'from-rose-500 to-rose-600' },
                  urgent:   { border: 'border-amber-200 dark:border-amber-800/40', bg: 'bg-amber-50 dark:bg-amber-950/10', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', bar: 'from-amber-400 to-amber-600' },
                  alert:    { border: 'border-blue-200 dark:border-blue-800/40', bg: 'bg-blue-50 dark:bg-blue-950/10', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', bar: 'from-blue-400 to-blue-600' },
                  safe:     { border: 'border-slate-200/80 dark:border-slate-800/80', bg: 'bg-white dark:bg-slate-950', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-slate-900 dark:text-white', bar: 'from-emerald-400 to-emerald-600' },
                  none:     { border: 'border-slate-200/80 dark:border-slate-800/80', bg: 'bg-white dark:bg-slate-950', badge: 'bg-slate-100 text-slate-500', bar: 'from-slate-300 to-slate-400' },
                };
                const st = styles[urgency];
                return (
                  <div key={emp.id} onClick={() => setSelectedProfileEmp(emp)} className={`${st.bg} border ${st.border} rounded-2xl p-4 cursor-pointer hover:shadow-sm transition-all`}>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                        {emp.nameEn.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">{isAr ? emp.nameAr : emp.nameEn}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${st.badge}`}>
                            {urgency === 'none' ? (isAr ? 'مستمر' : 'Continuous') :
                             urgency === 'critical' ? (isAr ? `${emp.daysLeft} يوم فقط!` : `${emp.daysLeft}d LEFT!`) :
                             urgency === 'urgent' ? (isAr ? `${emp.daysLeft} يوم` : `${emp.daysLeft}d`) :
                             urgency === 'alert' ? (isAr ? `${emp.daysLeft} يوم` : `${emp.daysLeft}d`) :
                             (isAr ? 'آمن' : 'Safe')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[9px] text-slate-400 mb-2">
                          <span>{emp.role}</span>
                          <span>&bull;</span>
                          <span>{emp.contractType || (isAr ? 'دوام كامل' : 'Full Time')}</span>
                          <span>&bull;</span>
                          <span className="font-mono text-slate-900 dark:text-white font-bold">{formatCurrency(emp.salary)}</span>
                        </div>
                        {emp.pct !== null && (
                          <div className="space-y-1">
                            <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full bg-gradient-to-r ${st.bar} rounded-full transition-all`} style={{ width: `${emp.pct}%` }} />
                            </div>
                            <div className="flex justify-between text-[8px] text-slate-400">
                              <span>{emp.contractStartDate}</span>
                              <span className="font-bold">{emp.pct}% {isAr ? 'مضى من العقد' : 'elapsed'}</span>
                              <span>{emp.contractEndDate}</span>
                            </div>
                          </div>
                        )}
                        {emp.pct === null && (
                          <span className="text-[9px] text-slate-400">{isAr ? 'عقد مفتوح غير محدد المدة' : 'Open-ended / indefinite contract'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ────────────────────────────────────────────────────────
          SUB-TAB: LEAVES
          ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'leaves' && (
        <div className="space-y-6 text-start">
          <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{isAr ? 'سجلات وإدارة الإجازات الزمنية للموظفين' : 'Staff Leaves & Absentee Cabinet'}</h3>
              <p className="text-[10px] text-slate-400 font-bold">{isAr ? 'حساب فترة الإجازة وعرض ملاحظات وأسباب غياب الكوادر' : 'Apply time-offs, view duration math, and check reason logs.'}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => exportHRLeavesExcel(leaveRequests, isAr ? 'ar' : 'en')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <FileText className="h-4 w-4" />
                <span>{isAr ? 'تصدير Excel' : 'Export Excel'}</span>
              </button>
              <button
                onClick={() => {
                  setNewLeaveEmp('');
                  setNewLeaveStart('');
                  setNewLeaveEnd('');
                  setNewLeaveReason('');
                  setShowAddLeaveModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'طلب إجازة جديد' : 'New Leave Request'}</span>
              </button>
            </div>
          </div>

          {/* Leave Stats Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: isAr ? 'جميع الطلبات' : 'Total Requests', value: leaveRequests.length, color: 'blue' },
              { label: isAr ? 'معتمدة' : 'Approved', value: leaveRequests.filter(l => l.status === 'APPROVED').length, color: 'emerald' },
              { label: isAr ? 'قيد الانتظار' : 'Pending', value: leaveRequests.filter(l => l.status === 'PENDING').length, color: 'amber' }
            ].map(stat => (
              <div key={stat.label} className={`p-4 rounded-2xl ${colorCard[stat.color]} text-center`}>
                <span className={`text-xl font-black font-mono ${colorText[stat.color]} block`}>{stat.value}</span>
                <span className="text-[10px] text-slate-400 font-bold">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Leaves Log */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 text-xs overflow-x-auto font-semibold">
            {leaveRequests.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="font-bold">{isAr ? 'لا توجد طلبات إجازة مسجلة بعد' : 'No leave requests recorded yet'}</p>
              </div>
            ) : (
            <table className="w-full text-start">
              <thead>
                <tr className="border-b text-slate-400 text-[10px] bg-slate-50/50 dark:bg-slate-900/20">
                  <th className="py-3 px-4 text-start">{isAr ? 'الموظف' : 'Employee'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'نوع الإجازة' : 'Type'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'من' : 'From'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'إلى' : 'To'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'المدة' : 'Duration'}</th>
                  <th className="py-3 px-4 text-start">{isAr ? 'السبب' : 'Reason'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الحالة / الإجراء' : 'Status / Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-900/30">
                {leaveRequests.map(req => (
                  <tr key={req.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/20 ${
                    req.status === 'PENDING' ? 'bg-amber-50/30 dark:bg-amber-950/5' : ''
                  }`}>
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900 dark:text-white">{isAr ? (req.employeeNameAr || req.employeeName) : (req.employeeNameEn || req.employeeName)}</div>
                      {req.department && <div className="text-[9px] text-slate-400">{req.department}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                        req.type === 'ANNUAL' ? 'bg-blue-50 text-slate-900 dark:text-white dark:bg-blue-950/30' :
                        req.type === 'SICK' ? 'bg-rose-50 text-slate-900 dark:text-white dark:bg-rose-950/30' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-900'
                      }`}>
                        {req.type === 'ANNUAL' ? (isAr ? 'إجازة سنوية' : 'Annual') :
                         req.type === 'SICK' ? (isAr ? 'مرضية' : 'Sick') :
                         (isAr ? 'بدون راتب' : 'Unpaid')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">{req.from}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">{req.to}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-900 dark:text-white font-mono bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-lg text-[10px]">{req.duration}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-[160px] truncate" title={req.reason}>{req.reason || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                          req.status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-slate-900 dark:text-white' :
                          req.status === 'REJECTED' ? 'bg-rose-50 dark:bg-rose-950/30 text-slate-900 dark:text-white' :
                          'bg-amber-50 dark:bg-amber-950/30 text-slate-900 dark:text-white animate-pulse'
                        }`}>
                          {req.status === 'APPROVED' ? (isAr ? 'مقبولة' : 'Approved') :
                           req.status === 'REJECTED' ? (isAr ? 'مرفوضة' : 'Rejected') :
                           (isAr ? 'قيد الانتظار' : 'Pending')}
                        </span>
                        {/* Admin approval buttons for pending leaves */}
                        {isAdmin && req.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleApproveLeave(req.id)}
                              title={isAr ? 'قبول الإجازة' : 'Approve Leave'}
                              className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all"
                            >
                              <CheckCheck className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleRejectLeave(req.id)}
                              title={isAr ? 'رفض الإجازة' : 'Reject Leave'}
                              className="p-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white cursor-pointer transition-all"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {req.approvedBy && req.status === 'APPROVED' && (
                          <span className="text-[8px] text-slate-400 font-mono">by {req.approvedBy}</span>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteLeave(req.id)}
                            title={isAr ? 'حذف سجل الإجازة' : 'Delete Leave Record'}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-rose-650 hover:text-white text-slate-400 dark:bg-slate-900 transition-all cursor-pointer mt-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          SUB-TAB: HOLIDAYS (الإجازات الرسمية)
          ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'holidays' && (() => {
        const holidayDates = getHolidayDates();
        const daysInMonth = new Date(holidayYear, holidayMonth + 1, 0).getDate();
        const firstDay = new Date(holidayYear, holidayMonth, 1).getDay();
        const monthLabel = isAr
          ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][holidayMonth]
          : ['January','February','March','April','May','June','July','August','September','October','November','December'][holidayMonth];

        const toggleDay = (day: number) => {
          const dateStr = `${holidayYear}-${String(holidayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const events = [...(data.hrEvents || [])];
          const existing = events.findIndex((e: any) => e.date === dateStr && e.type === 'holiday');
          if (existing >= 0) {
            events.splice(existing, 1);
          } else {
            events.push({
              id: `holiday-${dateStr}-${Date.now()}`,
              titleAr: 'إجازة رسمية',
              titleEn: 'Official Holiday',
              date: dateStr,
              type: 'holiday'
            });
          }
          syncHRCollection('hrEvents', events);
        };

        const dayNames = isAr ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'] : ['Su','Mo','Tu','We','Th','Fr','Sa'];
        const todayStr = new Date().toISOString().split('T')[0];

        return (
          <div className="space-y-5 text-start">
            <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  <Sparkles className="h-4 w-4 text-slate-900 dark:text-white inline-block me-1.5" />
                  {isAr ? 'الإجازات الرسمية' : 'Official Holidays'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  {isAr ? 'إدارة أيام الإجازات الرسمية — اضغط على اليوم لوضع علامة أو إزالتها' : 'Manage official holidays — tap a day to toggle.'}
                </p>
              </div>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => { if (holidayMonth === 0) { setHolidayMonth(11); setHolidayYear(y => y - 1); } else { setHolidayMonth(m => m - 1); } }} className="text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer p-1">
                <ChevronRight className="h-5 w-5" />
              </button>
              <span className="text-sm font-black text-slate-800 dark:text-white min-w-[140px] text-center">{monthLabel} {holidayYear}</span>
              <button onClick={() => { if (holidayMonth === 11) { setHolidayMonth(0); setHolidayYear(y => y + 1); } else { setHolidayMonth(m => m + 1); } }} className="text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer p-1 rotate-180">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Calendar grid */}
            <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
              <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800/50">
                {dayNames.map(d => (
                  <div key={d} className="py-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-wider">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateStr = `${holidayYear}-${String(holidayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isHoliday = holidayDates.has(dateStr);
                  const isToday = dateStr === todayStr;
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`aspect-square flex items-center justify-center text-xs font-bold rounded-lg m-0.5 transition-all cursor-pointer
                        ${isHoliday
                          ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 ring-1 ring-rose-300 dark:ring-rose-700'
                          : isToday
                            ? 'bg-blue-50 dark:bg-blue-950/20 text-slate-900 dark:text-white dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-100 dark:bg-rose-900/30 ring-1 ring-rose-300 dark:ring-rose-700" /> {isAr ? 'إجازة رسمية' : 'Holiday'}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-50 dark:bg-blue-950/20 ring-1 ring-blue-200 dark:ring-blue-800" /> {isAr ? 'اليوم' : 'Today'}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-100 dark:bg-slate-800/50" /> {isAr ? 'يوم عادي' : 'Regular'}</span>
            </div>

            {/* Upcoming holidays list */}
            <div className="bg-white dark:bg-slate-950 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
              <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-300 mb-2">{isAr ? 'الإجازات الرسمية المسجلة' : 'Recorded Holidays'}</h4>
              {calendarEvents.filter((e: any) => e.type === 'holiday').length === 0 ? (
                <p className="text-[10px] text-slate-400">{isAr ? 'لا توجد إجازات رسمية مسجلة بعد' : 'No official holidays recorded yet.'}</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {[...calendarEvents]
                    .filter((e: any) => e.type === 'holiday')
                    .sort((a: any, b: any) => a.date.localeCompare(b.date))
                    .map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{e.date}</span>
                        <button
                          onClick={() => {
                            const next = (data.hrEvents || []).filter((ev: any) => ev.id !== e.id);
                            syncHRCollection('hrEvents', next);
                          }}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer p-0.5"
                          title={isAr ? 'إزالة' : 'Remove'}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ────────────────────────────────────────────────────────
          SUB-TAB: LOANS
          ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'loans' && (
        <div className="space-y-5 text-start">
          {/* Header */}
          <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{isAr ? 'سجلات السلف والعهد الجارية' : 'Staff Loans & Advances'}</h3>
              <p className="text-[10px] text-slate-400 font-bold">{isAr ? 'متابعة أقساط السلف ونسبة الإهلاك الشهري لكل موظف' : 'Track cash advances, monthly installments, and repayment progress.'}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => exportHRLoansExcel(loansList, isAr ? 'ar' : 'en')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <FileText className="h-4 w-4" />
                <span>{isAr ? 'تصدير Excel' : 'Export Excel'}</span>
              </button>
              <button
                onClick={() => {
                  if (!isAdmin) {
                    showAlert(isAr ? 'تنبيه' : 'Alert', isAr ? 'صرف السلف مخصص للأدمن فقط!' : 'Granting loans is Admin-only!', 'warning');
                    return;
                  }
                  setNewLoanEmp(''); setNewLoanAmount(1000); setNewLoanInstallmentMonths(5); setNewLoanReason(''); setShowAddLoanModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{isAr ? 'منح سلفة جديدة' : 'New Loan'}</span>
              </button>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: isAr ? 'إجمالي السلف الممنوحة' : 'Total Disbursed', value: formatCurrency(loansList.reduce((s, l) => s + l.amount, 0)), color: 'blue' },
              { label: isAr ? 'إجمالي المسدد' : 'Total Repaid', value: formatCurrency(loansList.reduce((s, l) => s + l.paid, 0)), color: 'emerald' },
              { label: isAr ? 'الرصيد المتبقي الجاري' : 'Outstanding Balance', value: formatCurrency(loansList.reduce((s, l) => s + l.remaining, 0)), color: 'amber' },
            ].map(s => (
              <div key={s.label} className={`p-5 rounded-3xl ${colorCard[s.color]} text-center`}>
                <span className={`text-base font-black font-mono ${colorText[s.color]} block`}>{s.value}</span>
                <span className="text-[9px] text-slate-400 font-bold">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Loan Cards */}
          {loansList.length === 0 ? (
            <div className="bg-white dark:bg-slate-950 p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 text-center text-slate-400">
              <Wallet className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-bold text-xs">{isAr ? 'لا توجد سلف مسجلة حالياً' : 'No active loans recorded'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {loansList.map(ln => {
                const pct = ln.amount > 0 ? Math.min(100, Math.round((ln.paid / ln.amount) * 100)) : 0;
                const emp = data.employees.find(e => e.id === ln.empId);
                const empLeave = emp ? leaveRequests.find(l => l.employeeId === emp.id && l.status === 'APPROVED' && new Date(l.to) >= new Date()) : null;
                return (
                  <div key={ln.id} className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 hover:shadow-md transition-all">
                    {/* Employee info */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-2xl bg-slate-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                        {(ln.empName || '?').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-black text-slate-900 dark:text-white block truncate">{ln.empName}</span>
                        <span className="text-[9px] text-slate-400">{emp?.role || ''} &bull; {emp?.department || ''}</span>
                      </div>
                      {empLeave && <span className="text-[8px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-lg font-bold shrink-0">{isAr ? 'إجازة' : 'On Leave'}</span>}
                    </div>

                    {/* Amount breakdown */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <span className="text-[8px] text-slate-400 block">{isAr ? 'مبلغ السلفة' : 'Principal'}</span>
                        <span className="text-xs font-black font-mono text-slate-800 dark:text-white">{formatCurrency(ln.amount)}</span>
                      </div>
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 rounded-xl">
                        <span className="text-[8px] text-slate-400 block">{isAr ? 'القسط الشهري' : 'Monthly'}</span>
                        <span className="text-xs font-black font-mono text-slate-900 dark:text-white">{formatCurrency(ln.installment)}</span>
                      </div>
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                        <span className="text-[8px] text-slate-400 block">{isAr ? 'تم السداد' : 'Repaid'}</span>
                        <span className="text-xs font-black font-mono text-slate-900 dark:text-white">{formatCurrency(ln.paid)}</span>
                      </div>
                      <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                        <span className="text-[8px] text-slate-400 block">{isAr ? 'المتبقي' : 'Remaining'}</span>
                        <span className="text-xs font-black font-mono text-slate-900 dark:text-white">{formatCurrency(ln.remaining)}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-slate-400 font-bold">{isAr ? 'نسبة الإهلاك' : 'Repayment Progress'}</span>
                        <span className="font-black text-slate-900 dark:text-white">{pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] text-slate-400">
                        <span>{ln.months} {isAr ? 'شهور إجمالاً' : 'months total'}</span>
                        <span>{pct < 100 ? (isAr ? `متبقي ${formatCurrency(ln.remaining)}` : `${formatCurrency(ln.remaining)} left`) : (isAr ? 'تم السداد كاملاً' : 'Fully repaid')}</span>
                      </div>
                    </div>
                    {/* Admin Actions */}
                    {isAdmin && ln.remaining > 0 && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            setShowManualRepayModal(ln);
                            setRepayAmount(Math.min(ln.installment, ln.remaining));
                          }}
                          className="flex-1 py-1.5 text-[9px] font-bold bg-blue-50 hover:bg-blue-600 hover:text-white text-slate-900 dark:text-white dark:bg-blue-950/20 dark:text-blue-400 rounded-lg transition-all cursor-pointer text-center"
                        >
                          {isAr ? 'سداد يدوي' : 'Manual Repay'}
                        </button>
                        <button
                          onClick={() => handleDeleteLoan(ln.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-slate-900 dark:text-white dark:bg-rose-950/20 dark:text-rose-450 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          SUB-TAB: REDESIGNED PAYROLL LEDGER
          ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'payroll' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 text-start space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b pb-4 border-slate-100 dark:border-slate-900 gap-4">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{isAr ? 'مسيرات وقسائم أجور الموظفين الشهرية' : 'Monthly Salary Consolidated Sheet'}</h3>
                <p className="text-[10px] text-slate-400 font-bold">{isAr ? 'اختر الخزينة أو الحساب البنكي لصرف الأجور وترحيل القيد آلياً للحسابات العامة' : 'Select fund source, calculate net employee accruals and disburse entries.'}</p>
              </div>

              {/* Payment selector and Release Button */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{isAr ? 'من خزانة/بنك:' : 'Pay from:'}</span>
                  <select
                    value={paymentSourceId}
                    onChange={(e) => setPaymentSourceId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 dark:text-white focus:outline-none max-w-[200px]"
                  >
                    {paymentSources.map(src => (
                      <option key={src.id} value={src.id}>
                        {isAr ? src.nameAr : src.nameEn} ({formatCurrency(src.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    const payrollExportData = data.employees
                      .filter(emp => emp.status === 'ACTIVE')
                      .map(emp => {
                        const basic = emp.salary;
                        const allowances = emp.allowances || 0;
                        const wDays = emp.workingDays || 30;
                        const wh = emp.workingHours || 8;
                        const overtimePay = (emp.overtimeHours || 0) * (basic / (wDays * wh)) * 1.5;
                        const deductions = emp.deductions || 0;
                        const loans = getEmployeeInstallment(emp);
                        const netSalary = (basic + allowances + overtimePay) - deductions - loans;
                        return {
                          code: emp.code,
                          name: isAr ? emp.nameAr : emp.nameEn,
                          basic,
                          allowances,
                          overtime: overtimePay,
                          deductions,
                          loans,
                          net: netSalary
                        };
                      });
                    exportHRPayrollExcel(payrollExportData, isAr ? 'ar' : 'en');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  <span>{isAr ? 'تصدير Excel' : 'Export Excel'}</span>
                </button>
                <button
                  onClick={() => {
                    if (!isAdmin) {
                      showAlert(isAr ? 'تنبيه' : 'Alert', isAr ? 'صرف الأجور وترحيل القيود مخصص للأدمن فقط!' : 'Payroll disbursement is Admin-only!', 'warning');
                      return;
                    }
                    setShowPayrollConfirmModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isAr ? 'اعتماد كشف الرواتب وترحيل القيود' : 'Disburse & Post JV'}</span>
                </button>
              </div>
            </div>

            {/* Premium sheet grid layout */}
            <div className="overflow-x-auto border rounded-2xl border-slate-100 dark:border-slate-855">
              <table className="w-full text-start border-collapse text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 text-[10px] uppercase font-extrabold font-mono">
                    <th className="py-3 px-4 text-start">{isAr ? 'كود' : 'Code'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'الاسم بالكامل' : 'Employee'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'أيام العمل' : 'Work Days'}</th>
                    <th className="py-3 px-4 text-end">{isAr ? 'الأساسي المستحق' : 'Earned Basic'}</th>
                    <th className="py-3 px-4 text-end text-slate-900 dark:text-white">{isAr ? 'البدلات' : 'Allowances'}</th>
                    <th className="py-3 px-4 text-end text-slate-900 dark:text-white">{isAr ? 'أجر الإضافي' : 'Overtime'}</th>
                    <th className="py-3 px-4 text-end text-slate-900 dark:text-white">{isAr ? 'الخصومات' : 'Deductions'}</th>
                    <th className="py-3 px-4 text-end text-slate-900 dark:text-white">{isAr ? 'أقساط السلف' : 'Loans'}</th>
                    <th className="py-3 px-4 text-end text-slate-900 dark:text-white">{isAr ? 'صافي الراتب' : 'Net Salary'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'قسيمة راتب' : 'Slip'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {data.employees.map(emp => {
                    const wDays = emp.workingDays || 30;
                    const leaveDays = getLeaveDaysInMonth(emp.id, new Date().getMonth() + 1, new Date().getFullYear());
                    const actualDays = Math.max(0, wDays - leaveDays);
                    const basic = emp.salary;
                    const dailyRate = basic / wDays;
                    const earnedBasic = dailyRate * actualDays;
                    const allowances = emp.allowances || 0;
                    const wh = emp.workingHours || 8;
                    const overtimePay = (emp.overtimeHours || 0) * (basic / (wDays * wh)) * 1.5;
                    const deductions = emp.deductions || 0;
                    const loans = getEmployeeInstallment(emp);
                    const netSalary = (earnedBasic + allowances + overtimePay) - deductions - loans;

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="py-3 px-4 font-mono text-slate-500">{emp.code}</td>
                        <td className="py-3 px-4 font-black text-slate-900 dark:text-white">{isAr ? emp.nameAr : emp.nameEn}</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          {wDays === actualDays ? wDays : <span title={isAr ? `${leaveDays} أيام إجازة` : `${leaveDays} leave days`}>{actualDays}/{wDays}</span>}
                        </td>
                        <td className="py-3 px-4 text-end font-mono text-slate-600 dark:text-slate-300">{formatCurrency(earnedBasic)}</td>
                        <td className="py-3 px-4 text-end font-mono text-slate-900 dark:text-white">+{formatCurrency(allowances)}</td>
                        <td className="py-3 px-4 text-end font-mono text-slate-900 dark:text-white">+{formatCurrency(overtimePay)}</td>
                        <td className="py-3 px-4 text-end font-mono text-slate-900 dark:text-white">-{formatCurrency(deductions)}</td>
                        <td className="py-3 px-4 text-end font-mono text-slate-900 dark:text-white">-{formatCurrency(loans)}</td>
                        <td className="py-3 px-4 text-end font-mono font-black text-sm text-slate-900 dark:text-white dark:text-white">{formatCurrency(netSalary)}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedPayslipEmp(emp)}
                            className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 font-bold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            {isAr ? 'عرض' : 'View'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          SUB-TAB: DYNAMIC ANALYTICS REPORTS
          ──────────────────────────────────────────────────────── */}
      {activeSubTab === 'reports' && (() => {
        const depts = getDynamicDepartments();
        const totalSalary = data.employees.reduce((s, e) => s + e.salary, 0);
        const totalAllowances = data.employees.reduce((s, e) => s + (e.allowances || 0), 0);
        const totalDeductions = data.employees.reduce((s, e) => s + (e.deductions || 0), 0);
        const totalLoans = loansList.reduce((s, l) => s + l.remaining, 0);
        const leaveByType = [
          { name: isAr ? 'سنوية' : 'Annual', value: leaveRequests.filter(l => l.type === 'ANNUAL').length, color: '#2563eb' },
          { name: isAr ? 'مرضية' : 'Sick', value: leaveRequests.filter(l => l.type === 'SICK').length, color: '#e11d48' },
          { name: isAr ? 'بدون راتب' : 'Unpaid', value: leaveRequests.filter(l => l.type === 'UNPAID').length, color: '#f59e0b' },
        ];
        const leaveByStatus = [
          { name: isAr ? 'معتمدة' : 'Approved', value: leaveRequests.filter(l => l.status === 'APPROVED').length, color: '#10b981' },
          { name: isAr ? 'معلقة' : 'Pending', value: leaveRequests.filter(l => l.status === 'PENDING').length, color: '#f59e0b' },
          { name: isAr ? 'مرفوضة' : 'Rejected', value: leaveRequests.filter(l => l.status === 'REJECTED').length, color: '#e11d48' },
        ];
        const hasLeaveData = leaveByType.some(l => l.value > 0);
        const hasStatusData = leaveByStatus.some(l => l.value > 0);
        const salaryBreakdown = [
          { name: isAr ? 'الراتب الأساسي' : 'Base', value: totalSalary, color: '#2563eb' },
          { name: isAr ? 'البدلات' : 'Allowances', value: totalAllowances, color: '#7c3aed' },
          { name: isAr ? 'الخصومات' : 'Deductions', value: totalDeductions, color: '#e11d48' },
          { name: isAr ? 'السلف' : 'Loans', value: totalLoans, color: '#f59e0b' },
        ];

        return (
        <div className="space-y-5 text-start">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80">
            <div>
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">{isAr ? 'مركز التقارير والتحليلات التفاعلية' : 'HR Analytics & Reporting Center'}</h3>
              <p className="text-[9px] text-slate-400 font-bold">{isAr ? 'بيانات مباشرة من قاعدة بيانات الموظفين والإجازات والسلف' : 'Live data from employees, leaves, loans, and payroll database.'}</p>
            </div>
            <button
              onClick={() => {
                const reportExportData = depts.map(dept => {
                  const onLeave = leaveRequests.filter(l =>
                    dept.staff.some((s: any) => s.id === l.employeeId) && l.status === 'APPROVED' &&
                    new Date(l.to) >= new Date()
                  ).length;
                  const withLoans = loansList.filter(l =>
                    dept.staff.some((s: any) => s.id === l.empId) && l.remaining > 0
                  ).length;
                  const avgSalary = dept.staff.length > 0 ? Math.round(dept.staff.reduce((sum: number, emp: any) => sum + emp.salary, 0) / dept.staff.length) : 0;
                  return {
                    name: isAr ? dept.nameAr : dept.nameEn,
                    employeesCount: dept.employeesCount,
                    onLeave,
                    withLoans,
                    budget: dept.budget,
                    avgSalary
                  };
                });
                exportHRDepartmentsExcel(reportExportData, isAr ? 'ar' : 'en');
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-center shrink-0"
            >
              <FileText className="h-4 w-4" />
              <span>{isAr ? 'تصدير ملخص الأقسام Excel' : 'Export Departments Summary'}</span>
            </button>
          </div>

          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: isAr ? 'إجمالي الرواتب الأساسية' : 'Total Base Salaries', value: formatCurrency(totalSalary), color: 'blue', icon: <DollarSign className="h-4 w-4" /> },
              { label: isAr ? 'إجمالي البدلات الشهرية' : 'Total Allowances', value: formatCurrency(totalAllowances), color: 'violet', icon: <TrendingUp className="h-4 w-4" /> },
              { label: isAr ? 'طلبات الإجازات الإجمالية' : 'Total Leave Requests', value: leaveRequests.length, color: 'emerald', icon: <CalendarIcon className="h-4 w-4" /> },
              { label: isAr ? 'رصيد السلف الجاري' : 'Outstanding Loans', value: formatCurrency(totalLoans), color: 'amber', icon: <Wallet className="h-4 w-4" /> },
            ].map(s => (
              <div key={s.label} className={`p-5 rounded-3xl ${colorCard[s.color]}`}>
                <div className={`h-8 w-8 rounded-xl ${colorBg[s.color]} ${colorText[s.color]} flex items-center justify-center mb-3`}>{s.icon}</div>
                <span className={`text-base font-black font-mono ${colorText[s.color]} block`}>{s.value}</span>
                <span className="text-[9px] text-slate-400 font-bold">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Dept Budget Bar */}
            <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80">
              <h4 className="text-xs font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-slate-900 dark:text-white" />
                {isAr ? 'الميزانية السنوية للأجور حسب الأقسام' : 'Annual Labor Budget by Department'}
              </h4>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={depts} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey={isAr ? 'nameAr' : 'nameEn'} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={(v) => `${Math.round(v/1000)}k`} />
                    <Tooltip formatter={(v: any) => [formatCurrency(v), isAr ? 'الأجور' : 'Budget']} contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                    <Bar dataKey="budget" radius={[8, 8, 0, 0]}>
                      {depts.map((_, i) => <Cell key={i} fill={['#2563eb','#10b981','#7c3aed','#f59e0b'][i % 4]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Salary Breakdown Pie */}
            <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80">
              <h4 className="text-xs font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Percent className="h-4 w-4 text-violet-600" />
                {isAr ? 'تفصيل مكونات الرواتب' : 'Payroll Components Breakdown'}
              </h4>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={salaryBreakdown} cx="40%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={4} dataKey="value">
                      {salaryBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [formatCurrency(v)]} contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                    <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ fontSize: '10px', fontWeight: 700 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Leave Type Pie */}
            <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80">
              <h4 className="text-xs font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-slate-900 dark:text-white" />
                {isAr ? 'توزيع أنواع الإجازات' : 'Leave Type Distribution'}
              </h4>
              <div className="h-52">
                {hasLeaveData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={leaveByType} cx="40%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={4} dataKey="value">
                        {leaveByType.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                      <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
                        formatter={(v) => <span style={{ fontSize: '10px', fontWeight: 700 }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <CalendarIcon className="h-8 w-8 mb-2 opacity-40" />
                    <span className="text-[11px] font-bold">{isAr ? 'لا توجد إجازات مسجلة' : 'No leave records'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Leave Status Pie */}
            <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80">
              <h4 className="text-xs font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-900 dark:text-white" />
                {isAr ? 'حالات طلبات الإجازات' : 'Leave Request Statuses'}
              </h4>
              <div className="h-52">
                {hasStatusData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={leaveByStatus} cx="40%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={4} dataKey="value">
                        {leaveByStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                      <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
                        formatter={(v) => <span style={{ fontSize: '10px', fontWeight: 700 }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Activity className="h-8 w-8 mb-2 opacity-40" />
                    <span className="text-[11px] font-bold">{isAr ? 'لا توجد طلبات إجازة' : 'No leave requests'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dept staff summary table */}
          <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 text-xs">
            <h4 className="text-xs font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-900 dark:text-white" />
              {isAr ? 'ملخص الموارد البشرية حسب الأقسام' : 'HR Summary by Department'}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-[10px] text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-900/30">
                    <th className="py-3 px-4 text-start">{isAr ? 'القسم' : 'Department'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الموظفون' : 'Staff'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'في إجازة' : 'On Leave'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'لديه سلف' : 'With Loans'}</th>
                    <th className="py-3 px-4 text-end">{isAr ? 'ميزانية سنوية' : 'Annual Budget'}</th>
                    <th className="py-3 px-4 text-end">{isAr ? 'متوسط الراتب' : 'Avg Salary'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-900/30 font-semibold">
                  {depts.map((dept, i) => {
                    const now = new Date();
                    const onLeave = leaveRequests.filter(l =>
                      dept.staff.some((s: any) => s.id === l.employeeId) &&
                      l.status === 'APPROVED' && new Date(l.to) >= now
                    ).length;
                    const withLoans = loansList.filter(l =>
                      dept.staff.some((s: any) => s.id === l.empId) && l.remaining > 0
                    ).length;
                    const avgSalary = dept.employeesCount > 0 ? Math.round(dept.budget / 12 / dept.employeesCount) : 0;
                    const colors = ['text-slate-900 dark:text-white','text-slate-900 dark:text-white','text-violet-600','text-slate-900 dark:text-white'];
                    return (
                      <tr key={dept.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                        <td className={`py-3 px-4 font-black ${colors[i % 4]}`}>{isAr ? dept.nameAr : dept.nameEn}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 dark:text-white">{dept.employeesCount}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-bold ${onLeave > 0 ? 'text-violet-600' : 'text-slate-400'}`}>{onLeave}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-bold ${withLoans > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{withLoans}</span>
                        </td>
                        <td className="py-3 px-4 text-end font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(dept.budget)}</td>
                        <td className="py-3 px-4 text-end font-mono font-bold text-slate-700 dark:text-slate-300">{formatCurrency(avgSalary)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ────────────────────────────────────────────────────────
          POPUP MODAL: DETAILED INVOICE-STYLE PAYSLIP PDF
          ──────────────────────────────────────────────────────── */}
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
            <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-850 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] text-slate-805 dark:text-slate-350">
              
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center shrink-0">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{isAr ? 'قسيمة الراتب التفصيلية للموظف' : 'Employee Pay Receipt Slip'}</span>
                <button onClick={() => setSelectedPayslipEmp(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Payslip content for printing */}
              <div id="payslip-content" className="p-6 overflow-y-auto space-y-6 text-start text-xs font-semibold flex-1">
                <div className="flex justify-between border-b pb-4">
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white tracking-wide">{isAr ? 'شركة لودينغ للأغذية' : 'LODing Foods Co.'}</h2>
                    <span className="text-[10px] text-slate-400 block font-normal">{isAr ? 'نظام الرواتب المحاسبي الموحد' : 'Consolidated Payroll Management'}</span>
                  </div>
                  <div className="text-end font-mono text-[10px] text-slate-400 font-normal">
                    <span>{isAr ? 'رقم القسيمة:' : 'Receipt:'} {emp.code}-{new Date().getMonth()+1}</span>
                    <span className="block">{isAr ? 'التاريخ:' : 'Date:'} {new Date().toISOString().split('T')[0]}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">{isAr ? 'الموظف' : 'Employee'}</span>
                    <span className="font-black text-slate-800 dark:text-slate-150">{isAr ? emp.nameAr : emp.nameEn}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">{isAr ? 'القسم والوردية' : 'Dept / Shift'}</span>
                    <span>{emp.department || (isAr ? 'عام' : 'General')} / {getShiftLabel(emp.shift)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">{isAr ? 'المسمى الوظيفي' : 'Role'}</span>
                    <span>{emp.role}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">{isAr ? 'الرقم القومي' : 'National ID'}</span>
                    <span className="font-mono">{emp.nationalId || 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">{isAr ? 'تفاصيل المبالغ والبدلات' : 'Earnings Breakdown'}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{isAr ? 'الراتب الأساسي التعاقدي:' : 'Contractual Base Salary:'}</span>
                      <span className="font-mono text-slate-950 dark:text-white">{formatCurrency(basic)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{isAr ? 'البدلات والمكافآت المضافة:' : 'Bonuses / Allowances:'}</span>
                      <span className="font-mono">+{formatCurrency(allowances)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{isAr ? 'أجر ساعات الإضافي:' : 'Overtime Compensate:'}</span>
                      <div className="text-end">
                        <span className="font-mono block">+{formatCurrency(overtimePay)}</span>
                        <span className="text-[9px] text-slate-400 block font-normal">({emp.overtimeHours || 0} {isAr ? 'ساعة مضافة' : 'Hrs'} × {formatCurrency(overtimeRate)} × 1.5)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">{isAr ? 'تفاصيل الاستقطاعات والخصومات' : 'Deductions Breakdown'}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-900 dark:text-white">
                      <span className="text-slate-500">{isAr ? 'الخصومات والجزاءات المطبقة:' : 'Penalties / Deductions:'}</span>
                      <span className="font-mono">-{formatCurrency(deductions)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 dark:text-white">
                      <span className="text-slate-500">{isAr ? 'اقتطاع السلف والعهد الجارية:' : 'Staff Loan Installment:'}</span>
                      <span className="font-mono">-{formatCurrency(loans)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-dashed flex justify-between items-center bg-[#ebf4ff]/40 dark:bg-slate-900/50 p-4 rounded-2xl border border-blue-100 dark:border-slate-800">
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">{isAr ? 'الصافي النهائي المستحق للصرف' : 'Total Net Cash Disbursed'}</span>
                    <span className="text-xs text-slate-400 font-normal">{isAr ? 'شاملاً العمل الإضافي ومستقطعاً منه السلف والجزاءات' : 'Inclusive of all active payroll modifications.'}</span>
                  </div>
                  <span className="text-base font-black text-slate-900 dark:text-white dark:text-white font-mono underline">{formatCurrency(netSal)}</span>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-2 shrink-0">
                <button
                  onClick={() => printElementById('payslip-content', isAr ? 'قسيمة راتب' : 'Payslip')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl cursor-pointer"
                >
                  {isAr ? 'طباعة القسيمة' : 'Print Slip'}
                </button>
                <button
                  onClick={() => setSelectedPayslipEmp(null)}
                  className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-4 py-2 rounded-xl cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ────────────────────────────────────────────────────────
          POPUP MODAL: DETAILED DEPARTMENT MEMBERS LIST
          ──────────────────────────────────────────────────────── */}
      {selectedDeptDetails && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-855 w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center shrink-0">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{isAr ? 'موظفي قسم:' : 'Staff Members in:'} {isAr ? selectedDeptDetails.nameAr : selectedDeptDetails.nameEn}</span>
                <span className="text-[10px] text-slate-400 block font-normal">{isAr ? `إجمالي الأجور السنوية للقسم: ${formatCurrency(selectedDeptDetails.budget)}` : `Annual Budget: ${formatCurrency(selectedDeptDetails.budget)}`}</span>
              </div>
              <button onClick={() => setSelectedDeptDetails(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-xs space-y-3">
              {selectedDeptDetails.staff.length === 0 ? (
                <div className="p-6 text-center text-slate-400 font-bold">
                  {isAr ? 'لا يوجد موظفون معينون في هذا القسم حالياً.' : 'No staff currently assigned to this department.'}
                </div>
              ) : (
                selectedDeptDetails.staff.map((emp: any) => (
                  <div key={emp.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center font-bold">
                    <div>
                      <span className="text-slate-900 dark:text-white block">{isAr ? emp.nameAr : emp.nameEn}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{emp.role}</span>
                    </div>
                    <div className="text-end font-mono">
                      <span className="text-slate-800 dark:text-slate-200 block">{formatCurrency(emp.salary)}</span>
                      <span className="text-[9px] text-slate-400 font-normal">{getShiftLabel(emp.shift)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 flex justify-end shrink-0">
              <button onClick={() => setSelectedDeptDetails(null)} className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold px-5 py-2 rounded-xl cursor-pointer">{isAr ? 'إغلاق' : 'Close'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          POPUP MODAL: DETAILED PROFILE COMPONENT WITH TIMELINE LOGS
          ──────────────────────────────────────────────────────── */}
      {selectedProfileEmp && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-855 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] text-slate-700 dark:text-slate-350">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-slate-900 dark:text-white flex items-center justify-center font-black font-mono text-xs">{selectedProfileEmp.code}</div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">{isAr ? 'الملف الوظيفي والتاريخ المهني' : 'Detailed Job dossier history'}</span>
              </div>
              <button onClick={() => setSelectedProfileEmp(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-start text-xs font-semibold flex-1">
              <div className="flex items-center gap-4 border-b pb-4">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 uppercase font-black text-lg">
                  {selectedProfileEmp.nameEn.substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? selectedProfileEmp.nameAr : selectedProfileEmp.nameEn}</h3>
                  <p className="text-[10px] text-slate-400 block">{selectedProfileEmp.role} ({selectedProfileEmp.department || (isAr ? 'عام' : 'General')})</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase block">{isAr ? 'البريد الإلكتروني المخصص' : 'Company Email'}</span>
                  <span>{selectedProfileEmp.email || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase block">{isAr ? 'رقم الهاتف الجوال' : 'Mobile Phone'}</span>
                  <span className="font-mono">{selectedProfileEmp.phone || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase block">{isAr ? 'رقم الهوية الوطنية / الإقامة' : 'National ID card'}</span>
                  <span className="font-mono">{selectedProfileEmp.nationalId || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase block">{isAr ? 'المدير المباشر المسؤول' : 'Reporting Manager'}</span>
                  <span>{selectedProfileEmp.manager || 'N/A'}</span>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase block">{isAr ? 'مدة صلاحية التعاقد' : 'Contract Term duration'}</span>
                  <span className="font-mono">
                    {selectedProfileEmp.contractStartDate && selectedProfileEmp.contractEndDate
                      ? `${selectedProfileEmp.contractStartDate}  ==>  ${selectedProfileEmp.contractEndDate}`
                      : (isAr ? 'مستمر (غير محدد نهاية)' : 'Continuous')}
                  </span>
                </div>
              </div>

              {/* Financial stats summary inside profile */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border rounded-2xl space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isAr ? 'الملخص المالي والرواتب المعتمدة' : 'Accruals & wage breakdown'}</h4>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div>
                    <span className="text-slate-450 block font-normal">{isAr ? 'الراتب الأساسي' : 'Base'}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(selectedProfileEmp.salary)}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block font-normal text-slate-900 dark:text-white">{isAr ? 'البدلات' : 'Allowances'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">+{formatCurrency(selectedProfileEmp.allowances || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-455 block font-normal text-slate-900 dark:text-white">{isAr ? 'الخصومات' : 'Penalties'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">-{formatCurrency(selectedProfileEmp.deductions || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-455 block font-normal text-slate-900 dark:text-white">{isAr ? 'رصيد السلف' : 'Advances'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(selectedProfileEmp.loanBalance || 0)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500">{isAr ? 'رصيد الإجازات السنوية المتبقي' : 'Annual Leave Remaining'}</span>
                  <span className="text-sm font-black font-mono text-slate-900 dark:text-white">{selectedProfileEmp.annualLeaveBalance ?? 20} {isAr ? 'يوم' : 'Days'}</span>
                </div>
                <div className="flex items-center justify-between px-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-500">{isAr ? 'أيام العمل الشهرية' : 'Monthly Work Days'}</span>
                  <span className="text-sm font-black font-mono text-sky-600">{selectedProfileEmp.workingDays ?? 26} {isAr ? 'يوم' : 'Days'}</span>
                </div>
                <div className="flex items-center justify-between px-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-500">{isAr ? 'ساعات العمل اليومية' : 'Daily Work Hours'}</span>
                  <span className="text-sm font-black font-mono text-slate-900 dark:text-white">{selectedProfileEmp.workingHours ?? 8} {isAr ? 'ساعة' : 'Hrs'}</span>
                </div>
                <div className="flex items-center justify-between px-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-500">{isAr ? 'ساعات إضافية متراكمة' : 'Accumulated Overtime'}</span>
                  <span className="text-sm font-black font-mono text-slate-900 dark:text-white">+{selectedProfileEmp.overtimeHours ?? 0} {isAr ? 'ساعة' : 'Hrs'}</span>
                </div>
                <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{isAr ? 'إجمالي ساعات العمل اليومي' : 'Total Daily Hours'}</span>
                  <span className="text-sm font-black font-mono text-indigo-600">{(selectedProfileEmp.workingHours ?? 8) + (selectedProfileEmp.overtimeHours ?? 0)} {isAr ? 'ساعة' : 'Hrs'}</span>
                </div>
              </div>

              {/* Timeline operational logs */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">{isAr ? 'التاريخ المهني والعمليات (Timeline)' : 'Operational Activity Timeline'}</h4>
                <div className="relative border-s border-slate-200 dark:border-slate-800 ms-3 space-y-4">
                  {(() => {
                    const timeline = selectedProfileEmp.timelineJson 
                      ? JSON.parse(selectedProfileEmp.timelineJson) 
                      : [{ date: selectedProfileEmp.hireDate || '2023-01-01', time: '09:00', action: 'تم تعيين الموظف وإعداد ملف الموارد البشرية بالكامل.', user: 'admin' }];
                    
                    return timeline.map((act: any, idx: number) => (
                      <div key={`timeline-${idx}`} className="relative ps-6 text-start">
                        <span className="absolute -inset-s-1.5 top-1.5 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-950"></span>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-400 font-mono block">{act.date} {act.time}</span>
                          <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">{act.action}</p>
                          <span className="text-[8px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 font-mono">By: {act.user}</span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 flex justify-end shrink-0">
              <button onClick={() => setSelectedProfileEmp(null)} className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold px-5 py-2 rounded-xl cursor-pointer">{isAr ? 'إغلاق' : 'Close'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          POPUP MODAL: NEW CALENDAR EVENT MODAL
          ──────────────────────────────────────────────────────── */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-3xl shadow-2xl w-full max-w-md text-start overflow-hidden flex flex-col text-xs font-semibold">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center shrink-0">
              <span className="font-black text-slate-905 dark:text-white uppercase tracking-wider">{isAr ? 'إضافة فعالية جديدة للتقويم' : 'Create calendar Event'}</span>
              <button onClick={() => setShowAddEventModal(false)} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleAddCalendarEvent} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">{isAr ? 'اسم الفعالية (عربي):' : 'Event Title (AR):'}</label>
                <input type="text" required value={newEventTitleAr} onChange={(e) => setNewEventTitleAr(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">{isAr ? 'اسم الفعالية (إنجليزي):' : 'Event Title (EN):'}</label>
                <input type="text" required value={newEventTitleEn} onChange={(e) => setNewEventTitleEn(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">{isAr ? 'تاريخ الفعالية:' : 'Event Date:'}</label>
                  <input type="date" required value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">{isAr ? 'نوع الفعالية:' : 'Event Type:'}</label>
                  <select value={newEventType} onChange={(e) => setNewEventType(e.target.value as any)} className="w-full py-2.5 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    <option value="event">{isAr ? 'فعالية تنسيقية' : 'Event'}</option>
                    <option value="holiday">{isAr ? 'إجازة رسمية' : 'Holiday'}</option>
                    <option value="meeting">{isAr ? 'اجتماع عمل' : 'Meeting'}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowAddEventModal(false)} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-xl">{isAr ? 'حفظ الفعالية' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          POPUP MODAL: APPLY FOR LEAVE MODAL
          ──────────────────────────────────────────────────────── */}
      {showAddLeaveModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-3xl shadow-2xl w-full max-w-md text-start overflow-hidden flex flex-col text-xs font-semibold">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center shrink-0">
              <span className="font-black text-slate-905 dark:text-white uppercase tracking-wider">{isAr ? 'تسجيل إجازة للموظف' : 'Request Staff Leave'}</span>
              <button onClick={() => setShowAddLeaveModal(false)} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">{isAr ? 'اختر الموظف طالب الإجازة:' : 'Employee:'}</label>
                <select required value={newLeaveEmp} onChange={(e) => setNewLeaveEmp(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  <option value="">{isAr ? 'اختر موظف...' : 'Select Employee...'}</option>
                  {data.employees.map(e => <option key={e.id} value={e.id}>{isAr ? e.nameAr : e.nameEn}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">{isAr ? 'تاريخ البداية:' : 'Start Date:'}</label>
                  <input type="date" required value={newLeaveStart} onChange={(e) => setNewLeaveStart(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">{isAr ? 'تاريخ النهاية:' : 'End Date:'}</label>
                  <input type="date" required value={newLeaveEnd} onChange={(e) => setNewLeaveEnd(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">{isAr ? 'نوع الإجازة المطلوبة:' : 'Leave Type:'}</label>
                <select value={newLeaveType} onChange={(e) => setNewLeaveType(e.target.value)} className="w-full py-2.5 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  <option value="ANNUAL">{isAr ? 'إجازة سنوية' : 'Annual Leave'}</option>
                  <option value="SICK">{isAr ? 'إجازة مرضية' : 'Sick Leave'}</option>
                  <option value="UNPAID">{isAr ? 'إجازة بدون راتب' : 'Unpaid Leave'}</option>
                </select>
                {newLeaveType === 'ANNUAL' && newLeaveEmp && (
                  <div className="mt-2 text-[10px] font-bold">
                    {(() => {
                      const emp = data.employees.find(e => e.id === newLeaveEmp);
                      const bal = emp?.annualLeaveBalance ?? 20;
                      return (
                        <span className={bal <= 0 ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'}>
                          {isAr ? `رصيد الإجازات السنوية المتبقي: ${bal} يوم` : `Remaining annual leave: ${bal} days`}
                          {bal <= 0 && (isAr ? ' (غير كافٍ)' : ' (insufficient)')}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">{isAr ? 'السبب / الملاحظات المبررة للغياب:' : 'Reason Description Notes:'}</label>
                <textarea required value={newLeaveReason} onChange={(e) => setNewLeaveReason(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 h-20" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowAddLeaveModal(false)} className="bg-slate-105 dark:bg-slate-800 text-slate-705 dark:text-slate-300 px-4 py-2 rounded-xl">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-xl">{isAr ? 'تقديم طلب الإجازة' : 'Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          POPUP MODAL: NEW LOAN MODAL
          ──────────────────────────────────────────────────────── */}
      {showAddLoanModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-3xl shadow-2xl w-full max-w-md text-start overflow-hidden flex flex-col text-xs font-semibold">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center shrink-0">
              <span className="font-black text-slate-905 dark:text-white uppercase tracking-wider">{isAr ? 'طلب صرف سلفة مالية' : 'Request cash advance'}</span>
              <button onClick={() => setShowAddLoanModal(false)} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleCreateLoan} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">{isAr ? 'الموظف طالب السلفة:' : 'Employee:'}</label>
                <select required value={newLoanEmp} onChange={(e) => setNewLoanEmp(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  <option value="">{isAr ? 'اختر موظف...' : 'Select Employee...'}</option>
                  {data.employees.map(e => <option key={e.id} value={e.id}>{isAr ? e.nameAr : e.nameEn}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">{isAr ? 'مبلغ السلفة (ج.م):' : 'Loan Amount:'}</label>
                  <input type="number" required value={newLoanAmount} onChange={(e) => setNewLoanAmount(Number(e.target.value))} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">{isAr ? 'مدة التقسيط (شهور):' : 'Installment months:'}</label>
                  <input type="number" required value={newLoanInstallmentMonths} onChange={(e) => setNewLoanInstallmentMonths(Number(e.target.value))} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">{isAr ? 'القسط الشهري (يُكتب يدوياً):' : 'Monthly installment (manual):'}</label>
                <input type="number" required value={newLoanInstallment} onChange={(e) => setNewLoanInstallment(Number(e.target.value))} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold font-mono text-slate-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">{isAr ? 'مبررات صرف السلفة:' : 'Reason notes:'}</label>
                <input type="text" required value={newLoanReason} onChange={(e) => setNewLoanReason(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowAddLoanModal(false)} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-355 px-4 py-2 rounded-xl">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-xl">{isAr ? 'صرف السلفة المعتمدة' : 'Disburse'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          POPUP MODAL: DOUBLE-ENTRY JV PREVIEW ON PAYROLL CONFIRM
          ──────────────────────────────────────────────────────── */}
      {showPayrollConfirmModal && (() => {
        const { totalGrossBasic, totalAllowances, totalOvertimePay, totalDeductions, totalLoansDeduction, totalNetPaid, grossExpenseDebited, activeStaffCount } = getPayrollAggregates();
        const source = paymentSources.find(s => s.id === paymentSourceId);

        return (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-855 w-full max-w-xl overflow-hidden flex flex-col text-xs font-semibold">
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center shrink-0">
                <span className="font-black text-slate-905 dark:text-white uppercase tracking-wider">{isAr ? 'معاينة القيد المحاسبي المتوازن لمسير الرواتب' : 'Pre-post balanced General Ledger JV preview'}</span>
                <button onClick={() => setShowPayrollConfirmModal(false)} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              
              <div className="p-6 space-y-4 text-start">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border rounded-2xl flex gap-3 text-slate-700 dark:text-slate-350">
                  <AlertCircle className="h-5 w-5 text-slate-900 dark:text-white shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold">{isAr ? 'ملاحظة محاسبية هامة' : 'General Ledger Mapping'}</p>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {isAr 
                        ? `سيتم سحب مبلغ الرواتب الصافية (${formatCurrency(totalNetPaid)}) مباشرة من حساب ${source ? source.nameAr : ''} وتخفيض رصيده الجاري بالمنظومة.`
                        : `Net salary total (${formatCurrency(totalNetPaid)}) will be deducted from ${source ? source.nameEn : ''} balance.`}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-black text-slate-400 uppercase tracking-widest">{isAr ? 'قيود دفتر اليومية المقترحة' : 'Journal Entries lines'}</h4>
                  <div className="border rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-900 p-2 font-black border-b text-[10px]">
                      <span>{isAr ? 'الحساب الرئيسي' : 'Account'}</span>
                      <span className="text-end text-slate-900 dark:text-white">{isAr ? 'مدين (Deb)' : 'Debit'}</span>
                      <span className="text-end text-slate-900 dark:text-white">{isAr ? 'دائن (Cred)' : 'Credit'}</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-900 text-[10px] font-mono">
                      {/* Basic Salary & Overtime */}
                      <div className="grid grid-cols-3 p-2.5">
                        <span className="font-bold">{isAr ? '601 - أجور ورواتب أساسية' : '601 - Basic Salaries'}</span>
                        <span className="text-end text-slate-900 dark:text-white font-bold">{formatCurrency(totalGrossBasic + totalOvertimePay)}</span>
                        <span className="text-end text-slate-300">0.00</span>
                      </div>
                      {/* Allowances */}
                      {totalAllowances > 0 && (
                        <div className="grid grid-cols-3 p-2.5">
                          <span className="font-bold">{isAr ? '606 - مصروف البدلات والإضافات' : '606 - Allowances Expense'}</span>
                          <span className="text-end text-slate-900 dark:text-white font-bold">{formatCurrency(totalAllowances)}</span>
                          <span className="text-end text-slate-300">0.00</span>
                        </div>
                      )}
                      {/* Deductions Income */}
                      {totalDeductions > 0 && (
                        <div className="grid grid-cols-3 p-2.5">
                          <span className="font-bold">{isAr ? '405 - إيراد غرامات وجزاءات' : '405 - Penalties Income'}</span>
                          <span className="text-end text-slate-300">0.00</span>
                          <span className="text-end text-slate-900 dark:text-white font-bold">{formatCurrency(totalDeductions)}</span>
                        </div>
                      )}
                      {/* Staff Advances */}
                      {totalLoansDeduction > 0 && (
                        <div className="grid grid-cols-3 p-2.5">
                          <span className="font-bold">{isAr ? '107 - سلف وعُهد الموظفين' : '107 - Staff Advances'}</span>
                          <span className="text-end text-slate-300">0.00</span>
                          <span className="text-end text-slate-900 dark:text-white font-bold">{formatCurrency(totalLoansDeduction)}</span>
                        </div>
                      )}
                      {/* Cash Box/Bank */}
                      <div className="grid grid-cols-3 p-2.5">
                        <span className="font-bold">
                          {source ? `${source.accountId} - ${isAr ? source.nameAr : source.nameEn}` : ''}
                        </span>
                        <span className="text-end text-slate-300">0.00</span>
                        <span className="text-end text-slate-900 dark:text-white font-bold">{formatCurrency(totalNetPaid)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold font-mono text-[10px]">
                  <span>{isAr ? 'موظفين نشطين مشمولين بالصرف:' : 'Total staff paid:'}</span>
                  <span className="text-slate-900 dark:text-white">{activeStaffCount} {isAr ? 'موظفين' : 'Staff'}</span>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-2 shrink-0">
                <button type="button" onClick={() => setShowPayrollConfirmModal(false)} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-355 px-5 py-2 rounded-xl cursor-pointer">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button type="button" onClick={handleDisbursePayrollAction} className="bg-blue-600 text-white px-6 py-2 rounded-xl cursor-pointer">{isAr ? 'اعتماد وترحيل القيد بالدفاتر' : 'Approve & releasing JV'}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ────────────────────────────────────────────────────────
          POPUP MODAL: EDIT EMPLOYEE PROFILE DRAWER
          ──────────────────────────────────────────────────────── */}
      {showEditEmpForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-3xl shadow-2xl w-full max-w-2xl text-start overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-slate-900 dark:text-white" />
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{isAr ? 'تعديل الملف الشخصي والوظيفي' : 'Edit Employee Profile & Compensation'}</span>
              </div>
              <button onClick={() => setShowEditEmpForm(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditEmployee} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-650 block">{isAr ? 'الاسم بالكامل (عربي):' : 'Full Name (AR):'}</label>
                  <input type="text" required value={editNameAr} onChange={(e) => setEditNameAr(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-655 block">{isAr ? 'الاسم بالكامل (إنجليزي):' : 'Full Name (EN):'}</label>
                  <input type="text" required value={editNameEn} onChange={(e) => setEditNameEn(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-650 block">{isAr ? 'المسمى الوظيفي:' : 'Job Title / Role:'}</label>
                  <input type="text" required value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-650 block">{isAr ? 'القسم المستهدف:' : 'Department:'}</label>
                    <select value={editDept} onChange={(e) => setEditDept(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {allDepts.map(d => (
                        <option key={d.id} value={d.nameAr}>{isAr ? d.nameAr : d.nameEn}</option>
                      ))}
                    </select>
                  </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-650 block">{isAr ? 'الراتب الأساسي التعاقدي (ج.م):' : 'Base wage (EGP):'}</label>
                  <input type="number" required value={editSalary} onChange={(e) => setEditSalary(Number(e.target.value))} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-905 dark:text-slate-100" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-650 block">{isAr ? 'الوردية المحددة:' : 'Shift Logistics:'}</label>
                  <select value={editShift} onChange={(e) => setEditShift(e.target.value as EmployeeShift)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    <option value={EmployeeShift.Morning}>{isAr ? 'صباحية (AM)' : 'Morning'}</option>
                    <option value={EmployeeShift.Evening}>{isAr ? 'مسائية (PM)' : 'Evening'}</option>
                    <option value={EmployeeShift.Overnight}>{isAr ? 'ليلية (Night)' : 'Overnight'}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-650 block">{isAr ? 'حالة الموظف:' : 'Employee Status:'}</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold">
                    <option value="ACTIVE">{isAr ? 'نشط عملياً' : 'Active'}</option>
                    <option value="ARCHIVED">{isAr ? 'مؤرشف وموقوف' : 'Archived'}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-650 block">{isAr ? 'الرقم القومي / الإقامة:' : 'National ID:'}</label>
                  <input type="text" required value={editNationalId} onChange={(e) => setEditNationalId(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-650 block">{isAr ? 'البريد الإلكتروني للموظف:' : 'Email Address:'}</label>
                  <input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-650 block">{isAr ? 'رقم الجوال الشخصي:' : 'Phone Number:'}</label>
                  <input type="text" required value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-650 block">{isAr ? 'المدير المباشر:' : 'Direct Manager:'}</label>
                  <input type="text" required value={editManager} onChange={(e) => setEditManager(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-655 block">{isAr ? 'تاريخ بداية العقد:' : 'Contract Start Date:'}</label>
                  <input type="date" required value={editContractStart} onChange={(e) => setEditContractStart(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-650 block">{isAr ? 'تاريخ نهاية العقد:' : 'Contract End Date:'}</label>
                  <input type="date" required value={editContractEnd} onChange={(e) => setEditContractEnd(e.target.value)} className="w-full py-2 px-3 border rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                <div className="space-y-1">
                  <label className="font-bold text-blue-700 dark:text-blue-400 block text-[11px]">{isAr ? 'رصيد الإجازات السنوية (أيام):' : 'Annual Leave Balance (Days):'}</label>
                  <input type="number" value={editAnnualLeaveBalance} onChange={(e) => setEditAnnualLeaveBalance(Number(e.target.value))} className="w-full py-2 px-3 border rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 rounded-xl">
                  <div className="space-y-1">
                    <label className="font-bold text-sky-700 dark:text-white block text-[11px]">{isAr ? 'أيام العمل الشهرية:' : 'Monthly Work Days:'}</label>
                    <input type="number" min="1" max="31" value={editWorkingDays} onChange={(e) => setEditWorkingDays(Math.min(31, Math.max(1, Number(e.target.value))))} className="w-full py-2 px-3 border rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold" />
                  </div>
                </div>
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                  <div className="space-y-1">
                    <label className="font-bold text-amber-700 dark:text-amber-400 block text-[11px]">{isAr ? 'ساعات العمل اليومية:' : 'Daily Working Hours:'}</label>
                    <input type="number" value={editWorkingHours} onChange={(e) => setEditWorkingHours(Number(e.target.value))} className="w-full py-2 px-3 border rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-bold" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowEditEmpForm(null)} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-355 font-bold px-4 py-2 rounded-xl cursor-pointer">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl cursor-pointer">{isAr ? 'حفظ التعديلات' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-sm text-start overflow-hidden flex flex-col text-xs font-semibold">
            <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <span className="font-black text-slate-900 dark:text-white">{alertModal.title}</span>
              <button onClick={() => setAlertModal(prev => ({ ...prev, show: false }))} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <div className="flex justify-center">
                <AlertCircle className={`h-12 w-12 ${
                  alertModal.type === 'success' ? 'text-emerald-500' :
                  alertModal.type === 'error' ? 'text-rose-500' :
                  alertModal.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                }`} />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{alertModal.message}</p>
            </div>
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button 
                onClick={() => setAlertModal(prev => ({ ...prev, show: false }))} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl cursor-pointer transition-all text-[11px]"
              >
                {isAr ? 'موافق' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-sm text-start overflow-hidden flex flex-col text-xs font-semibold">
            <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <span className="font-black text-slate-900 dark:text-white">{confirmModal.title}</span>
              <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <div className="flex justify-center">
                <AlertCircle className="h-12 w-12 text-amber-500" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} 
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-5 py-2.5 rounded-xl cursor-pointer transition-all text-[11px]"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, show: false }));
                }} 
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all text-[11px]"
              >
                {isAr ? 'تأكيد' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Edit Modal */}
      {showEditDeptModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col text-slate-800 dark:text-slate-200">
            <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <span className="text-xs font-black text-slate-900 dark:text-white">{isAr ? 'تعديل بيانات القسم:' : 'Edit Department:'} {isAr ? showEditDeptModal.nameAr : showEditDeptModal.nameEn}</span>
              <button onClick={() => setShowEditDeptModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleEditDepartmentSubmit} className="p-6 space-y-5 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'مدير القسم' : 'Department Manager'}</label>
                <input
                  type="text"
                  required
                  value={editDeptManager}
                  onChange={(e) => setEditDeptManager(e.target.value)}
                  className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'الميزانية السنوية (ج.م)' : 'Annual Budget (EGP)'}</label>
                <input
                  type="number"
                  required
                  value={editDeptBudget}
                  onChange={(e) => setEditDeptBudget(Number(e.target.value))}
                  className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowEditDeptModal(null)} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all text-[11px]">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all text-[11px] shadow-sm">{isAr ? 'حفظ التعديلات' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col text-slate-800 dark:text-slate-200">
            <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <span className="text-xs font-black text-slate-900 dark:text-white">{isAr ? 'إضافة قسم جديد' : 'Add New Department'}</span>
              <button onClick={() => setShowAddDeptModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleAddDepartment} className="p-6 space-y-5 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'اسم القسم (عربي)' : 'Department Name (AR)'}</label>
                <input type="text" required value={newDeptNameAr} onChange={(e) => setNewDeptNameAr(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'اسم القسم (إنجليزي)' : 'Department Name (EN)'}</label>
                <input type="text" required value={newDeptNameEn} onChange={(e) => setNewDeptNameEn(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'مدير القسم' : 'Department Manager'}</label>
                <input type="text" value={newDeptManager} onChange={(e) => setNewDeptManager(e.target.value)} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'الميزانية السنوية (ج.م)' : 'Annual Budget (EGP)'}</label>
                <input type="number" required value={newDeptBudget} onChange={(e) => setNewDeptBudget(Number(e.target.value))} className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowAddDeptModal(false)} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all text-[11px]">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all text-[11px] shadow-sm">{isAr ? 'إضافة القسم' : 'Add Department'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Loan Repayment Modal */}
      {showManualRepayModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden flex flex-col text-slate-800 dark:text-slate-200">
            <div className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <span className="text-xs font-black text-slate-900 dark:text-white">{isAr ? 'تسديد سلفة يدوي' : 'Manual Loan Repayment'}</span>
              <button onClick={() => setShowManualRepayModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleManualLoanRepay(showManualRepayModal.id, repayAmount);
                setShowManualRepayModal(null);
              }}
              className="p-6 space-y-5 text-xs"
            >
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-bold">{isAr ? 'الموظف' : 'Employee'}</span>
                <span className="font-black text-slate-900 dark:text-white block text-sm">{showManualRepayModal.empName}</span>
                <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-bold">
                  <span>{isAr ? 'المتبقي:' : 'Outstanding:'} {formatCurrency(showManualRepayModal.remaining)}</span>
                  <span>{isAr ? 'القسط:' : 'Installment:'} {formatCurrency(showManualRepayModal.installment)}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">{isAr ? 'المبلغ المراد سداده (ج.م)' : 'Amount to Repay (EGP)'}</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={showManualRepayModal.remaining}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(Number(e.target.value))}
                  className="w-full py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
              <p className="text-[9px] text-slate-900 dark:text-white font-bold bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl">
                * {isAr ? 'سيتم عمل قيد محاسبي لإيداع النقدية في الصندوق وتخفيض مديونية الموظف.' : 'This will post a JV: Debit Cash Box, Credit Staff Advances.'}
              </p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowManualRepayModal(null)} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all text-[11px]">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all text-[11px] shadow-sm">{isAr ? 'تأكيد السداد' : 'Confirm Repayment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
