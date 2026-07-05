export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  nameAr TEXT NOT NULL,
  nameEn TEXT NOT NULL,
  type TEXT NOT NULL,
  parentCode TEXT,
  balance REAL NOT NULL DEFAULT 0,
  isSystem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  entryNumber TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  approved INTEGER NOT NULL DEFAULT 0,
  approvedBy TEXT
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY,
  entryId TEXT NOT NULL,
  accountId TEXT NOT NULL,
  debit REAL NOT NULL DEFAULT 0,
  credit REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (entryId) REFERENCES journal_entries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  date TEXT NOT NULL,
  supplierId TEXT NOT NULL,
  status TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  taxAmount REAL NOT NULL DEFAULT 0,
  totalAmount REAL NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  itemsJson TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  nameAr TEXT NOT NULL,
  nameEn TEXT NOT NULL,
  category TEXT NOT NULL,
  unitAr TEXT NOT NULL DEFAULT '',
  unitEn TEXT NOT NULL DEFAULT '',
  cost REAL NOT NULL DEFAULT 0,
  quantity REAL NOT NULL DEFAULT 0,
  reorderPoint REAL NOT NULL DEFAULT 0,
  yieldPercent REAL
);

CREATE TABLE IF NOT EXISTS wastage (
  id TEXT PRIMARY KEY,
  itemId TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  cost REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  itemId TEXT NOT NULL,
  yieldAmount REAL NOT NULL DEFAULT 1,
  laborCost REAL NOT NULL DEFAULT 0,
  packagingCost REAL NOT NULL DEFAULT 0,
  otherOperatingCost REAL NOT NULL DEFAULT 0,
  calculatedCost REAL NOT NULL DEFAULT 0,
  sellingPrice REAL NOT NULL DEFAULT 0,
  marginPercent REAL NOT NULL DEFAULT 0,
  foodCostPercent REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recipe_components (
  id TEXT PRIMARY KEY,
  recipeId TEXT NOT NULL,
  componentItemId TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  lossPercent REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  orderNumber TEXT NOT NULL,
  date TEXT NOT NULL,
  channel TEXT,
  cashierName TEXT,
  dineInAmount REAL DEFAULT 0,
  takeawayAmount REAL DEFAULT 0,
  deliveryAmount REAL DEFAULT 0,
  deliveryAppsAmount REAL DEFAULT 0,
  cashAmount REAL DEFAULT 0,
  cardAmount REAL DEFAULT 0,
  serviceCharge REAL DEFAULT 0,
  taxAmount REAL NOT NULL DEFAULT 0,
  totalAmount REAL NOT NULL DEFAULT 0,
  foodCost REAL NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  itemsJson TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS treasuries (
  id TEXT PRIMARY KEY,
  nameAr TEXT NOT NULL,
  nameEn TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  branch TEXT,
  responsible TEXT,
  accountId TEXT
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  accountNumber TEXT NOT NULL,
  bankNameAr TEXT NOT NULL,
  bankNameEn TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 0,
  branch TEXT,
  responsible TEXT,
  accountId TEXT
);

CREATE TABLE IF NOT EXISTS checkbooks (
  id TEXT PRIMARY KEY,
  bankAccountId TEXT NOT NULL,
  code TEXT NOT NULL,
  startNumber INTEGER NOT NULL,
  endNumber INTEGER NOT NULL,
  checksJson TEXT NOT NULL DEFAULT '[]',
  FOREIGN KEY (bankAccountId) REFERENCES bank_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS money_transactions (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  sourceType TEXT NOT NULL,
  sourceId TEXT NOT NULL,
  destType TEXT NOT NULL,
  destId TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS cheques (
  id TEXT PRIMARY KEY,
  chequeNumber TEXT NOT NULL,
  bankName TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  type TEXT NOT NULL,
  dueDate TEXT NOT NULL,
  status TEXT NOT NULL,
  partyName TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS fixed_assets (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  nameAr TEXT NOT NULL,
  nameEn TEXT NOT NULL,
  purchaseDate TEXT NOT NULL,
  purchaseValue REAL NOT NULL DEFAULT 0,
  salvageValue REAL NOT NULL DEFAULT 0,
  usefulLifeYears INTEGER NOT NULL DEFAULT 5,
  accumulatedDepreciation REAL NOT NULL DEFAULT 0,
  currentBookValue REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  nameAr TEXT NOT NULL,
  nameEn TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  salary REAL NOT NULL DEFAULT 0,
  shift TEXT NOT NULL DEFAULT 'MORNING',
  loanBalance REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  allowances REAL DEFAULT 0,
  deductions REAL DEFAULT 0,
  overtimeHours REAL DEFAULT 0,
  workingDays REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  branchAr TEXT NOT NULL DEFAULT '',
  branchEn TEXT NOT NULL DEFAULT '',
  departmentAr TEXT NOT NULL DEFAULT '',
  departmentEn TEXT NOT NULL DEFAULT '',
  budgetedRevenue REAL NOT NULL DEFAULT 0,
  budgetedFoodCost REAL NOT NULL DEFAULT 0,
  budgetedLaborCost REAL NOT NULL DEFAULT 0,
  budgetedExpenses REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  nameAr TEXT NOT NULL,
  nameEn TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  balance REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  nameAr TEXT NOT NULL,
  nameEn TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  balance REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  user TEXT NOT NULL,
  actionAr TEXT NOT NULL DEFAULT '',
  actionEn TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  ipAddress TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS backup_schedule (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  frequency TEXT NOT NULL DEFAULT 'DAILY',
  time TEXT NOT NULL DEFAULT '23:00',
  target TEXT NOT NULL DEFAULT 'LOCAL',
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ═══════════════════════════════════════════════
-- AUTHENTICATION: Users & Sessions
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  permissions TEXT DEFAULT NULL,
  nameAr TEXT NOT NULL DEFAULT '',
  nameEn TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  lastLoginAt TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════
-- PERFORMANCE INDEXES
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_invoices (
  id TEXT PRIMARY KEY,
  invoiceNumber TEXT NOT NULL,
  date TEXT NOT NULL,
  dueDate TEXT NOT NULL DEFAULT '',
  customerId TEXT NOT NULL DEFAULT '',
  subtotal REAL NOT NULL DEFAULT 0,
  discountTotal REAL NOT NULL DEFAULT 0,
  taxRate REAL NOT NULL DEFAULT 0.14,
  taxAmount REAL NOT NULL DEFAULT 0,
  totalAmount REAL NOT NULL DEFAULT 0,
  paidAmount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  paymentMethod TEXT NOT NULL DEFAULT 'CASH',
  notes TEXT NOT NULL DEFAULT '',
  journalEntryId TEXT DEFAULT '',
  itemsJson TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS vouchers (
  id TEXT PRIMARY KEY,
  voucherNumber TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  partyType TEXT NOT NULL DEFAULT 'OTHER',
  partyId TEXT NOT NULL DEFAULT '',
  partyName TEXT NOT NULL DEFAULT '',
  paymentMethod TEXT NOT NULL DEFAULT 'CASH',
  treasuryId TEXT DEFAULT '',
  bankAccountId TEXT DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  referenceNumber TEXT DEFAULT '',
  journalEntryId TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sales_returns (
  id TEXT PRIMARY KEY,
  returnNumber TEXT NOT NULL,
  date TEXT NOT NULL,
  originalInvoiceId TEXT NOT NULL DEFAULT '',
  customerId TEXT NOT NULL DEFAULT '',
  subtotal REAL NOT NULL DEFAULT 0,
  taxAmount REAL NOT NULL DEFAULT 0,
  totalAmount REAL NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  journalEntryId TEXT DEFAULT '',
  itemsJson TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id TEXT PRIMARY KEY,
  returnNumber TEXT NOT NULL,
  date TEXT NOT NULL,
  originalPurchaseId TEXT NOT NULL DEFAULT '',
  supplierId TEXT NOT NULL DEFAULT '',
  subtotal REAL NOT NULL DEFAULT 0,
  taxAmount REAL NOT NULL DEFAULT 0,
  totalAmount REAL NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  journalEntryId TEXT DEFAULT '',
  itemsJson TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id TEXT PRIMARY KEY,
  runNumber TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  totalGross REAL NOT NULL DEFAULT 0,
  totalDeductions REAL NOT NULL DEFAULT 0,
  totalNet REAL NOT NULL DEFAULT 0,
  journalEntryId TEXT DEFAULT '',
  linesJson TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS accounting_periods (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  closedAt TEXT DEFAULT '',
  closedBy TEXT DEFAULT '',
  closingEntryId TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(entryId);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(accountId);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_order_number ON sales(orderNumber);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplierId);
CREATE INDEX IF NOT EXISTS idx_inventory_code ON inventory(code);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_money_tx_date ON money_transactions(date);
CREATE INDEX IF NOT EXISTS idx_cheques_due_date ON cheques(dueDate);
CREATE INDEX IF NOT EXISTS idx_cheques_status ON cheques(status);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expiresAt);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON sales_invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON sales_invoices(customerId);
CREATE INDEX IF NOT EXISTS idx_vouchers_date ON vouchers(date);
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON vouchers(type);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_runs(year, month);
CREATE INDEX IF NOT EXISTS idx_periods_status ON accounting_periods(status);
`;
