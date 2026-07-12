export enum AccountType {
  Asset = 'ASSET',
  Liability = 'LIABILITY',
  Equity = 'EQUITY',
  Revenue = 'REVENUE',
  CostOfSales = 'COST_OF_SALES',
  Expense = 'EXPENSE'
}

export interface Account {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: AccountType;
  parentCode: string | null;
  balance: number;
  isSystem?: boolean;
}

export enum JournalEntryType {
  Manual = 'MANUAL',
  Auto = 'AUTO',
  Adjustment = 'ADJUSTMENT',
  Opening = 'OPENING',
  Closing = 'CLOSING',
  Recurring = 'RECURRING'
}

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  items?: { itemId: string; nameAr: string; nameEn: string; quantity: number; unitAr: string; unitEn: string; cost: number }[];
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  type: JournalEntryType;
  description: string;
  lines: JournalLine[];
  approved: boolean;
  approvedBy?: string;
}

export enum PurchaseStatus {
  Draft = 'DRAFT',
  Requested = 'REQUESTED',
  Approved = 'APPROVED',
  Ordered = 'ORDERED',
  Received = 'RECEIVED',
  Invoiced = 'INVOICED',
  Paid = 'PAID',
  Returned = 'RETURNED'
}

export interface PurchaseItem {
  itemId: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseTransaction {
  id: string;
  number: string;
  date: string;
  supplierId: string;
  status: PurchaseStatus;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  type: 'REQUEST' | 'ORDER' | 'RECEIPT' | 'INVOICE' | 'PAYMENT';
}

export enum ItemCategory {
  FoodRaw = 'FOOD_RAW',
  Beverage = 'BEVERAGE',
  Packaging = 'PACKAGING',
  Cleaning = 'CLEANING',
  OperatingSupply = 'OPERATING_SUPPLY',
  SemiFinished = 'SEMI_FINISHED',
  FinishedProduct = 'FINISHED_PRODUCT'
}

export interface InventoryItem {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: ItemCategory;
  unitAr: string;
  unitEn: string;
  cost: number;
  quantity: number;
  reorderPoint: number;
  yieldPercent?: number; // نسبة التصافي
}

export interface WastageLog {
  id: string;
  itemId: string;
  quantity: number;
  date: string;
  reason: string;
  cost: number;
}

export interface RecipeComponent {
  componentItemId: string; // From InventoryItem (raw, semi-finished)
  quantity: number; // weight or amount needed
  lossPercent: number; // نسبة الهالك
}

export interface Recipe {
  id: string;
  itemId: string; // The finished product ID in InventoryItem
  version?: number;
  isActive?: boolean;
  yieldAmount: number; // output amount of the recipe (e.g., 1 meal or 1 kg)
  components: RecipeComponent[];
  laborCost: number;
  packagingCost: number;
  otherOperatingCost: number;
  calculatedCost: number;
  sellingPrice: number;
  marginPercent: number;
  foodCostPercent: number;
}

export enum SaleChannel {
  DineIn = 'DINE_IN',
  Takeaway = 'TAKEAWAY',
  Delivery = 'DELIVERY',
  DeliveryApps = 'DELIVERY_APPS'
}

export interface SaleOrder {
  id: string;
  orderNumber: string;
  date: string;
  channel?: SaleChannel;
  cashierName?: string;
  dineInAmount?: number;
  takeawayAmount?: number;
  deliveryAmount?: number;
  deliveryAppsAmount?: number;
  cashAmount?: number;
  cardAmount?: number;
  serviceCharge?: number;
  taxAmount: number;
  totalAmount: number;
  foodCost: number;
  description?: string;
  items?: {
    itemId: string; // finished item
    quantity: number;
    price: number;
    cost: number;
  }[];
}

export enum TreasuryTransType {
  Receipt = 'RECEIPT', // سند قبض
  Payment = 'PAYMENT', // سند صرف
  Transfer = 'TRANSFER', // تحويل خزائن
  Deposit = 'DEPOSIT', // إيداع بنكي
  Withdrawal = 'WITHDRAWAL' // سحب بنكي
}

export interface BankAccount {
  id: string;
  accountNumber: string;
  bankNameAr: string;
  bankNameEn: string;
  balance: number;
  branch?: string;
  responsible?: string;
  accountId?: string;
}

export interface Treasury {
  id: string;
  nameAr: string;
  nameEn: string;
  balance: number;
  branch?: string;
  responsible?: string;
  accountId?: string;
}

export interface CheckbookCheck {
  number: number;
  status: 'UNUSED' | 'USED' | 'CANCELLED';
  voucherId?: string;
}

export interface Checkbook {
  id: string;
  bankAccountId: string;
  code: string;
  startNumber: number;
  endNumber: number;
  checks: CheckbookCheck[];
}

export interface MoneyTransaction {
  id: string;
  number: string;
  date: string;
  type: TreasuryTransType;
  amount: number;
  sourceType: 'CASHBOX' | 'BANK' | 'SUPPLIER' | 'CUSTOMER' | 'EXPENSE' | 'DIRECT';
  sourceId: string;
  destType: 'CASHBOX' | 'BANK' | 'SUPPLIER' | 'CUSTOMER' | 'EXPENSE' | 'DIRECT';
  destId: string;
  description: string;
}

export enum ChequeStatus {
  Outstanding = 'OUTSTANDING',
  UnderCollection = 'UNDER_COLLECTION',
  Collected = 'COLLECTED',
  Bounced = 'BOUNCED',
  Paid = 'PAID'
}

export interface Cheque {
  id: string;
  chequeNumber: string;
  bankName: string;
  amount: number;
  type: 'INCOMING' | 'OUTGOING';
  dueDate: string;
  status: ChequeStatus;
  partyName: string;
}

export interface FixedAsset {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  purchaseDate: string;
  purchaseValue: number;
  salvageValue: number;
  usefulLifeYears: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
}

export enum EmployeeShift {
  Morning = 'MORNING',
  Evening = 'EVENING',
  Overnight = 'OVERNIGHT'
}

export interface Employee {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  role: string;
  salary: number;
  shift: EmployeeShift;
  loanBalance: number;
  active: boolean;
  allowances?: number;
  deductions?: number;
  overtimeHours?: number;
  workingDays?: number;
  workingHours?: number;
  nationalId?: string;
  department?: string;
  email?: string;
  phone?: string;
  hireDate?: string;
  contractType?: string;
  manager?: string;
  status?: string;
  timelineJson?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  annualLeaveBalance?: number;
}

// Each key represents a tab/module ID from the sidebar
export interface UserPermissions {
  dashboard: boolean;
  accounts: boolean;
  journals: boolean;
  general_ledger: boolean;
  statement_of_account: boolean;
  vouchers: boolean;
  treasury: boolean;
  fixed_assets: boolean;
  purchases: boolean;
  inventory: boolean;
  recipes: boolean;
  sales_invoices: boolean;
  sales: boolean;
  returns: boolean;
  hr: boolean;
  payroll_runs: boolean;
  budgets: boolean;
  period_closing: boolean;
  reports: boolean;
  audit_log: boolean;
  user_management: boolean;
}

// Predefined role permission sets
export const ROLE_PERMISSIONS: Record<string, UserPermissions> = {
  admin: {
    dashboard: true, accounts: true, journals: true, general_ledger: true,
    statement_of_account: true, vouchers: true, treasury: true, fixed_assets: true,
    purchases: true, inventory: true, recipes: true, sales_invoices: true,
    sales: true, returns: true, hr: true, payroll_runs: true, budgets: true,
    period_closing: true, reports: true, audit_log: true, user_management: true
  },
  accountant: {
    dashboard: true, accounts: true, journals: true, general_ledger: true,
    statement_of_account: true, vouchers: true, treasury: true, fixed_assets: true,
    purchases: false, inventory: false, recipes: false, sales_invoices: true,
    sales: true, returns: true, hr: false, payroll_runs: false, budgets: true,
    period_closing: true, reports: true, audit_log: true, user_management: false
  },
  cashier: {
    dashboard: true, accounts: false, journals: false, general_ledger: false,
    statement_of_account: false, vouchers: false, treasury: false, fixed_assets: false,
    purchases: false, inventory: false, recipes: false, sales_invoices: false,
    sales: true, returns: true, hr: false, payroll_runs: false, budgets: false,
    period_closing: false, reports: false, audit_log: false, user_management: false
  },
  store_manager: {
    dashboard: true, accounts: false, journals: false, general_ledger: false,
    statement_of_account: false, vouchers: true, treasury: false, fixed_assets: false,
    purchases: true, inventory: true, recipes: true, sales_invoices: false,
    sales: false, returns: true, hr: false, payroll_runs: false, budgets: false,
    period_closing: false, reports: true, audit_log: false, user_management: false
  },
  hr_manager: {
    dashboard: true, accounts: false, journals: false, general_ledger: false,
    statement_of_account: false, vouchers: false, treasury: false, fixed_assets: false,
    purchases: false, inventory: false, recipes: false, sales_invoices: false,
    sales: false, returns: false, hr: true, payroll_runs: true, budgets: false,
    period_closing: false, reports: true, audit_log: false, user_management: false
  },
  viewer: {
    dashboard: true, accounts: false, journals: false, general_ledger: false,
    statement_of_account: false, vouchers: false, treasury: false, fixed_assets: false,
    purchases: false, inventory: false, recipes: false, sales_invoices: false,
    sales: false, returns: false, hr: false, payroll_runs: false, budgets: false,
    period_closing: false, reports: true, audit_log: false, user_management: false
  }
};

export interface UserSession {
  username: string;
  company: string;
  branch: string;
  period: string;
  role?: string;
  permissions?: UserPermissions;
}


export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  actionAr: string;
  actionEn: string;
  details: string;
  ipAddress: string;
}

export interface Budget {
  id: string;
  year: number;
  month: number;
  branchAr: string;
  branchEn: string;
  departmentAr: string;
  departmentEn: string;
  budgetedRevenue: number;
  budgetedFoodCost: number;
  budgetedLaborCost: number;
  budgetedExpenses: number;
}

export interface Supplier {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  balance: number;
}

export interface Customer {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  phone: string;
  balance: number;
}

// ═══════════════════════════════════════════════
// SALES INVOICES
// ═══════════════════════════════════════════════

export enum InvoiceStatus {
  Draft = 'DRAFT',
  Issued = 'ISSUED',
  PartiallyPaid = 'PARTIALLY_PAID',
  Paid = 'PAID',
  Cancelled = 'CANCELLED'
}

export interface SalesInvoiceItem {
  itemId: string;
  nameAr: string;
  nameEn: string;
  unitAr?: string;
  unitEn?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerId: string;
  items: SalesInvoiceItem[];
  subtotal: number;
  discountTotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  paymentMethod: 'CASH' | 'CREDIT' | 'BANK_TRANSFER' | 'CHEQUE';
  notes: string;
  journalEntryId?: string;
}

// ═══════════════════════════════════════════════
// VOUCHERS (سندات القبض والصرف)
// ═══════════════════════════════════════════════

export enum VoucherType {
  Receipt = 'RECEIPT',   // سند قبض
  Payment = 'PAYMENT'    // سند صرف
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  type: VoucherType;
  date: string;
  amount: number;
  partyType: 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'OTHER';
  partyId: string;
  partyName: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
  treasuryId?: string;
  bankAccountId?: string;
  description: string;
  referenceNumber?: string;
  journalEntryId?: string;
  chequeImage?: string;
}

// ═══════════════════════════════════════════════
// SALES RETURNS / CREDIT NOTES
// ═══════════════════════════════════════════════

export interface SalesReturn {
  id: string;
  returnNumber: string;
  date: string;
  originalInvoiceId: string;
  customerId: string;
  items: SalesInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  reason: string;
  journalEntryId?: string;
}

// ═══════════════════════════════════════════════
// PURCHASE RETURNS / DEBIT NOTES
// ═══════════════════════════════════════════════

export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  date: string;
  originalPurchaseId: string;
  supplierId: string;
  items: { itemId: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  reason: string;
  journalEntryId?: string;
}

// ═══════════════════════════════════════════════
// PAYROLL
// ═══════════════════════════════════════════════

export interface PayslipLine {
  employeeId: string;
  basicSalary: number;
  workingDays: number;
  actualDays: number;
  overtime: number;
  overtimeAmount: number;
  allowances: number;
  grossPay: number;
  deductions: number;
  loanInstallment: number;
  socialInsurance: number;
  tax: number;
  netPay: number;
}

export interface PayrollRun {
  id: string;
  runNumber: string;
  month: number;
  year: number;
  date: string;
  status: 'DRAFT' | 'APPROVED' | 'PAID';
  lines: PayslipLine[];
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  journalEntryId?: string;
}

// ═══════════════════════════════════════════════
// ACCOUNTING PERIODS
// ═══════════════════════════════════════════════

export interface AccountingPeriod {
  id: string;
  year: number;
  month: number;
  status: 'OPEN' | 'CLOSED';
  closedAt?: string;
  closedBy?: string;
  closingEntryId?: string;
}

export interface BackupSchedule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  time: string;
  target: string;
  enabled: boolean;
  customPath?: string;
}

export interface ERPData {
  accounts: Account[];
  journalEntries: JournalEntry[];
  purchases: PurchaseTransaction[];
  inventory: InventoryItem[];
  wastage: WastageLog[];
  recipes: Recipe[];
  sales: SaleOrder[];
  treasuries: Treasury[];
  bankAccounts: BankAccount[];
  moneyTransactions: MoneyTransaction[];
  cheques: Cheque[];
  fixedAssets: FixedAsset[];
  employees: Employee[];
  budgets: Budget[];
  suppliers: Supplier[];
  customers: Customer[];
  auditLogs: AuditLog[];
  backupSchedule: BackupSchedule;
  // New entities
  salesInvoices: SalesInvoice[];
  vouchers: Voucher[];
  salesReturns: SalesReturn[];
  purchaseReturns: PurchaseReturn[];
  payrollRuns: PayrollRun[];
  accountingPeriods: AccountingPeriod[];
  checkbooks?: Checkbook[];
  hrLeaves?: any[];
  hrCandidates?: any[];
  hrDepartments?: any[];
  hrJobs?: any[];
  hrAppraisals?: any[];
  hrLoans?: any[];
  hrDocuments?: any[];
  hrTrainings?: any[];
  hrAttendance?: any[];
  hrEvents?: any[];
  companyProfile?: {
    nameAr: string;
    nameEn: string;
    registrationNumber: string;
    taxNumber: string;
    addressAr: string;
    addressEn: string;
    email: string;
    phone: string;
    branches?: string;
    zakatRate?: number;
  };
}

