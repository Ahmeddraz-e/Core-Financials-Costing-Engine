import { useState, useMemo } from 'react';
import {
  TrendingUp, DollarSign, Wallet, Building, Package, Users2,
  FileWarning, AlertTriangle, ChevronRight, ArrowUpRight, ArrowDownRight,
  ChefHat, Briefcase, PieChart as PieIcon, Activity, UserCheck, ShoppingBag
} from 'lucide-react';
import {
  LineChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, CartesianGrid, AreaChart
} from 'recharts';
import { ERPData, AccountType } from '../types';

interface DashboardProps {
  data: ERPData;
  lang: 'ar' | 'en';
  setActiveTab: (tab: string) => void;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#f43f5e'];

export default function Dashboard({ data, lang, setActiveTab }: DashboardProps) {
  const isAr = lang === 'ar';

  const getAccountBalance = (code: string) => {
    return data.accounts.find(a => a.code === code)?.balance || 0;
  };

  const getAccountGroupBalance = (type: string) => {
    return data.accounts.filter(a => a.type === type).reduce((sum, a) => sum + a.balance, 0);
  };

  const dineInSales = getAccountBalance('4101001');
  const takeawaySales = getAccountBalance('4102001');
  const deliverySales = getAccountBalance('4103001');
  const appSales = getAccountBalance('4104002') || getAccountBalance('4104001');
  const totalSales = dineInSales + takeawaySales + deliverySales + appSales;

  const foodCost = getAccountBalance('5101001');
  const beverageCost = getAccountBalance('5102001');
  const packagingCost = getAccountBalance('5103001');
  const wastageCost = getAccountBalance('5104001');
  const totalCostOfSales = foodCost + beverageCost + packagingCost + wastageCost;

  const rentExpense = getAccountBalance('6102001');
  const laborExpense = getAccountBalance('6101001');
  const utilitiesExpense = getAccountBalance('6103001');
  const marketingExpense = getAccountBalance('6104001');
  const depExpense = getAccountBalance('6105001');
  const totalExpenses = rentExpense + laborExpense + utilitiesExpense + marketingExpense + depExpense;

  const grossProfit = totalSales - totalCostOfSales;
  const netProfit = grossProfit - totalExpenses;

  const cashInBox = data.treasuries.reduce((sum, t) => sum + t.balance, 0);
  const bankBalances = data.bankAccounts.reduce((sum, b) => sum + b.balance, 0);
  const inventoryValue = data.inventory.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
  const supplierPayables = data.suppliers.reduce((sum, s) => sum + s.balance, 0);
  const customerReceivables = data.customers.reduce((sum, c) => sum + c.balance, 0);

  const foodCostPercent = totalSales > 0 ? (totalCostOfSales / totalSales) * 100 : 0;
  const laborCostPercent = totalSales > 0 ? (laborExpense / totalSales) * 100 : 0;
  const primeCostPercent = foodCostPercent + laborCostPercent;

  const lowStockItems = data.inventory.filter(item => item.quantity <= item.reorderPoint);
  const totalBouncedCheques = data.cheques.filter(c => c.status === 'BOUNCED').length;
  const pendingPRs = data.purchases.filter(p => p.type === 'REQUEST' && p.status === 'REQUESTED').length;
  const activeCheques = data.cheques.filter(c => c.status === 'OUTSTANDING' || c.status === 'UNDER_COLLECTION');

  const [activeAlertTab, setActiveAlertTab] = useState<'inventory' | 'finance' | 'cheques'>('inventory');

  const formatCurrency = (val: number) => {
    const hasDecimal = val % 1 !== 0;
    const formattedNum = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasDecimal ? 2 : 0,
      maximumFractionDigits: hasDecimal ? 2 : 0
    }).format(val);
    return isAr ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
  };

  const formatPercent = (val: number) => val.toFixed(1) + '%';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 p-3 rounded-2xl shadow-xl transition-all duration-200">
          <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider font-mono">
            {label}
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => {
              const color = entry.stroke && entry.stroke !== 'none' ? entry.stroke : (entry.fill || entry.color || '#3b82f6');
              return (
                <div key={index} className="flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-extrabold">
                      {entry.name}
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                    {formatCurrency(entry.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      const val = entry.value;
      const totalSum = entry.payload.totalSales !== undefined 
        ? entry.payload.totalSales 
        : (entry.payload.totalInventory !== undefined ? entry.payload.totalInventory : totalSales);
      const pct = totalSum > 0 ? (val / totalSum) * 100 : 0;
      
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 p-3 rounded-2xl shadow-xl transition-all duration-200">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.payload.color || entry.color }} />
            <span className="text-xs text-slate-700 dark:text-slate-200 font-extrabold">
              {entry.name}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
              {formatCurrency(val)}
            </span>
            <span className="text-[10px] font-black text-emerald-500 font-mono bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-md">
              {pct.toFixed(1)}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const dailySalesData = useMemo(() => {
    if (data.sales.length === 0) return [];
    const map = new Map<string, { total: number; foodCost: number }>();
    for (const s of data.sales) {
      const existing = map.get(s.date) || { total: 0, foodCost: 0 };
      existing.total += s.totalAmount;
      existing.foodCost += s.foodCost;
      map.set(s.date, existing);
    }
    const sorted = Array.from(map.entries())
      .map(([date, v]) => ({ date: date.slice(5), fullDate: date, total: v.total, foodCost: v.foodCost }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
      
    // If there is only one data point, pad a preceding day with 0 sales to make the line/area chart connect beautifully!
    if (sorted.length === 1) {
      const singlePoint = sorted[0];
      const d = new Date(singlePoint.fullDate);
      d.setDate(d.getDate() - 1);
      const prevDateStr = d.toISOString().split('T')[0];
      return [
        { date: prevDateStr.slice(5), fullDate: prevDateStr, total: 0, foodCost: 0 },
        singlePoint
      ];
    }
    return sorted;
  }, [data.sales]);

  const peakSales = useMemo(() => {
    if (dailySalesData.length === 0) return { date: '-', total: 0 };
    return dailySalesData.reduce((max, d) => d.total > max.total ? d : max, { date: '-', total: 0 });
  }, [dailySalesData]);

  const avgSales = useMemo(() => {
    const activeDays = dailySalesData.filter(d => d.total > 0);
    if (activeDays.length === 0) return 0;
    return activeDays.reduce((sum, d) => sum + d.total, 0) / activeDays.length;
  }, [dailySalesData]);

  const [salesChartType, setSalesChartType] = useState<'AREA' | 'BAR' | 'LINE'>('AREA');

  const channelData = useMemo(() => [
    { name: isAr ? 'صالة' : 'Dine-In', value: dineInSales, color: '#3b82f6', totalSales },
    { name: isAr ? 'تيك أواي' : 'Takeaway', value: takeawaySales, color: '#8b5cf6', totalSales },
    { name: isAr ? 'دليفري' : 'Delivery', value: deliverySales, color: '#06b6d4', totalSales },
    { name: isAr ? 'تطبيقات' : 'Apps', value: appSales, color: '#f59e0b', totalSales },
  ].filter(d => d.value > 0), [dineInSales, takeawaySales, deliverySales, appSales, isAr, totalSales]);

  const expenseData = useMemo(() => [
    { name: isAr ? 'رواتب' : 'Salaries', value: Math.abs(laborExpense), color: '#ef4444' },
    { name: isAr ? 'إيجار' : 'Rent', value: Math.abs(rentExpense), color: '#f59e0b' },
    { name: isAr ? 'مرافق' : 'Utilities', value: Math.abs(utilitiesExpense), color: '#84cc16' },
    { name: isAr ? 'تسويق' : 'Marketing', value: Math.abs(marketingExpense), color: '#06b6d4' },
    { name: isAr ? 'إهلاك' : 'Depreciation', value: Math.abs(depExpense), color: '#6366f1' },
  ].filter(d => d.value > 0), [laborExpense, rentExpense, utilitiesExpense, marketingExpense, depExpense, isAr]);

  const inventoryCategoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data.inventory) {
      const existing = map.get(item.category) || 0;
      map.set(item.category, existing + item.cost * item.quantity);
    }
    return Array.from(map.entries()).map(([cat, val], i) => ({
      name: cat.replace(/_/g, ' '),
      value: val,
      color: COLORS[i % COLORS.length],
      totalInventory: inventoryValue
    }));
  }, [data.inventory, inventoryValue]);

  return (
    <div id="dashboard_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {isAr ? 'لوحة تحكم المدير المالي • CFO' : 'CFO & Executive Dashboard'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'تحليل لحظي للأرصدة النقدية والمبيعات وهوامش الأرباح وتكاليف التشغيل' : 'Real-time ledger analytics, cash boxes, and operational food costing margins'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {isAr ? 'آخر تحديث: لحظي' : 'Live sync'}
          </span>
        </div>
      </div>

      <div id="kpi_cards_grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold">{isAr ? 'إجمالي المبيعات' : 'Gross Sales'}</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{formatCurrency(totalSales)}</h3>
            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3" />
              <span>{data.sales.length} {isAr ? 'فاتورة مسجلة' : 'invoices'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold">{isAr ? 'مجمل الربح' : 'Gross Profit'}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{formatCurrency(grossProfit)}</h3>
            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3" />
              <span>{formatPercent(totalSales > 0 ? (grossProfit / totalSales) * 100 : 0)} {isAr ? 'هامش مجمل الربح' : 'Margin'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold">{isAr ? 'صافي الربح الفعلي' : 'Net Profit'}</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{formatCurrency(netProfit)}</h3>
            <span className="text-[10px] text-violet-500 font-bold flex items-center gap-1 mt-1">
              <span>{formatPercent(totalSales > 0 ? (netProfit / totalSales) * 100 : 0)} {isAr ? 'صافي العائد' : 'Net Margin'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold">{isAr ? 'نسبة تكلفة الأغذية' : 'Food Cost %'}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <ChefHat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{formatPercent(foodCostPercent)}</h3>
            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-1">
              <span>{isAr ? 'المعيار المستهدف: 30%' : 'Target: 30%'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold">{isAr ? 'نسبة تكلفة العمالة' : 'Labor Cost %'}</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{formatPercent(laborCostPercent)}</h3>
            <span className="text-[10px] text-sky-500 font-bold flex items-center gap-1 mt-1">
              <span>{isAr ? 'الرواتب والأجور' : 'Salaries ratio'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold">{isAr ? 'التكلفة الأولية' : 'Prime Cost %'}</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{formatPercent(primeCostPercent)}</h3>
            <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1 mt-1">
              <span>{isAr ? 'الحد الأقصى: 65%' : 'Max limit: 65%'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold">{isAr ? 'النقدية بالخزائن' : 'Treasury Cash'}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{formatCurrency(cashInBox)}</h3>
            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
              <span>{data.treasuries.length} {isAr ? 'خزينة' : 'cashboxes'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold">{isAr ? 'أرصدة البنوك' : 'Bank Balances'}</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{formatCurrency(bankBalances)}</h3>
            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
              <span>{data.bankAccounts.length} {isAr ? 'حساب بنكي' : 'bank accounts'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold">{isAr ? 'قيمة المخزون' : 'Inventory Value'}</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{formatCurrency(inventoryValue)}</h3>
            <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1 mt-1">
              <span>{lowStockItems.length} {isAr ? 'تنبيهات نقص' : 'low-stock alerts'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold">{isAr ? 'أرصدة الموردين' : 'Supplier Payables'}</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
              <Users2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-rose-600 font-mono">{formatCurrency(supplierPayables)}</h3>
            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
              <span>{data.suppliers.length} {isAr ? 'مورد' : 'suppliers'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold">{isAr ? 'أرصدة العملاء' : 'Customer Receivables'}</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{formatCurrency(customerReceivables)}</h3>
            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
              <span>{isAr ? 'عملاء آجل' : 'credit customers'}</span>
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-xs font-bold">{isAr ? 'صافي السيولة' : 'Net Liquidity'}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-extrabold text-emerald-500 font-mono">{formatCurrency(cashInBox + bankBalances)}</h3>
            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-1">
              <span>{isAr ? 'نقدية + بنوك' : 'Cash & Banks'}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                {isAr ? 'اتجاه المبيعات اليومية' : 'Daily Sales Trends'}
              </h3>
              <span className="text-[11px] text-slate-400 font-bold">
                {isAr ? `بناءً على ${dailySalesData.length} يوم مبيعات` : `Based on ${dailySalesData.length} days of sales`}
              </span>
            </div>

            {/* Interactive chart type switcher */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/50 dark:border-slate-850">
              {(['AREA', 'LINE', 'BAR'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSalesChartType(type)}
                  className={`px-3 py-1.5 text-[9.5px] font-bold rounded-lg transition-all cursor-pointer ${
                    salesChartType === type
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-sky-400 shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                  }`}
                >
                  {type === 'AREA' ? (isAr ? 'مساحة' : 'Area') :
                   type === 'LINE' ? (isAr ? 'خطوط' : 'Line') :
                   (isAr ? 'أعمدة' : 'Bar')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-3 h-72">
              {dailySalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {salesChartType === 'AREA' ? (
                    <AreaChart data={dailySalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/60" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={false} dy={8} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={false} dx={-8} tickFormatter={(value) => formatCurrency(value).replace('EGP', '').trim()} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area name={isAr ? 'المبيعات' : 'Sales'} type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fill="url(#salesGrad)" activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} />
                      <Area name={isAr ? 'تكلفة الأغذية' : 'Food Cost'} type="monotone" dataKey="foodCost" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 3" fill="url(#costGrad)" activeDot={{ r: 4, strokeWidth: 0, fill: '#f43f5e' }} />
                    </AreaChart>
                  ) : salesChartType === 'LINE' ? (
                    <LineChart data={dailySalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/60" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={false} dy={8} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={false} dx={-8} tickFormatter={(value) => formatCurrency(value).replace('EGP', '').trim()} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line name={isAr ? 'المبيعات' : 'Sales'} type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} />
                      <Line name={isAr ? 'تكلفة الأغذية' : 'Food Cost'} type="monotone" dataKey="foodCost" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 3" activeDot={{ r: 4 }} />
                    </LineChart>
                  ) : (
                    <BarChart data={dailySalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/60" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={false} dy={8} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={false} dx={-8} tickFormatter={(value) => formatCurrency(value).replace('EGP', '').trim()} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar name={isAr ? 'المبيعات' : 'Sales'} dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar name={isAr ? 'تكلفة الأغذية' : 'Food Cost'} dataKey="foodCost" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm font-bold">
                  {isAr ? 'لا توجد مبيعات مسجلة بعد. أضف مبيعات لعرض الرسم البياني.' : 'No sales recorded yet. Add sales to see the chart.'}
                </div>
              )}
            </div>

            {/* Quick stats insights panel */}
            <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col justify-center">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{isAr ? 'ذكاء لوحة المبيعات' : 'Sales intelligence'}</span>
              
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'أعلى قمة مبيعات' : 'Highest daily peak'}</span>
                <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 block mt-0.5">{formatCurrency(peakSales.total)}</span>
                <span className="text-[9px] text-slate-500 block font-bold">{isAr ? `في تاريخ ${peakSales.date}` : `on date ${peakSales.date}`}</span>
              </div>
              
              <div className="border-t border-slate-200/60 dark:border-slate-800 pt-3">
                <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'متوسط المبيعات اليومية' : 'Daily sales average'}</span>
                <span className="text-sm font-black font-mono text-blue-600 dark:text-sky-400 block mt-0.5">{formatCurrency(avgSales)}</span>
              </div>

              <div className="border-t border-slate-200/60 dark:border-slate-800 pt-3">
                <span className="text-[10px] font-bold text-slate-400 block">{isAr ? 'انحراف تكلفة الأغذية' : 'Food Cost deviation'}</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 block mt-0.5">
                  {formatPercent(foodCostPercent)}
                </span>
                <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block ${foodCostPercent <= 30 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                  {foodCostPercent <= 30 ? (isAr ? 'نطاق آمن ومربح' : 'Profitable range') : (isAr ? 'يتطلب مراجعة' : 'Needs audit')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-2">
              {isAr ? 'توزيع قنوات البيع' : 'Revenue Channels'}
            </h3>
            <span className="text-[11px] text-slate-400 font-bold block mb-4">
              {isAr ? 'نسبة كل قناة من إجمالي المبيعات' : 'Share of each sales channel'}
            </span>
            {channelData.length > 0 ? (
              <div className="h-56 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={channelData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={62} 
                      outerRadius={80} 
                      paddingAngle={3} 
                      dataKey="value"
                    >
                      {channelData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} stroke={entry.color} strokeWidth={1} style={{ outline: 'none' }} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconSize={6}
                      iconType="circle"
                      formatter={(value: string) => <span className="text-[10.5px] font-extrabold text-slate-600 dark:text-slate-400">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-7">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">
                    {isAr ? 'الإجمالي' : 'Total'}
                  </span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                    {formatCurrency(totalSales).replace('EGP', '').trim()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-400 text-sm font-bold">
                {isAr ? 'لا توجد بيانات' : 'No data yet'}
              </div>
            )}
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-2">
            <span className="text-amber-600 block mb-0.5">⚠️ {isAr ? 'ملاحظة تشغيلية:' : 'Operational note:'}</span>
            {isAr
              ? 'تطبيقات التوصيل تمثل نسبة عالية من المبيعات ولكن هامش ربحها أقل بـ 20% بسبب عمولات المنصات.'
              : 'Delivery apps have high volume but 20% lower margins due to platform commissions.'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-4">
            {isAr ? 'توزيع المصروفات' : 'Expense Distribution'}
          </h3>
          {expenseData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="expGrad-0" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#f87171" />
                    </linearGradient>
                    <linearGradient id="expGrad-1" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                    <linearGradient id="expGrad-2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#84cc16" />
                      <stop offset="100%" stopColor="#a3e635" />
                    </linearGradient>
                    <linearGradient id="expGrad-3" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                    <linearGradient id="expGrad-4" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={false} stroke="#f1f5f9" className="dark:stroke-slate-800/60" strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(value).replace('EGP', '').trim()}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 10.5, fontWeight: 'extrabold', fill: '#64748b' }} 
                    tickLine={false} 
                    axisLine={false} 
                    width={isAr ? 75 : 65}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" barSize={10} radius={[0, 5, 5, 0]}>
                    {expenseData.map((_entry, idx) => (
                      <Cell key={idx} fill={`url(#expGrad-${idx % 5})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-bold">
              {isAr ? 'لا توجد مصروفات مسجلة' : 'No expenses recorded'}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-4">
            {isAr ? 'قيمة المخزون حسب الفئة' : 'Inventory by Category'}
          </h3>
          {inventoryCategoryData.length > 0 ? (
            <div className="h-64 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={inventoryCategoryData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={55} 
                    outerRadius={73} 
                    paddingAngle={3} 
                    dataKey="value"
                  >
                    {inventoryCategoryData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} stroke={entry.color} strokeWidth={1} style={{ outline: 'none' }} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={6}
                    iconType="circle"
                    formatter={(value: string) => <span className="text-[9.5px] font-extrabold text-slate-600 dark:text-slate-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-7">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">
                  {isAr ? 'الإجمالي' : 'Total'}
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                  {formatCurrency(inventoryValue).replace('EGP', '').trim()}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-bold">
              {isAr ? 'المخزون فارغ' : 'No inventory'}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex flex-col justify-between items-start gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                  {isAr ? 'مركز الإنذار' : 'Alert Center'}
                </h3>
                <p className="text-[11px] text-slate-400 font-bold">{isAr ? 'تنبيهات تلقائية' : 'Auto warnings'}</p>
              </div>
            </div>
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 w-full">
              <button onClick={() => setActiveAlertTab('inventory')}
                className={`flex-1 px-2 py-1 text-[10px] font-bold rounded-md text-center ${activeAlertTab === 'inventory' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}>
                {isAr ? 'مخزون' : 'Stock'} ({lowStockItems.length})
              </button>
              <button onClick={() => setActiveAlertTab('finance')}
                className={`flex-1 px-2 py-1 text-[10px] font-bold rounded-md text-center ${activeAlertTab === 'finance' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}>
                {isAr ? 'موردين' : 'Payables'} ({data.suppliers.filter(s => s.balance > 10000).length})
              </button>
              <button onClick={() => setActiveAlertTab('cheques')}
                className={`flex-1 px-2 py-1 text-[10px] font-bold rounded-md text-center ${activeAlertTab === 'cheques' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'}`}>
                {isAr ? 'شيكات' : 'Cheques'} ({activeCheques.length})
              </button>
            </div>
          </div>

          <div className="min-h-40">
            {activeAlertTab === 'inventory' && (
              <div className="space-y-2">
                {lowStockItems.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    ✅ {isAr ? 'جميع الخامات متوفرة بمستويات آمنة' : 'All items above reorder points'}
                  </div>
                ) : (
                  lowStockItems.slice(0, 5).map(item => (
                    <div key={item.id} className="flex justify-between items-center p-2.5 rounded-xl bg-rose-500/5 border border-rose-100 dark:border-rose-900/30 text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                        <div>
                          <p className="text-slate-800 dark:text-slate-200">{isAr ? item.nameAr : item.nameEn}</p>
                          <span className="text-[10px] text-slate-400">{item.code}</span>
                        </div>
                      </div>
                      <div className="text-end">
                        <p className="text-rose-600 font-bold font-mono">{item.quantity} {isAr ? item.unitAr : item.unitEn}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {activeAlertTab === 'finance' && (
              <div className="space-y-2">
                {data.suppliers.filter(s => s.balance > 0).slice(0, 5).map(sup => (
                  <div key={sup.id} className="flex justify-between items-center p-2.5 rounded-xl bg-amber-500/5 border border-amber-100 dark:border-amber-900/30 text-xs font-semibold">
                    <span>{isAr ? sup.nameAr : sup.nameEn}</span>
                    <span className="text-amber-700 dark:text-amber-500 font-bold font-mono">{formatCurrency(sup.balance)}</span>
                  </div>
                ))}
              </div>
            )}
            {activeAlertTab === 'cheques' && (
              <div className="space-y-2">
                {activeCheques.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    {isAr ? 'لا توجد شيكات معلقة' : 'No pending cheques'}
                  </div>
                ) : (
                  activeCheques.slice(0, 5).map(ch => (
                    <div key={ch.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                      <div>
                        <span className="font-mono">{ch.chequeNumber}</span>
                        <span className="text-[10px] text-slate-400 block">{ch.partyName}</span>
                      </div>
                      <span className="font-bold font-mono">{formatCurrency(ch.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-4">
          {isAr ? 'روابط التنقل السريع' : 'Quick Actions'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => setActiveTab('journals')} className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-center transition-colors">
            <DollarSign className="h-5 w-5 text-blue-500 mx-auto mb-2" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'قيد محاسبي' : 'New JV'}</span>
          </button>
          <button onClick={() => setActiveTab('recipes')} className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-center transition-colors">
            <ChefHat className="h-5 w-5 text-indigo-500 mx-auto mb-2" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'وصفات' : 'Recipes'}</span>
          </button>
          <button onClick={() => setActiveTab('purchases')} className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-center transition-colors">
            <ShoppingBag className="h-5 w-5 text-amber-500 mx-auto mb-2" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'مشتريات' : 'Purchases'}</span>
          </button>
          <button onClick={() => setActiveTab('treasury')} className="p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-center transition-colors">
            <Wallet className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{isAr ? 'خزينة' : 'Treasury'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
