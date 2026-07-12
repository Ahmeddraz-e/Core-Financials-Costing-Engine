import React, { useState, useMemo } from 'react';
import { 
  FileBarChart, Search, CheckCircle, AlertCircle, FileText, 
  BarChart3, TrendingUp, ShieldCheck, Printer, Calculator, 
  ChevronRight, ChevronDown, RefreshCw, Download, FileSpreadsheet, 
  Settings, CheckCircle2, X, Maximize2, Minimize2, EyeOff, SlidersHorizontal, BookOpen, Clock, ArrowUpRight, ArrowDownRight, Landmark
} from 'lucide-react';
import { ERPData, Account, AccountType, JournalEntry, JournalLine, InvoiceStatus, SalesInvoice, Voucher, PurchaseTransaction, PayrollRun, SalesReturn, PurchaseReturn } from '../types';
import { printDocument, companyHeaderHTML, signaturesHTML, footerHTML, exportToCSV } from '../utils/printUtils';
import {
  exportTrialBalanceExcel,
  exportIncomeStatementExcel,
  exportBalanceSheetExcel,
} from '../utils/excelExport';
import {
  printPDF,
  buildTrialBalancePDF,
  buildIncomeStatementPDF,
  buildBalanceSheetPDF,
} from '../utils/pdfExport';
import ExportButton, { exportIcons } from './ExportButton';
import TaxReport from './TaxReport';
import AgingReport from './AgingReport';

interface ReportsProps {
  data: ERPData;
  lang: 'ar' | 'en';
}

interface TreeNode {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  balance: number;
  compareBalance?: number;
  isAccount: boolean;
  type?: AccountType;
  children: TreeNode[];
}

export default function Reports({ data, lang }: ReportsProps) {
  const isAr = lang === 'ar';
  const [activeReport, setActiveReport] = useState<'trial_balance' | 'income_statement' | 'balance_sheet' | 'tax_report' | 'aging_report'>('trial_balance');

  // Filter states
  const now = new Date();
  const initFirstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const initLastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const [startDate, setStartDate] = useState<string>(initFirstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(initLastDay.toISOString().split('T')[0]);
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [costCenterFilter, setCostCenterFilter] = useState<string>('ALL');
  const [showZeroBalances, setShowZeroBalances] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('detailed');
  const [compareMode, setCompareMode] = useState<'NONE' | 'PREV_PERIOD' | 'PREV_YEAR'>('PREV_PERIOD');
  const [periodPreset, setPeriodPreset] = useState<string>('this_month');

  // Collapsible tree expanded state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'assets': true,
    'liabilities': true,
    'equity': true,
    'revenue': true,
    'cogs': true,
    'expense': true,
    'sub-1101': true,
    'sub-1102': true,
    'sub-1103': true,
    'sub-1104': true,
    'sub-1105': true,
    'sub-2101': true,
    'sub-2102': true,
    'sub-2103': true,
    'sub-6101': true
  });

  // Saved templates
  const defaultTemplateDates = {
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  };
  const [savedTemplates, setSavedTemplates] = useState<Record<string, any>>({
    'default_board': { nameAr: 'تقرير مجلس الإدارة الافتراضي', nameEn: 'Default Board Report', startDate: defaultTemplateDates.start, endDate: defaultTemplateDates.end, branch: 'ALL', costCenter: 'ALL' }
  });
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');

  // Drill-down states
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<Account | null>(null);
  const [selectedJournalEntry, setSelectedJournalEntry] = useState<JournalEntry | null>(null);
  const [selectedSourceDoc, setSelectedSourceDoc] = useState<{ type: string; doc: any; label: string } | null>(null);
  
  // Inline ledger account click selection (left sidebar list)
  const [clickedAccount, setClickedAccount] = useState<Account | null>(null);

  // Diagnostics modal
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState<boolean>(false);

  // Refresh spinner helper
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Deterministic Branch & Cost Center allocations (matching SQLite seed)
  const getEntryBranch = (entry: JournalEntry): string => {
    const hash = entry.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return hash % 2 === 0 ? 'MAIN' : 'HELIOPOLIS';
  };

  const getEntryCostCenter = (entry: JournalEntry): string => {
    const hash = entry.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const val = hash % 3;
    return val === 0 ? 'KITCHEN' : (val === 1 ? 'SERVICE' : 'ADMIN');
  };

  const formatCurrency = (val: number) => {
    const hasDecimal = val % 1 !== 0;
    const formattedNum = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasDecimal ? 2 : 0,
      maximumFractionDigits: hasDecimal ? 2 : 0
    }).format(val);
    return isAr ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
  };

  // Format currency with specified language helper
  const fmtCurrency = (val: number, l: 'ar' | 'en') => {
    const formattedNum = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
    return l === 'ar' ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
  };

  // Date Presets Handler
  const handlePeriodChange = (val: string) => {
    setPeriodPreset(val);
    const today = new Date();
    if (val === 'today') {
      const dateStr = today.toISOString().split('T')[0];
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else if (val === 'this_week') {
      const first = today.getDate() - today.getDay();
      const last = first + 6;
      const weekStart = new Date(today.getFullYear(), today.getMonth(), first);
      const weekEnd = new Date(today.getFullYear(), today.getMonth(), last);
      setStartDate(weekStart.toISOString().split('T')[0]);
      setEndDate(weekEnd.toISOString().split('T')[0]);
    } else if (val === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (val === 'this_year') {
      setStartDate(`${today.getFullYear()}-01-01`);
      setEndDate(`${today.getFullYear()}-12-31`);
    }
  };

  // Dynamic ledger balance aggregator
  const computedBalances = useMemo(() => {
    const balances: Record<string, { current: number; compare: number }> = {};
    
    // Initialize all balances to 0 (recompute entirely from journal entries within the period)
    data.accounts.forEach(acc => {
      balances[acc.id] = { current: 0, compare: 0 };
    });

    // 1. Determine comparison dates
    let compareStart = '';
    let compareEnd = '';
    if (compareMode === 'PREV_PERIOD') {
      const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
      compareEnd = new Date(new Date(startDate).getTime() - 86400000).toISOString().split('T')[0];
      compareStart = new Date(new Date(compareEnd).getTime() - diffMs).toISOString().split('T')[0];
    } else if (compareMode === 'PREV_YEAR') {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      compareStart = new Date(sDate.getFullYear() - 1, sDate.getMonth(), sDate.getDate()).toISOString().split('T')[0];
      compareEnd = new Date(eDate.getFullYear() - 1, eDate.getMonth(), eDate.getDate()).toISOString().split('T')[0];
    }

    // 2. Loop through approved journal entries and sum debits & credits
    const approvedEntries = (data.journalEntries || []).filter(e => e.approved);

    approvedEntries.forEach(entry => {
      const entryBranch = getEntryBranch(entry);
      const entryCostCenter = getEntryCostCenter(entry);

      if (branchFilter !== 'ALL' && entryBranch !== branchFilter) return;
      if (costCenterFilter !== 'ALL' && entryCostCenter !== costCenterFilter) return;

      entry.lines.forEach(line => {
        const acc = data.accounts.find(a => a.id === line.accountId);
        if (!acc) return;

        const isDebitNature = acc.type === AccountType.Asset || acc.type === AccountType.Expense || acc.type === AccountType.CostOfSales;
        const change = isDebitNature ? (line.debit - line.credit) : (line.credit - line.debit);

        const isBS = acc.type === AccountType.Asset || acc.type === AccountType.Liability || acc.type === AccountType.Equity;

        // Current period sum
        if (isBS) {
          // BS accounts: cumulative from inception up to endDate
          if (entry.date <= endDate) {
            balances[acc.id].current += change;
          }
        } else {
          // P&L accounts: only entries within the selected date range
          if (entry.date >= startDate && entry.date <= endDate) {
            balances[acc.id].current += change;
          }
        }

        // Comparison period sum
        if (compareMode !== 'NONE') {
          if (isBS) {
            if (entry.date <= compareEnd) {
              balances[acc.id].compare += change;
            }
          } else {
            if (entry.date >= compareStart && entry.date <= compareEnd) {
              balances[acc.id].compare += change;
            }
          }
        }
      });
    });

    return balances;
  }, [data.journalEntries, data.accounts, startDate, endDate, branchFilter, costCenterFilter, compareMode]);

  // Extract total P&L revenue/expense dynamically for Retained Earnings rollup
  const netProfitCurrent = useMemo(() => {
    let rev = 0;
    let cost = 0;
    let exp = 0;

    data.accounts.forEach(acc => {
      const val = computedBalances[acc.id]?.current || 0;
      if (acc.type === AccountType.Revenue) rev += val;
      else if (acc.type === AccountType.CostOfSales) cost += val;
      else if (acc.type === AccountType.Expense) exp += val;
    });

    return rev - cost - exp;
  }, [data.accounts, computedBalances]);

  const netProfitCompare = useMemo(() => {
    if (compareMode === 'NONE') return 0;
    let rev = 0;
    let cost = 0;
    let exp = 0;

    data.accounts.forEach(acc => {
      const val = computedBalances[acc.id]?.compare || 0;
      if (acc.type === AccountType.Revenue) rev += val;
      else if (acc.type === AccountType.CostOfSales) cost += val;
      else if (acc.type === AccountType.Expense) exp += val;
    });

    return rev - cost - exp;
  }, [data.accounts, computedBalances, compareMode]);

  // Trial balance totals (debit / credit)
  const trialBalanceTotals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    data.accounts.forEach(acc => {
      const balanceObj = computedBalances[acc.id] || { current: 0, compare: 0 };
      let currentBal = balanceObj.current;

      const isDebitAcc = acc.type === AccountType.Asset || acc.type === AccountType.Expense || acc.type === AccountType.CostOfSales;
      const displayDebit = isDebitAcc ? (currentBal >= 0 ? currentBal : 0) : (currentBal < 0 ? -currentBal : 0);
      const displayCredit = isDebitAcc ? (currentBal < 0 ? -currentBal : 0) : (currentBal >= 0 ? currentBal : 0);
      debit += displayDebit;
      credit += displayCredit;
    });
    return { debit, credit };
  }, [data.accounts, computedBalances, netProfitCurrent]);

  // Custom detailed P&L calculations
  const detailedIncomeStatement = useMemo(() => {
    const getBalanceByCodes = (codes: string[]) => {
      let current = 0;
      let compare = 0;
      data.accounts.forEach(acc => {
        if (codes.includes(acc.code)) {
          current += computedBalances[acc.id]?.current || 0;
          compare += computedBalances[acc.id]?.compare || 0;
        }
      });
      return { current, compare };
    };

    const getOtherBalances = (type: AccountType, excludedCodes: string[]) => {
      let current = 0;
      let compare = 0;
      data.accounts.forEach(acc => {
        if (acc.type === type && !excludedCodes.includes(acc.code)) {
          current += computedBalances[acc.id]?.current || 0;
          compare += computedBalances[acc.id]?.compare || 0;
        }
      });
      return { current, compare };
    };

    // 1. Revenues
    const dineInRevenue = getBalanceByCodes(['4101001']);
    const takeawayRevenue = getBalanceByCodes(['4102001']);
    const deliveryRevenue = getBalanceByCodes(['4103001']);
    const deliveryAppsRevenue = getBalanceByCodes(['4104001']);
    const operatingRevenueExclusions = ['4101001', '4102001', '4103001', '4104001', '4107001'];
    const otherOperatingRevenue = getOtherBalances(AccountType.Revenue, operatingRevenueExclusions);

    const totalOperatingRevenueCurrent = dineInRevenue.current + takeawayRevenue.current + deliveryRevenue.current + deliveryAppsRevenue.current + otherOperatingRevenue.current;
    const totalOperatingRevenueCompare = dineInRevenue.compare + takeawayRevenue.compare + deliveryRevenue.compare + deliveryAppsRevenue.compare + otherOperatingRevenue.compare;

    // 2. COGS
    const foodBeverageCOGS = getBalanceByCodes(['5101001', '5102001']);
    const packagingCOGS = getBalanceByCodes(['5103001']);
    const wastageCOGS = getBalanceByCodes(['5104001']);
    const cogsExclusions = ['5101001', '5102001', '5103001', '5104001'];
    const otherCOGS = getOtherBalances(AccountType.CostOfSales, cogsExclusions);

    const totalCOGSCurrent = foodBeverageCOGS.current + packagingCOGS.current + wastageCOGS.current + otherCOGS.current;
    const totalCOGSCompare = foodBeverageCOGS.compare + packagingCOGS.compare + wastageCOGS.compare + otherCOGS.compare;

    // Gross Profit
    const grossProfitCurrent = totalOperatingRevenueCurrent - totalCOGSCurrent;
    const grossProfitCompare = totalOperatingRevenueCompare - totalCOGSCompare;

    // 3. Operating Expenses
    const salariesWagesExpense = getBalanceByCodes(['6101001', '6106001']);
    const rentExpense = getBalanceByCodes(['6102001']);
    const utilitiesExpense = getBalanceByCodes(['6103001']);
    const marketingExpense = getBalanceByCodes(['6104001']);
    const depreciationExpense = getBalanceByCodes(['6105001']);
    const expenseExclusions = ['6101001', '6102001', '6103001', '6104001', '6105001', '6106001'];
    const otherExpenses = getOtherBalances(AccountType.Expense, expenseExclusions);

    const totalExpensesCurrent = salariesWagesExpense.current + rentExpense.current + utilitiesExpense.current + marketingExpense.current + depreciationExpense.current + otherExpenses.current;
    const totalExpensesCompare = salariesWagesExpense.compare + rentExpense.compare + utilitiesExpense.compare + marketingExpense.compare + depreciationExpense.compare + otherExpenses.compare;

    // Net Operating Profit
    const netOperatingProfitCurrent = grossProfitCurrent - totalExpensesCurrent;
    const netOperatingProfitCompare = grossProfitCompare - totalExpensesCompare;

    // 4. Other Non-Operating
    const otherNonOperatingRevenue = getBalanceByCodes(['4107001']);

    // Net Profit Before Tax/Zakat
    const netProfitBeforeTaxCurrent = netOperatingProfitCurrent + otherNonOperatingRevenue.current;
    const netProfitBeforeTaxCompare = netOperatingProfitCompare + otherNonOperatingRevenue.compare;

    // Provision (Estimated zakat & tax rate from company profile, default 15%)
    const zakatRate = (data as any).companyProfile?.zakatRate ?? 15;
    const zakatMultiplier = zakatRate / 100;
    const taxProvisionCurrent = netProfitBeforeTaxCurrent > 0 ? netProfitBeforeTaxCurrent * zakatMultiplier : 0;
    const taxProvisionCompare = netProfitBeforeTaxCompare > 0 ? netProfitBeforeTaxCompare * zakatMultiplier : 0;

    // Final Net Profit
    const finalNetProfitCurrent = netProfitBeforeTaxCurrent - taxProvisionCurrent;
    const finalNetProfitCompare = netProfitBeforeTaxCompare - taxProvisionCompare;

    const rows = [
      // REVENUES
      { id: 'h_rev', nameAr: 'أولاً: الإيرادات التشغيلية', nameEn: 'I. Operating Revenues', isHeader: true },
      { id: 'dine_in', nameAr: 'إيرادات مبيعات الصالة', nameEn: 'Dine-In Sales Revenues', current: dineInRevenue.current, compare: dineInRevenue.compare, indent: 1 },
      { id: 'takeaway', nameAr: 'إيرادات مبيعات التيك أواي', nameEn: 'Takeaway Sales Revenues', current: takeawayRevenue.current, compare: takeawayRevenue.compare, indent: 1 },
      { id: 'delivery', nameAr: 'إيرادات مبيعات التوصيل', nameEn: 'Delivery Sales Revenues', current: deliveryRevenue.current, compare: deliveryRevenue.compare, indent: 1 },
      { id: 'delivery_apps', nameAr: 'إيرادات مبيعات تطبيقات التوصيل', nameEn: 'Third-Party App Sales', current: deliveryAppsRevenue.current, compare: deliveryAppsRevenue.compare, indent: 1 },
      ...(otherOperatingRevenue.current !== 0 || otherOperatingRevenue.compare !== 0 || showZeroBalances ? [
        { id: 'other_op_rev', nameAr: 'إيرادات تشغيلية أخرى', nameEn: 'Other Operating Revenues', current: otherOperatingRevenue.current, compare: otherOperatingRevenue.compare, indent: 1 }
      ] : []),
      { id: 't_rev', nameAr: 'إجمالي الإيرادات التشغيلية', nameEn: 'Total Operating Revenues', current: totalOperatingRevenueCurrent, compare: totalOperatingRevenueCompare, isTotal: true },

      // COGS
      { id: 'h_cogs', nameAr: 'ثانياً: تكلفة المبيعات', nameEn: 'II. Cost of Sales', isHeader: true },
      { id: 'materials', nameAr: 'تكلفة المواد والأغذية المستهلكة', nameEn: 'Cost of Food & Beverage Used', current: foodBeverageCOGS.current, compare: foodBeverageCOGS.compare, isDeduction: true, indent: 1 },
      { id: 'packaging', nameAr: 'تكلفة مواد التعبئة والتغليف', nameEn: 'Cost of Packaging Used', current: packagingCOGS.current, compare: packagingCOGS.compare, isDeduction: true, indent: 1 },
      { id: 'wastage', nameAr: 'تكلفة الهالك والفاقد', nameEn: 'Cost of Food Wastage', current: wastageCOGS.current, compare: wastageCOGS.compare, isDeduction: true, indent: 1 },
      ...(otherCOGS.current !== 0 || otherCOGS.compare !== 0 || showZeroBalances ? [
        { id: 'other_cogs', nameAr: 'تكاليف مباشرة أخرى', nameEn: 'Other Direct Costs', current: otherCOGS.current, compare: otherCOGS.compare, isDeduction: true, indent: 1 }
      ] : []),
      { id: 't_cogs', nameAr: 'إجمالي تكلفة المبيعات', nameEn: 'Total Cost of Sales', current: totalCOGSCurrent, compare: totalCOGSCompare, isDeduction: true, isTotal: true },

      // GROSS PROFIT
      { id: 'gross_profit', nameAr: 'إجمالي الربح (مجمل الربح)', nameEn: 'Gross Profit', current: grossProfitCurrent, compare: grossProfitCompare, isTotal: true, isHighlight: true },

      // EXPENSES
      { id: 'h_exp', nameAr: 'ثالثاً: المصاريف التشغيلية', nameEn: 'III. Operating Expenses', isHeader: true },
      { id: 'salaries', nameAr: 'رواتب وأجور ومنافع الموظفين', nameEn: 'Salaries, Wages & Benefits', current: salariesWagesExpense.current, compare: salariesWagesExpense.compare, isDeduction: true, indent: 1 },
      { id: 'rent', nameAr: 'مصروف الإيجار ومرافق المقر', nameEn: 'Rent & Facility Expenses', current: rentExpense.current, compare: rentExpense.compare, isDeduction: true, indent: 1 },
      { id: 'utilities', nameAr: 'مصروفات المرافق (كهرباء، مياه، غاز)', nameEn: 'Utilities (Electricity, Water, Gas)', current: utilitiesExpense.current, compare: utilitiesExpense.compare, isDeduction: true, indent: 1 },
      { id: 'marketing', nameAr: 'مصاريف تسويق ودعاية', nameEn: 'Marketing & Advertising', current: marketingExpense.current, compare: marketingExpense.compare, isDeduction: true, indent: 1 },
      { id: 'depreciation', nameAr: 'مصروف إهلاك الأصول الثابتة', nameEn: 'Depreciation Expense', current: depreciationExpense.current, compare: depreciationExpense.compare, isDeduction: true, indent: 1 },
      ...(otherExpenses.current !== 0 || otherExpenses.compare !== 0 || showZeroBalances ? [
        { id: 'other_exp', nameAr: 'مصروفات تشغيلية أخرى', nameEn: 'Other Operating Expenses', current: otherExpenses.current, compare: otherExpenses.compare, isDeduction: true, indent: 1 }
      ] : []),
      { id: 't_exp', nameAr: 'إجمالي المصاريف التشغيلية', nameEn: 'Total Operating Expenses', current: totalExpensesCurrent, compare: totalExpensesCompare, isDeduction: true, isTotal: true },

      // NET OPERATING PROFIT
      { id: 'net_op_profit', nameAr: 'صافي الربح التشغيلي', nameEn: 'Net Operating Profit', current: netOperatingProfitCurrent, compare: netOperatingProfitCompare, isTotal: true, isHighlight: true },

      // OTHER INCOME
      { id: 'h_other', nameAr: 'رابعاً: الإيرادات والمصاريف الأخرى', nameEn: 'IV. Other Income & Expense', isHeader: true },
      { id: 'other_non_op', nameAr: 'إيراد جزاءات وغرامات الموظفين', nameEn: 'Employee Penalties Income', current: otherNonOperatingRevenue.current, compare: otherNonOperatingRevenue.compare, indent: 1 },

      // PRE-TAX PROFIT
      { id: 'pre_tax_profit', nameAr: 'صافي الربح قبل الزكاة والضريبة', nameEn: 'Net Profit Before Zakat & Tax', current: netProfitBeforeTaxCurrent, compare: netProfitBeforeTaxCompare, isTotal: true },

      // TAX PROVISION
      { id: 'tax_provision', nameAr: 'مخصص الزكاة وضريبة الدخل المقدرة', nameEn: 'Estimated Zakat & Tax Provision', current: taxProvisionCurrent, compare: taxProvisionCompare, isDeduction: true, indent: 1 },

      // FINAL NET PROFIT
      { id: 'final_net_profit', nameAr: 'صافي الربح النهائي', nameEn: 'Final Net Profit', current: finalNetProfitCurrent, compare: finalNetProfitCompare, isTotal: true, isHighlight: true, isFinalTotal: true }
    ];

    return {
      totalOperatingRevenueCurrent,
      totalOperatingRevenueCompare,
      grossProfitCurrent,
      grossProfitCompare,
      netOperatingProfitCurrent,
      netOperatingProfitCompare,
      finalNetProfitCurrent,
      finalNetProfitCompare,
      rows
    };
  }, [data.accounts, computedBalances, showZeroBalances, (data as any).companyProfile?.zakatRate]);

  // Tree views builder
  const treeData = useMemo(() => {
    const buildGroup = (key: string, nameAr: string, nameEn: string, accountTypes: AccountType[], codePrefixes: string[]): TreeNode => {
      const filteredAccs = data.accounts.filter(acc => 
        accountTypes.includes(acc.type)
      );

      const children = filteredAccs.map(acc => {
        let currentBal = computedBalances[acc.id]?.current || 0;
        let compareBal = computedBalances[acc.id]?.compare || 0;

        // Roll net profit into retained earnings code 3102001
        if (acc.code === '3102001') {
          currentBal += netProfitCurrent;
          compareBal += netProfitCompare;
        }

        return {
          id: acc.id,
          code: acc.code,
          nameAr: acc.nameAr,
          nameEn: acc.nameEn,
          balance: currentBal,
          compareBalance: compareBal,
          isAccount: true,
          type: acc.type,
          children: []
        };
      });

      // Group children recursively by subgroup code prefixes (first 4 digits)
      const subTree: TreeNode[] = [];
      const subGroupsMap: Record<string, TreeNode> = {};

      children.forEach(c => {
        const subPref = c.code.substring(0, 4);
        if (!subGroupsMap[subPref]) {
          let subNameAr = c.nameAr;
          let subNameEn = c.nameEn;
          if (subPref === '1101') { subNameAr = 'النقدي بالخزينة'; subNameEn = 'Cash Box'; }
          else if (subPref === '1102') { subNameAr = 'حسابات البنوك الجارية'; subNameEn = 'Bank Accounts'; }
          else if (subPref === '1103') { subNameAr = 'العملاء والمدينون'; subNameEn = 'Receivables'; }
          else if (subPref === '1104' || subPref === '1105') { subNameAr = 'مخزن المواد الغذانية'; subNameEn = 'Inventory Assets'; }
          else if (subPref === '2101') { subNameAr = 'الموردين والحسابات الدائنة'; subNameEn = 'Payables'; }
          else if (subPref === '6101') { subNameAr = 'أجور ومصاريف تشغيل'; subNameEn = 'Operating Expenses'; }
          
          subGroupsMap[subPref] = {
            id: `sub-${subPref}`,
            code: subPref,
            nameAr: subNameAr,
            nameEn: subNameEn,
            balance: 0,
            compareBalance: 0,
            isAccount: false,
            children: []
          };
          subTree.push(subGroupsMap[subPref]);
        }
        subGroupsMap[subPref].children.push(c);
      });

      // Roll up children balances to subGroups
      subTree.forEach(sg => {
        sg.balance = sg.children.reduce((sum, child) => sum + child.balance, 0);
        sg.compareBalance = sg.children.reduce((sum, child) => sum + (child.compareBalance || 0), 0);
      });

      // Sort subgroups by code
      subTree.sort((a, b) => a.code.localeCompare(b.code));

      return {
        id: key,
        code: key.toUpperCase(),
        nameAr,
        nameEn,
        balance: subTree.reduce((sum, child) => sum + child.balance, 0),
        compareBalance: subTree.reduce((sum, child) => sum + (child.compareBalance || 0), 0),
        isAccount: false,
        children: viewMode === 'detailed' ? subTree : []
      };
    };

    // Calculate core elements
    const assets = buildGroup('assets', 'الأصول', 'Assets Group', [AccountType.Asset], ['1']);
    const liabilities = buildGroup('liabilities', 'الخصوم', 'Liabilities Group', [AccountType.Liability], ['2']);
    const equity = buildGroup('equity', 'حقوق الملكية', 'Owner Equity Group', [AccountType.Equity], ['3']);

    // Trial balance needs all main groups
    const revenue = buildGroup('revenue', 'الإيرادات', 'Revenues', [AccountType.Revenue], ['4']);
    const cogs = buildGroup('cogs', 'تكلفة المبيعات', 'Cost of Goods Sold', [AccountType.CostOfSales], ['5']);
    const expense = buildGroup('expense', 'المصروفات', 'Operating Expenses', [AccountType.Expense], ['6']);

    return { assets, liabilities, equity, revenue, cogs, expense };
  }, [data.accounts, computedBalances, netProfitCurrent, netProfitCompare, viewMode]);

  // Balance Equation audit checking
  const balanceDifference = Math.abs(treeData.assets.balance - (treeData.liabilities.balance + treeData.equity.balance));
  const isBalanced = balanceDifference < 1; // variance within EGP 1 decimal check

  // Document matcher (general ledger -> source documents)
  const findSourceDocument = (entry: JournalEntry) => {
    const inv = data.salesInvoices?.find(i => i.journalEntryId === entry.id || entry.description.includes(i.invoiceNumber));
    if (inv) return { type: 'SALES_INVOICE', doc: inv, label: inv.invoiceNumber };

    const vouch = data.vouchers?.find(v => v.journalEntryId === entry.id || (v.referenceNumber && entry.description.includes(v.referenceNumber)));
    if (vouch) return { type: 'VOUCHER', doc: vouch, label: vouch.voucherNumber };

    const sr = data.salesReturns?.find(r => r.journalEntryId === entry.id || entry.description.includes(r.returnNumber));
    if (sr) return { type: 'SALES_RETURN', doc: sr, label: sr.returnNumber };

    const pr = data.purchaseReturns?.find(r => r.journalEntryId === entry.id || entry.description.includes(r.returnNumber));
    if (pr) return { type: 'PURCHASE_RETURN', doc: pr, label: pr.returnNumber };

    const pay = data.payrollRuns?.find(r => r.journalEntryId === entry.id || entry.description.includes(r.runNumber));
    if (pay) return { type: 'PAYROLL', doc: pay, label: pay.runNumber };

    const pur = data.purchases?.find(p => entry.description.includes(p.number));
    if (pur) return { type: 'PURCHASE', doc: pur, label: pur.number };

    return null;
  };

  // Compile full General Ledger entries list for drill-down modal
  const accountLedgerActivity = useMemo(() => {
    const targetAccount = clickedAccount || selectedLedgerAccount;
    if (!targetAccount) return { openingBalance: 0, lines: [] };

    const balancesBeforeStart = (data.journalEntries || [])
      .filter(e => e.approved && e.date < startDate)
      .flatMap(e => e.lines)
      .filter(l => l.accountId === targetAccount.id);

    const isDebitNature = targetAccount.type === AccountType.Asset || targetAccount.type === AccountType.Expense || targetAccount.type === AccountType.CostOfSales;
    
    // Accumulate opening balance
    const openingBalance = balancesBeforeStart.reduce((sum, line) => {
      const change = isDebitNature ? (line.debit - line.credit) : (line.credit - line.debit);
      return sum + change;
    }, 0);

    // Activity lines
    const activeEntries = (data.journalEntries || [])
      .filter(e => e.approved && e.date >= startDate && e.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));

    const lines: any[] = [];
    let running = openingBalance;

    activeEntries.forEach(entry => {
      const matchLines = entry.lines.filter(l => l.accountId === targetAccount.id);
      matchLines.forEach(line => {
        const change = isDebitNature ? (line.debit - line.credit) : (line.credit - line.debit);
        running += change;
        lines.push({
          date: entry.date,
          entryNumber: entry.entryNumber,
          description: entry.description || (isAr ? 'حركة قيد دوري' : 'Journal entry allocation'),
          debit: line.debit,
          credit: line.credit,
          balanceAfter: running,
          rawEntry: entry
        });
      });
    });

    return { openingBalance, lines };
  }, [clickedAccount, selectedLedgerAccount, data.journalEntries, startDate, endDate]);

  // SVG Area Chart Data Builder (Monthly Trend over selected period)
  const chartData = useMemo(() => {
    const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const sDate = startDate ? new Date(startDate) : new Date();
    const eDate = endDate ? new Date(endDate) : new Date();
    const months: { nameAr: string; nameEn: string }[] = [];

    const startMonth = sDate.getFullYear() * 12 + sDate.getMonth();
    const endMonth = eDate.getFullYear() * 12 + eDate.getMonth();

    for (let m = startMonth; m <= endMonth; m++) {
      const y = Math.floor(m / 12);
      const monthIdx = m % 12;
      months.push({ nameAr: monthNamesAr[monthIdx], nameEn: monthNamesEn[monthIdx] });
    }

    const approvedEntries = (data.journalEntries || []).filter(e => e.approved);

    return months.map((m, i) => {
      const refMonth = startMonth + i;
      const y = Math.floor(refMonth / 12);
      const monthIdx = refMonth % 12;
      const endOfMonth = new Date(y, monthIdx + 1, 0).toISOString().split('T')[0];
      let assetsSum = 0;

      approvedEntries.forEach(entry => {
        if (entry.date <= endOfMonth) {
          entry.lines.forEach(line => {
            const acc = data.accounts.find(a => a.id === line.accountId);
            if (acc && acc.type === AccountType.Asset) {
              assetsSum += (line.debit - line.credit);
            }
          });
        }
      });

      return {
        label: isAr ? m.nameAr : m.nameEn,
        value: assetsSum
      };
    });
  }, [data.journalEntries, data.accounts, isAr, startDate, endDate]);

  const chartSVGPath = useMemo(() => {
    const values = chartData.map(d => d.value);
    const maxVal = Math.max(...values, 100000);
    const minVal = Math.min(...values, 0);
    const range = maxVal - minVal || 1;

    // Width: 320, Height: 140
    const points = chartData.map((d, i) => {
      const x = (i / (chartData.length - 1)) * 260 + 40;
      const y = 120 - ((d.value - minVal) / range) * 90;
      return { x, y };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} 130 L ${points[0].x} 130 Z`;

    return { linePath, areaPath, points };
  }, [chartData]);

  // ── New Excel Export ──
  const handleExportExcel = async () => {
    if (activeReport === 'trial_balance') {
      const accounts = data.accounts.map(acc => {
        const balanceObj = computedBalances[acc.id] || { current: 0, compare: 0 };
        let currentBal = balanceObj.current;
        const isDebitAcc = acc.type === AccountType.Asset || acc.type === AccountType.Expense || acc.type === AccountType.CostOfSales;
        const debit = isDebitAcc ? (currentBal >= 0 ? currentBal : 0) : (currentBal < 0 ? -currentBal : 0);
        const credit = isDebitAcc ? (currentBal < 0 ? -currentBal : 0) : (currentBal >= 0 ? currentBal : 0);
        return {
          code: acc.code,
          name: isAr ? acc.nameAr : acc.nameEn,
          type: acc.type,
          debit,
          credit,
        };
      });
      await exportTrialBalanceExcel(accounts, trialBalanceTotals.debit, trialBalanceTotals.credit, startDate, endDate, lang);
    } else if (activeReport === 'income_statement') {
      const mappedRows = detailedIncomeStatement.rows.map(row => ({
        id: row.id,
        name: isAr ? row.nameAr : row.nameEn,
        current: row.current ?? 0,
        compare: row.compare ?? 0,
        isHeader: row.isHeader,
        isTotal: row.isTotal,
        isHighlight: row.isHighlight,
        isDeduction: row.isDeduction,
        isFinalTotal: row.isFinalTotal,
        indent: row.indent,
      }));
      await exportIncomeStatementExcel(mappedRows, detailedIncomeStatement.totalOperatingRevenueCurrent, startDate, endDate, lang, compareMode);
    } else if (activeReport === 'balance_sheet') {
      const treeGroups = [
        { label: isAr ? 'الأصول' : 'Assets', children: flattenTree(treeData.assets) },
        { label: isAr ? 'الخصوم' : 'Liabilities', children: flattenTree(treeData.liabilities) },
        { label: isAr ? 'حقوق الملكية' : 'Equity', children: flattenTree(treeData.equity) },
      ];
      await exportBalanceSheetExcel(treeGroups, startDate, endDate, lang, compareMode);
    }
  };

  // Flatten tree nodes into list for export
  const flattenTree = (node: TreeNode): { code: string; name: string; balance: number; compareBalance?: number }[] => {
    const results: { code: string; name: string; balance: number; compareBalance?: number }[] = [];
    const walk = (n: TreeNode) => {
      if (n.isAccount && (showZeroBalances || n.balance !== 0)) {
        results.push({
          code: n.code,
          name: isAr ? n.nameAr : n.nameEn,
          balance: n.balance,
          compareBalance: n.compareBalance,
        });
      }
      n.children.forEach(walk);
    };
    walk(node);
    return results;
  };

  // ── New PDF Export ──
  const handleExportPDF = () => {
    if (activeReport === 'trial_balance') {
      const accounts = data.accounts.map(acc => {
        const balanceObj = computedBalances[acc.id] || { current: 0, compare: 0 };
        let currentBal = balanceObj.current;
        const isDebitAcc = acc.type === AccountType.Asset || acc.type === AccountType.Expense || acc.type === AccountType.CostOfSales;
        const debit = isDebitAcc ? (currentBal >= 0 ? currentBal : 0) : (currentBal < 0 ? -currentBal : 0);
        const credit = isDebitAcc ? (currentBal < 0 ? -currentBal : 0) : (currentBal >= 0 ? currentBal : 0);
        return { code: acc.code, name: isAr ? acc.nameAr : acc.nameEn, type: acc.type, debit, credit };
      });
      const html = buildTrialBalancePDF(accounts, trialBalanceTotals.debit, trialBalanceTotals.credit, startDate, endDate, isAr);
      printPDF(html, isAr ? 'ميزان المراجعة' : 'Trial Balance');
    } else if (activeReport === 'income_statement') {
      const mappedRows = detailedIncomeStatement.rows.map(row => ({
        id: row.id,
        name: isAr ? row.nameAr : row.nameEn,
        current: row.current ?? 0,
        compare: row.compare ?? 0,
        isHeader: row.isHeader,
        isTotal: row.isTotal,
        isHighlight: row.isHighlight,
        isDeduction: row.isDeduction,
        isFinalTotal: row.isFinalTotal,
        indent: row.indent,
      }));
      const html = buildIncomeStatementPDF(mappedRows, detailedIncomeStatement.totalOperatingRevenueCurrent, startDate, endDate, isAr, compareMode);
      printPDF(html, isAr ? 'قائمة الأرباح والخسائر' : 'Income Statement');
    } else if (activeReport === 'balance_sheet') {
      const treeGroups = [
        { label: isAr ? 'الأصول' : 'Assets', children: flattenTree(treeData.assets) },
        { label: isAr ? 'الخصوم' : 'Liabilities', children: flattenTree(treeData.liabilities) },
        { label: isAr ? 'حقوق الملكية' : 'Equity', children: flattenTree(treeData.equity) },
      ];
      const html = buildBalanceSheetPDF(treeGroups, endDate, isAr, compareMode);
      printPDF(html, isAr ? 'الميزانية العمومية' : 'Balance Sheet');
    }
  };

  // Exports and report prints
  const handleExportSpreadsheet = () => {
    const flatRows: any[] = [];
    const collectRows = (node: TreeNode) => {
      if (!showZeroBalances && node.balance === 0) return;
      flatRows.push({
        [isAr ? 'كود الحساب' : 'Code']: node.code,
        [isAr ? 'البيان والتفاصيل' : 'Account Name']: isAr ? node.nameAr : node.nameEn,
        [isAr ? 'الرصيد الحالي' : 'Current Balance']: node.balance,
        [isAr ? 'رصيد المقارنة' : 'Compare Balance']: node.compareBalance || 0
      });
      if (node.children) node.children.forEach(collectRows);
    };

    if (activeReport === 'balance_sheet') {
      collectRows(treeData.assets);
      collectRows(treeData.liabilities);
      collectRows(treeData.equity);
    } else if (activeReport === 'income_statement') {
      detailedIncomeStatement.rows.forEach(row => {
        if (row.isHeader) {
          flatRows.push({
            [isAr ? 'البيان والتفاصيل' : 'Statement Item']: isAr ? row.nameAr : row.nameEn,
            [isAr ? 'المبلغ' : 'Amount']: '',
            [isAr ? 'النسبة من الإيرادات' : '% of Revenue']: '',
            [isAr ? 'الرصيد المقارن' : 'Compare Amount']: '',
            [isAr ? 'نسبة التغير' : 'Change %']: ''
          });
        } else {
          const amount = row.current ?? 0;
          const compareVal = row.compare ?? 0;
          
          const revPct = detailedIncomeStatement.totalOperatingRevenueCurrent > 0 
            ? (amount / detailedIncomeStatement.totalOperatingRevenueCurrent) * 100 
            : 0;

          let changePct = 0;
          if (compareVal !== 0) {
            changePct = ((amount - compareVal) / compareVal) * 100;
          } else if (amount !== 0) {
            changePct = amount > 0 ? 100 : -100;
          }

          flatRows.push({
            [isAr ? 'البيان والتفاصيل' : 'Statement Item']: isAr ? row.nameAr : row.nameEn,
            [isAr ? 'المبلغ' : 'Amount']: row.isDeduction ? -amount : amount,
            [isAr ? 'النسبة من الإيرادات' : '% of Revenue']: `${revPct.toFixed(2)}%`,
            [isAr ? 'الرصيد المقارن' : 'Compare Amount']: row.isDeduction ? -compareVal : compareVal,
            [isAr ? 'نسبة التغير' : 'Change %']: compareMode !== 'NONE' ? `${changePct.toFixed(2)}%` : ''
          });
        }
      });
    } else if (activeReport === 'trial_balance') {
      data.accounts.forEach(acc => {
        flatRows.push({
          'كود الحساب': acc.code,
          'الحساب المحاسبي': isAr ? acc.nameAr : acc.nameEn,
          'النوع': acc.type,
          'الرصيد الحالي': computedBalances[acc.id]?.current || 0
        });
      });
    }

    exportToCSV(flatRows, `${activeReport}_Report`);
  };

  const handlePrintHTML = () => {
    let reportTitle = isAr ? 'الميزانية العمومية والمركز المالي' : 'Balance Sheet & Financial Position';
    if (activeReport === 'income_statement') reportTitle = isAr ? 'قائمة الأرباح والخسائر' : 'Profit & Loss Statement';
    if (activeReport === 'trial_balance') reportTitle = isAr ? 'ميزان المراجعة التفصيلي' : 'Trial Balance Report';

    const buildHTMLRows = (node: TreeNode): string => {
      if (!showZeroBalances && node.balance === 0) return '';
      const isSub = node.children && node.children.length > 0;
      return `
        <tr style="font-weight: ${isSub ? 'bold' : 'normal'}; background: ${isSub ? '#f8fafc' : 'transparent'};">
          <td style="padding:8px; border-bottom:1px solid #e2e8f0; font-family:monospace;">${node.code}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0; padding-right: ${isSub ? '15px' : '30px'};">${isAr ? node.nameAr : node.nameEn}</td>
          <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:left; font-family:monospace;">${fmtCurrency(node.balance, lang)}</td>
        </tr>
        ${node.children ? node.children.map(buildHTMLRows).join('') : ''}
      `;
    };

    let tableContent = '';
    let tableHeader = `
      <tr style="background: #1e40af; color: white;">
        <th style="padding: 10px; text-align: right;">${isAr ? 'الكود' : 'Code'}</th>
        <th style="padding: 10px; text-align: right;">${isAr ? 'اسم الحساب المحاسبي' : 'Account Name'}</th>
        <th style="padding: 10px; text-align: left;">${isAr ? 'الرصيد الإجمالي' : 'Total Balance'}</th>
      </tr>
    `;

    if (activeReport === 'balance_sheet') {
      tableContent = buildHTMLRows(treeData.assets) + buildHTMLRows(treeData.liabilities) + buildHTMLRows(treeData.equity);
    } else if (activeReport === 'income_statement') {
      const showCompare = compareMode !== 'NONE';
      tableHeader = `
        <tr style="background: #1e40af; color: white;">
          <th style="padding: 10px; text-align: right;">${isAr ? 'البيان والتفاصيل' : 'Statement Item'}</th>
          <th style="padding: 10px; text-align: left;">${isAr ? 'المبلغ' : 'Amount'}</th>
          <th style="padding: 10px; text-align: left;">${isAr ? '% من الإيرادات' : '% of Revenue'}</th>
          ${showCompare ? `<th style="padding: 10px; text-align: left;">${isAr ? '% التغير' : '% Change'}</th>` : ''}
        </tr>
      `;

      tableContent = detailedIncomeStatement.rows.map(row => {
        let style = 'border-bottom: 1px solid #e2e8f0; padding: 8px;';
        let rowStyle = 'background: transparent;';
        
        if (row.isHeader) {
          style += 'font-weight: bold; font-size: 12px; color: #1e3a8a; background-color: #f8fafc;';
          rowStyle = 'background-color: #f8fafc; font-weight: bold;';
        } else if (row.isTotal) {
          style += 'font-weight: bold; border-top: 1px solid #94a3b8; border-bottom: 2px double #94a3b8; background-color: #f1f5f9;';
          rowStyle = 'background-color: #f1f5f9; font-weight: bold;';
        }

        if (row.isHighlight) {
          style += 'font-weight: bold; background-color: #eff6ff; color: #1e40af; border-top: 1px solid #bfdbfe; border-bottom: 2px solid #bfdbfe;';
          rowStyle = 'background-color: #eff6ff; font-weight: bold;';
        }

        if (row.isFinalTotal) {
          style += 'font-weight: bold; font-size: 12px; background-color: #ecfdf5; color: #065f46; border-top: 2px solid #059669; border-bottom: 4px double #059669;';
          rowStyle = 'background-color: #ecfdf5; font-weight: bold;';
        }

        if (row.isHeader) {
          return `
            <tr style="${rowStyle}">
              <td colspan="${showCompare ? '4' : '3'}" style="${style} text-align: right;">${isAr ? row.nameAr : row.nameEn}</td>
            </tr>
          `;
        }

        const amount = row.current ?? 0;
        const absValStr = formatCurrency(Math.abs(amount));
        const displayVal = row.isDeduction ? `(${absValStr})` : (amount < 0 ? `(${absValStr})` : absValStr);

        const revPct = detailedIncomeStatement.totalOperatingRevenueCurrent > 0 
          ? (amount / detailedIncomeStatement.totalOperatingRevenueCurrent) * 100 
          : 0;
        const absPctStr = `${Math.abs(revPct).toFixed(2)}%`;
        const displayPct = row.isDeduction ? `(${absPctStr})` : (revPct < 0 ? `(${absPctStr})` : absPctStr);

        let displayChange = '';
        if (showCompare) {
          const compVal = row.compare ?? 0;
          if (compVal === 0) {
            displayChange = amount === 0 ? '0.00%' : (amount > 0 ? '▲ 100.00%' : '▼ (100.00%)');
          } else {
            const changePct = ((amount - compVal) / compVal) * 100;
            const absChangePctStr = `${Math.abs(changePct).toFixed(2)}%`;
            displayChange = changePct > 0 ? `▲ ${absChangePctStr}` : `▼ (${absChangePctStr})`;
          }
        }

        const indentPadding = row.indent ? `padding-right: ${row.indent * 16}px;` : 'padding-right: 8px;';

        return `
          <tr style="${rowStyle}">
            <td style="${style} text-align: right; ${indentPadding}">${isAr ? row.nameAr : row.nameEn}</td>
            <td style="${style} text-align: left; font-family: monospace;">${displayVal}</td>
            <td style="${style} text-align: left; font-family: monospace;">${displayPct}</td>
            ${showCompare ? `<td style="${style} text-align: left; font-family: monospace;">${displayChange}</td>` : ''}
          </tr>
        `;
      }).join('');
    }

    const html = `
      <div class="print-page" style="padding: 20px;">
        ${companyHeaderHTML()}
        <div class="doc-title" style="margin-bottom: 25px;">
          <h2>${reportTitle}</h2>
          <div style="font-size: 11px; color:#475569;">
            ${isAr ? `الفترة: من ${startDate} إلى ${endDate}` : `Period: From ${startDate} to ${endDate}`}
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            ${tableHeader}
          </thead>
          <tbody>
            ${tableContent}
          </tbody>
        </table>
        ${signaturesHTML([
          isAr ? 'رئيس الحسابات' : 'Head of Accounting',
          isAr ? 'المدير المالي' : 'Finance Manager',
          isAr ? 'اعتماد المدير العام' : 'CFO / General Manager'
        ])}
        ${footerHTML()}
      </div>
    `;

    printDocument(html, reportTitle);
  };

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) return;
    setSavedTemplates({
      ...savedTemplates,
      [newTemplateName]: {
        nameAr: newTemplateName,
        nameEn: newTemplateName,
        startDate,
        endDate,
        branch: branchFilter,
        costCenter: costCenterFilter
      }
    });
    setNewTemplateName('');
    setShowSaveTemplateModal(false);
    window.showAlert('تم حفظ القالب بنجاح', 'Report template saved successfully', 'success');
  };

  const loadTemplate = (key: string) => {
    const t = savedTemplates[key];
    if (!t) return;
    setStartDate(t.startDate);
    setEndDate(t.endDate);
    setBranchFilter(t.branch);
    setCostCenterFilter(t.costCenter);
  };

  // Render recursively styled tree view node helper
  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isZero = node.balance === 0;

    if (!showZeroBalances && isZero) return null;

    const toggle = () => {
      setExpandedNodes({
        ...expandedNodes,
        [node.id]: !isExpanded
      });
    };

    // Calculate dynamic variances for comparisons
    const varianceVal = node.compareBalance !== undefined ? (node.balance - node.compareBalance) : 0;
    const variancePct = node.compareBalance 
      ? (varianceVal / Math.abs(node.compareBalance)) * 100 
      : (node.balance !== 0 ? (node.balance > 0 ? 100 : -100) : 0);

    const isLeafSelected = clickedAccount?.id === node.id;

    return (
      <div key={node.id} className="w-full">
        <div 
          style={{ paddingRight: isAr ? `${depth * 1.25 + 0.75}rem` : '0.75rem', paddingLeft: !isAr ? `${depth * 1.25 + 0.75}rem` : '0.75rem' }}
          className={`flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all ${
            !node.isAccount ? 'bg-slate-50/50 dark:bg-slate-900/30 font-black text-slate-900 dark:text-white' : 'font-semibold text-slate-700 dark:text-slate-350'
          } ${isLeafSelected ? 'bg-blue-50/70 dark:bg-blue-900/20' : ''}`}
        >
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <button onClick={toggle} className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className={`h-3.5 w-3.5 ${isAr ? 'rotate-180' : 'rotate-0'}`} />}
              </button>
            ) : (
              <div className="w-5" />
            )}
            
            <button 
              onClick={() => {
                if (node.isAccount) {
                  const acc = data.accounts.find(a => a.id === node.id);
                  if (acc) setClickedAccount(acc);
                }
              }}
              disabled={!node.isAccount}
              className={`text-start font-bold ${
                node.isAccount 
                  ? 'text-blue-700 dark:text-sky-400 hover:underline cursor-pointer' 
                  : 'text-slate-900 dark:text-white pointer-events-none'
              }`}
            >
              {isAr ? node.nameAr : node.nameEn}
            </button>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <div className={`w-28 text-right shrink-0 ${!node.isAccount ? 'text-slate-900 dark:text-white font-black' : 'text-slate-700 dark:text-slate-200'}`}>
              {formatCurrency(node.balance)}
            </div>

            {compareMode !== 'NONE' && (
              <div className="w-28 text-right text-slate-400 shrink-0">
                {formatCurrency(node.compareBalance || 0)}
              </div>
            )}
            
            {compareMode !== 'NONE' && (
              <div className="w-28 text-right font-bold shrink-0 text-slate-800 dark:text-slate-200">
                {varianceVal >= 0 ? '+' : ''}{formatCurrency(varianceVal)}
              </div>
            )}

            {compareMode !== 'NONE' && (
              <div className="w-16 text-right font-bold shrink-0 text-slate-800 dark:text-slate-200">
                {variancePct.toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="w-full">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="financial_reports_view" className="space-y-5 overflow-y-auto max-h-[calc(100vh-4rem)] p-1 text-slate-800 dark:text-slate-200" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* 1. COMPREHENSIVE TITLE & SUBTITLE BLOCK */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-850 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <FileBarChart className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'الميزانية العمومية والتقارير المالية المتقدمة' : 'Advanced Balance Sheet & Financial Statements'}</span>
              <span className="text-[9px] font-bold text-slate-400 border border-slate-200 dark:border-slate-800 px-1 rounded-md">Drill-Down</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold mt-0.5 leading-relaxed max-w-xl">
              {isAr 
                ? 'تقرير محاسبي حديث يعمل مباشرة من القيود اليومية بعد الترحيل، مع شجرة حسابات قابلة للتوسعة، فلترة ذكية، وتحليل دقيق للحسابات وحركات الدفاتر.' 
                : 'Modern accounting reports built directly from posted journal entries with dynamic account trees, smart filtering, and drill-down audits.'}
            </p>
          </div>
        </div>

        {/* Toolbar Buttons Row 1 */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <button 
            onClick={triggerRefresh}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-455 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث' : 'Refresh'}</span>
          </button>
          
          <ExportButton 
            lang={lang}
            actions={[
              {
                labelAr: 'تصدير Excel',
                labelEn: 'Export Excel',
                icon: exportIcons.excel,
                description: isAr ? 'ملف Excel احترافي بتنسيقات متقدمة' : 'Professional Excel with advanced formatting',
                action: handleExportExcel,
              },
              {
                labelAr: 'تصدير PDF',
                labelEn: 'Export PDF',
                icon: exportIcons.pdf,
                description: isAr ? 'ملف PDF جاهز للطباعة' : 'Print-ready PDF document',
                action: handleExportPDF,
              },
              {
                labelAr: 'طباعة',
                labelEn: 'Print',
                icon: exportIcons.printer,
                description: isAr ? 'طباعة مباشرة على الطابعة' : 'Print directly to printer',
                action: handlePrintHTML,
              },
            ]}
          />
        </div>
      </div>

      {/* Toolbar Row 2 */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-[#f8fafc] dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="bg-blue-600/10 text-blue-700 dark:text-sky-400 px-2 py-0.5 rounded-md text-[10px]">{isAr ? 'ملف التقرير' : 'Report Book'}</span>
          <span className="text-slate-550 dark:text-slate-400 flex items-center gap-1 font-mono text-[11px]">
            {isAr ? 'الفترة:' : 'Period:'} {startDate} ➡️ {endDate}
          </span>
          <span className="text-slate-400 font-mono text-[10px] hidden md:inline-block">
            {isAr ? 'آخر تحديث: ٥ يوليو ٢٠٢٦' : 'Last sync: 5 July 2026'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => {
              setShowZeroBalances(!showZeroBalances);
              triggerRefresh();
            }}
            className={`px-3 py-1 text-xs font-bold rounded-lg border cursor-pointer flex items-center gap-1.5 transition-all ${
              showZeroBalances 
                ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-350' 
                : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            <span>{showZeroBalances ? (isAr ? 'إخفاء الصفرية' : 'Hide Zeros') : (isAr ? 'إظهار الرصيد الصفري' : 'Show Zeros')}</span>
          </button>

          <button 
            onClick={() => {
              const allExpanded = true;
              setExpandedNodes({
                assets: allExpanded, liabilities: allExpanded, equity: allExpanded,
                revenue: allExpanded, cogs: allExpanded, expense: allExpanded,
                'sub-1101': allExpanded, 'sub-1102': allExpanded, 'sub-1103': allExpanded,
                'sub-1104': allExpanded, 'sub-1105': allExpanded, 'sub-2101': allExpanded,
                'sub-2102': allExpanded, 'sub-2103': allExpanded, 'sub-6101': allExpanded
              });
            }}
            className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {isAr ? 'فتح الكل' : 'Expand All'}
          </button>

          <button 
            onClick={() => {
              const allExpanded = false;
              setExpandedNodes({
                assets: allExpanded, liabilities: allExpanded, equity: allExpanded,
                revenue: allExpanded, cogs: allExpanded, expense: allExpanded,
                'sub-1101': allExpanded, 'sub-1102': allExpanded, 'sub-1103': allExpanded,
                'sub-1104': allExpanded, 'sub-1105': allExpanded, 'sub-2101': allExpanded,
                'sub-2102': allExpanded, 'sub-2103': allExpanded, 'sub-6101': allExpanded
              });
            }}
            className="px-3 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            {isAr ? 'طي الكل' : 'Collapse All'}
          </button>

          <button 
            onClick={() => setShowSaveTemplateModal(true)}
            className="px-3.5 py-1.5 text-xs font-black rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center gap-1 cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{isAr ? 'حفظ كقالب' : 'Save Template'}</span>
          </button>
        </div>
      </div>

      {/* 2. FILTERS CARD PANEL (Matching Image 1 Row) */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          
          {/* Period Selector */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">{isAr ? 'الفترة' : 'Period Preset'}</label>
            <select 
              value={periodPreset} 
              onChange={e => handlePeriodChange(e.target.value)} 
              className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white"
            >
              <option value="today">{isAr ? 'اليوم' : 'Today'}</option>
              <option value="this_week">{isAr ? 'هذا الأسبوع' : 'This Week'}</option>
              <option value="this_month">{isAr ? 'هذا الشهر' : 'This Month'}</option>
              <option value="this_year">{isAr ? 'هذا العام' : 'This Year'}</option>
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 block mb-1">{isAr ? 'من' : 'From Date'}</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white" 
            />
          </div>

          {/* Date to */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 block mb-1">{isAr ? 'إلى' : 'To Date'}</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white" 
            />
          </div>

          {/* Comparison selector */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 block mb-1">{isAr ? 'المقارنة' : 'Comparison'}</label>
            <select 
              value={compareMode} 
              onChange={e => setCompareMode(e.target.value as any)} 
              className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white"
            >
              <option value="NONE">{isAr ? 'بدون مقارنة' : 'No Comparison'}</option>
              <option value="PREV_PERIOD">{isAr ? 'الشهر السابق' : 'Previous Period'}</option>
              <option value="PREV_YEAR">{isAr ? 'السنة السابقة' : 'Previous Year'}</option>
            </select>
          </div>

          {/* View Mode */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-400 block mb-1">{isAr ? 'العرض' : 'View Mode'}</label>
            <select 
              value={viewMode} 
              onChange={e => setViewMode(e.target.value as any)} 
              className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white"
            >
              <option value="detailed">{isAr ? 'تفصيلي' : 'Detailed Tree'}</option>
              <option value="summary">{isAr ? 'مختصر' : 'Summary Book'}</option>
            </select>
          </div>

        </div>
      </div>

      {/* 3. KPI METRIC CARDS GRID (Consolidated layout from Image 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI Assets */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl p-4 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'إجمالي الأصول' : 'Total Assets'}</span>
            <span className="text-base font-black text-slate-950 dark:text-white font-mono mt-1 block">{formatCurrency(treeData.assets.balance)}</span>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
        </div>

        {/* KPI Liabilities */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl p-4 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'إجمالي الخصوم' : 'Total Liabilities'}</span>
            <span className="text-base font-black text-slate-950 dark:text-white font-mono mt-1 block">{formatCurrency(treeData.liabilities.balance)}</span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl">
            <Calculator className="h-5 w-5 text-amber-600" />
          </div>
        </div>

        {/* KPI Equity */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl p-4 shadow-xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'إجمالي حقوق الملكية' : 'Total Equity'}</span>
            <span className="text-base font-black text-slate-950 dark:text-white font-mono mt-1 block">{formatCurrency(treeData.equity.balance)}</span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
        </div>

        {/* KPI Balance Check Equation */}
        <div className={`bg-white dark:bg-slate-950 border rounded-2xl p-4 shadow-xs flex justify-between items-center ${
          isBalanced ? 'border-emerald-200/60 dark:border-emerald-900/30' : 'border-rose-200/60 dark:border-rose-900/30'
        }`}>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 block">{isAr ? 'مراجعة المعادلة' : 'Equation Variance'}</span>
            <span className="text-base font-black font-mono mt-1 block text-slate-950 dark:text-white">
              {formatCurrency(balanceDifference)}
            </span>
          </div>
          <div className={`p-3 rounded-xl ${isBalanced ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
            {isBalanced ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-650 animate-bounce" />}
          </div>
        </div>

      </div>

      {/* Conditional Alert Banner */}
      {!isBalanced && (
        <div className="bg-rose-50 border border-rose-250 dark:bg-rose-950/20 dark:border-rose-900/50 p-4 rounded-xl flex items-center gap-3 text-rose-700 dark:text-rose-400 shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0 animate-bounce" />
          <span className="text-[11px] font-bold">
            {isAr 
              ? 'يوجد فرق بين الأصول والخصوم + حقوق الملكية، يرجى مراجعة القيود غير المرحلة أو الحسابات ذات التصنيف غير الصحيح.' 
              : 'Imbalance in balance sheet: Assets != Liabilities + Equity. Check unposted journal entries or group classifications.'}
          </span>
          <button 
            onClick={() => setShowDiagnosticsModal(true)}
            className="ml-auto bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer"
          >
            {isAr ? 'بدء التحليل' : 'Start Audit'}
          </button>
        </div>
      )}

      {/* 4. MAIN SPLIT LAYOUT (Tree on Right, Ledger + Chart on Left - Matching Image 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* LEFT COLUMN: Ledger Activity & Area Chart */}
        <div className="lg:col-span-1 space-y-5">
          
          {/* Card A: Balance Trend over time */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-905 dark:text-white">{isAr ? 'اتجاه الرصيد عبر الزمن' : 'Balance Trend History'}</h3>
                <span className="text-[9px] text-slate-400 block mt-0.5">{isAr ? 'تطور الأصول والخصوم وحقوق الملكية خلال الأشهر الأخيرة' : 'Overall corporate asset trend line'}</span>
              </div>
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </div>

            {/* Area Chart Container */}
            <div className="w-full h-40 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/20 rounded-xl p-2">
              <svg className="w-full h-full" viewBox="0 0 320 140">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="40" y1="30" x2="300" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
                <line x1="40" y1="60" x2="300" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
                <line x1="40" y1="90" x2="300" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3" />
                <line x1="40" y1="120" x2="300" y2="120" stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Fill Area */}
                <path d={chartSVGPath.areaPath} fill="url(#chartGradient)" />

                {/* Line Path */}
                <path d={chartSVGPath.linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

                {/* Data Points */}
                {chartSVGPath.points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                ))}

                {/* Axis Labels */}
                {chartData.map((d, i) => (
                  <text key={i} x={(i / (chartData.length - 1)) * 260 + 40} y="134" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8" fontFamily="Cairo">
                    {d.label}
                  </text>
                ))}

                {/* Left Values Axis */}
                <text x="32" y="32" textAnchor="end" fontSize="7" fontWeight="bold" fill="#94a3b8" fontFamily="monospace">12M</text>
                <text x="32" y="62" textAnchor="end" fontSize="7" fontWeight="bold" fill="#94a3b8" fontFamily="monospace">9M</text>
                <text x="32" y="92" textAnchor="end" fontSize="7" fontWeight="bold" fill="#94a3b8" fontFamily="monospace">6M</text>
                <text x="32" y="122" textAnchor="end" fontSize="7" fontWeight="bold" fill="#94a3b8" fontFamily="monospace">3M</text>
              </svg>
            </div>
          </div>

          {/* Card B: Click-to-drill ledger list (Selected Account) */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900 mb-4">
              <div>
                <h3 className="text-xs font-black text-slate-905 dark:text-white">{isAr ? 'كشف الحساب المختار' : 'Quick Ledger Account'}</h3>
                <span className="text-[9px] text-slate-400 block mt-0.5">{isAr ? 'اختر حساباً من الشجرة لعرض القيود' : 'Select an account in the tree grid to display postings'}</span>
              </div>
              <BookOpen className="h-4 w-4 text-slate-400" />
            </div>

            {clickedAccount ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 text-[11px] font-bold text-blue-750">
                  <span>{clickedAccount.code} — {isAr ? clickedAccount.nameAr : clickedAccount.nameEn}</span>
                  <button 
                    onClick={() => {
                      setSelectedLedgerAccount(clickedAccount);
                      setClickedAccount(null);
                    }}
                    className="hover:underline text-[9px] font-extrabold uppercase bg-white dark:bg-slate-850 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 cursor-pointer"
                  >
                    {isAr ? 'نافذة كاملة' : 'Full Screen'}
                  </button>
                </div>
                
                <div className="overflow-x-auto text-[10px] max-h-48">
                  <table className="w-full text-start border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-[9px] font-bold">
                        <th className="py-1.5 text-start">{isAr ? 'القيد' : 'Entry'}</th>
                        <th className="py-1.5 text-start">{isAr ? 'البيان' : 'Narrative'}</th>
                        <th className="py-1.5 text-end">{isAr ? 'الرصيد' : 'Balance'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountLedgerActivity.lines.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-400 font-bold">{isAr ? 'لا توجد قيود لعرضها' : 'No entries found'}</td>
                        </tr>
                      ) : (
                        accountLedgerActivity.lines.map((line, idx) => (
                          <tr key={line.entryNumber} className="border-b border-slate-50 dark:border-slate-900/30">
                            <td className="py-1.5">
                              <button onClick={() => setSelectedJournalEntry(line.rawEntry)} className="text-blue-600 hover:underline font-bold">
                                {line.entryNumber}
                              </button>
                            </td>
                            <td className="py-1.5 truncate max-w-[100px]" title={line.description}>{line.description}</td>
                            <td className="py-1.5 text-end font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(line.balanceAfter)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 font-bold text-[11px] bg-slate-50/50 dark:bg-slate-900/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                {isAr ? 'لا توجد قيود لعرضها (اضغط على حساب في الشجرة)' : 'No entries to display (click account name in the tree)'}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: The Odoo Collapsible Balance Sheet Tree-Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-900 mb-4 text-xs font-bold">
            <div>
              <h3 className="text-xs font-black text-slate-905 dark:text-white">{isAr ? 'شجرة الميزانية العمومية' : 'Balance Sheet Tree Grid'}</h3>
              <span className="text-[9px] text-slate-400 block mt-0.5">{isAr ? 'كل حساب قابل للضغط للوصول إلى كشف الحساب والقيود المرتبطة' : 'Click account node to show entries ledger and original documents'}</span>
            </div>
            
            <button onClick={() => setViewMode(viewMode === 'detailed' ? 'summary' : 'detailed')} className="text-blue-650 hover:underline cursor-pointer">
              {viewMode === 'detailed' ? (isAr ? 'مختصر' : 'Summary') : (isAr ? 'تفصيلي' : 'Detailed')}
            </button>
          </div>

          {/* Tree-Grid Headers */}
          <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
            <span className="w-2/5 text-start">{isAr ? 'الحساب / القسم' : 'Account Category'}</span>
            <div className="flex gap-4 w-3/5 justify-end font-mono">
              <span className="w-28 text-right shrink-0">{isAr ? 'الرصيد الحالي' : 'Current Balance'}</span>
              {compareMode !== 'NONE' && <span className="w-28 text-right shrink-0">{isAr ? 'الفترة السابقة' : 'Compare Period'}</span>}
              {compareMode !== 'NONE' && <span className="w-28 text-right shrink-0">{isAr ? 'الفرق' : 'Variance'}</span>}
              {compareMode !== 'NONE' && <span className="w-16 text-right shrink-0">{isAr ? 'النسبة' : 'Var %'}</span>}
            </div>
          </div>

          <div className="space-y-1 text-xs">
            {renderTreeNode(treeData.assets)}
            {renderTreeNode(treeData.liabilities)}
            {renderTreeNode(treeData.equity)}
          </div>
        </div>

      </div>

      {/* 5. BOTTOM SECTION: Other Financial Reports Tabs (Image 3 & 4 Layout) */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl p-5 shadow-xs">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-900 mb-4">
          <div>
            <h3 className="text-xs font-black text-slate-905 dark:text-white">{isAr ? 'تقارير أخرى' : 'Other Statements'}</h3>
            <span className="text-[9px] text-slate-400 block mt-0.5">{isAr ? 'تحويل سريع إلى ميزان المراجعة أو تقارير الأعمار أو الإقرار الضريبي' : 'Switch views for trial balance, aging ledger, and tax summaries'}</span>
          </div>

          {/* Navigation tabs row */}
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1">
            <button 
              onClick={() => setActiveReport('aging_report')}
              className={`px-3.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${activeReport === 'aging_report' ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              {isAr ? 'أعمار الديون' : 'Aging'}
            </button>
            <button 
              onClick={() => setActiveReport('tax_report')}
              className={`px-3.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${activeReport === 'tax_report' ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              {isAr ? 'الإقرار الضريبي' : 'VAT Tax'}
            </button>
            <button 
              onClick={() => setActiveReport('income_statement')}
              className={`px-3.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${activeReport === 'income_statement' ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              {isAr ? 'قائمة الأرباح والخسائر' : 'Income Statement'}
            </button>
            <button 
              onClick={() => setActiveReport('trial_balance')}
              className={`px-3.5 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${activeReport === 'trial_balance' ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'}`}
            >
              {isAr ? 'ميزان المراجعة' : 'Trial Balance'}
            </button>
          </div>
        </div>

        {/* Tab display boxes */}
        <div className="p-2 border border-slate-100 dark:border-slate-900 rounded-xl">
          
          {activeReport === 'trial_balance' && (
            <div className="space-y-3">
              <div className="flex justify-end gap-2">
                <ExportButton
                  lang={lang}
                  actions={[
                    { labelAr: 'تصدير Excel', labelEn: 'Export Excel', icon: exportIcons.excel, description: isAr ? 'ملف Excel احترافي' : 'Professional Excel', action: () => handleExportExcel() },
                    { labelAr: 'تصدير PDF', labelEn: 'Export PDF', icon: exportIcons.pdf, description: isAr ? 'ملف PDF جاهز' : 'PDF Document', action: () => handleExportPDF() },
                    { labelAr: 'طباعة', labelEn: 'Print', icon: exportIcons.printer, description: isAr ? 'طباعة مباشرة' : 'Print Directly', action: () => handlePrintHTML() },
                  ]}
                />
              </div>
              <div className="overflow-x-auto text-[11px] font-bold">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 uppercase text-[9px] font-bold">
                    <th className="py-2 px-3 text-start">{isAr ? 'الحساب' : 'Account'}</th>
                    <th className="py-2 px-3 text-center">{isAr ? 'مدين' : 'Debit'}</th>
                    <th className="py-2 px-3 text-end">{isAr ? 'دائن' : 'Credit'}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map(acc => {
                    const balanceObj = computedBalances[acc.id] || { current: 0, compare: 0 };
                    let currentBal = balanceObj.current;
                    
                    if (!showZeroBalances && currentBal === 0) return null;

                    const isDebitAcc = acc.type === AccountType.Asset || acc.type === AccountType.Expense || acc.type === AccountType.CostOfSales;
                    const displayDebit = isDebitAcc ? (currentBal >= 0 ? currentBal : 0) : (currentBal < 0 ? -currentBal : 0);
                    const displayCredit = isDebitAcc ? (currentBal < 0 ? -currentBal : 0) : (currentBal >= 0 ? currentBal : 0);

                    return (
                      <tr key={acc.id} className="border-b border-slate-50 dark:border-slate-900/40 hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-200">
                          {isAr ? acc.nameAr : acc.nameEn}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-900 dark:text-white">
                          {displayDebit > 0 ? formatCurrency(displayDebit) : '-'}
                        </td>
                        <td className="py-2 px-3 text-end font-mono text-slate-600 dark:text-slate-400">
                          {displayCredit > 0 ? formatCurrency(displayCredit) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 font-black text-sm border-t-2 border-slate-300 dark:border-slate-600">
                    <td className="py-3 px-3 text-slate-900 dark:text-white">{isAr ? 'المجموع' : 'Total'}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-900 dark:text-white">{formatCurrency(trialBalanceTotals.debit)}</td>
                    <td className="py-3 px-3 text-end font-mono text-slate-900 dark:text-white">{formatCurrency(trialBalanceTotals.credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            </div>
          )}

          {activeReport === 'income_statement' && (
            <div className="space-y-3">
              <div className="flex justify-end gap-2 px-3 pt-3">
                <ExportButton
                  lang={lang}
                  actions={[
                    { labelAr: 'تصدير Excel', labelEn: 'Export Excel', icon: exportIcons.excel, description: isAr ? 'ملف Excel احترافي' : 'Professional Excel', action: () => handleExportExcel() },
                    { labelAr: 'تصدير PDF', labelEn: 'Export PDF', icon: exportIcons.pdf, description: isAr ? 'ملف PDF جاهز' : 'PDF Document', action: () => handleExportPDF() },
                    { labelAr: 'طباعة', labelEn: 'Print', icon: exportIcons.printer, description: isAr ? 'طباعة مباشرة' : 'Print Directly', action: () => handlePrintHTML() },
                  ]}
                />
              </div>
              <div className="overflow-x-auto text-[11px] font-bold p-3">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[9px] font-extrabold tracking-wider">
                    <th className="py-2.5 px-3 text-start w-2/5">{isAr ? 'البيان والتفاصيل' : 'Statement Item'}</th>
                    <th className="py-2.5 px-3 text-right font-mono w-1/5">{isAr ? 'المبلغ' : 'Amount'}</th>
                    <th className="py-2.5 px-3 text-right font-mono w-1/5">{isAr ? '% من الإيرادات' : '% of Revenue'}</th>
                    {compareMode !== 'NONE' && (
                      <th className="py-2.5 px-3 text-right font-mono w-1/5">{isAr ? '% التغير' : '% Change'}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {detailedIncomeStatement.rows.map((row) => {
                    // Determine styling based on row attributes
                    let rowClass = "border-b border-slate-50 dark:border-slate-900/40 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 dark:hover:bg-slate-900/20 transition-all";
                    let nameClass = "py-2 px-3 font-semibold text-slate-700 dark:text-slate-350";
                    let valClass = "py-2 px-3 text-right font-mono text-slate-900 dark:text-white font-bold";
                    let pctClass = "py-2 px-3 text-right font-mono text-slate-505 dark:text-slate-400";
                    let changeClass = "py-2 px-3 text-right font-mono font-bold";

                    if (row.isHeader) {
                      rowClass = "bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-805";
                      nameClass = "py-2.5 px-3 font-extrabold text-slate-900 dark:text-white text-xs";
                      valClass = "hidden";
                      pctClass = "hidden";
                      changeClass = "hidden";
                    } else if (row.isTotal) {
                      rowClass = "border-t border-slate-200 dark:border-slate-800 border-b-2 border-double border-slate-300 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/10 font-bold";
                      nameClass = "py-2.5 px-3 font-black text-slate-900 dark:text-white";
                      valClass = "py-2.5 px-3 text-right font-mono text-slate-950 dark:text-white font-black";
                      pctClass = "py-2.5 px-3 text-right font-mono text-slate-750 dark:text-slate-200 font-extrabold";
                    }

                    if (row.isHighlight) {
                      rowClass = "bg-slate-50 dark:bg-slate-900/60 border-t border-b-2 border-slate-250 dark:border-slate-800";
                      nameClass = "py-3 px-3 font-black text-slate-900 dark:text-white text-xs";
                      valClass = "py-3 px-3 text-right font-mono text-slate-950 dark:text-white font-black text-xs";
                      pctClass = "py-3 px-3 text-right font-mono text-slate-800 dark:text-slate-200 font-black text-xs";
                    }

                    if (row.isFinalTotal) {
                      rowClass = "bg-slate-100/80 dark:bg-slate-900 border-t-2 border-b-4 border-double border-slate-350 dark:border-slate-700";
                      nameClass = "py-3 px-3 font-black text-slate-900 dark:text-white text-[12px] uppercase";
                      valClass = "py-3 px-3 text-right font-mono text-slate-950 dark:text-white font-black text-[12px]";
                      pctClass = "py-3 px-3 text-right font-mono text-slate-950 dark:text-white font-black text-[12px]";
                    }

                    // Format values
                    let displayVal = "";
                    let displayPct = "";
                    let displayChange = "";
                    let changeColor = "text-slate-500 dark:text-slate-400";

                    if (!row.isHeader) {
                      const amount = row.current ?? 0;
                      // 1. Format value
                      const absValStr = formatCurrency(Math.abs(amount));
                      if (row.isDeduction) {
                        displayVal = `(${absValStr})`;
                      } else {
                        displayVal = amount < 0 ? `(${absValStr})` : absValStr;
                      }

                      // 2. Format percentage of revenue
                      const revPct = detailedIncomeStatement.totalOperatingRevenueCurrent > 0 
                        ? (amount / detailedIncomeStatement.totalOperatingRevenueCurrent) * 100 
                        : 0;
                      
                      const absPctStr = `${Math.abs(revPct).toFixed(2)}%`;
                      if (row.isDeduction) {
                        displayPct = `(${absPctStr})`;
                      } else {
                        displayPct = revPct < 0 ? `(${absPctStr})` : absPctStr;
                      }

                      // 3. Format comparison change percentage
                      if (compareMode !== 'NONE') {
                        const compVal = row.compare ?? 0;
                        if (compVal === 0) {
                          if (amount === 0) {
                            displayChange = "0.00%";
                          } else {
                            displayChange = amount > 0 ? "▲ 100.00%" : "▼ (100.00%)";
                            changeColor = "text-slate-800 dark:text-slate-200";
                          }
                        } else {
                          const changePct = ((amount - compVal) / compVal) * 100;
                          const absChangePctStr = `${Math.abs(changePct).toFixed(2)}%`;
                          
                          // Determine if the change is positive or negative (accounting for revenues vs costs)
                          const isRevenueType = row.id.includes('rev') || row.id === 'dine_in' || row.id === 'takeaway' || row.id === 'delivery' || row.id === 'delivery_apps' || row.id === 'other_non_op' || row.id === 'gross_profit' || row.id === 'net_op_profit' || row.id === 'pre_tax_profit' || row.id === 'final_net_profit';
                          
                          const isPositiveGrowth = changePct > 0;
                          
                          changeColor = "text-slate-800 dark:text-slate-200";
                          if (isRevenueType) {
                            if (isPositiveGrowth) {
                              displayChange = `▲ ${absChangePctStr}`;
                            } else {
                              displayChange = `▼ (${absChangePctStr})`;
                            }
                          } else {
                            if (isPositiveGrowth) {
                              displayChange = `▲ ${absChangePctStr}`;
                            } else {
                              displayChange = `▼ (${absChangePctStr})`;
                            }
                          }
                        }
                      }
                    }

                    return (
                      <tr key={row.id} className={rowClass}>
                        <td className={nameClass} style={{ paddingRight: row.indent ? `${row.indent * 16}px` : undefined }}>
                          {isAr ? row.nameAr : row.nameEn}
                        </td>
                        {row.isHeader ? (
                          <>
                            <td className="hidden"></td>
                            <td className="hidden"></td>
                            {compareMode !== 'NONE' && <td className="hidden"></td>}
                          </>
                        ) : (
                          <>
                            <td className={valClass}>{displayVal}</td>
                            <td className={pctClass}>{displayPct}</td>
                            {compareMode !== 'NONE' && (
                              <td className={`${changeClass} ${changeColor}`}>{displayChange}</td>
                            )}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </div>
          )}

          {activeReport === 'tax_report' && (
            <TaxReport data={data} lang={lang} />
          )}

          {activeReport === 'aging_report' && (
            <AgingReport data={data} lang={lang} />
          )}

        </div>

      </div>

      {/* 6. MODAL DRILL-DOWNS */}
      {/* MODAL A: GENERAL LEDGER DRAWER */}
      {selectedLedgerAccount && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-end z-45" dir={isAr ? 'rtl' : 'ltr'}>
          <div className={`bg-white dark:bg-slate-950 border-s dark:border-slate-800 w-full max-w-3xl h-full flex flex-col shadow-2xl animate-in ${isAr ? 'slide-in-from-left' : 'slide-in-from-right'} duration-300`}>
            
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-[#f4f8fe]/60 dark:bg-slate-900/60">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider block">{isAr ? 'كشف الحساب التفصيلي بالأستاذ' : 'General Ledger Account Activity'}</span>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">{selectedLedgerAccount.code} — {isAr ? selectedLedgerAccount.nameAr : selectedLedgerAccount.nameEn}</span>
                </div>
              </div>
              <button onClick={() => setSelectedLedgerAccount(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'الرصيد الافتتاحي (قبل البداية):' : 'Period Opening Balance:'}</span>
                  <span className="text-lg font-black text-slate-800 dark:text-white font-mono">{formatCurrency(accountLedgerActivity.openingBalance)}</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'الرصيد الختامي بعد الحركات:' : 'Period Closing Balance:'}</span>
                  <span className="text-lg font-black text-slate-800 dark:text-white font-mono">
                    {formatCurrency(accountLedgerActivity.lines[accountLedgerActivity.lines.length - 1]?.balanceAfter ?? accountLedgerActivity.openingBalance)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto text-xs">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="py-2 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="py-2 text-start">{isAr ? 'رقم القيد' : 'Journal Entry'}</th>
                      <th className="py-2 text-start">{isAr ? 'البيان' : 'Narrative'}</th>
                      <th className="py-2 text-end">{isAr ? 'مدين' : 'Debit'}</th>
                      <th className="py-2 text-end">{isAr ? 'دائن' : 'Credit'}</th>
                      <th className="py-2 text-end">{isAr ? 'الرصيد التراكمي' : 'Running Balance'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountLedgerActivity.lines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">{isAr ? 'لا توجد حركات قيود معتمدة' : 'No posted transactions.'}</td>
                      </tr>
                    ) : (
                      accountLedgerActivity.lines.map((line, idx) => (
                        <tr key={line.entryNumber} className="border-b border-slate-50 dark:border-slate-900/60 hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                          <td className="py-2.5 font-bold text-slate-505">{line.date}</td>
                          <td className="py-2.5">
                            <button onClick={() => setSelectedJournalEntry(line.rawEntry)} className="font-black text-blue-600 dark:text-sky-400 hover:underline cursor-pointer">
                              {line.entryNumber}
                            </button>
                          </td>
                          <td className="py-2.5 text-slate-650 dark:text-slate-350 max-w-xs truncate">{line.description}</td>
                          <td className="py-2.5 text-end font-mono text-slate-900 dark:text-white">{line.debit > 0 ? formatCurrency(line.debit) : '—'}</td>
                          <td className="py-2.5 text-end font-mono text-slate-900 dark:text-white">{line.credit > 0 ? formatCurrency(line.credit) : '—'}</td>
                          <td className="py-2.5 text-end font-mono font-bold text-slate-950 dark:text-white">{formatCurrency(line.balanceAfter)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL B: JOURNAL ENTRY DETAIL VIEWER */}
      {selectedJournalEntry && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-[#f4f8fe]/50 dark:bg-slate-900/40">
              <div>
                <span className="text-xs font-black text-slate-909 dark:text-white uppercase tracking-wider block">{isAr ? 'مستند القيد اليومي المزدوج' : 'Double Entry Journal Voucher'}</span>
                <span className="text-[10px] text-slate-400 font-black font-mono">{selectedJournalEntry.entryNumber}</span>
              </div>
              <button onClick={() => setSelectedJournalEntry(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-bold">
                <div>
                  <span className="text-slate-400 block">{isAr ? 'تاريخ الترحيل:' : 'Posting Date:'}</span>
                  <span className="text-slate-900 dark:text-white">{selectedJournalEntry.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isAr ? 'نوع القيد:' : 'Entry Type:'}</span>
                  <span className="text-slate-900 dark:text-white">{selectedJournalEntry.type}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block">{isAr ? 'البيان:' : 'Narrative:'}</span>
                  <span className="text-slate-900 dark:text-white">{selectedJournalEntry.description || '-'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">{isAr ? 'بنود الترحيل' : 'Journal Posting Lines'}</span>
                <div className="border border-slate-150/60 dark:border-slate-850 rounded-xl overflow-hidden">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[9px] uppercase font-bold">
                        <th className="py-2 px-3 text-start">{isAr ? 'الحساب' : 'Account'}</th>
                        <th className="py-2 px-3 text-end">{isAr ? 'مدين (Dr)' : 'Debit'}</th>
                        <th className="py-2 px-3 text-end">{isAr ? 'دائن (Cr)' : 'Credit'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedJournalEntry.lines.map((line, idx) => {
                        const acc = data.accounts.find(a => a.id === line.accountId);
                        const hasItems = line.items && line.items.length > 0;
                        return (
                          <React.Fragment key={`jv-line-${idx}`}>
                            <tr className="border-b border-slate-50 dark:border-slate-900/60">
                              <td className="py-2 px-3 font-bold text-slate-750 dark:text-slate-200">
                                {acc ? `${acc.code} — ${isAr ? acc.nameAr : acc.nameEn}` : line.accountId}
                              </td>
                              <td className="py-2 px-3 text-end font-mono text-slate-900 dark:text-white font-bold">{line.debit > 0 ? formatCurrency(line.debit) : '—'}</td>
                              <td className="py-2 px-3 text-end font-mono text-slate-900 dark:text-white font-bold">{line.credit > 0 ? formatCurrency(line.credit) : '—'}</td>
                            </tr>
                            {hasItems && (
                              <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                                <td colSpan={3} className="py-1.5 px-6">
                                  <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                                    {line.items!.map((item, iIdx) => (
                                      <div key={iIdx} className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 py-0.5">
                                        <span>{isAr ? item.nameAr : item.nameEn}</span>
                                        <span className="font-mono whitespace-nowrap">
                                          {item.quantity.toFixed(3)} {isAr ? item.unitAr : item.unitEn}
                                          <span className="ms-2 text-slate-400">({formatCurrency(item.cost)})</span>
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {(() => {
                const src = findSourceDocument(selectedJournalEntry);
                if (!src) return null;
                return (
                  <div className="p-3 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-105 dark:border-blue-900/50 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'المستند التجاري الأصلي:' : 'Linked business document:'}</span>
                      <span className="font-black text-blue-700 dark:text-sky-400 font-mono text-xs">{src.label} ({src.type})</span>
                    </div>
                    <button 
                      onClick={() => setSelectedSourceDoc(src)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] shadow-sm cursor-pointer"
                    >
                      {isAr ? 'عرض المستند التجاري' : 'Open Source Document'}
                    </button>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* MODAL C: ORIGINAL SOURCE DOCUMENT DISPLAY */}
      {selectedSourceDoc && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-[#f4f8fe]/60 dark:bg-slate-900/60">
              <span className="text-xs font-black text-slate-909 dark:text-white uppercase tracking-wider">{isAr ? `معاينة المستند الأصلي: ${selectedSourceDoc.type}` : `Original Document View: ${selectedSourceDoc.type}`}</span>
              <button onClick={() => setSelectedSourceDoc(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              
              {selectedSourceDoc.type === 'SALES_INVOICE' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-blue-600 dark:text-sky-400 text-sm">
                        {(() => {
                          try {
                            const p = JSON.parse(localStorage.getItem('erp_company_profile') || '{}');
                            return (isAr ? p.nameAr : p.nameEn) || 'LODing Foods';
                          } catch {
                            return 'LODing Foods';
                          }
                        })()}
                      </h4>
                      <span className="text-[10px] text-slate-400">{isAr ? 'فاتورة مبيعات' : 'Sales Invoice'}</span>
                    </div>
                    <div className="text-end font-mono text-[10px] text-slate-400 font-bold">
                      <div>INV-NO: {selectedSourceDoc.doc.invoiceNumber}</div>
                      <div>DATE: {selectedSourceDoc.doc.date}</div>
                    </div>
                  </div>

                  <div className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="py-2 px-3 text-start">{isAr ? 'الصنف' : 'Item'}</th>
                          <th className="py-2 px-3 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                          <th className="py-2 px-3 text-end">{isAr ? 'الإجمالي' : 'Total'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSourceDoc.doc.items.map((item: any, idx: number) => (
                          <tr key={item.itemId} className="border-b border-slate-50 dark:border-slate-900/60">
                            <td className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300">{isAr ? item.nameAr : item.nameEn}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">{item.quantity}</td>
                            <td className="py-2 px-3 text-end font-mono text-slate-900 dark:text-white">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-1.5 text-right font-bold text-slate-505 pt-2 border-t border-slate-100 dark:border-slate-850">
                    <div className="flex justify-between"><span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span><span className="font-mono text-slate-850">{formatCurrency(selectedSourceDoc.doc.subtotal)}</span></div>
                    <div className="flex justify-between"><span>{isAr ? 'الضريبة:' : 'Tax:'}</span><span className="font-mono text-slate-850">{formatCurrency(selectedSourceDoc.doc.taxAmount)}</span></div>
                    <div className="flex justify-between text-slate-950 dark:text-white font-black text-sm pt-1 border-t border-dashed"><span>{isAr ? 'الإجمالي العام:' : 'Invoice Grand Total:'}</span><span className="font-mono">{formatCurrency(selectedSourceDoc.doc.totalAmount)}</span></div>
                  </div>
                </div>
              )}

              {selectedSourceDoc.type === 'VOUCHER' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'سند القبض والصرف' : 'Payment/Receipt Voucher'}</span>
                      <span className="text-sm font-black text-blue-700 dark:text-sky-400 font-mono">{selectedSourceDoc.doc.voucherNumber}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-750">
                      {selectedSourceDoc.doc.type === 'RECEIPT' ? (isAr ? 'قبض نقدي' : 'Cash Receipt') : (isAr ? 'صرف نقدي' : 'Payment Voucher')}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-150/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2 font-bold text-slate-700 dark:text-slate-350">
                    <div className="flex justify-between"><span>{isAr ? 'التاريخ المعتمد:' : 'Posting Date:'}</span><span className="font-mono text-slate-950 dark:text-white">{selectedSourceDoc.doc.date}</span></div>
                    <div className="flex justify-between"><span>{isAr ? 'الطرف المستلم / المدفوع له:' : 'Party Account:'}</span><span className="text-slate-955 dark:text-white">{selectedSourceDoc.doc.partyName}</span></div>
                    <div className="flex justify-between"><span>{isAr ? 'طريقة الدفع والتسوية:' : 'Payment Method:'}</span><span className="text-slate-955 dark:text-white">{selectedSourceDoc.doc.paymentMethod}</span></div>
                    <div className="flex justify-between"><span>{isAr ? 'البيان / التفاصيل التوضيحية:' : 'Description:'}</span><span className="text-slate-955 dark:text-white">{selectedSourceDoc.doc.description}</span></div>
                    <div className="flex justify-between text-slate-955 dark:text-white font-black text-sm pt-2 border-t border-slate-150"><span>{isAr ? 'قيمة السند الإجمالية:' : 'Voucher Net Amount:'}</span><span className="font-mono text-slate-955 dark:text-white">{formatCurrency(selectedSourceDoc.doc.amount)}</span></div>
                  </div>
                </div>
              )}

              {selectedSourceDoc.type === 'PURCHASE' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-indigo-600 dark:text-sky-400 text-sm">Corporate Inventory Purchase</h4>
                      <span className="text-[10px] text-slate-400">{isAr ? 'فاتورة شراء خامات' : 'Raw Materials Purchase Bill'}</span>
                    </div>
                    <div className="text-end font-mono text-[10px] text-slate-400 font-bold">
                      <div>BILL: {selectedSourceDoc.doc.number}</div>
                      <div>DATE: {selectedSourceDoc.doc.date}</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/20 text-slate-700 dark:text-slate-350 space-y-2 font-bold">
                    <div className="flex justify-between"><span>{isAr ? 'حالة الفاتورة والاعتماد:' : 'Bill Status:'}</span><span className="text-indigo-650">{selectedSourceDoc.doc.status}</span></div>
                    <div className="flex justify-between"><span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span><span className="font-mono text-slate-955 dark:text-white">{formatCurrency(selectedSourceDoc.doc.subtotal)}</span></div>
                    <div className="flex justify-between text-slate-955 dark:text-white font-black text-sm pt-2 border-t"><span>{isAr ? 'القيمة الإجمالية المسددة:' : 'Total Amount Paid:'}</span><span className="font-mono text-slate-955 dark:text-white">{formatCurrency(selectedSourceDoc.doc.totalAmount)}</span></div>
                  </div>
                </div>
              )}

              {selectedSourceDoc.type === 'PAYROLL' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-950/10 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'مسيرة رواتب معتمدة' : 'Payroll Run Summary'}</span>
                      <span className="font-black text-emerald-700 font-mono">{selectedSourceDoc.doc.runNumber}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-750 dark:text-emerald-400">{selectedSourceDoc.doc.status}</span>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-150/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-350 space-y-2 font-bold">
                    <div className="flex justify-between"><span>{isAr ? 'الفترة الزمنية:' : 'Salary Period:'}</span><span className="font-mono text-slate-905 dark:text-white">Month {selectedSourceDoc.doc.month} / {selectedSourceDoc.doc.year}</span></div>
                    <div className="flex justify-between"><span>{isAr ? 'إجمالي الرواتب الأساسية والبدلات:' : 'Total Gross Payroll:'}</span><span className="font-mono text-slate-905 dark:text-white">{formatCurrency(selectedSourceDoc.doc.totalGross)}</span></div>
                    <div className="flex justify-between"><span>{isAr ? 'الاستقطاعات والجزاءات:' : 'Total Deductions:'}</span><span className="font-mono text-slate-905 dark:text-white">-{formatCurrency(selectedSourceDoc.doc.totalDeductions)}</span></div>
                    <div className="flex justify-between text-slate-950 dark:text-white font-black text-sm pt-2 border-t border-slate-200 dark:border-slate-700"><span>{isAr ? 'صافي المبلغ المسيل بالبنوك:' : 'Net Disbursed Cash:'}</span><span className="font-mono text-slate-950 dark:text-white">{formatCurrency(selectedSourceDoc.doc.totalNet)}</span></div>
                  </div>
                </div>
              )}

              {/* General fallback doc details */}
              {selectedSourceDoc.type !== 'SALES_INVOICE' && selectedSourceDoc.type !== 'VOUCHER' && selectedSourceDoc.type !== 'PURCHASE' && selectedSourceDoc.type !== 'PAYROLL' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-mono whitespace-pre-wrap">
                  {JSON.stringify(selectedSourceDoc.doc, null, 2)}
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* MODAL D: SAVING CONFIGURATION TEMPLATES */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-[#f4f8fe]/60 dark:bg-slate-900/60">
              <span className="text-xs font-black text-slate-900 dark:text-white">{isAr ? 'حفظ إعدادات التقرير الحالية كقالب' : 'Save Config Template'}</span>
              <button onClick={() => setShowSaveTemplateModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">{isAr ? 'اسم القالب المحفوظ:' : 'Template Name:'}</label>
                <input 
                  type="text" 
                  value={newTemplateName} 
                  onChange={e => setNewTemplateName(e.target.value)} 
                  placeholder={isAr ? 'مثال: تقرير الربع الأول المجمع' : 'e.g. Q1 Board Statement'}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowSaveTemplateModal(false)} className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-655 dark:text-slate-300 hover:bg-slate-200 cursor-pointer">{isAr ? 'إلغاء' : 'Cancel'}</button>
                <button onClick={handleSaveTemplate} className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">{isAr ? 'حفظ الآن' : 'Save Template'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL E: DISCREPANCY EQUATION DIAGNOSTICS */}
      {showDiagnosticsModal && (() => {
        const unapprovedEntries = (data.journalEntries || []).filter(e => !e.approved);
        let unapprovedAssetImpact = 0;
        let unapprovedLiabilityImpact = 0;
        unapprovedEntries.forEach(je => {
          je.lines.forEach(line => {
            const acc = data.accounts.find(a => a.id === line.accountId);
            if (!acc) return;
            const impact = (line.debit - line.credit);
            if (acc.type === AccountType.Asset) unapprovedAssetImpact += impact;
            else if (acc.type === AccountType.Liability) unapprovedLiabilityImpact -= impact;
            else if (acc.type === AccountType.Equity) unapprovedLiabilityImpact -= impact;
          });
        });

        const unusualSigns = data.accounts.filter(acc => {
          const bal = computedBalances[acc.id]?.current || 0;
          if (acc.type === AccountType.Asset) return bal < -0.01;
          if (acc.type === AccountType.Liability || acc.type === AccountType.Equity) return bal > 0.01;
          return false;
        });

        const mismatches = data.accounts.filter(acc => {
          const computed = computedBalances[acc.id]?.current || 0;
          return acc.type === AccountType.Asset || acc.type === AccountType.Liability || acc.type === AccountType.Equity;
        });

        return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center bg-[#fef2f2] dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-slate-900 dark:text-white" />
                <span className="text-xs font-black text-rose-700 dark:text-rose-400">{isAr ? 'تحليل عدم اتزان الميزانية' : 'Balance Sheet Audit Analysis'}</span>
              </div>
              <button onClick={() => setShowDiagnosticsModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            
            <div className="p-6 space-y-5 text-xs overflow-y-auto">
              
              {/* 1. Balance Equation Breakdown */}
              <div>
                <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-2">{isAr ? '🔍 تفصيل معادلة الميزانية' : '🔍 Balance Sheet Equation'}</h4>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-2 font-bold">
                  <div className="flex justify-between">
                    <span>{isAr ? 'إجمالي الأصول' : 'Total Assets'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(treeData.assets.balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'إجمالي الخصوم' : 'Total Liabilities'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(treeData.liabilities.balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'إجمالي حقوق الملكية' : 'Total Equity'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(treeData.equity.balance)}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-slate-900 dark:text-white font-black">
                    <span>{isAr ? 'الفرق (أصول - خصوم - حقوق ملكية)' : 'Variance (A - L - E)'}</span>
                    <span className="font-mono">{formatCurrency(balanceDifference)}</span>
                  </div>
                </div>
              </div>

              {/* 2. Unapproved Entries Impact */}
              <div>
                <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-2">
                  {isAr ? '📋 القيود الغير معتمدة' : '📋 Unapproved Journal Entries'}
                  <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] mr-1">{unapprovedEntries.length}</span>
                </h4>
                {unapprovedEntries.length === 0 ? (
                  <p className="text-slate-400 font-bold">{isAr ? '✅ لا توجد قيود غير معتمدة' : '✅ All entries are approved'}</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {unapprovedEntries.slice(0, 10).map(je => (
                      <div key={je.id} className="flex justify-between bg-amber-50/50 dark:bg-amber-900/10 px-3 py-1.5 rounded-lg font-bold">
                        <span className="text-slate-600 dark:text-slate-400">{je.entryNumber} - {je.description}</span>
                        <span className="font-mono text-amber-600">{je.date}</span>
                      </div>
                    ))}
                    {unapprovedEntries.length > 10 && (
                      <p className="text-[10px] text-slate-400">...و {unapprovedEntries.length - 10} أخرى</p>
                    )}
                  </div>
                )}
                {unapprovedEntries.length > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    {isAr 
                      ? `تأثير هذه القيود لو تم اعتمادها: الأصول تتغير بـ ${formatCurrency(unapprovedAssetImpact)} والخصوم تتغير بـ ${formatCurrency(unapprovedLiabilityImpact)}`
                      : `If approved: Assets change by ${formatCurrency(unapprovedAssetImpact)}, Liabilities by ${formatCurrency(unapprovedLiabilityImpact)}`}
                  </p>
                )}
              </div>

              {/* 3. Accounts with Unusual Signs */}
              {unusualSigns.length > 0 && (
                <div>
                  <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-2">
                    {isAr ? '⚠️ حسابات بإشارة غير طبيعية' : '⚠️ Accounts with Abnormal Sign'}
                  </h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {unusualSigns.map(acc => (
                      <div key={acc.id} className="flex justify-between bg-rose-50/50 dark:bg-rose-900/10 px-3 py-1.5 rounded-lg font-bold">
                        <span className="text-slate-600 dark:text-slate-400">{acc.code} - {isAr ? acc.nameAr : acc.nameEn}</span>
                        <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(computedBalances[acc.id]?.current || 0)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {isAr 
                      ? 'حساب أصول من الطبيعي أن يكون مدين (موجب)، وحساب خصوم/حقوق ملكية من الطبيعي أن يكون دائن (سالب).'
                      : 'Assets should normally have debit (positive) balance; Liabilities/Equity should have credit (negative) balance.'}
                  </p>
                </div>
              )}

              {isBalanced && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 p-4 rounded-xl text-center">
                  <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                  <p className="font-black text-emerald-700 dark:text-emerald-400">
                    {isAr ? 'الميزانية العمومية متزنة ✅' : 'Balance Sheet is Balanced ✅'}
                  </p>
                  <p className="text-[10px] text-emerald-500 mt-0.5">
                    {isAr ? 'الأصول = الخصوم + حقوق الملكية' : 'Assets = Liabilities + Equity'}
                  </p>
                </div>
              )}
              
              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-850">
                <button onClick={() => setShowDiagnosticsModal(false)} className="px-4 py-2 text-xs font-black rounded-lg bg-slate-900 text-white hover:bg-slate-800 cursor-pointer">{isAr ? 'إغلاق' : 'Close Diagnostics'}</button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

    </div>
  );
}
