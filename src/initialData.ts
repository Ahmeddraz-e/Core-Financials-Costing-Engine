import { ERPData, AccountType, JournalEntryType, ItemCategory, PurchaseStatus, SaleChannel, TreasuryTransType, ChequeStatus, EmployeeShift } from './types';

export const initialERPData: ERPData = {
  accounts: [
    // Assets (1xxx)
    { id: '101', code: '1101001', nameAr: 'الخزينة الرئيسية - كاش', nameEn: 'Main Cash Box', type: AccountType.Asset, parentCode: null, balance: 0 },
    { id: '102', code: '1102001', nameAr: 'حساب البنك الأهلي المصري', nameEn: 'National Bank of Egypt (NBE)', type: AccountType.Asset, parentCode: null, balance: 0 },
    { id: '103', code: '1103001', nameAr: 'العملاء - حسابات مدينة', nameEn: 'Accounts Receivable (Customers)', type: AccountType.Asset, parentCode: null, balance: 0 },
    { id: '104', code: '1104001', nameAr: 'مخزن المواد الغذائية والمشروبات', nameEn: 'Food & Beverage Inventory', type: AccountType.Asset, parentCode: null, balance: 0 },
    { id: '105', code: '1105001', nameAr: 'مخزن مواد التعبئة والتغليف', nameEn: 'Packaging Inventory', type: AccountType.Asset, parentCode: null, balance: 0 },
    { id: '106', code: '1201001', nameAr: 'أصول ثابتة - معدات مطبخ', nameEn: 'Fixed Assets - Kitchen Equipment', type: AccountType.Asset, parentCode: null, balance: 0 },
    { id: '107', code: '1106001', nameAr: 'سلف وعُهد الموظفين', nameEn: 'Staff Advances & Loans', type: AccountType.Asset, parentCode: null, balance: 0 },

    // Liabilities (2xxx)
    { id: '201', code: '2101001', nameAr: 'الموردين - حسابات دائنة', nameEn: 'Accounts Payable (Suppliers)', type: AccountType.Liability, parentCode: null, balance: 0 },
    { id: '202', code: '2102001', nameAr: 'مستحقات رواتب الموظفين', nameEn: 'Accrued Salaries', type: AccountType.Liability, parentCode: null, balance: 0 },
    { id: '203', code: '2103001', nameAr: 'مستحقات الضرائب (القيمة المضافة)', nameEn: 'VAT Payable', type: AccountType.Liability, parentCode: null, balance: 0 },

    // Equity (3xxx)
    { id: '301', code: '3101001', nameAr: 'رأس مال الشركة', nameEn: 'Share Capital', type: AccountType.Equity, parentCode: null, balance: 0 },
    { id: '302', code: '3102001', nameAr: 'أرباح وخسائر مرحلة', nameEn: 'Retained Earnings', type: AccountType.Equity, parentCode: null, balance: 0 },

    // Revenues (4xxx)
    { id: '401', code: '4101001', nameAr: 'مبيعات الصالة', nameEn: 'Dine-In Sales', type: AccountType.Revenue, parentCode: null, balance: 0 },
    { id: '402', code: '4102001', nameAr: 'مبيعات التيك أواي', nameEn: 'Takeaway Sales', type: AccountType.Revenue, parentCode: null, balance: 0 },
    { id: '403', code: '4103001', nameAr: 'مبيعات التوصيل (دليفري)', nameEn: 'Direct Delivery Sales', type: AccountType.Revenue, parentCode: null, balance: 0 },
    { id: '404', code: '4104001', nameAr: 'مبيعات تطبيقات التوصيل', nameEn: 'Third-Party App Sales', type: AccountType.Revenue, parentCode: null, balance: 0 },
    { id: '405', code: '4107001', nameAr: 'إيراد غرامات وجزاءات الموظفين', nameEn: 'Employee Penalties Income', type: AccountType.Revenue, parentCode: null, balance: 0 },
    { id: '406', code: '4108001', nameAr: 'خصم المبيعات والمسموحات', nameEn: 'Sales Discounts & Allowances', type: AccountType.Revenue, parentCode: null, balance: 0 },

    // Cost Of Sales (5xxx)
    { id: '501', code: '5101001', nameAr: 'تكلفة المواد الغذائية المستهلكة', nameEn: 'Cost of Food Used', type: AccountType.CostOfSales, parentCode: null, balance: 0 },
    { id: '502', code: '5102001', nameAr: 'تكلفة المشروبات المستهلكة', nameEn: 'Cost of Beverages Used', type: AccountType.CostOfSales, parentCode: null, balance: 0 },
    { id: '503', code: '5103001', nameAr: 'تكلفة مواد التغليف المستهلكة', nameEn: 'Cost of Packaging Used', type: AccountType.CostOfSales, parentCode: null, balance: 0 },
    { id: '504', code: '5104001', nameAr: 'تكلفة الهالك والفاقد', nameEn: 'Cost of Food Wastage', type: AccountType.CostOfSales, parentCode: null, balance: 0 },

    // Expenses (6xxx)
    { id: '601', code: '6101001', nameAr: 'مصروفات الرواتب والأجور', nameEn: 'Salaries & Wages Expense', type: AccountType.Expense, parentCode: null, balance: 0 },
    { id: '602', code: '6102001', nameAr: 'مصروفات الإيجار', nameEn: 'Rent Expense', type: AccountType.Expense, parentCode: null, balance: 0 },
    { id: '603', code: '6103001', nameAr: 'مصروف كهرباء ومياه وغاز', nameEn: 'Utilities (Electricity, Water, Gas)', type: AccountType.Expense, parentCode: null, balance: 0 },
    { id: '604', code: '6104001', nameAr: 'مصروفات التسويق والدعاية', nameEn: 'Marketing & Advertising', type: AccountType.Expense, parentCode: null, balance: 0 },
    { id: '605', code: '6105001', nameAr: 'مصروف إهلاك أصول ثابتة', nameEn: 'Depreciation Expense', type: AccountType.Expense, parentCode: null, balance: 0 },
    { id: '606', code: '6106001', nameAr: 'مصروف البدلات والإضافات', nameEn: 'Allowances Expense', type: AccountType.Expense, parentCode: null, balance: 0 }
  ],
  journalEntries: [],
  purchases: [],
  inventory: [],
  wastage: [],
  recipes: [],
  sales: [],
  treasuries: [
    { id: 'cb-1', nameAr: 'خزينة الفرع الرئيسي - الكاشير', nameEn: 'Main Branch Cashier', balance: 0, branch: 'main', responsible: 'أحمد محمد', accountId: '101' }
  ],
  bankAccounts: [
    { id: 'ba-1', accountNumber: 'EG1234567890123456789', bankNameAr: 'البنك الأهلي المصري - حساب جاري', bankNameEn: 'NBE - Current Account', balance: 0, branch: 'main', responsible: 'شادي مصطفى', accountId: '102' }
  ],
  moneyTransactions: [],
  cheques: [],
  fixedAssets: [],
  employees: [],
  budgets: [],
  suppliers: [],
  customers: [],
  auditLogs: [],
  backupSchedule: {
    frequency: 'DAILY',
    time: '23:00',
    target: 'LOCAL',
    enabled: true
  },
  salesInvoices: [],
  vouchers: [],
  salesReturns: [],
  purchaseReturns: [],
  payrollRuns: [],
  accountingPeriods: [],
  checkbooks: [],
  companyProfile: {
    nameAr: 'لودينغ للأغذية',
    nameEn: 'LODing Foods',
    registrationNumber: 'ERP-2026-01',
    taxNumber: '123456789',
    addressAr: '123 شارع المهندسين، الجيزة',
    addressEn: 'Mohandessin St, Giza 123',
    email: 'info@loding-erp.com',
    phone: '+20 2 1234 5678',
    branches: 'الفرع الرئيسي, فرع الدقي, فرع مدينة نصر',
    zakatRate: 15
  }
};
