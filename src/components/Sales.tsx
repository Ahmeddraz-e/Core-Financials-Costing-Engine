import React, { useState } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  Calculator, 
  Check, 
  User, 
  CreditCard, 
  DollarSign, 
  Calendar, 
  ArrowRight, 
  ListOrdered, 
  FileSpreadsheet, 
  AlertTriangle, 
  ShieldCheck,
  Archive,
  RefreshCw,
  Clock
} from 'lucide-react';
import { 
  ERPData, 
  InventoryItem, 
  Recipe, 
  ItemCategory, 
  Account, 
  JournalEntry, 
  Treasury, 
  SaleOrder, 
  SaleChannel,
  AccountType
} from '../types';

interface SalesProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdateSales: (sales: SaleOrder[]) => void;
  onUpdateInventory: (items: InventoryItem[]) => void;
  onUpdateTreasuries: (treasuries: Treasury[]) => void;
  onUpdateAccounts: (accounts: Account[]) => void;
  onUpdateEntries: (entries: JournalEntry[]) => void;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
}

interface ItemizedSaleInput {
  item: InventoryItem;
  qty: number;
}

export default function Sales({
  data,
  lang,
  onUpdateSales,
  onUpdateInventory,
  onUpdateTreasuries,
  onUpdateAccounts,
  onUpdateEntries,
  onAddAuditLog
}: SalesProps) {
  const isAr = lang === 'ar';
  
  // Tabs: 'LIST' (Log of reports) or 'NEW' (Enter new report)
  const [activeTab, setActiveTab] = useState<'LIST' | 'NEW'>('LIST');

  // FORM STATES
  const [salesDate, setSalesDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cashierName, setCashierName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Financial breakdown
  const [dineInSales, setDineInSales] = useState<number>(0);
  const [takeawaySales, setTakeawaySales] = useState<number>(0);
  const [deliverySales, setDeliverySales] = useState<number>(0);
  const [deliveryAppsSales, setDeliveryAppsSales] = useState<number>(0);
  
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [vatTax, setVatTax] = useState<number>(0);

  // Settlement details (What was actually handed over)
  const [cashCollected, setCashCollected] = useState<number>(0);
  const [cardCollected, setCardCollected] = useState<number>(0);

  // Inventory deduction method: 'ESTIMATED' (Estimated Food Cost %) or 'ITEMIZED' (Exact recipe explosion)
  const [deductionMethod, setDeductionMethod] = useState<'ESTIMATED' | 'ITEMIZED'>('ESTIMATED');
  const [estimatedCostPercent, setEstimatedCostPercent] = useState<number>(30); // 30% of sales represents Cost of Food

  // ITEMIZED MENU DISH QUANTITIES (if ITEMIZED method chosen)
  const [itemizedList, setItemizedList] = useState<ItemizedSaleInput[]>([]);
  const [menuSearch, setMenuSearch] = useState<string>('');

  // Finished dishes filter for itemized entry
  const finishedProducts = data.inventory.filter(i => i.category === ItemCategory.FinishedProduct);
  const filteredProducts = finishedProducts.filter(p => 
    (isAr ? p.nameAr : p.nameEn).toLowerCase().includes(menuSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(menuSearch.toLowerCase())
  );

  const handleAddItemToSummary = (prod: InventoryItem) => {
    const existing = itemizedList.find(i => i.item.id === prod.id);
    if (existing) {
      setItemizedList(itemizedList.map(i => i.item.id === prod.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setItemizedList([...itemizedList, { item: prod, qty: 1 }]);
    }
  };

  const handleUpdateItemQty = (prodId: string, delta: number) => {
    setItemizedList(itemizedList.map(i => {
      if (i.item.id === prodId) {
        const nextQty = i.qty + delta;
        return nextQty > 0 ? { ...i, qty: nextQty } : null;
      }
      return i;
    }).filter(Boolean) as ItemizedSaleInput[]);
  };

  const handleRemoveItem = (prodId: string) => {
    setItemizedList(itemizedList.filter(i => i.item.id !== prodId));
  };

  // Sync menu quantities to channel revenues
  const handleApplyItemizedTotals = () => {
    const subtotal = itemizedList.reduce((sum, item) => sum + (item.item.cost * item.qty), 0); // sellable item 'cost' is retail price
    // Split subtotal to takeaway as a default, and auto-calculate taxes
    setTakeawaySales(subtotal);
    setDineInSales(0);
    setDeliverySales(0);
    setDeliveryAppsSales(0);
    setServiceCharge(0);
    setVatTax(Math.round(subtotal * 0.14));
    setCashCollected(Math.round(subtotal * 1.14));
    setCardCollected(0);
    
    alert(isAr 
      ? `تم ملء المبالغ المالية بناءً على إجمالي كميات الوجبات: ${subtotal} ج.م` 
      : `Financial totals updated from itemized quantities: ${subtotal} EGP`);
  };

  // Computations
  const subtotalRevenue = dineInSales + takeawaySales + deliverySales + deliveryAppsSales;
  const grandTotalRequired = subtotalRevenue + serviceCharge + vatTax;
  const totalSettled = cashCollected + cardCollected;
  const discrepancy = totalSettled - grandTotalRequired;

  // Submit report handler
  const handlePostShiftReport = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cashierName.trim()) {
      alert(isAr ? '⚠️ الرجاء إدخال اسم الكاشير أو كود الوردية' : '⚠️ Please enter cashier name or shift ID');
      return;
    }

    if (subtotalRevenue <= 0) {
      alert(isAr ? '⚠️ إجمالي قيمة المبيعات يجب أن يكون أكبر من الصفر' : '⚠️ Total sales revenue must be greater than zero');
      return;
    }

    // CHECK INVENTORY IF ITEMIZED METHOD
    let tempInventory = [...data.inventory];
    let calculatedFoodCost = 0;

    if (deductionMethod === 'ITEMIZED') {
      if (itemizedList.length === 0) {
        alert(isAr 
          ? '⚠️ لقد اخترت طريقة جرد الوجبات ولكنك لم تقم بإضافة أي وجبة مباعة!' 
          : '⚠️ You selected itemized deduction but have not added any sold dishes!');
        return;
      }

      // Ingredients validation & deduction
      let canProceed = true;
      let missingMaterialName = '';

      for (const entry of itemizedList) {
        const recipe = data.recipes.find(r => r.itemId === entry.item.id);
        const costPerDish = recipe ? recipe.calculatedCost : (entry.item.cost * 0.3); // fallback to 30% standard cost
        calculatedFoodCost += costPerDish * entry.qty;

        if (recipe) {
          for (const component of recipe.components) {
            const rawItem = tempInventory.find(ri => ri.id === component.componentItemId);
            if (rawItem) {
              const totalNeeded = component.quantity * entry.qty;
              if (rawItem.quantity < totalNeeded) {
                canProceed = false;
                missingMaterialName = isAr ? rawItem.nameAr : rawItem.nameEn;
                break;
              } else {
                rawItem.quantity -= totalNeeded;
              }
            }
          }
        }
        if (!canProceed) break;
      }

      if (!canProceed) {
        alert(isAr 
          ? `⚠️ رصيد خامات منخفض! لا يمكن إتمام التسجيل لعدم وجود كميات كافية من (${missingMaterialName}) في المخازن لتغطية الوردية.` 
          : `⚠️ Low stocks! Cannot complete entry because ingredient (${missingMaterialName}) has insufficient stocks.`);
        return;
      }
    } else {
      // Estimated food cost percent method (e.g., 30% of subtotalRevenue)
      calculatedFoodCost = Math.round(subtotalRevenue * (estimatedCostPercent / 100));
      
      // Deduct proportionally from general F&B inventory if we want, or just log the financial cost of food sold
      // To keep inventory valuation synchronized, we can reduce the Food & Beverage stock account balance by calculatedFoodCost
    }

    // UPDATE INVENTORY IF ITEMIZED
    if (deductionMethod === 'ITEMIZED') {
      onUpdateInventory(tempInventory);
    }

    // UPDATE TREASURIES (Add cashCollected to Main Cash Box cb-1)
    const updatedTreasuries = data.treasuries.map(t => {
      if (t.id === 'cb-1') {
        return { ...t, balance: t.balance + cashCollected };
      }
      return t;
    });
    onUpdateTreasuries(updatedTreasuries);

    // AUTO-POST BALANCED GENERAL JOURNAL ENTRY FOR THIS CASHIER SHIFT REPORT
    const reportSerial = String(data.sales.length + 1).padStart(3, '0');
    const jvNumber = `JV-SL-${salesDate.replace(/-/g, '')}-${reportSerial}`;

    // LINES:
    // Debit: Cash Box (101) for cashCollected
    // Debit: Bank Account (102) for cardCollected
    // Credit: VAT Tax Payable (2103001) for vatTax
    // Credit: Dine-In Sales (401) for dineInSales + serviceCharge
    // Credit: Takeaway Sales (402) for takeawaySales
    // Credit: Delivery Sales (403) for deliverySales
    // Credit: Delivery Apps Sales (404) for deliveryAppsSales
    // Debit/Credit: Cash discrepancy (Overage as sales 401, Shortage as general operating expense 603)
    
    const jvLines = [
      { accountId: '101', debit: cashCollected, credit: 0 }, // Cash
      { accountId: '102', debit: cardCollected, credit: 0 }  // Card/Bank
    ].filter(l => l.debit > 0);

    // Discrepancy adjustment
    if (discrepancy < 0) {
      // Shortage (عجز) - Debited to General Expenses (603)
      jvLines.push({ accountId: '603', debit: Math.abs(discrepancy), credit: 0 });
    } else if (discrepancy > 0) {
      // Overage (زيادة) - Credited to Dine-In Sales or Retained Earnings (let's use 401 for simplicity)
      jvLines.push({ accountId: '401', debit: 0, credit: discrepancy });
    }

    // Revenues & Taxes Credits
    if (dineInSales > 0 || serviceCharge > 0) {
      jvLines.push({ accountId: '401', debit: 0, credit: dineInSales + serviceCharge });
    }
    if (takeawaySales > 0) {
      jvLines.push({ accountId: '402', debit: 0, credit: takeawaySales });
    }
    if (deliverySales > 0) {
      jvLines.push({ accountId: '403', debit: 0, credit: deliverySales });
    }
    if (deliveryAppsSales > 0) {
      jvLines.push({ accountId: '404', debit: 0, credit: deliveryAppsSales });
    }
    if (vatTax > 0) {
      jvLines.push({ accountId: '2103001', debit: 0, credit: vatTax });
    }

    // COST OF FOOD USED ENTRY
    // Debit: Cost of Food Used (501)
    // Credit: Food & Beverage Inventory (104)
    if (calculatedFoodCost > 0) {
      jvLines.push({ accountId: '501', debit: calculatedFoodCost, credit: 0 });
      jvLines.push({ accountId: '104', debit: 0, credit: calculatedFoodCost });
    }

    const year = new Date(salesDate).getFullYear();
    const shiftJV: JournalEntry = {
      id: 'je-sl-' + Math.random().toString(36).substring(2, 9),
      entryNumber: jvNumber,
      date: salesDate,
      type: 'AUTO' as any,
      description: `مطابقة وتسجيل مبيعات كاشير: ${cashierName} - بتاريخ ${salesDate}. ${notes || ''}`,
      approved: true,
      approvedBy: 'مدير النظام المالي',
      lines: jvLines
    };

    // Update Accounts ledger balances
    const updatedAccounts = data.accounts.map(acc => {
      let debitSum = 0;
      let creditSum = 0;
      jvLines.forEach(l => {
        if (l.accountId === acc.id) {
          debitSum += l.debit;
          creditSum += l.credit;
        }
      });
      
      if (acc.type === AccountType.Asset || acc.type === AccountType.Expense || acc.type === AccountType.CostOfSales) {
        return { ...acc, balance: acc.balance + debitSum - creditSum };
      } else {
        return { ...acc, balance: acc.balance + creditSum - debitSum };
      }
    });

    // Create the new Sales report record
    const newReport: SaleOrder = {
      id: 'sl-' + Math.random().toString(36).substring(2, 9),
      orderNumber: `REP-${salesDate.replace(/-/g, '')}-${reportSerial}`,
      date: salesDate,
      cashierName,
      dineInAmount: dineInSales,
      takeawayAmount: takeawaySales,
      deliveryAmount: deliverySales,
      deliveryAppsAmount: deliveryAppsSales,
      cashAmount: cashCollected,
      cardAmount: cardCollected,
      serviceCharge,
      taxAmount: vatTax,
      totalAmount: grandTotalRequired,
      foodCost: calculatedFoodCost,
      description: notes || (isAr ? `مبيعات الكاشير والمطابقة للوردية` : `Cashier reconciliation and shift posting`),
      items: itemizedList.map(i => ({
        itemId: i.item.id,
        quantity: i.qty,
        price: i.item.cost, // sellable price
        cost: i.item.cost
      }))
    };

    // Update ERP State
    onUpdateAccounts(updatedAccounts);
    onUpdateEntries([shiftJV, ...data.journalEntries]);
    onUpdateSales([newReport, ...(data.sales || [])]);

    onAddAuditLog(
      `مطابقة مبيعات الكاشير: ${cashierName}`,
      `Cashier sales registration: ${cashierName}`,
      `تم إدراج تقرير مبيعات الكاشير بقيمة ${grandTotalRequired.toFixed(1)} ج.م، وترحيل القيد المحاسبي المتوازن ${jvNumber}، وخصم تكلفة خامات بقيمة ${calculatedFoodCost} ج.م.`
    );

    // RESET STATE
    setCashierName('');
    setNotes('');
    setDineInSales(0);
    setTakeawaySales(0);
    setDeliverySales(0);
    setDeliveryAppsSales(0);
    setServiceCharge(0);
    setVatTax(0);
    setCashCollected(0);
    setCardCollected(0);
    setItemizedList([]);
    setDeductionMethod('ESTIMATED');

    alert(isAr 
      ? '✅ تم مطابقة وتسجيل مبيعات الوردية وتوليد القيود المحاسبية وتعديل الأرصدة بنجاح!' 
      : '✅ Cashier Shift Report successfully registered, GL double-entry posted and stocks updated!');
    
    setActiveTab('LIST');
  };

  // REVERSE REPORT HANDLER (Delete / Rollback)
  const handleReverseReport = (report: SaleOrder) => {
    window.showConfirm(
      `هل أنت متأكد من رغبتك في إلغاء وعكس مبيعات الوردية رقم ${report.orderNumber}؟ سيتم حذف القيود المحاسبية التابعة وعكس الأرصدة.`,
      `Are you sure you want to reverse and cancel cashier report ${report.orderNumber}? This will roll back accounts and remove the journal entry.`,
      () => {
        // Remove report
        const nextSales = (data.sales || []).filter(s => s.id !== report.id);
        onUpdateSales(nextSales);

        // Reverse cash in cb-1
        const updatedTreasuries = data.treasuries.map(t => {
          if (t.id === 'cb-1') {
            return { ...t, balance: Math.max(0, t.balance - (report.cashAmount || 0)) };
          }
          return t;
        });
        onUpdateTreasuries(updatedTreasuries);

        // Reverse accounting journal entries (Find JV matching this report date and cashierName)
        // Accumulate all account changes from all matching JVs before applying once
        const matchingEntries = data.journalEntries.filter(je =>
          je.description.includes(report.cashierName || '') && je.date === report.date
        );
        let accountsToUpdate = data.accounts.map(acc => ({ ...acc }));
        matchingEntries.forEach(je => {
          accountsToUpdate = accountsToUpdate.map(acc => {
            let debitSum = 0;
            let creditSum = 0;
            je.lines.forEach(l => {
              if (l.accountId === acc.id) {
                debitSum += l.debit;
                creditSum += l.credit;
              }
            });
            if (acc.type === AccountType.Asset || acc.type === AccountType.Expense || acc.type === AccountType.CostOfSales) {
              return { ...acc, balance: acc.balance - debitSum + creditSum };
            } else {
              return { ...acc, balance: acc.balance - creditSum + debitSum };
            }
          });
        });
        onUpdateAccounts(accountsToUpdate);
        const nextEntries = data.journalEntries.filter(je =>
          !(je.description.includes(report.cashierName || '') && je.date === report.date)
        );
        onUpdateEntries(nextEntries);

        onAddAuditLog(
          `إلغاء وعكس تقرير مبيعات كاشير: ${report.orderNumber}`,
          `Reverse Cashier Sales Report: ${report.orderNumber}`,
          `تم إلغاء تقرير مبيعات الكاشير وتصحيح الخزينة الرئيسية والقيود المحاسبية التابعة لعكس الأرصدة بالكامل.`
        );

        window.showAlert(
          'تم عكس وإلغاء تقرير مبيعات الكاشير بنجاح',
          'Cashier report successfully reversed and deleted',
          'success'
        );
      }
    );
  };

  // STATS MATH
  const recordedSalesList = data.sales || [];
  const totalSalesAll = recordedSalesList.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCashAll = recordedSalesList.reduce((sum, s) => sum + (s.cashAmount || 0), 0);
  const totalCardAll = recordedSalesList.reduce((sum, s) => sum + (s.cardAmount || 0), 0);
  const totalFoodCostAll = recordedSalesList.reduce((sum, s) => sum + s.foodCost, 0);

  return (
    <div id="backoffice_sales_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-emerald-600" />
            <span>{isAr ? 'تسجيل وتقييد مبيعات الكاشير والورديات' : 'Register Cashier Sales & Shift Reports'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-1">
            {isAr 
              ? 'مكتب الإدارة المالية: إدخال ومطابقة إيرادات الكاشير اليومية، مطابقة فروق العجز والزيادة، وجرد الخامات آلياً بالقيود المحاسبية المستندية.' 
              : 'Back-office accounting: input and reconcile cashier daily reports, match cash handovers, and deduct recipe ingredients with real-time double entry.'}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button
            id="tab_list_sales"
            onClick={() => setActiveTab('LIST')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'LIST' 
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{isAr ? 'سجل تقارير الورديات' : 'Shift Reports Log'}</span>
          </button>
          <button
            id="tab_new_sales"
            onClick={() => setActiveTab('NEW')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'NEW' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>{isAr ? 'إدخال وردية جديدة' : 'Register New Shift'}</span>
          </button>
        </div>
      </div>

      {/* STATS BARS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Sales */}
        <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-xl">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              {isAr ? 'إجمالي المبيعات المرحلة' : 'Total Posted Revenues'}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
              {totalSalesAll.toLocaleString('ar-EG', { minimumFractionDigits: 1 })} ج.م
            </span>
          </div>
        </div>

        {/* Total Cash Box */}
        <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-xl">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              {isAr ? 'المبالغ النقدية المستلمة' : 'Total Cash Handed Over'}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
              {totalCashAll.toLocaleString('ar-EG', { minimumFractionDigits: 1 })} ج.م
            </span>
          </div>
        </div>

        {/* Total Card */}
        <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-xl">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              {isAr ? 'إيداعات الشبكة والفيزا' : 'Bank Visa/Card Collected'}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
              {totalCardAll.toLocaleString('ar-EG', { minimumFractionDigits: 1 })} ج.م
            </span>
          </div>
        </div>

        {/* Food Cost */}
        <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              {isAr ? 'تكلفة الخامات المخصومة' : 'Cost of Food Deducted'}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
              {totalFoodCostAll.toLocaleString('ar-EG', { minimumFractionDigits: 1 })} ج.م
            </span>
          </div>
        </div>

      </div>

      {/* ACTIVE VIEW RENDERING */}
      {activeTab === 'LIST' ? (
        /* TAB 1: REPORTS HISTORY LIST */
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
              {isAr ? 'سجل مطابقة وإيداعات مبيعات كاشيرات المطعم' : 'Cashier Shift Reconciliations Log'}
            </h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full font-extrabold">
              {recordedSalesList.length} {isAr ? 'وردية مسجلة' : 'Reports Registered'}
            </span>
          </div>

          {recordedSalesList.length === 0 ? (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500 space-y-3">
              <ClipboardList className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">
                {isAr ? 'لا توجد تقارير مبيعات مسجلة حتى الآن.' : 'No cashier sales reports have been registered yet.'}
              </p>
              <button
                onClick={() => setActiveTab('NEW')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-lg font-black transition-all cursor-pointer"
              >
                {isAr ? 'اضغط هنا لتسجيل أول وردية كاشير' : 'Add First Cashier Shift'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 text-start">{isAr ? 'رقم السجل / التاريخ' : 'Report No / Date'}</th>
                    <th className="p-4 text-start">{isAr ? 'الكاشير / الوردية' : 'Cashier / Shift'}</th>
                    <th className="p-4 text-start">{isAr ? 'مبيعات القنوات' : 'Channel Distribution'}</th>
                    <th className="p-4 text-start">{isAr ? 'سداد الكاشير (نقدي / فيزا)' : 'Handed Over (Cash/Card)'}</th>
                    <th className="p-4 text-start">{isAr ? 'إجمالي الإيراد' : 'Grand Revenue'}</th>
                    <th className="p-4 text-start">{isAr ? 'تكلفة المواد الغذائية' : 'Food Cost'}</th>
                    <th className="p-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {recordedSalesList.map(report => {
                    const totalChannels = (report.dineInAmount || 0) + (report.takeawayAmount || 0) + (report.deliveryAmount || 0) + (report.deliveryAppsAmount || 0);
                    return (
                      <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 font-semibold text-slate-900 dark:text-slate-300">
                          <div className="font-bold text-blue-600">{report.orderNumber}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {report.date}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {report.cashierName}
                          </div>
                          <div className="text-[10px] text-slate-400 italic max-w-xs truncate mt-0.5" title={report.description}>
                            {report.description}
                          </div>
                        </td>
                        <td className="p-4 text-[10px] space-y-0.5 font-bold text-slate-500">
                          {report.dineInAmount ? <div>🍽️ {isAr ? 'صالة:' : 'Dine:'} <span className="font-mono text-slate-700 dark:text-slate-300">{report.dineInAmount} ج.م</span></div> : null}
                          {report.takeawayAmount ? <div>🛍️ {isAr ? 'تيك أواي:' : 'Takeaway:'} <span className="font-mono text-slate-700 dark:text-slate-300">{report.takeawayAmount} ج.م</span></div> : null}
                          {report.deliveryAmount ? <div>🛵 {isAr ? 'دليفري:' : 'Delivery:'} <span className="font-mono text-slate-700 dark:text-slate-300">{report.deliveryAmount} ج.م</span></div> : null}
                          {report.deliveryAppsAmount ? <div>📱 {isAr ? 'تطبيقات:' : 'Apps:'} <span className="font-mono text-slate-700 dark:text-slate-300">{report.deliveryAppsAmount} ج.م</span></div> : null}
                        </td>
                        <td className="p-4 text-[10px] space-y-1">
                          <div className="flex gap-2 items-center">
                            <span className="bg-amber-100 dark:bg-amber-950/50 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold">💵 {isAr ? 'كاش' : 'Cash'}</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{report.cashAmount || 0} ج.م</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold">💳 {isAr ? 'شبكة' : 'Card'}</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{report.cardAmount || 0} ج.م</span>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          <div className="font-mono">{report.totalAmount.toLocaleString('ar-EG')} ج.م</div>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-black uppercase font-mono tracking-wider">
                            {isAr ? 'مرحل ومطابق 🟢' : 'Posted OK 🟢'}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-rose-600">
                          {report.foodCost} ج.م
                          <div className="text-[9px] text-slate-400 font-semibold">{isAr ? 'خصم مخزني' : 'Deducted'}</div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleReverseReport(report)}
                            className="bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 p-2 rounded-xl transition-all font-black text-[10px]"
                            title={isAr ? 'عكس وحذف القيد' : 'Reverse and Delete'}
                          >
                            {isAr ? 'إلغاء وعكس 🔄' : 'Reverse 🔄'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: REGISTER NEW SHIFT REPORT FORM */
        <form onSubmit={handlePostShiftReport} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SECTION: FINANCIALS & SETTLEMENTS (Col: 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Shift metadata */}
            <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="text-xs font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider flex items-center gap-1.5 text-blue-600">
                <Clock className="h-4 w-4" />
                <span>{isAr ? '1. بيانات كاشير الوردية' : '1. Cashier & Shift Info'}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 mb-1.5">
                    {isAr ? 'تاريخ مبيعات اليوم' : 'Sales Report Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={salesDate}
                    onChange={(e) => setSalesDate(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 mb-1.5">
                    {isAr ? 'اسم الكاشير / كود الوردية' : 'Cashier Name / Shift Code'}
                  </label>
                  <input
                    type="text"
                    required
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    placeholder={isAr ? 'مثال: وردية بلال المسائية' : 'e.g., Belal Evening Shift'}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 mb-1.5">
                  {isAr ? 'ملاحظات / تفاصيل الوردية' : 'Discrepancies notes / Description'}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isAr ? 'مثال: مبيعات صالة مزدحمة ومطابقة الوردية عدا فرق طفيف...' : 'e.g., weekend busy dine-in shift notes'}
                  rows={2}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Step 2: Revenues Breakdown */}
            <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="text-xs font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider flex items-center gap-1.5 text-blue-600">
                <Calculator className="h-4 w-4" />
                <span>{isAr ? '2. مبيعات الكاشير التفصيلية بقنواتها' : '2. Sales Channels Breakdown'}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Dine in */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    🍽️ {isAr ? 'مبيعات الصالة' : 'Dine-In Sales (Gross)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={dineInSales || ''}
                      onChange={(e) => setDineInSales(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute inset-y-0 left-3 flex items-center text-[10px] text-slate-400 font-bold">ج.م</span>
                  </div>
                </div>

                {/* Takeaway */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    🛍️ {isAr ? 'مبيعات التيك أواي' : 'Takeaway Sales'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={takeawaySales || ''}
                      onChange={(e) => setTakeawaySales(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute inset-y-0 left-3 flex items-center text-[10px] text-slate-400 font-bold">ج.م</span>
                  </div>
                </div>

                {/* Direct Delivery */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    🛵 {isAr ? 'مبيعات الدليفري المباشر' : 'Direct Delivery Sales'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={deliverySales || ''}
                      onChange={(e) => setDeliverySales(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute inset-y-0 left-3 flex items-center text-[10px] text-slate-400 font-bold">ج.م</span>
                  </div>
                </div>

                {/* Delivery Apps */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    📱 {isAr ? 'مبيعات تطبيقات التوصيل (طلبات إلخ)' : 'Delivery Apps Sales'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={deliveryAppsSales || ''}
                      onChange={(e) => setDeliveryAppsSales(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute inset-y-0 left-3 flex items-center text-[10px] text-slate-400 font-bold">ج.م</span>
                  </div>
                </div>

                {/* Service Charge */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex justify-between items-center">
                    <span>⚡ {isAr ? 'رسوم الخدمة والضيافة' : 'Service Charge'}</span>
                    <button
                      type="button"
                      onClick={() => setServiceCharge(Math.round(dineInSales * 0.12))}
                      className="text-[9px] text-blue-600 hover:underline font-extrabold"
                    >
                      {isAr ? 'احسب 12% من الصالة' : 'Auto 12%'}
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={serviceCharge || ''}
                      onChange={(e) => setServiceCharge(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute inset-y-0 left-3 flex items-center text-[10px] text-slate-400 font-bold">ج.م</span>
                  </div>
                </div>

                {/* VAT Tax */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex justify-between items-center">
                    <span>📋 {isAr ? 'ضريبة القيمة المضافة (14% VAT)' : 'VAT Tax (14%)'}</span>
                    <button
                      type="button"
                      onClick={() => setVatTax(Math.round(subtotalRevenue * 0.14))}
                      className="text-[9px] text-blue-600 hover:underline font-extrabold"
                    >
                      {isAr ? 'احسب 14% ضريبة' : 'Auto 14%'}
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={vatTax || ''}
                      onChange={(e) => setVatTax(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                    <span className="absolute inset-y-0 left-3 flex items-center text-[10px] text-slate-400 font-bold">ج.م</span>
                  </div>
                </div>

              </div>

              {/* Summary calculations banner */}
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold">{isAr ? 'إجمالي الإيرادات الفاتورة المطلوب مطابقتها:' : 'Required Bill Grand Total:'}</span>
                </div>
                <div className="text-base font-black font-mono">
                  {grandTotalRequired.toLocaleString('ar-EG')} ج.م
                </div>
              </div>

            </div>

            {/* Step 3: Cash & Card handovers and discrepancies */}
            <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="text-xs font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider flex items-center gap-1.5 text-amber-600">
                <DollarSign className="h-4 w-4" />
                <span>{isAr ? '3. العهدة المستلمة والتسوية النقدية' : '3. Cashier Collections & Settlements'}</span>
              </h3>

              <p className="text-[11px] text-slate-500 font-bold">
                {isAr 
                  ? 'يرجى إدخال المبالغ النقدية التي قام الكاشير بتسليمها للخزينة، والمبالغ المودعة عبر الفيزا لمطابقتها تلقائياً مع قيمة المبيعات.'
                  : 'Enter actual cash handed to treasury and card sales processed to match with required invoice totals.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Cash hand over */}
                <div>
                  <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 mb-1.5 flex justify-between items-center">
                    <span>💵 {isAr ? 'النقدية المستلمة (الخزينة - 101)' : 'Cash Collected to Treasury'}</span>
                    <button
                      type="button"
                      onClick={() => setCashCollected(grandTotalRequired - cardCollected)}
                      className="text-[9px] text-blue-600 hover:underline font-extrabold"
                    >
                      {isAr ? 'تسوية كليّة' : 'Settle Remainder'}
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={cashCollected || ''}
                      onChange={(e) => setCashCollected(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute inset-y-0 left-3 flex items-center text-[10px] text-slate-400 font-bold">ج.م</span>
                  </div>
                </div>

                {/* Card Visa collected */}
                <div>
                  <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 mb-1.5 flex justify-between items-center">
                    <span>💳 {isAr ? 'مبيعات فيزا وشبكة (البنك - 102)' : 'Visa/Card processed to Bank'}</span>
                    <button
                      type="button"
                      onClick={() => setCardCollected(grandTotalRequired - cashCollected)}
                      className="text-[9px] text-blue-600 hover:underline font-extrabold"
                    >
                      {isAr ? 'تسوية كليّة' : 'Settle Remainder'}
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={cardCollected || ''}
                      onChange={(e) => setCardCollected(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute inset-y-0 left-3 flex items-center text-[10px] text-slate-400 font-bold">ج.م</span>
                  </div>
                </div>

              </div>

              {/* DISCREPANCY DISPLAY */}
              <div className="pt-2">
                {discrepancy === 0 ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black flex items-center gap-2">
                    <ShieldCheck className="h-4.5 w-4.5" />
                    <span>{isAr ? 'مطابقة متوازنة تماماً بنسبة 100% 🟢' : 'Reconciled balanced 100% 🟢'}</span>
                  </div>
                ) : discrepancy < 0 ? (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl text-xs space-y-1">
                    <div className="font-black flex items-center gap-2">
                      <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
                      <span>{isAr ? `عجز في عهدة الكاشير بقيمة: ${Math.abs(discrepancy)} ج.م` : `Cashier shortage amount: ${Math.abs(discrepancy)} EGP`}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold leading-normal">
                      {isAr 
                        ? 'سيقوم النظام آلياً بتحميل هذا العجز كمصروف فروقات عهدة مدينة في شجرة الحسابات (حساب 603) لتتطابق أرقام التسوية مع المبيعات.'
                        : 'System will automatically debit this discrepancy to cash shortage expenses (603) to preserve double-entry balance.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded-xl text-xs space-y-1">
                    <div className="font-black flex items-center gap-2">
                      <AlertTriangle className="h-4.5 w-4.5 text-blue-600" />
                      <span>{isAr ? `زيادة عهدة في الصندوق بقيمة: ${discrepancy} ج.م` : `Overage excess cash: ${discrepancy} EGP`}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold leading-normal">
                      {isAr 
                        ? 'سيتم ترحيل الزيادة كإيرادات مبيعات أو فروقات نقدية دائنة (حساب 401) تلقائياً لتطابق الدفاتر.'
                        : 'System will automatically credit this overage to Sales Revenue (401) to preserve double-entry balance.'}
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* RIGHT SECTION: INVENTORY STOCKS & RECIPE CONTROL (Col: 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Step 4: Inventory Deduction Settings */}
            <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 shadow-xs">
              <h3 className="text-xs font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 uppercase tracking-wider flex items-center gap-1.5 text-teal-600">
                <Archive className="h-4 w-4" />
                <span>{isAr ? '4. خصم وجرد خامات المخزن' : '4. Inventory Deduction Method'}</span>
              </h3>

              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDeductionMethod('ESTIMATED')}
                  className={`py-2 text-[10px] font-black rounded-lg transition-all ${
                    deductionMethod === 'ESTIMATED' 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                      : 'text-slate-500'
                  }`}
                >
                  {isAr ? 'نسبة تكلفة تقديرية 📉' : 'Food Cost % Est'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeductionMethod('ITEMIZED')}
                  className={`py-2 text-[10px] font-black rounded-lg transition-all ${
                    deductionMethod === 'ITEMIZED' 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                      : 'text-slate-500'
                  }`}
                >
                  {isAr ? 'جرد وجبات تفصيلي 📋' : 'Itemized Menu Sales'}
                </button>
              </div>

              {deductionMethod === 'ESTIMATED' ? (
                /* ESTIMATED PERCENTAGE UI */
                <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                  <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider block">
                    {isAr ? 'الخصم المالي التلقائي (الافتراضي والسريع)' : 'Estimated Proportionate Method'}
                  </span>
                  
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      {isAr ? 'نسبة تكلفة الطعام القياسية المعيارية' : 'Standard Food Cost Percentage'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={estimatedCostPercent}
                        onChange={(e) => setEstimatedCostPercent(Number(e.target.value))}
                        className="w-full text-xs font-bold p-2 rounded-lg bg-white dark:bg-slate-800 border focus:outline-none"
                      />
                      <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div className="text-[10px] font-bold text-slate-500 space-y-1 mt-2">
                    <p className="text-emerald-600 dark:text-emerald-400">
                      {isAr 
                        ? `✓ سيتم خصم خامات بقيمة: ${(subtotalRevenue * (estimatedCostPercent / 100)).toFixed(1)} ج.م`
                        : `✓ Will credit F&B stocks by: ${(subtotalRevenue * (estimatedCostPercent / 100)).toFixed(1)} EGP`}
                    </p>
                    <p className="leading-relaxed">
                      {isAr 
                        ? 'تسهيلاً للعمل، يقوم هذا الخيار بالترحيل الفوري لتكلفة الطعام (الطرف المدين 501) وتخفيض رصيد حساب مخزون الأغذية والمشروبات (الطرف الدائن 104) دون الحاجة لجرد صحن صحن.'
                        : 'Avoids plate-by-plate checkout. Directly credits Inventory Asset 104 and debits Cost of Goods 501 by estimated proportion.'}
                    </p>
                  </div>
                </div>
              ) : (
                /* ITEMIZED MEAL DISHES INPUT */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-800 dark:text-teal-300 text-xs">
                    <span className="font-black text-[10px] block mb-1">
                      {isAr ? 'تفجير مكونات الوجبات المباعة مخزنياً' : 'Exact Recipe Stock Deductions'}
                    </span>
                    <p className="text-[10px] font-bold text-slate-500 leading-normal">
                      {isAr 
                        ? 'يرجى تسجيل كميات الوجبات التي باعها الكاشير. سيقوم النظام بحساب إجمالي قيمة المبيعات آلياً، ومطابقة المكونات مع الخلطات والوصفات لخصم الخامات واللحوم بالجرام بدقة.'
                        : 'Record sold plate quantities. System uses integrated recipe sheets to explode ingredients and deduct them by grams from warehouse.'}
                    </p>
                  </div>

                  {/* Menu search & add panel */}
                  <div className="space-y-3">
                    <div className="relative">
                      <span className={`absolute inset-y-0 ${isAr ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-slate-400`}>
                        <Search className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={menuSearch}
                        onChange={(e) => setMenuSearch(e.target.value)}
                        placeholder={isAr ? 'ابحث عن وجبة / منتج تام...' : 'Search finished dish...'}
                        className={`w-full text-xs font-bold py-2 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} rounded-lg bg-slate-50 dark:bg-slate-900 border text-slate-800 dark:text-slate-200 focus:outline-none`}
                      />
                    </div>

                    {/* Filtered list of dishes */}
                    <div className="max-h-[160px] overflow-y-auto border rounded-xl divide-y bg-white dark:bg-slate-950 dark:border-slate-800 text-xs font-bold">
                      {filteredProducts.map(prod => (
                        <div key={prod.id} className="p-2 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <div>
                            <span className="text-[9px] text-slate-400 font-mono font-black">{prod.code}</span>
                            <p className="text-slate-800 dark:text-slate-200">{isAr ? prod.nameAr : prod.nameEn}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddItemToSummary(prod)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2.5 py-1 rounded font-black cursor-pointer"
                          >
                            + {isAr ? 'إضافة' : 'Add'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Selected dishes table */}
                  {itemizedList.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider">
                        {isAr ? 'قائمة الوجبات المباعة المقيدة بالوردية:' : 'Quantities Sold Checklist:'}
                      </span>

                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                        {itemizedList.map(entry => (
                          <div key={entry.item.id} className="flex justify-between items-center text-xs border p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800">
                            <div className="min-w-0 pr-2">
                              <p className="truncate font-black text-slate-900 dark:text-slate-200">{isAr ? entry.item.nameAr : entry.item.nameEn}</p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {entry.qty} x {entry.item.cost.toFixed(0)} = {entry.qty * entry.item.cost} ج.م
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button 
                                type="button"
                                onClick={() => handleUpdateItemQty(entry.item.id, -1)}
                                className="p-1 rounded bg-white dark:bg-slate-800 border text-slate-600"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-mono font-bold text-xs w-6 text-center">{entry.qty}</span>
                              <button 
                                type="button"
                                onClick={() => handleUpdateItemQty(entry.item.id, 1)}
                                className="p-1 rounded bg-white dark:bg-slate-800 border text-slate-600"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleRemoveItem(entry.item.id)}
                                className="p-1 rounded bg-rose-50 text-rose-600 ml-1"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Apply button */}
                      <button
                        type="button"
                        onClick={handleApplyItemizedTotals}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold py-2 rounded-lg text-[10px] mt-2 cursor-pointer flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>{isAr ? 'تطبيق هذه الكميات وتحديث مبالغ المبيعات تلقائياً' : 'Sync menu totals to financial forms'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Trigger Card */}
              <div className="pt-4 border-t">
                <button
                  type="submit"
                  id="btn_post_shift_reconciliation"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  <ShieldCheck className="h-4.5 w-4.5" />
                  <span>{isAr ? 'ترحيل ومطابقة الوردية للدفاتر 📂' : 'Confirm Reconcile & Post Report'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

            </div>

          </div>

        </form>
      )}

    </div>
  );
}
