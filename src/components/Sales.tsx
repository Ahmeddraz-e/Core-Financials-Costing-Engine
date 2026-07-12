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
  Clock,
  Settings,
  X,
  Receipt,
  Hash,
  Store,
  Users,
  Grid3X3,
  Package,
  Percent,
  Banknote,
  Wallet,
  Landmark,
  ChevronDown,
  Printer,
  Ban,
  Undo2,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleSlash2,
  CircleOff,
  RotateCcw,
  ScrollText,
  Scale,
  Box,
  TrendingDown,
  TrendingUp,
  BadgeCheck,
  Layers,
  ListChecks,
  SplitSquareHorizontal,
  FileCheck,
  BanknoteIcon,
  ArrowLeftRight,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  ShoppingCart,
  Barcode,
  NotebookTabs,
  Route,
  Timer,
  Gauge,
  FileText
} from 'lucide-react';
import { 
  ERPData, 
  InventoryItem, 
  Recipe, 
  ItemCategory, 
  Account, 
  JournalEntry, 
  Treasury,
  BankAccount,
  SaleOrder,
  SaleChannel,
  AccountType,
  Customer
} from '../types';
import { exportPOSInvoicesExcel } from '../utils/excelExport';

interface SalesProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onUpdateSales: (sales: SaleOrder[]) => void;
  onUpdateInventory: (items: InventoryItem[]) => void;
  onUpdateTreasuries: (treasuries: Treasury[]) => void;
  onUpdateBankAccounts: (bankAccounts: BankAccount[]) => void;
  onUpdateAccounts: (accounts: Account[]) => void;
  onUpdateEntries: (entries: JournalEntry[]) => void;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
  onUpdateERPState?: (updater: (prev: ERPData) => ERPData) => void;
}

interface ItemizedSaleInput {
  item: InventoryItem;
  qty: number;
  channel: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'DELIVERY_APPS';
}

export default function Sales({
  data,
  lang,
  onUpdateSales,
  onUpdateInventory,
  onUpdateTreasuries,
  onUpdateBankAccounts,
  onUpdateAccounts,
  onUpdateEntries,
  onAddAuditLog,
  onUpdateERPState
}: SalesProps) {
  const isAr = lang === 'ar';

  const [alertModal, setAlertModal] = useState<{ show: boolean; title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }>({ show: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setAlertModal({ show: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  };

  const [selectedTreasuryId, setSelectedTreasuryId] = useState(data.treasuries[0]?.id || '');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState(data.bankAccounts[0]?.id || '');
  
  const formatNum = (val: number) => {
    const hasDecimal = val % 1 !== 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasDecimal ? 2 : 0,
      maximumFractionDigits: hasDecimal ? 2 : 0
    }).format(val);
  };
  
  const [activeTab, setActiveTab] = useState<'LIST' | 'NEW'>('LIST');
  const [calcMode, setCalcMode] = useState<'MANUAL' | 'ITEMIZED'>('ITEMIZED');
  const [salesDate, setSalesDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cashierName, setCashierName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [dineInSales, setDineInSales] = useState<number>(0);
  const [takeawaySales, setTakeawaySales] = useState<number>(0);
  const [deliverySales, setDeliverySales] = useState<number>(0);
  const [deliveryAppsSales, setDeliveryAppsSales] = useState<number>(0);
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [vatTax, setVatTax] = useState<number>(0);
  const [cashCollected, setCashCollected] = useState<number>(0);
  const [cardCollected, setCardCollected] = useState<number>(0);
  const [walletAmount, setWalletAmount] = useState<number>(0);
  const [walletName, setWalletName] = useState<string>('');
  const [bankTransferAmount, setBankTransferAmount] = useState<number>(0);
  const [chequeAmount, setChequeAmount] = useState<number>(0);
  const [chequeDrawnBank, setChequeDrawnBank] = useState<string>('');
  const [deductionMethod, setDeductionMethod] = useState<'ESTIMATED' | 'ITEMIZED' | 'MANUAL_RAW'>('ESTIMATED');
  const [estimatedCostPercent, setEstimatedCostPercent] = useState<number>(30);
  const [manualRawList, setManualRawList] = useState<{ itemId: string; quantity: number }[]>([]);
  const [selectedRawItemId, setSelectedRawItemId] = useState<string>('');
  const [selectedRawQty, setSelectedRawQty] = useState<number>(1);
  const [itemizedList, setItemizedList] = useState<ItemizedSaleInput[]>([]);
  const [menuSearch, setMenuSearch] = useState<string>('');

  const finishedProducts = data.inventory.filter(i => i.category === ItemCategory.FinishedProduct);
  const filteredProducts = finishedProducts.filter(p => 
    (isAr ? p.nameAr : p.nameEn).toLowerCase().includes(menuSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(menuSearch.toLowerCase())
  );

  const getItemPrice = (itemId: string, fallbackCost: number) => {
    const recipe = data.recipes.find(r => r.itemId === itemId && r.isActive !== false);
    return recipe && recipe.sellingPrice > 0 ? recipe.sellingPrice : fallbackCost;
  };

  const handleAddItemToSummary = (prod: InventoryItem) => {
    const ch = orderType === 'APPS' ? 'DELIVERY_APPS' : orderType;
    const existing = itemizedList.find(i => i.item.id === prod.id && i.channel === ch);
    if (existing) {
      setItemizedList(itemizedList.map(i => (i.item.id === prod.id && i.channel === ch) ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setItemizedList([...itemizedList, { item: prod, qty: 1, channel: ch }]);
    }
  };

  const handleUpdateItemQty = (prodId: string, channel: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'DELIVERY_APPS', delta: number) => {
    setItemizedList(itemizedList.map(i => {
      if (i.item.id === prodId && i.channel === channel) {
        const nextQty = i.qty + delta;
        return nextQty > 0 ? { ...i, qty: nextQty } : null;
      }
      return i;
    }).filter(Boolean) as ItemizedSaleInput[]);
  };

  const handleRemoveItem = (prodId: string, channel: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'DELIVERY_APPS') => {
    setItemizedList(itemizedList.filter(i => !(i.item.id === prodId && i.channel === channel)));
  };

  const handleUpdateItemChannel = (prodId: string, oldChannel: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'DELIVERY_APPS', newChannel: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'DELIVERY_APPS') => {
    const target = itemizedList.find(i => i.item.id === prodId && i.channel === oldChannel);
    if (!target) return;

    const duplicate = itemizedList.find(i => i.item.id === prodId && i.channel === newChannel);
    if (duplicate) {
      setItemizedList(itemizedList.map(i => {
        if (i.item.id === prodId && i.channel === newChannel) {
          return { ...i, qty: i.qty + target.qty };
        }
        return i;
      }).filter(i => !(i.item.id === prodId && i.channel === oldChannel)));
    } else {
      setItemizedList(itemizedList.map(i => {
        if (i.item.id === prodId && i.channel === oldChannel) {
          return { ...i, channel: newChannel };
        }
        return i;
      }));
    }
  };

  const handleApplyItemizedTotals = () => {
    const subtotal = itemizedList.reduce((sum, item) => sum + (getItemPrice(item.item.id, item.item.cost) * item.qty), 0);
    setDineInSales(calculatedDineIn);
    setTakeawaySales(calculatedTakeaway);
    setDeliverySales(calculatedDelivery);
    setDeliveryAppsSales(0);
    setServiceCharge(0);
    setVatTax(0);
    setCashCollected(Math.round(subtotal));
    setCardCollected(0);
    setWalletAmount(0);
    setWalletName('');
    setBankTransferAmount(0);
    setChequeAmount(0);
    setChequeDrawnBank('');
    
    showAlert(
      isAr ? 'حساب المبالغ' : 'Totals Calculated',
      isAr 
        ? `تم ملء المبالغ المالية بناءً على إجمالي كميات الوجبات: ${subtotal} ج.م` 
        : `Financial totals updated from itemized quantities: ${subtotal} EGP`,
      'info'
    );
  };

  const calculatedDineIn = itemizedList
    .filter(i => i.channel === 'DINE_IN')
    .reduce((sum, i) => sum + (getItemPrice(i.item.id, i.item.cost) * i.qty), 0);

  const calculatedTakeaway = itemizedList
    .filter(i => i.channel === 'TAKEAWAY')
    .reduce((sum, i) => sum + (getItemPrice(i.item.id, i.item.cost) * i.qty), 0);

  const calculatedDelivery = itemizedList
    .filter(i => i.channel === 'DELIVERY')
    .reduce((sum, i) => sum + (getItemPrice(i.item.id, i.item.cost) * i.qty), 0);

  const calculatedDeliveryApps = itemizedList
    .filter(i => i.channel === 'DELIVERY_APPS')
    .reduce((sum, i) => sum + (getItemPrice(i.item.id, i.item.cost) * i.qty), 0);

  const activeDineIn = calcMode === 'ITEMIZED' ? calculatedDineIn : dineInSales;
  const activeTakeaway = calcMode === 'ITEMIZED' ? calculatedTakeaway : takeawaySales;
  const activeDelivery = calcMode === 'ITEMIZED' ? calculatedDelivery : deliverySales;
  const activeDeliveryApps = calcMode === 'ITEMIZED' ? calculatedDeliveryApps : deliveryAppsSales;

  const explodedIngredients = React.useMemo(() => {
    const list: { id: string; nameAr: string; nameEn: string; qtyNeeded: number; currentQty: number; unitAr: string; unitEn: string }[] = [];
    itemizedList.forEach(entry => {
      const recipe = data.recipes.find(r => r.itemId === entry.item.id && r.isActive !== false);
      if (recipe) {
        recipe.components.forEach(component => {
          const rawItem = data.inventory.find(ri => ri.id === component.componentItemId);
          if (rawItem) {
            const qtyNeeded = (component.quantity / (recipe.yieldAmount || 1)) * entry.qty;
            const existing = list.find(item => item.id === rawItem.id);
            if (existing) {
              existing.qtyNeeded += qtyNeeded;
            } else {
              list.push({
                id: rawItem.id,
                nameAr: rawItem.nameAr,
                nameEn: rawItem.nameEn,
                qtyNeeded,
                currentQty: rawItem.quantity,
                unitAr: rawItem.unitAr,
                unitEn: rawItem.unitEn
              });
            }
          }
        });
      }
    });
    return list;
  }, [itemizedList, data.recipes, data.inventory]);

  const activeDeductionIngredients = React.useMemo(() => {
    if (deductionMethod === 'MANUAL_RAW') {
      return manualRawList.map(entry => {
        const rawItem = data.inventory.find(ri => ri.id === entry.itemId);
        return {
          id: entry.itemId,
          nameAr: rawItem?.nameAr || '',
          nameEn: rawItem?.nameEn || '',
          qtyNeeded: entry.quantity,
          currentQty: rawItem?.quantity || 0,
          unitAr: rawItem?.unitAr || '',
          unitEn: rawItem?.unitEn || ''
        };
      });
    } else {
      return explodedIngredients;
    }
  }, [deductionMethod, manualRawList, explodedIngredients, data.inventory]);

  // REAL STATE - affects grand total
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [additionalFees, setAdditionalFees] = useState<number>(0);

  const subtotalRevenue = activeDineIn + activeTakeaway + activeDelivery + activeDeliveryApps;
  const grandTotalRequired = subtotalRevenue + serviceCharge + vatTax + additionalFees - discountAmount;
  const totalSettled = cashCollected + cardCollected + walletAmount + bankTransferAmount + chequeAmount;
  const discrepancy = totalSettled - grandTotalRequired;
  const paidAmount = cashCollected + cardCollected + walletAmount + bankTransferAmount + chequeAmount;
  const remaining = Math.max(0, grandTotalRequired - paidAmount);
  const netAmount = grandTotalRequired;

  // UI STATE
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'CARD' | 'WALLET' | 'BANK_TRANSFER' | 'CHEQUE' | 'MIXED'>('CASH');
  const [customerId, setCustomerId] = useState<string>('');
  const [branchName] = useState<string>('الفرع الرئيسي');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'APPS'>('DINE_IN');
  const [invoiceStatus, setInvoiceStatus] = useState<'DRAFT' | 'PENDING' | 'CONFIRMED' | 'PAID' | 'RETURNED' | 'CANCELLED' | 'SUSPENDED'>('DRAFT');

  const generateInvoiceNumber = () => {
    const count = (data.sales?.length || 0) + 1;
    return `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(count).padStart(4,'0')}`;
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; icon: any; labelAr: string; labelEn: string }> = {
      DRAFT: { color: 'text-slate-900 dark:text-white', bg: 'bg-amber-50 dark:bg-amber-950/30', icon: CircleDashed, labelAr: 'مسودة', labelEn: 'Draft' },
      PENDING: { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', icon: CircleDot, labelAr: 'معلقة', labelEn: 'Pending' },
      CONFIRMED: { color: 'text-slate-900 dark:text-white', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: CircleCheck, labelAr: 'مؤكدة', labelEn: 'Confirmed' },
      PAID: { color: 'text-slate-900 dark:text-white', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: BadgeCheck, labelAr: 'مدفوعة', labelEn: 'Paid' },
      RETURNED: { color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', icon: RotateCcw, labelAr: 'مرتجعة', labelEn: 'Returned' },
      CANCELLED: { color: 'text-slate-900 dark:text-white', bg: 'bg-rose-50 dark:bg-rose-950/30', icon: Ban, labelAr: 'ملغية', labelEn: 'Cancelled' },
      SUSPENDED: { color: 'text-slate-900 dark:text-white', bg: 'bg-purple-50 dark:bg-purple-950/30', icon: Timer, labelAr: 'معلقة', labelEn: 'Suspended' },
    };
    return configs[status] || configs.DRAFT;
  };

  const handlePostShiftReport = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cashierName.trim()) {
      showAlert(
        isAr ? 'تنبيه' : 'Warning',
        isAr ? '⚠️ الرجاء إدخال اسم الكاشير أو كود الوردية' : '⚠️ Please enter cashier name or shift ID',
        'warning'
      );
      return;
    }

    if (subtotalRevenue <= 0) {
      showAlert(
        isAr ? 'تنبيه' : 'Warning',
        isAr ? '⚠️ إجمالي قيمة المبيعات يجب أن يكون أكبر من الصفر' : '⚠️ Total sales revenue must be greater than zero',
        'warning'
      );
      return;
    }

    if (paidAmount <= 0) {
      showAlert(
        isAr ? 'خطأ' : 'Error',
        isAr ? '⚠️ الرجاء إدخال مبلغ الدفع (نقدي / فيزا / محفظة / تحويل / شيك)' : '⚠️ Please enter a payment amount (Cash / Card / Wallet / Transfer / Cheque)',
        'error'
      );
      return;
    }

    const isCreditSale = customerId !== '';
    const targetTreasury = data.treasuries.find(t => t.id === selectedTreasuryId);
    const targetBank = data.bankAccounts.find(b => b.id === selectedBankAccountId);

    if (!isCreditSale) {
      if (cashCollected > 0 || walletAmount > 0) {
        if (!selectedTreasuryId || !targetTreasury) {
          showAlert(
            isAr ? 'خطأ' : 'Error',
            isAr ? '⚠️ الرجاء اختيار الخزينة المستهدفة للنقدي والمحفظة' : '⚠️ Please select a target treasury for cash/wallet collected',
            'error'
          );
          return;
        }
      }
      if (cardCollected > 0 || bankTransferAmount > 0 || chequeAmount > 0) {
        if (!selectedBankAccountId || !targetBank) {
          showAlert(
            isAr ? 'خطأ' : 'Error',
            isAr ? '⚠️ الرجاء اختيار الحساب البنكي للفيزا / التحويل / الشيك' : '⚠️ Please select a target bank account for card/transfer/cheque',
            'error'
          );
          return;
        }
      }
    }

    let tempInventory = [...data.inventory];
    let calculatedFoodCost = 0;
    let foodCostBreakdown: { itemId: string; nameAr: string; nameEn: string; quantity: number; unitAr: string; unitEn: string; cost: number }[] = [];

    if (deductionMethod === 'ITEMIZED') {
      if (itemizedList.length === 0) {
        showAlert(
          isAr ? 'تنبيه' : 'Warning',
          isAr 
            ? '⚠️ لقد اخترت طريقة جرد الوجبات ولكنك لم تقم بإضافة أي وجبة مباعة!' 
            : '⚠️ You selected itemized deduction but have not added any sold dishes!',
          'warning'
        );
        return;
      }

      let canProceed = true;
      let missingMaterialName = '';

      for (const entry of itemizedList) {
        const recipe = data.recipes.find(r => r.itemId === entry.item.id && r.isActive !== false);

        if (recipe) {
          for (const component of recipe.components) {
            const rawItem = tempInventory.find(ri => ri.id === component.componentItemId);
            if (rawItem) {
              const totalNeeded = (component.quantity / (recipe.yieldAmount || 1)) * entry.qty;
              if (rawItem.quantity < totalNeeded) {
                canProceed = false;
                missingMaterialName = isAr ? rawItem.nameAr : rawItem.nameEn;
                break;
              } else {
                rawItem.quantity -= totalNeeded;
                const existing = foodCostBreakdown.find(b => b.itemId === rawItem.id);
                if (existing) {
                  existing.quantity += totalNeeded;
                  existing.cost += (component.quantity / (recipe.yieldAmount || 1)) * entry.qty * (rawItem.cost || 0);
                } else {
                  foodCostBreakdown.push({
                    itemId: rawItem.id,
                    nameAr: rawItem.nameAr,
                    nameEn: rawItem.nameEn,
                    quantity: totalNeeded,
                    unitAr: rawItem.unitAr,
                    unitEn: rawItem.unitEn,
                    cost: (component.quantity / (recipe.yieldAmount || 1)) * entry.qty * (rawItem.cost || 0)
                  });
                }
              }
            }
          }
        } else {
          // Fallback if no recipe exists (30% of item's base cost)
          calculatedFoodCost += (entry.item.cost * 0.3) * entry.qty;
        }
        if (!canProceed) break;
      }

      if (!canProceed) {
        showAlert(
          isAr ? 'رصيد خامات غير كافٍ' : 'Low Stock Warning',
          isAr 
            ? `⚠️ رصيد خامات منخفض! لا يمكن إتمام التسجيل لعدم وجود كميات كافية من (${missingMaterialName}) في المخازن لتغطية الوردية.` 
            : `⚠️ Low stocks! Cannot complete entry because ingredient (${missingMaterialName}) has insufficient stocks.`,
          'warning'
        );
        return;
      }

      // Sum actual ingredient costs from the breakdown
      calculatedFoodCost += foodCostBreakdown.reduce((sum, b) => sum + b.cost, 0);
    } else if (deductionMethod === 'MANUAL_RAW') {
      if (manualRawList.length === 0) {
        showAlert(
          isAr ? 'تنبيه' : 'Warning',
          isAr 
            ? '⚠️ لقد اخترت إدخال الخامات يدوياً ولكنك لم تقم بإضافة أي خامة!' 
            : '⚠️ You selected manual raw material deduction but have not added any materials!',
          'warning'
        );
        return;
      }

      let canProceed = true;
      let missingMaterialName = '';

      for (const entry of manualRawList) {
        const rawItem = tempInventory.find(ri => ri.id === entry.itemId);
        if (rawItem) {
          if (rawItem.quantity < entry.quantity) {
            canProceed = false;
            missingMaterialName = isAr ? rawItem.nameAr : rawItem.nameEn;
            break;
          } else {
            rawItem.quantity -= entry.quantity;
            const itemCost = entry.quantity * (rawItem.cost || 0);
            foodCostBreakdown.push({
              itemId: rawItem.id,
              nameAr: rawItem.nameAr,
              nameEn: rawItem.nameEn,
              quantity: entry.quantity,
              unitAr: rawItem.unitAr,
              unitEn: rawItem.unitEn,
              cost: itemCost
            });
          }
        }
      }

      if (!canProceed) {
        showAlert(
          isAr ? 'رصيد خامات غير كافٍ' : 'Low Stock Warning',
          isAr 
            ? `⚠️ رصيد خامات منخفض! لا يمكن إتمام التسجيل لعدم وجود كميات كافية من (${missingMaterialName}) في المخازن لتغطية الوردية.` 
            : `⚠️ Low stocks! Cannot complete entry because ingredient (${missingMaterialName}) has insufficient stocks.`,
          'warning'
        );
        return;
      }

      // Sum actual raw material costs
      calculatedFoodCost = foodCostBreakdown.reduce((sum, b) => sum + b.cost, 0);
    } else {
      calculatedFoodCost = Math.round(subtotalRevenue * (estimatedCostPercent / 100));
    }

    let updatedCustomers = data.customers;
    let updatedTreasuries = data.treasuries;
    let updatedBankAccounts = data.bankAccounts;

    if (isCreditSale) {
      updatedTreasuries = data.treasuries;
      updatedBankAccounts = data.bankAccounts;
      updatedCustomers = data.customers.map(c =>
        c.id === customerId ? { ...c, balance: c.balance + grandTotalRequired } : c
      );
    } else {
      updatedTreasuries = data.treasuries.map(t => {
        if (t.id === selectedTreasuryId) {
          return { ...t, balance: t.balance + cashCollected };
        }
        return t;
      });
      const totalBankInflow = cardCollected + walletAmount + bankTransferAmount + chequeAmount;
      updatedBankAccounts = data.bankAccounts.map(b => {
        if (b.id === selectedBankAccountId) {
          return { ...b, balance: b.balance + totalBankInflow };
        }
        return b;
      });
    }

    const reportSerial = String(data.sales.length + 1).padStart(3, '0');
    const jvNumber = `JV-SL-${salesDate.replace(/-/g, '')}-${reportSerial}`;

    let jvLines: { accountId: string; debit: number; credit: number }[] = isCreditSale
      ? [{ accountId: '103', debit: grandTotalRequired, credit: 0 }]
      : [
          ...(cashCollected > 0 ? [{ accountId: targetTreasury?.accountId || '101', debit: cashCollected, credit: 0 }] : []),
          ...(cardCollected > 0 ? [{ accountId: targetBank?.accountId || '102', debit: cardCollected, credit: 0 }] : []),
          ...(walletAmount > 0 ? [{ accountId: targetBank?.accountId || '102', debit: walletAmount, credit: 0 }] : []),
          ...(bankTransferAmount > 0 ? [{ accountId: targetBank?.accountId || '102', debit: bankTransferAmount, credit: 0 }] : []),
          ...(chequeAmount > 0 ? [{ accountId: targetBank?.accountId || '102', debit: chequeAmount, credit: 0 }] : []),
        ];

    if (discrepancy < 0) {
      jvLines.push({ accountId: '603', debit: Math.abs(discrepancy), credit: 0 });
    } else if (discrepancy > 0) {
      jvLines.push({ accountId: '401', debit: 0, credit: discrepancy });
    }

    if (discountAmount > 0) {
      jvLines.push({ accountId: '406', debit: discountAmount, credit: 0 });
    }

    if (activeDineIn > 0 || serviceCharge > 0) {
      const existing401 = jvLines.find(l => l.accountId === '401');
      const dineInTotal = activeDineIn + serviceCharge;
      if (existing401) {
        existing401.credit = Number((existing401.credit + dineInTotal).toFixed(2));
      } else {
        jvLines.push({ accountId: '401', debit: 0, credit: dineInTotal });
      }
    }
    if (additionalFees > 0) {
      const existing401 = jvLines.find(l => l.accountId === '401');
      if (existing401) {
        existing401.credit = Number((existing401.credit + additionalFees).toFixed(2));
      } else {
        jvLines.push({ accountId: '401', debit: 0, credit: additionalFees });
      }
    }
    if (activeTakeaway > 0) {
      jvLines.push({ accountId: '402', debit: 0, credit: activeTakeaway });
    }
    if (activeDelivery > 0) {
      jvLines.push({ accountId: '403', debit: 0, credit: activeDelivery });
    }
    if (activeDeliveryApps > 0) {
      jvLines.push({ accountId: '404', debit: 0, credit: activeDeliveryApps });
    }
    if (vatTax > 0) {
      const vatAccount = getAccountByIdOrCode('2103001');
      jvLines.push({ accountId: vatAccount?.id || '203', debit: 0, credit: vatTax });
    }

    if (calculatedFoodCost > 0) {
      jvLines.push({ accountId: '501', debit: calculatedFoodCost, credit: 0 });
      jvLines.push({
        accountId: '104',
        debit: 0,
        credit: calculatedFoodCost,
        items: deductionMethod === 'ITEMIZED' && foodCostBreakdown.length > 0 ? foodCostBreakdown : undefined
      });
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

    const discountDesc = discountAmount > 0 ? ` | خصم: ${discountAmount}` : '';
    const feesDesc = additionalFees > 0 ? ` | رسوم إضافية: ${additionalFees}` : '';
    const invoiceMeta = JSON.stringify({ discount: discountAmount, fees: additionalFees, branch: branchName, customer: customerId, orderType, paymentMethod: selectedPaymentMethod });

    const newReport: SaleOrder = {
      id: 'sl-' + Math.random().toString(36).substring(2, 9),
      orderNumber: `REP-${salesDate.replace(/-/g, '')}-${reportSerial}`,
      date: salesDate,
      cashierName,
      dineInAmount: activeDineIn,
      takeawayAmount: activeTakeaway,
      deliveryAmount: activeDelivery,
      deliveryAppsAmount: activeDeliveryApps,
      cashAmount: cashCollected,
      cardAmount: cardCollected + walletAmount + bankTransferAmount + chequeAmount,
      serviceCharge,
      taxAmount: vatTax,
      totalAmount: grandTotalRequired,
      foodCost: calculatedFoodCost,
      description: (notes || (isAr ? `مبيعات الكاشير والمطابقة للوردية` : `Cashier reconciliation and shift posting`)) + discountDesc + feesDesc + ` [${invoiceMeta}]`,
      items: itemizedList.map(i => ({
        itemId: i.item.id,
        quantity: i.qty,
        price: getItemPrice(i.item.id, i.item.cost),
        cost: i.item.cost
      }))
    };

    if (onUpdateERPState) {
      onUpdateERPState(prev => ({
        ...prev,
        customers: updatedCustomers,
        sales: [newReport, ...(prev.sales || [])],
        inventory: (deductionMethod === 'ITEMIZED' || deductionMethod === 'MANUAL_RAW') ? tempInventory : prev.inventory,
        treasuries: updatedTreasuries,
        bankAccounts: updatedBankAccounts,
        accounts: updatedAccounts,
        journalEntries: [shiftJV, ...prev.journalEntries]
      }));
    } else {
      onUpdateSales([newReport, ...(data.sales || [])]);
      if (deductionMethod === 'ITEMIZED' || deductionMethod === 'MANUAL_RAW') {
        onUpdateInventory(tempInventory);
      }
      onUpdateTreasuries(updatedTreasuries);
      onUpdateBankAccounts(updatedBankAccounts);
      onUpdateAccounts(updatedAccounts);
      onUpdateEntries([shiftJV, ...data.journalEntries]);
    }

    onAddAuditLog(
      `مطابقة مبيعات الكاشير: ${cashierName}`,
      `Cashier sales registration: ${cashierName}`,
      `تم إدراج تقرير مبيعات الكاشير بقيمة ${grandTotalRequired.toFixed(1)} ج.م، وترحيل القيد المحاسبي المتوازن ${jvNumber}، وخصم تكلفة خامات بقيمة ${calculatedFoodCost} ج.م.`
    );

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
    setWalletAmount(0);
    setWalletName('');
    setBankTransferAmount(0);
    setChequeAmount(0);
    setChequeDrawnBank('');
    setDiscountAmount(0);
    setAdditionalFees(0);
    setItemizedList([]);
    setDeductionMethod(calcMode === 'MANUAL' ? 'ESTIMATED' : 'ITEMIZED');
    setManualRawList([]);
    setSelectedRawItemId('');
    setSelectedRawQty(1);
    setCustomerId('');
    setInvoiceStatus('CONFIRMED');

    showAlert(
      isAr ? 'تم تسجيل الوردية' : 'Shift Report Registered',
      isAr 
        ? '✅ تم مطابقة وتسجيل مبيعات الوردية وتوليد القيود المحاسبية وتعديل الأرصدة بنجاح!' 
        : '✅ Cashier Shift Report successfully registered, GL double-entry posted and stocks updated!',
      'success'
    );
    
    setActiveTab('LIST');
  };

  const handleReverseReport = (report: SaleOrder) => {
    showConfirm(
      isAr ? 'إلغاء وعكس مبيعات الوردية' : 'Reverse Shift Report',
      isAr 
        ? `هل أنت متأكد من رغبتك في إلغاء وعكس مبيعات الوردية رقم ${report.orderNumber}؟ سيتم حذف القيود المحاسبية وعكس الخزن/البنوك والمخزون.` 
        : `Are you sure you want to reverse and cancel cashier report ${report.orderNumber}? This will roll back accounts, treasuries, banks, and JVs.`,
      () => {
        const matchingEntries = data.journalEntries.filter(je =>
          je.description.includes(report.cashierName || '') && je.date === report.date
        );

        let updatedTreasuries = [...data.treasuries];
        let updatedBankAccounts = [...data.bankAccounts];
        let updatedCustomers = data.customers;

        // Reverse customer balance if this was a credit sale
        try {
          const metaMatch = report.description?.match(/\[({.*})\]/);
          if (metaMatch) {
            const meta = JSON.parse(metaMatch[1]);
            if (meta.customer) {
              updatedCustomers = updatedCustomers.map(c =>
                c.id === meta.customer ? { ...c, balance: Math.max(0, c.balance - report.totalAmount) } : c
              );
            }
          }
        } catch (e) {}

        matchingEntries.forEach(je => {
          je.lines.forEach(l => {
            if (l.debit > 0) {
              updatedTreasuries = updatedTreasuries.map(t => {
                if (t.accountId === l.accountId) {
                  return { ...t, balance: Math.max(0, t.balance - l.debit) };
                }
                return t;
              });
              updatedBankAccounts = updatedBankAccounts.map(b => {
                if (b.accountId === l.accountId) {
                  return { ...b, balance: Math.max(0, b.balance - l.debit) };
                }
                return b;
              });
            }
          });
        });

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

        const nextSales = (data.sales || []).filter(s => s.id !== report.id);
        const nextEntries = data.journalEntries.filter(je =>
          !(je.description.includes(report.cashierName || '') && je.date === report.date)
        );

        if (onUpdateERPState) {
          onUpdateERPState(prev => ({
            ...prev,
            customers: updatedCustomers,
            sales: nextSales,
            treasuries: updatedTreasuries,
            bankAccounts: updatedBankAccounts,
            accounts: accountsToUpdate,
            journalEntries: nextEntries
          }));
        } else {
          onUpdateSales(nextSales);
          onUpdateTreasuries(updatedTreasuries);
          onUpdateBankAccounts(updatedBankAccounts);
          onUpdateAccounts(accountsToUpdate);
          onUpdateEntries(nextEntries);
        }

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

  const recordedSalesList = data.sales || [];
  const totalSalesAll = recordedSalesList.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCashAll = recordedSalesList.reduce((sum, s) => sum + (s.cashAmount || 0), 0);
  const totalCardAll = recordedSalesList.reduce((sum, s) => sum + (s.cardAmount || 0), 0);
  const totalFoodCostAll = recordedSalesList.reduce((sum, s) => sum + s.foodCost, 0);

  // COMPUTED PREVIEW DATA FOR SECTIONS 7 - Linked to chart of accounts by real IDs
  const getAccountByIdOrCode = (idOrCode: string) => {
    return data.accounts.find(a => a.id === idOrCode) || data.accounts.find(a => a.code === idOrCode);
  };

  const getAccountName = (accountId: string, fallbackAr: string, fallbackEn: string) => {
    const acc = getAccountByIdOrCode(accountId);
    return acc ? { nameAr: acc.nameAr, nameEn: acc.nameEn, code: acc.code } : { nameAr: fallbackAr, nameEn: fallbackEn, code: accountId };
  };

  const previewJournalLines = React.useMemo(() => {
    const lines: { accountId: string; debit: number; credit: number; accountNameAr: string; accountNameEn: string; accountCode: string }[] = [];

    const treasuryAcc = data.treasuries.find(t => t.id === selectedTreasuryId);
    const bankAcc = data.bankAccounts.find(b => b.id === selectedBankAccountId);

    if (cashCollected > 0) {
      const aid = treasuryAcc?.accountId || '101';
      const an = getAccountName(aid, 'النقدية بالخزينة', 'Cash in Treasury');
      lines.push({ accountId: aid, debit: cashCollected, credit: 0, accountNameAr: an.nameAr, accountNameEn: an.nameEn, accountCode: an.code });
    }
    if (cardCollected > 0) {
      const aid = bankAcc?.accountId || '102';
      const an = getAccountName(aid, 'البنك - فيزا', 'Bank - Card');
      lines.push({ accountId: aid, debit: cardCollected, credit: 0, accountNameAr: an.nameAr, accountNameEn: an.nameEn, accountCode: an.code });
    }
    if (walletAmount > 0) {
      const aid = bankAcc?.accountId || '102';
      const an = getAccountName(aid, 'البنك - محفظة', 'Bank - Wallet');
      lines.push({ accountId: aid, debit: walletAmount, credit: 0, accountNameAr: `${an.nameAr} (${walletName || 'Wallet'})`, accountNameEn: `${an.nameEn} (${walletName || 'Wallet'})`, accountCode: an.code });
    }
    if (bankTransferAmount > 0) {
      const aid = bankAcc?.accountId || '102';
      const an = getAccountName(aid, 'البنك - تحويل', 'Bank - Transfer');
      lines.push({ accountId: aid, debit: bankTransferAmount, credit: 0, accountNameAr: an.nameAr, accountNameEn: an.nameEn, accountCode: an.code });
    }
    if (chequeAmount > 0) {
      const aid = bankAcc?.accountId || '102';
      const an = getAccountName(aid, 'البنك - شيك', 'Bank - Cheque');
      lines.push({ accountId: aid, debit: chequeAmount, credit: 0, accountNameAr: an.nameAr, accountNameEn: an.nameEn, accountCode: an.code });
    }
    if (subtotalRevenue > 0) {
      const revAfterDiscount = Math.max(0, activeDineIn + serviceCharge - discountAmount);
      if (revAfterDiscount > 0) {
        const an = getAccountName('401', 'مبيعات الصالة', 'Dine-In Sales');
        lines.push({ accountId: '401', debit: 0, credit: revAfterDiscount, accountNameAr: an.nameAr, accountNameEn: an.nameEn, accountCode: an.code });
      }
      if (activeTakeaway > 0) {
        const an = getAccountName('402', 'مبيعات التيك أواي', 'Takeaway Sales');
        lines.push({ accountId: '402', debit: 0, credit: activeTakeaway, accountNameAr: an.nameAr, accountNameEn: an.nameEn, accountCode: an.code });
      }
      if (activeDelivery > 0) {
        const an = getAccountName('403', 'مبيعات الدليفري', 'Delivery Sales');
        lines.push({ accountId: '403', debit: 0, credit: activeDelivery, accountNameAr: an.nameAr, accountNameEn: an.nameEn, accountCode: an.code });
      }
      if (activeDeliveryApps > 0) {
        const an = getAccountName('404', 'مبيعات التطبيقات', 'Apps Sales');
        lines.push({ accountId: '404', debit: 0, credit: activeDeliveryApps, accountNameAr: an.nameAr, accountNameEn: an.nameEn, accountCode: an.code });
      }
    }
    if (additionalFees > 0) {
      const an = getAccountName('401', 'إيرادات صالة - رسوم إضافية', 'Dine-In Sales - Additional Fees');
      lines.push({ accountId: '401', debit: 0, credit: additionalFees, accountNameAr: an.nameAr, accountNameEn: an.nameEn, accountCode: an.code });
    }
    if (vatTax > 0) {
      const vatAccount = getAccountByIdOrCode('2103001');
      const aid = vatAccount?.id || '203';
      const an = getAccountName(aid, 'ضريبة المبيعات', 'VAT Payable');
      lines.push({ accountId: aid, debit: 0, credit: vatTax, accountNameAr: an.nameAr, accountNameEn: an.nameEn, accountCode: an.code });
    }
    if (subtotalRevenue > 0) {
      const estCost = deductionMethod === 'ESTIMATED' ? Math.round(subtotalRevenue * (estimatedCostPercent / 100)) : 0;
      if (estCost > 0) {
        const an501 = getAccountName('501', 'تكلفة المبيعات', 'Cost of Sales');
        const an104 = getAccountName('104', 'مخزون المواد الخام', 'Inventory Asset');
        lines.push({ accountId: '501', debit: estCost, credit: 0, accountNameAr: an501.nameAr, accountNameEn: an501.nameEn, accountCode: an501.code });
        lines.push({ accountId: '104', debit: 0, credit: estCost, accountNameAr: an104.nameAr, accountNameEn: an104.nameEn, accountCode: an104.code });
      }
    }
    if (discrepancy < 0) {
      const an = getAccountName('603', 'مصروف عجز نقدي', 'Cash Shortage Expense');
      lines.push({ accountId: '603', debit: Math.abs(discrepancy), credit: 0, accountNameAr: an.nameAr, accountNameEn: an.nameEn, accountCode: an.code });
    }
    if (discrepancy > 0) {
      const an = getAccountName('401', 'فائض نقدي', 'Cash Overage');
      lines.push({ accountId: '401', debit: 0, credit: discrepancy, accountNameAr: an.nameAr, accountNameEn: an.nameEn, accountCode: an.code });
    }
    return lines;
  }, [cashCollected, cardCollected, subtotalRevenue, activeDineIn, activeTakeaway, activeDelivery, activeDeliveryApps, serviceCharge, vatTax, discrepancy, deductionMethod, estimatedCostPercent, selectedTreasuryId, selectedBankAccountId, discountAmount, additionalFees, data.accounts, data.treasuries, data.bankAccounts, isAr]);

  const selectedCustomer = data.customers?.find(c => c.id === customerId);

  const erpOperations = [
    { key: 'save', labelAr: 'حفظ الفاتورة', labelEn: 'Invoice Saved', icon: FileCheck, ready: true },
    { key: 'recipe', labelAr: 'حساب تكلفة الوصفات', labelEn: 'Recipe Cost Calculation', icon: Scale, ready: deductionMethod === 'ITEMIZED' && itemizedList.length > 0 },
    { key: 'consume', labelAr: 'استهلاك المواد الخام', labelEn: 'Raw Material Consumption', icon: Package, ready: activeDeductionIngredients.length > 0 },
    { key: 'deduct', labelAr: 'خصم المخزون', labelEn: 'Inventory Deduction', icon: Box, ready: activeDeductionIngredients.length > 0 || (deductionMethod === 'ESTIMATED' && subtotalRevenue > 0) },
    { key: 'stock', labelAr: 'حركة المخزون', labelEn: 'Stock Movement', icon: TrendingDown, ready: true },
    { key: 'journal', labelAr: 'قيود محاسبية', labelEn: 'Accounting Journal Entry', icon: ScrollText, ready: subtotalRevenue > 0 },
    { key: 'cash', labelAr: 'معاملة نقدية/بنكية', labelEn: 'Cash/Bank Transaction', icon: BanknoteIcon, ready: paidAmount > 0 },
    { key: 'costcenter', labelAr: 'تحديث مركز التكلفة', labelEn: 'Cost Center Update', icon: Layers, ready: true },
    { key: 'report', labelAr: 'تحديث تقارير المبيعات', labelEn: 'Sales Reports Update', icon: NotebookTabs, ready: true },
    { key: 'profit', labelAr: 'حساب الربح', labelEn: 'Profit Calculation', icon: TrendingUp, ready: subtotalRevenue > 0 },
    { key: 'invrepo', labelAr: 'تحديث تقارير المخزون', icon: ClipboardList, labelEn: 'Inventory Reports Update', ready: true },
    { key: 'dash', labelAr: 'تحديث إحصائيات لوحة التحكم', labelEn: 'Dashboard Statistics Update', icon: Gauge, ready: true },
  ];

  return (
    <div id="backoffice_sales_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-slate-900 dark:text-white" />
            <span>{isAr ? 'نقطة البيع المتكاملة - POS' : 'Point of Sale - POS Terminal'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-1">
            {isAr 
              ? 'إدارة المبيعات: إنشاء الفواتير، اختيار طرق الدفع، ومعاينة التأثير المحاسبي والمخزني قبل الترحيل.' 
              : 'Sales management: create invoices, select payment methods, and preview accounting & inventory impact before posting.'}
          </p>
        </div>

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
            <span>{isAr ? 'سجل الفواتير' : 'Invoices Log'}</span>
          </button>
          <button
            id="tab_new_sales"
            onClick={() => setActiveTab('NEW')}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'NEW' 
                ? 'bg-violet-600 text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>{isAr ? 'فاتورة جديدة' : 'New Invoice'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-violet-50 dark:bg-violet-950/30 text-slate-900 dark:text-white rounded-xl">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              {isAr ? 'إجمالي المبيعات المرحلة' : 'Total Posted Revenues'}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
              {formatNum(totalSalesAll)} ج.م
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-slate-900 dark:text-white rounded-xl">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              {isAr ? 'المبالغ النقدية المستلمة' : 'Total Cash Handed Over'}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
              {formatNum(totalCashAll)} ج.م
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-xl">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              {isAr ? 'إيداعات الشبكة والفيزا' : 'Bank Visa/Card Collected'}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
              {formatNum(totalCardAll)} ج.م
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-slate-900 dark:text-white rounded-xl">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              {isAr ? 'تكلفة الخامات المخصومة' : 'Cost of Food Deducted'}
            </span>
            <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
              {formatNum(totalFoodCostAll)} ج.م
            </span>
          </div>
        </div>
      </div>

      {activeTab === 'LIST' ? (
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Receipt className="h-4 w-4 text-violet-500" />
              {isAr ? 'سجل فواتير نقطة البيع' : 'POS Invoice History'}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    const invoices = (data.sales || []).map(s => ({
                      orderNumber: s.orderNumber,
                      date: s.date,
                      cashierName: s.cashierName || '',
                      description: (s.description || '').split(' [')[0],
                      dineInAmount: s.dineInAmount || 0,
                      takeawayAmount: s.takeawayAmount || 0,
                      deliveryAmount: s.deliveryAmount || 0,
                      deliveryAppsAmount: s.deliveryAppsAmount || 0,
                      cashAmount: s.cashAmount || 0,
                      cardAmount: s.cardAmount || 0,
                      serviceCharge: s.serviceCharge || 0,
                      taxAmount: s.taxAmount,
                      totalAmount: s.totalAmount,
                      foodCost: s.foodCost,
                    }));
                    await exportPOSInvoicesExcel(invoices, isAr ? 'ar' : 'en');
                  } catch (err) {
                    console.error('Export POS error:', err);
                    window.showAlert('فشل تصدير المبيعات', 'Sales export failed', 'danger');
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{isAr ? 'تصدير Excel' : 'Export Excel'}</span>
              </button>
              <span className="text-[10px] bg-violet-500/10 text-slate-900 dark:text-white px-2.5 py-1 rounded-full font-extrabold">
                {recordedSalesList.length} {isAr ? 'فاتورة مسجلة' : 'Invoices Registered'}
              </span>
            </div>
          </div>

          {recordedSalesList.length === 0 ? (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500 space-y-3">
              <Receipt className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">
                {isAr ? 'لا توجد فواتير مبيعات مسجلة حتى الآن.' : 'No POS invoices have been registered yet.'}
              </p>
              <button
                onClick={() => setActiveTab('NEW')}
                className="bg-violet-600 hover:bg-violet-700 text-white text-xs px-4 py-2 rounded-lg font-black transition-all cursor-pointer"
              >
                {isAr ? 'إنشاء أول فاتورة' : 'Create First Invoice'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 text-start">{isAr ? 'رقم الفاتورة / التاريخ' : 'Invoice No / Date'}</th>
                    <th className="p-4 text-start">{isAr ? 'الكاشير' : 'Cashier'}</th>
                    <th className="p-4 text-start">{isAr ? 'توزيع القنوات' : 'Channel Distribution'}</th>
                    <th className="p-4 text-start">{isAr ? 'المدفوعات (نقدي / فيزا)' : 'Payments (Cash/Card)'}</th>
                    <th className="p-4 text-start">{isAr ? 'الإجمالي' : 'Total'}</th>
                    <th className="p-4 text-start">{isAr ? 'تكلفة الطعام' : 'Food Cost'}</th>
                    <th className="p-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {recordedSalesList.map(report => {
                    const totalChannels = (report.dineInAmount || 0) + (report.takeawayAmount || 0) + (report.deliveryAmount || 0) + (report.deliveryAppsAmount || 0);
                    return (
                      <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 font-semibold text-slate-900 dark:text-slate-300">
                          <div className="font-bold text-slate-900 dark:text-white">{report.orderNumber}</div>
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
                          {report.dineInAmount ? <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {isAr ? 'صالة:' : 'Dine:'} <span className="font-mono text-slate-700 dark:text-slate-300">{report.dineInAmount} ج.م</span></div> : null}
                          {report.takeawayAmount ? <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400" /> {isAr ? 'تيك أواي:' : 'Takeaway:'} <span className="font-mono text-slate-700 dark:text-slate-300">{report.takeawayAmount} ج.م</span></div> : null}
                          {report.deliveryAmount ? <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> {isAr ? 'دليفري:' : 'Delivery:'} <span className="font-mono text-slate-700 dark:text-slate-300">{report.deliveryAmount} ج.م</span></div> : null}
                          {report.deliveryAppsAmount ? <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> {isAr ? 'تطبيقات:' : 'Apps:'} <span className="font-mono text-slate-700 dark:text-slate-300">{report.deliveryAppsAmount} ج.م</span></div> : null}
                        </td>
                        <td className="p-4 text-[10px] space-y-1">
                          <div className="flex gap-2 items-center">
                            <span className="bg-amber-100 dark:bg-amber-950/50 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold">Cash</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatNum(report.cashAmount || 0)} ج.م</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-extrabold">Card</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatNum(report.cardAmount || 0)} ج.م</span>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          <div className="font-mono">{formatNum(report.totalAmount)} ج.م</div>
                          <span className="text-[9px] bg-emerald-500/10 text-slate-900 dark:text-white px-1.5 py-0.5 rounded font-black uppercase font-mono tracking-wider">
                            {isAr ? 'مرحل' : 'Posted'}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                          {formatNum(report.foodCost)} ج.م
                          <div className="text-[9px] text-slate-400 font-semibold">{isAr ? 'مخصوم' : 'Deducted'}</div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleReverseReport(report)}
                            className="bg-rose-50 text-slate-900 dark:text-white hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 p-2 rounded-xl transition-all font-black text-[10px]"
                            title={isAr ? 'عكس وحذف' : 'Reverse and Delete'}
                          >
                            <Undo2 className="h-3.5 w-3.5 inline" /> {isAr ? 'عكس' : 'Reverse'}
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
        <form onSubmit={handlePostShiftReport} className="space-y-5">

          {/* SECTION 1: Invoice Information */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-50/50 to-white dark:from-violet-950/10 dark:to-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/40 rounded-xl">
                  <Receipt className="h-4 w-4 text-slate-900 dark:text-white dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    {isAr ? 'معلومات الفاتورة' : 'Invoice Information'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {isAr ? 'بيانات الفاتورة الأساسية' : 'Basic invoice metadata'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block">{isAr ? 'رقم الفاتورة' : 'Invoice No.'}</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white font-mono">{generateInvoiceNumber()}</span>
                </div>
                {(() => {
                  const cfg = getStatusConfig(invoiceStatus);
                  const Icon = cfg.icon;
                  return (
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold ${cfg.bg} ${cfg.color}`}>
                      <Icon className="h-3 w-3" />
                      {isAr ? cfg.labelAr : cfg.labelEn}
                    </span>
                  );
                })()}
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="group">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 group-focus-within:text-slate-900 dark:text-white transition-colors flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {isAr ? 'تاريخ الفاتورة' : 'Invoice Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={salesDate}
                    onChange={(e) => setSalesDate(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>

                <div className="group">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 group-focus-within:text-slate-900 dark:text-white transition-colors flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    {isAr ? 'اسم الكاشير' : 'Cashier Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    placeholder={isAr ? 'اسم الكاشير' : 'Cashier name'}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>

                <div className="group">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Store className="h-3 w-3" />
                    {isAr ? 'الفرع' : 'Branch'}
                  </label>
                  <div className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    {isAr ? 'الفرع الرئيسي' : 'Main Branch'}
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    {isAr ? 'العميل' : 'Customer'}
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  >
                    <option value="">{isAr ? '-- عميل نقدي (غير محدد) --' : '-- Cash Customer --'}</option>
                    {(data.customers || []).map(c => (
                      <option key={c.id} value={c.id}>{isAr ? c.nameAr : c.nameEn}</option>
                    ))}
                  </select>
                </div>

                <div className="group">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Grid3X3 className="h-3 w-3" />
                    {isAr ? 'نوع الطلب' : 'Order Type'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { value: 'DINE_IN', ar: 'صالة', en: 'Dine-In', icon: '🍽️' },
                      { value: 'TAKEAWAY', ar: 'تيك أواي', en: 'Takeaway', icon: '🛍️' },
                      { value: 'DELIVERY', ar: 'دليفري', en: 'Delivery', icon: '🛵' },
                      { value: 'APPS', ar: 'تطبيق', en: 'App', icon: '📱' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setOrderType(opt.value as any)}
                        className={`flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-black rounded-xl transition-all ${
                          orderType === opt.value
                            ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <span>{opt.icon}</span>
                        <span>{isAr ? opt.ar : opt.en}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Barcode className="h-3 w-3" />
                    {isAr ? 'بحث سريع / باركود' : 'Quick Search / Barcode'}
                  </label>
                  <div className="relative">
                    <span className={`absolute inset-y-0 ${isAr ? 'right-3' : 'left-3'} flex items-center text-slate-400`}>
                      <Search className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      placeholder={isAr ? 'ابحث عن منتج...' : 'Search product...'}
                      className={`w-full text-xs font-bold py-2.5 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition-all`}
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Percent className="h-3 w-3" />
                    {isAr ? 'حساب الوجبات' : 'Sales Mode'}
                  </label>
                  <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => { setCalcMode('MANUAL'); setDeductionMethod('ESTIMATED'); }}
                      className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${
                        calcMode === 'MANUAL'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {isAr ? 'يدوي' : 'Manual'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCalcMode('ITEMIZED'); setDeductionMethod('ITEMIZED'); }}
                      className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${
                        calcMode === 'ITEMIZED'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {isAr ? 'أصناف' : 'Itemized'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 group">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <FileSpreadsheet className="h-3 w-3" />
                  {isAr ? 'ملاحظات' : 'Notes'}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isAr ? 'ملاحظات إضافية...' : 'Additional notes...'}
                  rows={1}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* SECTION 1.5: Food Cost & Inventory Deduction Method */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mt-5">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-50/50 to-white dark:from-violet-950/10 dark:to-slate-950 flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/40 rounded-xl">
                <Scale className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  {isAr ? 'خصم المواد الخام وتكلفة الأغذية' : 'Food Cost & Stock Deduction'}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {isAr ? 'تحديد طريقة احتساب التكلفة والخامات المستهلكة بالوردية' : 'Set shift costing and ingredient consumption methods'}
                </p>
              </div>
            </div>
            <div className="p-6 text-start text-xs">
              <div className="flex flex-col gap-3">
                <div className="group">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                    {isAr ? 'طريقة الخصم واحتساب التكلفة' : 'Deduction & Costing Method'}
                  </label>
                  <select
                    value={deductionMethod}
                    onChange={(e) => setDeductionMethod(e.target.value as any)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  >
                    <option value="ESTIMATED">
                      {isAr ? 'تقدير تلقائي (نسبة مئوية من الإيراد)' : 'Estimated (% of Revenue)'}
                    </option>
                    {calcMode === 'ITEMIZED' && (
                      <option value="ITEMIZED">
                        {isAr ? 'حساب تلقائي بالوصفات (مبني على الوجبات)' : 'Recipe-based (Automatic)'}
                      </option>
                    )}
                    <option value="MANUAL_RAW">
                      {isAr ? 'تحديد يدوي للخامات المستهلكة (الاستهلاك الفعلي)' : 'Manual Raw Materials (Actual Consumption)'}
                    </option>
                  </select>
                </div>

                {/* Estimated percentage inputs */}
                {deductionMethod === 'ESTIMATED' && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-1 text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                      <span>{isAr ? 'نسبة تكلفة الطعام:' : 'Food Cost Percentage:'}</span>
                      <span className="text-violet-600 dark:text-violet-400">{estimatedCostPercent}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={estimatedCostPercent}
                        onChange={(e) => setEstimatedCostPercent(Number(e.target.value))}
                        className="flex-1 accent-violet-600 dark:accent-violet-500 cursor-pointer"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={estimatedCostPercent}
                        onChange={(e) => setEstimatedCostPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-12 text-center text-xs font-bold p-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Manual Raw Material inputs */}
                {deductionMethod === 'MANUAL_RAW' && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                    {/* Copy recipes helper button if itemized list exists */}
                    {calcMode === 'ITEMIZED' && explodedIngredients.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const confirmed = window.confirm(
                            isAr 
                              ? 'هل تريد استيراد جميع خامات الوجبات المباعة بالوردية للتعديل عليها يدوياً؟' 
                              : 'Do you want to import all recipe ingredients from sold meals to edit them manually?'
                          );
                          if (confirmed) {
                            const imported = explodedIngredients.map(ing => ({
                              itemId: ing.id,
                              quantity: ing.qtyNeeded
                            }));
                            setManualRawList(imported);
                          }
                        }}
                        className="w-full bg-white hover:bg-slate-100 text-violet-700 dark:bg-slate-950 dark:hover:bg-slate-800 text-[9px] font-black py-1.5 rounded-lg transition-all border border-violet-200 dark:border-violet-900/30 flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        {isAr ? 'استيراد خامات الوجبات للوردية' : 'Import Recipe Ingredients'}
                      </button>
                    )}

                    {/* Add Raw Material form */}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 min-w-0">
                        <label className="block text-[9px] font-bold text-slate-400 mb-1">
                          {isAr ? 'المادة الخام' : 'Raw Material'}
                        </label>
                        <select
                          value={selectedRawItemId}
                          onChange={(e) => setSelectedRawItemId(e.target.value)}
                          className="w-full text-[10px] font-bold p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          <option value="">{isAr ? '-- اختر مادة خام --' : '-- Select Material --'}</option>
                          {data.inventory
                            .filter(i => i.category !== ItemCategory.FinishedProduct)
                            .map(item => (
                              <option key={item.id} value={item.id}>
                                {isAr ? item.nameAr : item.nameEn} ({isAr ? item.unitAr : item.unitEn}) - تكلفة: {item.cost || 0}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="w-20 shrink-0">
                        <label className="block text-[9px] font-bold text-slate-400 mb-1">
                          {isAr ? 'الكمية' : 'Qty'}
                        </label>
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={selectedRawQty}
                          onChange={(e) => setSelectedRawQty(Number(e.target.value))}
                          className="w-full text-[10px] font-bold p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none text-center"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedRawItemId) return;
                          const existing = manualRawList.find(i => i.itemId === selectedRawItemId);
                          if (existing) {
                            setManualRawList(
                              manualRawList.map(i =>
                                i.itemId === selectedRawItemId
                                  ? { ...i, quantity: Number((i.quantity + selectedRawQty).toFixed(3)) }
                                  : i
                              )
                            );
                          } else {
                            setManualRawList([...manualRawList, { itemId: selectedRawItemId, quantity: selectedRawQty }]);
                          }
                          setSelectedRawItemId('');
                          setSelectedRawQty(1);
                        }}
                        className="bg-violet-600 hover:bg-violet-700 text-white p-2 rounded-lg transition-all shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Manual Raw Material table */}
                    {manualRawList.length > 0 ? (
                      <div className="max-h-[160px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950">
                        <table className="w-full text-[10px] text-start border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase border-b border-slate-150 dark:border-slate-800">
                              <th className="p-2 text-start">{isAr ? 'المادة' : 'Material'}</th>
                              <th className="p-2 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                              <th className="p-2 text-center">{isAr ? 'التكلفة' : 'Cost'}</th>
                              <th className="p-2 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {manualRawList.map(entry => {
                              const rawItem = data.inventory.find(ri => ri.id === entry.itemId);
                              const totalCost = entry.quantity * (rawItem?.cost || 0);
                              return (
                                <tr key={entry.itemId} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/20">
                                  <td className="p-2 font-bold text-slate-700 dark:text-slate-350">
                                    {rawItem ? (isAr ? rawItem.nameAr : rawItem.nameEn) : entry.itemId}
                                  </td>
                                  <td className="p-2 text-center font-mono text-slate-800 dark:text-slate-200">
                                    {entry.quantity} {rawItem ? (isAr ? rawItem.unitAr : rawItem.unitEn) : ''}
                                  </td>
                                  <td className="p-2 text-center font-mono text-emerald-600 dark:text-emerald-400">
                                    {formatNum(totalCost)} ج.م
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setManualRawList(manualRawList.filter(i => i.itemId !== entry.itemId))}
                                      className="text-rose-500 hover:text-rose-700 transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 text-center font-medium py-2">
                        {isAr ? 'لم يتم إضافة أي خامات بعد الوردية' : 'No materials added yet'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Products Data Grid */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-50/50 to-white dark:from-violet-950/10 dark:to-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 dark:bg-violet-900/40 rounded-xl">
                  <ShoppingCart className="h-4 w-4 text-slate-900 dark:text-white dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    {isAr ? 'المنتجات' : 'Products'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {isAr ? 'إضافة وتعديل الأصناف المباعة' : 'Add and manage sold items'}
                  </p>
                </div>
              </div>
              {calcMode === 'MANUAL' && itemizedList.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyItemizedTotals}
                  className="bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-extrabold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all hover:shadow-md hover:shadow-violet-500/20"
                >
                  <RefreshCw className="h-3 w-3" />
                  {isAr ? 'تطبيق الكميات' : 'Apply Quantities'}
                </button>
              )}
            </div>

            <div className="p-6">
              {/* Search bar - always visible */}
              <div className="mb-4">
                <div className="relative">
                  <span className={`absolute inset-y-0 ${isAr ? 'right-3' : 'left-3'} flex items-center text-slate-400`}>
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder={isAr ? 'ابحث عن وجبة...' : 'Search meal...'}
                    className={`w-full text-xs font-bold py-2.5 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all`}
                  />
                </div>
              </div>

              {/* Channel indicator */}
              {calcMode === 'ITEMIZED' && (
                <div className="mb-3 flex items-center gap-2 text-xs font-bold">
                  <span className="text-slate-400">{isAr ? 'تضاف إلى:' : 'Adding to:'}</span>
                  <span className={`px-2.5 py-1 rounded-lg text-white text-[11px] font-black ${
                    orderType === 'DINE_IN' ? 'bg-amber-500' :
                    orderType === 'TAKEAWAY' ? 'bg-sky-500' :
                    orderType === 'DELIVERY' ? 'bg-orange-500' : 'bg-emerald-500'
                  }`}>
                    {orderType === 'DINE_IN' ? '🍽️ ' : orderType === 'TAKEAWAY' ? '🛍️ ' : orderType === 'DELIVERY' ? '🛵 ' : '📱 '}
                    {orderType === 'DINE_IN' ? (isAr ? 'صالة' : 'Dine-In') :
                     orderType === 'TAKEAWAY' ? (isAr ? 'تيك أواي' : 'Takeaway') :
                     orderType === 'DELIVERY' ? (isAr ? 'دليفري' : 'Delivery') :
                     (isAr ? 'تطبيق' : 'App')}
                  </span>
                </div>
              )}

              {/* Meals grid - all available finished products */}
              {calcMode === 'ITEMIZED' && (
                <div className="mb-6">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 max-h-[300px] overflow-y-auto p-1">
                    {(menuSearch ? filteredProducts : finishedProducts).map(prod => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleAddItemToSummary(prod)}
                        className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border border-slate-100 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md hover:shadow-violet-500/10 transition-all text-center"
                      >
                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-slate-900 dark:text-white dark:text-violet-400 text-xs font-black">
                          {prod.code.slice(0, 2)}
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 line-clamp-2 leading-tight">
                          {isAr ? prod.nameAr : prod.nameEn}
                        </span>
                        <span className="text-[8px] font-mono font-black text-slate-900 dark:text-white">
                          {formatNum(getItemPrice(prod.id, prod.cost))}
                        </span>
                      </button>
                    ))}
                    {finishedProducts.length === 0 && (
                      <div className="col-span-full text-center py-6 text-[10px] text-slate-400">
                        {isAr ? 'لا توجد وجبات متاحة' : 'No meals available'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Products Data Grid */}
              {itemizedList.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-start border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                        <th className="p-3 text-start">{isAr ? 'المنتج' : 'Product'}</th>
                        <th className="p-3 text-start">{isAr ? 'رمز SKU' : 'SKU'}</th>
                        <th className="p-3 text-start">{isAr ? 'الوحدة' : 'Unit'}</th>
                        <th className="p-3 text-start">{isAr ? 'نوع الطلب' : 'Type'}</th>
                        <th className="p-3 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                        <th className="p-3 text-center">{isAr ? 'التحكم' : 'Control'}</th>
                        <th className="p-3 text-start">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                        <th className="p-3 text-start">{isAr ? 'الإجمالي' : 'Total'}</th>
                        <th className="p-3 text-center">{isAr ? 'حذف' : 'Remove'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {itemizedList.map(entry => {
                        const itemPrice = getItemPrice(entry.item.id, entry.item.cost);
                        const lineTotal = itemPrice * entry.qty;
                        return (
                          <tr key={`${entry.item.id}-${entry.channel}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center text-violet-500 text-[9px] font-black shrink-0">
                                  {entry.item.code.slice(0, 2)}
                                </div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[160px]">
                                  {isAr ? entry.item.nameAr : entry.item.nameEn}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-[10px] text-slate-400 font-semibold">{entry.item.code}</td>
                            <td className="p-3 text-slate-500 text-[10px]">{isAr ? entry.item.unitAr : entry.item.unitEn}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black text-white ${
                                entry.channel === 'DINE_IN' ? 'bg-amber-500' :
                                entry.channel === 'TAKEAWAY' ? 'bg-sky-500' :
                                entry.channel === 'DELIVERY' ? 'bg-orange-500' : 'bg-emerald-500'
                              }`}>
                                {entry.channel === 'DINE_IN' ? '🍽️' : entry.channel === 'TAKEAWAY' ? '🛍️' : entry.channel === 'DELIVERY' ? '🛵' : '📱'}
                                {entry.channel === 'DINE_IN' ? (isAr ? 'صالة' : 'Dine') :
                                 entry.channel === 'TAKEAWAY' ? (isAr ? 'تيك أواي' : 'Take') :
                                 entry.channel === 'DELIVERY' ? (isAr ? 'دليفري' : 'Deli') : (isAr ? 'تطبيق' : 'App')}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">{entry.qty}</td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(entry.item.id, entry.channel, -1)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(entry.item.id, entry.channel, 1)}
                                  className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-slate-900 dark:text-white hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-all cursor-pointer"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatNum(itemPrice)}</span>
                              <span className="text-[9px] text-slate-400 mr-1">ج.م</span>
                            </td>
                            <td className="p-3">
                              <span className="font-mono font-black text-slate-900 dark:text-white">{formatNum(lineTotal)}</span>
                              <span className="text-[9px] text-slate-400 mr-1">ج.م</span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(entry.item.id, entry.channel)}
                                className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-slate-900 dark:text-white hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                calcMode === 'ITEMIZED' && (
                  <div className="text-center py-6 text-slate-400 dark:text-slate-500">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">
                      {isAr ? 'اختر وجبة من الشبكة أعلاه لإضافتها' : 'Select a meal from the grid above'}
                    </p>
                  </div>
                )
              )}

              {/* Channel Revenue Inputs for MANUAL mode */}
              {calcMode === 'MANUAL' && (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/10 dark:to-slate-950 border border-amber-200/50 dark:border-amber-900/30">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      {isAr ? 'مبيعات الصالة' : 'Dine-In Sales'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={dineInSales || ''}
                      onChange={(e) => setDineInSales(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 transition-all"
                    />
                  </div>
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-sky-50/80 to-white dark:from-sky-950/10 dark:to-slate-950 border border-sky-200/50 dark:border-sky-900/30">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      {isAr ? 'مبيعات التيك أواي' : 'Takeaway Sales'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={takeawaySales || ''}
                      onChange={(e) => setTakeawaySales(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-white dark:bg-slate-900 border border-sky-200/60 dark:border-sky-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 transition-all"
                    />
                  </div>
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-orange-50/80 to-white dark:from-orange-950/10 dark:to-slate-950 border border-orange-200/50 dark:border-orange-900/30">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      {isAr ? 'مبيعات الدليفري' : 'Delivery Sales'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={deliverySales || ''}
                      onChange={(e) => setDeliverySales(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-white dark:bg-slate-900 border border-orange-200/60 dark:border-orange-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 transition-all"
                    />
                  </div>
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-50/80 to-white dark:from-rose-950/10 dark:to-slate-950 border border-rose-200/50 dark:border-rose-900/30">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      {isAr ? 'مبيعات التطبيقات' : 'Apps Sales'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={deliveryAppsSales || ''}
                      onChange={(e) => setDeliveryAppsSales(Number(e.target.value))}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: Invoice Summary + SECTION 4: Payment Methods (side by side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* SECTION 3: Invoice Summary */}
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-50/50 to-white dark:from-emerald-950/10 dark:to-slate-950 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
                  <Calculator className="h-4 w-4 text-slate-900 dark:text-white dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    {isAr ? 'ملخص الفاتورة' : 'Invoice Summary'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {isAr ? 'تفاصيل الإيرادات والمبالغ' : 'Revenue and amount breakdown'}
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-2.5">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500">{isAr ? 'إجمالي المبيعات' : 'Subtotal Revenue'}</span>
                  <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">{formatNum(subtotalRevenue)} ج.م</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500">{isAr ? 'الخصم' : 'Discount'}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={discountAmount || ''}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="w-20 text-[10px] font-bold p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-red-400 text-end"
                    />
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">- {formatNum(discountAmount)} ج.م</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500">{isAr ? 'رسوم الخدمة' : 'Service Charge'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setServiceCharge(Math.round(activeDineIn * 0.12))}
                      className="text-[9px] text-slate-900 dark:text-white hover:text-slate-900 dark:text-white font-extrabold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full hover:bg-emerald-100"
                    >
                      {isAr ? '12%' : 'Auto'}
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={serviceCharge || ''}
                      onChange={(e) => setServiceCharge(Number(e.target.value))}
                      className="w-20 text-[10px] font-bold p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-400 text-end"
                    />
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">+ {formatNum(serviceCharge)} ج.م</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500">{isAr ? 'الضريبة (VAT)' : 'Tax (VAT)'}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={vatTax || ''}
                      onChange={(e) => setVatTax(Number(e.target.value))}
                      className="w-20 text-[10px] font-bold p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-400 text-end"
                    />
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">{formatNum(vatTax)} ج.م</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500">{isAr ? 'رسوم إضافية' : 'Additional Fees'}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={additionalFees || ''}
                      onChange={(e) => setAdditionalFees(Number(e.target.value))}
                      className="w-20 text-[10px] font-bold p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-400 text-end"
                    />
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">+ {formatNum(additionalFees)} ج.م</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-3 bg-violet-50 dark:bg-violet-950/30 rounded-xl px-3 -mx-3">
                  <span className="text-sm font-black text-slate-800 dark:text-white">{isAr ? 'الإجمالي النهائي' : 'Grand Total'}</span>
                  <span className="text-lg font-black font-mono text-slate-900 dark:text-white">{formatNum(grandTotalRequired)} ج.م</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                  <span className="text-[11px] font-semibold text-slate-500">{isAr ? 'المبلغ المدفوع' : 'Paid Amount'}</span>
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">{formatNum(paidAmount)} ج.م</span>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">{isAr ? 'المبلغ المتبقي' : 'Remaining'}</span>
                  <span className={`text-xs font-black font-mono ${remaining > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'}`}>{formatNum(remaining)} ج.م</span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                  <span className="text-[11px] font-semibold text-slate-500">{isAr ? 'صافي الفاتورة' : 'Net Amount'}</span>
                  <span className="text-xs font-black font-mono text-slate-900 dark:text-white">{formatNum(netAmount)} ج.م</span>
                </div>

                {discrepancy !== 0 && (
                  <div className={`p-2.5 rounded-xl flex items-center gap-2 ${
                    discrepancy < 0
                      ? 'bg-rose-50 dark:bg-rose-950/30 text-slate-900 dark:text-white'
                      : 'bg-amber-50 dark:bg-amber-950/30 text-slate-900 dark:text-white'
                  }`}>
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[10px] font-bold">
                      {discrepancy < 0
                        ? (isAr ? `عجز: ${formatNum(Math.abs(discrepancy))} ج.م` : `Shortage: ${formatNum(Math.abs(discrepancy))} EGP`)
                        : (isAr ? `فائض: ${formatNum(discrepancy)} ج.م` : `Overage: ${formatNum(discrepancy)} EGP`)}
                    </span>
                  </div>
                )}

                {discrepancy === 0 && paidAmount > 0 && grandTotalRequired > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[10px] font-bold">{isAr ? 'مطابق 100% - لا توجد فروقات' : '100% Matched - No discrepancies'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 4: Payment Methods */}
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/50 to-white dark:from-blue-950/10 dark:to-slate-950 flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                  <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    {isAr ? 'طرق الدفع' : 'Payment Methods'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {isAr ? 'اختيار طريقة الدفع وتحديد الحساب' : 'Select payment method and destination'}
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Payment Method Cards - All types */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('CASH')}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      selectedPaymentMethod === 'CASH'
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-sm shadow-emerald-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <div className={`p-1.5 rounded-lg ${selectedPaymentMethod === 'CASH' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-slate-900 dark:text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <DollarSign className="h-4 w-4" />
                      </div>
                    </div>
                    <p className={`text-[9px] font-black ${selectedPaymentMethod === 'CASH' ? 'text-slate-900 dark:text-white dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                      {isAr ? 'نقداً' : 'Cash'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('CARD')}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      selectedPaymentMethod === 'CARD'
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 shadow-sm shadow-blue-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <div className={`p-1.5 rounded-lg ${selectedPaymentMethod === 'CARD' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <CreditCard className="h-4 w-4" />
                      </div>
                    </div>
                    <p className={`text-[9px] font-black ${selectedPaymentMethod === 'CARD' ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>
                      {isAr ? 'فيزا' : 'Visa'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('WALLET')}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      selectedPaymentMethod === 'WALLET'
                        ? 'border-violet-500 bg-violet-50/60 dark:bg-violet-950/30 shadow-sm shadow-violet-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <div className={`p-1.5 rounded-lg ${selectedPaymentMethod === 'WALLET' ? 'bg-violet-100 dark:bg-violet-900/40 text-slate-900 dark:text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <Wallet className="h-4 w-4" />
                      </div>
                    </div>
                    <p className={`text-[9px] font-black ${selectedPaymentMethod === 'WALLET' ? 'text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-400'}`}>
                      {isAr ? 'محفظة' : 'Wallet'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('BANK_TRANSFER')}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      selectedPaymentMethod === 'BANK_TRANSFER'
                        ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 shadow-sm shadow-sky-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <div className={`p-1.5 rounded-lg ${selectedPaymentMethod === 'BANK_TRANSFER' ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <Landmark className="h-4 w-4" />
                      </div>
                    </div>
                    <p className={`text-[9px] font-black ${selectedPaymentMethod === 'BANK_TRANSFER' ? 'text-sky-700 dark:text-sky-300' : 'text-slate-600 dark:text-slate-400'}`}>
                      {isAr ? 'تحويل بنكي' : 'Bank Transfer'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('CHEQUE')}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      selectedPaymentMethod === 'CHEQUE'
                        ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 shadow-sm shadow-amber-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <div className={`p-1.5 rounded-lg ${selectedPaymentMethod === 'CHEQUE' ? 'bg-amber-100 dark:bg-amber-900/40 text-slate-900 dark:text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <FileCheck className="h-4 w-4" />
                      </div>
                    </div>
                    <p className={`text-[9px] font-black ${selectedPaymentMethod === 'CHEQUE' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-400'}`}>
                      {isAr ? 'شيك' : 'Cheque'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('MIXED')}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      selectedPaymentMethod === 'MIXED'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 shadow-sm shadow-rose-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <div className={`p-1.5 rounded-lg ${selectedPaymentMethod === 'MIXED' ? 'bg-rose-100 dark:bg-rose-900/40 text-slate-900 dark:text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <ArrowLeftRight className="h-4 w-4" />
                      </div>
                    </div>
                    <p className={`text-[9px] font-black ${selectedPaymentMethod === 'MIXED' ? 'text-slate-900 dark:text-white dark:text-rose-300' : 'text-slate-600 dark:text-slate-400'}`}>
                      {isAr ? 'مختلط' : 'Mixed'}
                    </p>
                  </button>
                </div>

                {/* CASH inputs */}
                {selectedPaymentMethod === 'CASH' && (
                  <div className="space-y-3 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30">
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        {isAr ? 'المبلغ النقدي المستلم' : 'Cash Received'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={cashCollected || ''}
                        onChange={(e) => setCashCollected(Number(e.target.value))}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                    {cashCollected > grandTotalRequired && (
                      <div className="text-[10px] text-slate-900 dark:text-white font-bold flex items-center gap-1 bg-emerald-100/50 dark:bg-emerald-900/20 p-2 rounded-lg">
                        <BadgeCheck className="h-3 w-3" />
                        {isAr ? `الباقي: ${formatNum(cashCollected - grandTotalRequired)} ج.م` : `Change: ${formatNum(cashCollected - grandTotalRequired)} EGP`}
                      </div>
                    )}
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                        <Landmark className="h-3 w-3" />
                        {isAr ? 'الخزينة المستهدفة' : 'Target Treasury'}
                      </label>
                      <select
                        value={selectedTreasuryId}
                        onChange={(e) => setSelectedTreasuryId(e.target.value)}
                        className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none focus:border-emerald-500 transition-all"
                      >
                        <option value="" disabled>{isAr ? '-- اختر الخزينة --' : '-- Select Treasury --'}</option>
                        {data.treasuries.map(t => (
                          <option key={t.id} value={t.id}>
                            {isAr ? t.nameAr : t.nameEn} ({t.balance.toLocaleString()} ج.م)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* CARD/VISA inputs */}
                {selectedPaymentMethod === 'CARD' && (
                  <div className="space-y-3 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30">
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        {isAr ? 'مبلغ الفيزا' : 'Card Amount'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={cardCollected || ''}
                        onChange={(e) => setCardCollected(Number(e.target.value))}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="group">
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          {isAr ? 'رقم الجهاز' : 'Terminal No.'}
                        </label>
                        <input
                          type="text"
                          placeholder="T-001"
                          className="w-full text-[10px] font-semibold p-2 rounded-lg bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          {isAr ? 'رقم المرجع' : 'Reference No.'}
                        </label>
                        <input
                          type="text"
                          placeholder="REF-123"
                          className="w-full text-[10px] font-semibold p-2 rounded-lg bg-white dark:bg-slate-900 border border-blue-200/60 dark:border-blue-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                        <Landmark className="h-3 w-3" />
                        {isAr ? 'البنك المستهدف' : 'Target Bank'}
                      </label>
                      <select
                        value={selectedBankAccountId}
                        onChange={(e) => setSelectedBankAccountId(e.target.value)}
                        className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none focus:border-blue-500 transition-all"
                      >
                        <option value="" disabled>{isAr ? '-- اختر البنك --' : '-- Select Bank --'}</option>
                        {data.bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>
                            {isAr ? b.bankNameAr : b.bankNameEn} ({b.balance.toLocaleString()} ج.م)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* WALLET inputs */}
                {selectedPaymentMethod === 'WALLET' && (
                  <div className="space-y-3 p-4 rounded-xl bg-violet-50/50 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900/30">
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        {isAr ? 'مبلغ المحفظة' : 'Wallet Amount'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={walletAmount || ''}
                        onChange={(e) => setWalletAmount(Number(e.target.value))}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-violet-200/60 dark:border-violet-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                      />
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        {isAr ? 'اسم المحفظة' : 'Wallet Name'}
                      </label>
                      <input
                        type="text"
                        value={walletName}
                        onChange={(e) => setWalletName(e.target.value)}
                        placeholder={isAr ? 'مثال: فودافون كاش' : 'e.g., Vodafone Cash'}
                        className="w-full text-xs font-semibold p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-violet-200/60 dark:border-violet-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        {isAr ? 'رقم المعاملة' : 'Transaction ID'}
                      </label>
                      <input
                        type="text"
                        placeholder="TXN-001"
                        className="w-full text-[10px] font-semibold p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-violet-200/60 dark:border-violet-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                )}

                {/* BANK TRANSFER inputs - Connected to bank accounts */}
                {selectedPaymentMethod === 'BANK_TRANSFER' && (
                  <div className="space-y-3 p-4 rounded-xl bg-sky-50/50 dark:bg-sky-950/10 border border-sky-100 dark:border-sky-900/30">
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        {isAr ? 'مبلغ التحويل' : 'Transfer Amount'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={bankTransferAmount || ''}
                        onChange={(e) => setBankTransferAmount(Number(e.target.value))}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200/60 dark:border-sky-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                      />
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                        <Landmark className="h-3 w-3" />
                        {isAr ? 'الحساب البنكي' : 'Bank Account'}
                      </label>
                      <select
                        value={selectedBankAccountId}
                        onChange={(e) => setSelectedBankAccountId(e.target.value)}
                        className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-sky-200/60 dark:border-sky-800/40 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none focus:border-sky-500 transition-all"
                      >
                        <option value="" disabled>{isAr ? '-- اختر الحساب --' : '-- Select Account --'}</option>
                        {data.bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>
                            {isAr ? b.bankNameAr : b.bankNameEn} - {b.accountNumber} ({b.balance.toLocaleString()} ج.م)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        {isAr ? 'رقم المرجع' : 'Reference No.'}
                      </label>
                      <input
                        type="text"
                        placeholder="BNK-REF"
                        className="w-full text-xs font-semibold p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200/60 dark:border-sky-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                )}

                {/* CHEQUE inputs - Connected to bank accounts */}
                {selectedPaymentMethod === 'CHEQUE' && (
                  <div className="space-y-3 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30">
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        {isAr ? 'مبلغ الشيك' : 'Cheque Amount'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={chequeAmount || ''}
                        onChange={(e) => setChequeAmount(Number(e.target.value))}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="group">
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          {isAr ? 'رقم الشيك' : 'Cheque No.'}
                        </label>
                        <input
                          type="text"
                          placeholder="CHK-001"
                          className="w-full text-[10px] font-semibold p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          {isAr ? 'تاريخ الاستحقاق' : 'Due Date'}
                        </label>
                        <input
                          type="date"
                          className="w-full text-[10px] font-semibold p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                        {isAr ? 'البنك المسحوب منه' : 'Bank Drawn On'}
                      </label>
                      <select
                        value={chequeDrawnBank}
                        onChange={(e) => setChequeDrawnBank(e.target.value)}
                        className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none focus:border-amber-500 transition-all"
                      >
                        <option value="">{isAr ? '-- اختر البنك --' : '-- Select Bank --'}</option>
                        {data.bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>
                            {isAr ? b.bankNameAr : b.bankNameEn} - {b.accountNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                        <Landmark className="h-3 w-3" />
                        {isAr ? 'البنك المستهدف للإيداع' : 'Target Bank for Deposit'}
                      </label>
                      <select
                        value={selectedBankAccountId}
                        onChange={(e) => setSelectedBankAccountId(e.target.value)}
                        className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none focus:border-amber-500 transition-all"
                      >
                        <option value="" disabled>{isAr ? '-- اختر البنك --' : '-- Select Bank --'}</option>
                        {data.bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>
                            {isAr ? b.bankNameAr : b.bankNameEn} ({b.balance.toLocaleString()} ج.م)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* MIXED inputs - Connected to cashCollected/cardCollected */}
                {selectedPaymentMethod === 'MIXED' && (
                  <div className="space-y-3 p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="group">
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          {isAr ? 'نقداً' : 'Cash'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={cashCollected || ''}
                          onChange={(e) => setCashCollected(Number(e.target.value))}
                          placeholder="0"
                          className="w-full text-xs font-bold p-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          {isAr ? 'فيزا' : 'Card'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={cardCollected || ''}
                          onChange={(e) => setCardCollected(Number(e.target.value))}
                          placeholder="0"
                          className="w-full text-xs font-bold p-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-800/40 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    </div>
                    <div className="p-2 bg-white/50 dark:bg-slate-900/50 rounded-lg flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500">{isAr ? 'الإجمالي المطلوب' : 'Total Required'}</span>
                      <span className="text-xs font-black font-mono text-slate-900 dark:text-white">{formatNum(grandTotalRequired)} ج.م</span>
                    </div>
                    <div className="group">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                        <Landmark className="h-3 w-3" />
                        {isAr ? 'الخزينة المستهدفة للنقدي' : 'Target Treasury for Cash'}
                      </label>
                      <select
                        value={selectedTreasuryId}
                        onChange={(e) => setSelectedTreasuryId(e.target.value)}
                        className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border border-rose-200/60 dark:border-rose-800/40 bg-white dark:bg-slate-950 text-slate-950 dark:text-white focus:outline-none focus:border-rose-500 transition-all"
                      >
                        <option value="" disabled>{isAr ? '-- اختر الخزينة --' : '-- Select Treasury --'}</option>
                        {data.treasuries.map(t => (
                          <option key={t.id} value={t.id}>
                            {isAr ? t.nameAr : t.nameEn} ({t.balance.toLocaleString()} ج.م)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {selectedPaymentMethod === 'CASH' && paidAmount < grandTotalRequired && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCashCollected(grandTotalRequired)}
                      className="text-[10px] font-extrabold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg transition-all"
                    >
                      {isAr ? 'تسوية الإجمالي' : 'Settle Total'}
                    </button>
                  </div>
                )}
                {selectedPaymentMethod === 'CARD' && paidAmount < grandTotalRequired && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCardCollected(grandTotalRequired)}
                      className="text-[10px] font-extrabold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg transition-all"
                    >
                      {isAr ? 'تسوية الإجمالي' : 'Settle Total'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 5: Automatic ERP Operations Timeline */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 to-white dark:from-indigo-950/10 dark:to-slate-950 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
                <Route className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  {isAr ? 'عمليات ERP التلقائية' : 'Automatic ERP Operations'}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {isAr ? 'التسلسل الزمني للعمليات التي ستنفذ بعد تأكيد الفاتورة' : 'Workflow sequence executed after invoice confirmation'}
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {erpOperations.map((op, idx) => {
                  const Icon = op.icon;
                  return (
                    <div key={op.key} className={`relative flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      op.ready
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800 opacity-60'
                    }`}>
                      <div className={`p-1.5 rounded-lg ${
                        op.ready
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-slate-900 dark:text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[10px] font-bold truncate ${
                          op.ready ? 'text-slate-900 dark:text-white dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          {isAr ? op.labelAr : op.labelEn}
                        </p>
                        <span className={`text-[8px] font-semibold ${
                          op.ready ? 'text-emerald-500' : 'text-slate-400'
                        }`}>
                          {op.ready
                            ? (isAr ? '✓ جاهز للتنفيذ' : '✓ Ready to execute')
                            : (isAr ? '⟳ ينتظر البيانات' : '⟳ Awaiting data')
                          }
                        </span>
                      </div>
                      {idx < erpOperations.length - 1 && (
                        <div className="hidden lg:block absolute -right-[calc(50%+1.5rem)] top-1/2 -translate-y-1/2 z-10">
                          <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 6: Recipe Consumption Preview */}
          {activeDeductionIngredients.length > 0 && (
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-50/50 to-white dark:from-amber-950/10 dark:to-slate-950 flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
                  <Scale className="h-4 w-4 text-slate-900 dark:text-white dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    {isAr ? 'معاينة استهلاك الوصفات واليدوي' : 'Consumption Preview'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {isAr ? 'المواد الخام التي سيتم خصمها من المخزن - للمعاينة فقط' : 'Raw materials to be deducted from inventory - preview only'}
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-start border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                        <th className="p-3 text-start">{isAr ? 'المادة الخام' : 'Raw Material'}</th>
                        <th className="p-3 text-start">{isAr ? 'الكمية المطلوبة' : 'Qty Needed'}</th>
                        <th className="p-3 text-start">{isAr ? 'الوحدة' : 'Unit'}</th>
                        <th className="p-3 text-start">{isAr ? 'المخزون الحالي' : 'Current Stock'}</th>
                        <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {activeDeductionIngredients.map(ing => {
                        const isShortage = ing.qtyNeeded > ing.currentQty;
                        return (
                          <tr key={ing.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                              {isAr ? ing.nameAr : ing.nameEn}
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {ing.qtyNeeded.toLocaleString()}
                            </td>
                            <td className="p-3 text-slate-400 text-[10px] font-semibold">
                              {isAr ? ing.unitAr : ing.unitEn}
                            </td>
                            <td className="p-3 font-mono text-slate-500">
                              {ing.currentQty.toLocaleString()}
                            </td>
                            <td className="p-3">
                              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                                isShortage
                                  ? 'bg-rose-50 text-slate-900 dark:text-white dark:bg-rose-950/30 dark:text-rose-400'
                                  : 'bg-emerald-50 text-slate-900 dark:text-white dark:bg-emerald-950/30 dark:text-emerald-400'
                              }`}>
                                {isShortage ? (
                                  <><AlertTriangle className="h-3 w-3" /> {isAr ? 'نقص' : 'Shortage'}</>
                                ) : (
                                  <><Check className="h-3 w-3" /> {isAr ? 'متوفر' : 'Available'}</>
                                )}
                              </span>
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

          {/* SECTION 7: Accounting Preview */}
          {subtotalRevenue > 0 && (
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-50/50 to-white dark:from-blue-950/10 dark:to-slate-950 flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                  <ScrollText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    {isAr ? 'معاينة القيود المحاسبية' : 'Accounting Preview'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {isAr ? 'القيود التي سيتم ترحيلها في دفتر الأستاذ العام' : 'Journal entries to be posted to the general ledger'}
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-start border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                        <th className="p-3 text-start">{isAr ? 'كود الحساب' : 'Account Code'}</th>
                        <th className="p-3 text-start">{isAr ? 'اسم الحساب' : 'Account Name'}</th>
                        <th className="p-3 text-start">{isAr ? 'مدين' : 'Debit'}</th>
                        <th className="p-3 text-start">{isAr ? 'دائن' : 'Credit'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {previewJournalLines.map((line, idx) => (
                        <tr key={line.accountCode} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 font-mono text-[10px] font-bold text-slate-500">{line.accountCode}</td>
                          <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{isAr ? line.accountNameAr : line.accountNameEn}</td>
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{line.debit > 0 ? formatNum(line.debit) : '-'}</td>
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{line.credit > 0 ? formatNum(line.credit) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 text-[11px] font-black">
                        <td colSpan={2} className="p-3 text-slate-700 dark:text-slate-300">{isAr ? 'المجموع' : 'Total'}</td>
                        <td className="p-3 text-slate-900 dark:text-white font-mono">{formatNum(previewJournalLines.reduce((s, l) => s + l.debit, 0))}</td>
                        <td className="p-3 text-slate-900 dark:text-white font-mono">{formatNum(previewJournalLines.reduce((s, l) => s + l.credit, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {discountAmount > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 flex items-center gap-2">
                    <Percent className="h-3.5 w-3.5 text-slate-900 dark:text-white shrink-0" />
                    <span className="text-[10px] text-slate-900 dark:text-white dark:text-rose-400 font-semibold">
                      {isAr
                        ? `خصم بقيمة ${formatNum(discountAmount)} ج.م - تم تخفيض إيرادات الصالة`
                        : `Discount ${formatNum(discountAmount)} EGP - deducted from Dine-In revenue`}
                    </span>
                  </div>
                )}
                {additionalFees > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 flex items-center gap-2">
                    <Plus className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                      {isAr
                        ? `رسوم إضافية بقيمة ${formatNum(additionalFees)} ج.م - مضافة لإيرادات الصالة`
                        : `Additional fees ${formatNum(additionalFees)} EGP - added to Dine-In revenue`}
                    </span>
                  </div>
                )}
                {deductionMethod === 'ESTIMATED' && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 flex items-center gap-2">
                    <Percent className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                      {isAr
                        ? `تقدير تكلفة الطعام بنسبة ${estimatedCostPercent}% من الإيرادات`
                        : `Estimated food cost at ${estimatedCostPercent}% of revenue`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 8: Inventory Movement Preview */}
          {activeDeductionIngredients.length > 0 && (
            <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-orange-50/50 to-white dark:from-orange-950/10 dark:to-slate-950 flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
                  <Box className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    {isAr ? 'معاينة حركة المخزون' : 'Inventory Movement Preview'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {isAr ? 'تأثير الخصم على أرصدة المخازن' : 'Deduction impact on warehouse stock levels'}
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                  <table className="w-full text-start border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                        <th className="p-3 text-start">{isAr ? 'المادة' : 'Material'}</th>
                        <th className="p-3 text-start">{isAr ? 'المخزون الحالي' : 'Current Stock'}</th>
                        <th className="p-3 text-start">{isAr ? 'الكمية المستهلكة' : 'Consumed Qty'}</th>
                        <th className="p-3 text-start">{isAr ? 'المخزون المتبقي' : 'Remaining Stock'}</th>
                        <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {activeDeductionIngredients.map(ing => {
                        const remaining = Math.max(0, ing.currentQty - ing.qtyNeeded);
                        const isShortage = ing.qtyNeeded > ing.currentQty;
                        return (
                          <tr key={ing.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                              {isAr ? ing.nameAr : ing.nameEn}
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {ing.currentQty.toLocaleString()} {isAr ? ing.unitAr : ing.unitEn}
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                              -{ing.qtyNeeded.toLocaleString()} {isAr ? ing.unitAr : ing.unitEn}
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {remaining.toLocaleString()} {isAr ? ing.unitAr : ing.unitEn}
                            </td>
                            <td className="p-3">
                              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                                isShortage
                                  ? 'bg-rose-50 text-slate-900 dark:text-white dark:bg-rose-950/30 dark:text-rose-400'
                                  : remaining <= ing.currentQty * 0.2
                                    ? 'bg-amber-50 text-slate-900 dark:text-white dark:bg-amber-950/30 dark:text-amber-400'
                                    : 'bg-emerald-50 text-slate-900 dark:text-white dark:bg-emerald-950/30 dark:text-emerald-400'
                              }`}>
                                {isShortage
                                  ? <><AlertTriangle className="h-3 w-3" /> {isAr ? 'نقص حاد' : 'Shortage'}</>
                                  : remaining <= ing.currentQty * 0.2
                                    ? <><AlertTriangle className="h-3 w-3" /> {isAr ? 'مخزون منخفض' : 'Low Stock'}</>
                                    : <><Check className="h-3 w-3" /> {isAr ? 'متوفر' : 'In Stock'}</>
                                }
                              </span>
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

          {/* SECTION 9: Action Buttons */}
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  id="btn_post_shift_reconciliation"
                  className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold py-2.5 px-5 rounded-xl text-[11px] flex items-center gap-2 shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-200"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{isAr ? 'تأكيد وترحيل الفاتورة' : 'Confirm & Post Invoice'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-extrabold py-2.5 px-4 rounded-xl text-[10px] flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>{isAr ? 'مسودة' : 'Draft'}</span>
                </button>

                <button
                  type="button"
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-extrabold py-2.5 px-4 rounded-xl text-[10px] flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all"
                >
                  <Timer className="h-3.5 w-3.5" />
                  <span>{isAr ? 'تعليق' : 'Suspend'}</span>
                </button>

                <button
                  type="button"
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-extrabold py-2.5 px-4 rounded-xl text-[10px] flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>{isAr ? 'طباعة' : 'Print'}</span>
                </button>

                <button
                  type="button"
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-extrabold py-2.5 px-4 rounded-xl text-[10px] flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all"
                >
                  <NotebookTabs className="h-3.5 w-3.5" />
                  <span>{isAr ? 'طباعة المطبخ' : 'Kitchen Ticket'}</span>
                </button>

                <button
                  type="button"
                  className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-extrabold py-2.5 px-4 rounded-xl text-[10px] flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>{isAr ? 'فتح الدرج' : 'Open Drawer'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-slate-900 dark:text-white font-extrabold py-2.5 px-4 rounded-xl text-[10px] flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{isAr ? 'إعادة تعيين' : 'Reset'}</span>
                </button>
                <button
                  type="button"
                  className="bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-slate-900 dark:text-white font-extrabold py-2.5 px-4 rounded-xl text-[10px] flex items-center gap-1.5 transition-all"
                  onClick={() => {
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
                    setWalletAmount(0);
                    setWalletName('');
                    setBankTransferAmount(0);
                    setChequeAmount(0);
                    setChequeDrawnBank('');
                    setDiscountAmount(0);
                    setAdditionalFees(0);
                    setItemizedList([]);
                    setMenuSearch('');
                    setCustomerId('');
                    setInvoiceStatus('DRAFT');
                  }}
                >
                  <Ban className="h-4 w-4" />
                  <span>{isAr ? 'إلغاء' : 'Cancel'}</span>
                </button>
              </div>
            </div>

            {/* SECTION 10: Invoice Status Badges */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{isAr ? 'حالة الفاتورة:' : 'Invoice Status:'}</span>
                {(['DRAFT', 'PENDING', 'CONFIRMED', 'PAID', 'RETURNED', 'CANCELLED', 'SUSPENDED'] as const).map(status => {
                  const cfg = getStatusConfig(status);
                  const Icon = cfg.icon;
                  const isActive = invoiceStatus === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setInvoiceStatus(status)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold transition-all ${
                        isActive
                          ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1 ring-${status === 'DRAFT' ? 'amber' : status === 'PAID' ? 'emerald' : status === 'CANCELLED' ? 'rose' : status === 'RETURNED' ? 'orange' : status === 'SUSPENDED' ? 'purple' : 'blue'}-400`
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {isAr ? cfg.labelAr : cfg.labelEn}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </form>
      )}

      {alertModal.show && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-3xl shadow-2xl w-full max-w-sm text-start overflow-hidden flex flex-col text-xs font-semibold">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-855 flex justify-between items-center shrink-0">
              <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider">{alertModal.title}</span>
              <button onClick={() => setAlertModal(prev => ({ ...prev, show: false }))} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <div className="flex justify-center">
                <ShieldCheck className={`h-12 w-12 ${
                  alertModal.type === 'success' ? 'text-emerald-500' :
                  alertModal.type === 'error' ? 'text-slate-900 dark:text-white' :
                  alertModal.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                }`} />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{alertModal.message}</p>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-855 flex justify-end shrink-0">
              <button 
                onClick={() => setAlertModal(prev => ({ ...prev, show: false }))} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl cursor-pointer"
              >
                {isAr ? 'موافق' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-3xl shadow-2xl w-full max-w-sm text-start overflow-hidden flex flex-col text-xs font-semibold">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-855 flex justify-between items-center shrink-0">
              <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider">{confirmModal.title}</span>
              <button onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} className="text-slate-400 hover:text-slate-655 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4 text-center">
              <div className="flex justify-center">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-855 flex justify-end gap-2 shrink-0">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))} 
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-355 px-4 py-2 rounded-xl cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, show: false }));
                }} 
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl cursor-pointer"
              >
                {isAr ? 'تأكيد' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
