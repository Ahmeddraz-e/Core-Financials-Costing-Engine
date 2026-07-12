import Database from 'better-sqlite3';
import { hashPassword } from './queries/utils';

export function seedDatabase(db: Database.Database): void {
  const accountCount = db.prepare('SELECT COUNT(*) as cnt FROM accounts').get() as any;
  if (accountCount.cnt === 0) {
    const insertAccount = db.prepare(`INSERT OR IGNORE INTO accounts (id, code, nameAr, nameEn, type, parentCode, balance, isSystem) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    const accounts = [
      ['101', '1101001', 'الخزينة الرئيسية - كاش', 'Main Cash Box', 'ASSET', null, 0, 1],
      ['102', '1102001', 'حساب البنك الأهلي المصري', 'National Bank of Egypt (NBE)', 'ASSET', null, 0, 1],
      ['103', '1103001', 'العملاء - حسابات مدينة', 'Accounts Receivable (Customers)', 'ASSET', null, 0, 1],
      ['104', '1104001', 'مخزن المواد الغذانية والمشروبات', 'Food & Beverage Inventory', 'ASSET', null, 0, 1],
      ['105', '1105001', 'مخزن مواد التعبئة والتغليف', 'Packaging Inventory', 'ASSET', null, 0, 1],
      ['106', '1201001', 'أصول ثابتة - معدات مطبخ', 'Fixed Assets - Kitchen Equipment', 'ASSET', null, 0, 1],
      ['107', '1106001', 'سلف وعُهد الموظفين', 'Staff Advances & Loans', 'ASSET', null, 0, 1],
      ['201', '2101001', 'الموردين - حسابات دائنة', 'Accounts Payable (Suppliers)', 'LIABILITY', null, 0, 1],
      ['202', '2102001', 'مستحقات رواتب الموظفين', 'Accrued Salaries', 'LIABILITY', null, 0, 1],
      ['203', '2103001', 'مستحقات الضرائب (القيمة المضافة)', 'VAT Payable', 'LIABILITY', null, 0, 1],
      ['301', '3101001', 'رأس مال الشركة', 'Share Capital', 'EQUITY', null, 0, 1],
      ['302', '3102001', 'أرباح وخسائر مرحلة', 'Retained Earnings', 'EQUITY', null, 0, 1],
      ['401', '4101001', 'مبيعات الصالة', 'Dine-In Sales', 'REVENUE', null, 0, 1],
      ['402', '4102001', 'مبيعات التيك أواي', 'Takeaway Sales', 'REVENUE', null, 0, 1],
      ['403', '4103001', 'مبيعات التوصيل (دليفري)', 'Direct Delivery Sales', 'REVENUE', null, 0, 1],
      ['404', '4104001', 'مبيعات تطبيقات التوصيل', 'Third-Party App Sales', 'REVENUE', null, 0, 1],
      ['405', '4107001', 'إيراد غرامات وجزاءات الموظفين', 'Employee Penalties Income', 'REVENUE', null, 0, 1],
      ['411', '4105001', 'مبيعات الفواتير العامة', 'General Invoice Sales', 'REVENUE', null, 0, 1],
      ['501', '5101001', 'تكلفة المواد الغذائية المستهلكة', 'Cost of Food Used', 'COST_OF_SALES', null, 0, 1],
      ['502', '5102001', 'تكلفة المشروبات المستهلكة', 'Cost of Beverages Used', 'COST_OF_SALES', null, 0, 1],
      ['503', '5103001', 'تكلفة مواد التغليف المستهلكة', 'Cost of Packaging Used', 'COST_OF_SALES', null, 0, 1],
      ['504', '5104001', 'تكلفة الهالك والفاقد', 'Cost of Food Wastage', 'COST_OF_SALES', null, 0, 1],
      ['601', '6101001', 'مصروفات الرواتب والأجور', 'Salaries & Wages Expense', 'EXPENSE', null, 0, 1],
      ['602', '6102001', 'مصروفات الإيجار', 'Rent Expense', 'EXPENSE', null, 0, 1],
      ['603', '6103001', 'مصروف كهرباء ومياه وغاز', 'Utilities (Electricity, Water, Gas)', 'EXPENSE', null, 0, 1],
      ['604', '6104001', 'مصروفات التسويق والدعاية', 'Marketing & Advertising', 'EXPENSE', null, 0, 1],
      ['605', '6105001', 'مصروف إهلاك أصول ثابتة', 'Depreciation Expense', 'EXPENSE', null, 0, 1],
      ['606', '6106001', 'مصروف البدلات والإضافات', 'Allowances Expense', 'EXPENSE', null, 0, 1]
    ];
    for (const a of accounts) {
      insertAccount.run(...a);
    }

    const insertTreasury = db.prepare(`INSERT OR IGNORE INTO treasuries (id, nameAr, nameEn, balance, accountId) VALUES (?, ?, ?, ?, ?)`);
    insertTreasury.run('cb-1', 'خزينة الفرع الرئيسي - الكاشير', 'Main Branch Cashier', 0, '101');

    const insertBank = db.prepare(`INSERT OR IGNORE INTO bank_accounts (id, accountNumber, bankNameAr, bankNameEn, balance, accountId) VALUES (?, ?, ?, ?, ?, ?)`);
    insertBank.run('ba-1', 'EG1234567890123456789', 'البنك الأهلي المصري - حساب جاري', 'NBE - Current Account', 0, '102');

    const insertBackup = db.prepare(`INSERT OR IGNORE INTO backup_schedule (id, frequency, time, target, enabled) VALUES (1, 'DAILY', '23:00', 'LOCAL', 1)`);
    insertBackup.run();

    console.log('[Seed] Accounts and config seeded');
  }

  // Ensure account 411 exists even if database was already seeded
  db.prepare(`
    INSERT OR IGNORE INTO accounts (id, code, nameAr, nameEn, type, parentCode, balance, isSystem)
    VALUES ('411', '4105001', 'مبيعات الفواتير العامة', 'General Invoice Sales', 'REVENUE', null, 0, 1)
  `).run();

  // C-3 FIX: Ensure accounts 412 and 512 exist (used by ReturnsManager JEs)
  db.prepare(`
    INSERT OR IGNORE INTO accounts (id, code, nameAr, nameEn, type, parentCode, balance, isSystem)
    VALUES ('412', '4106001', 'مردودات المبيعات والمسموحات', 'Sales Returns & Allowances', 'REVENUE', null, 0, 1)
  `).run();

  db.prepare(`
    INSERT OR IGNORE INTO accounts (id, code, nameAr, nameEn, type, parentCode, balance, isSystem)
    VALUES ('512', '5105001', 'مردودات المشتريات والمسموحات', 'Purchase Returns & Allowances', 'COST_OF_SALES', null, 0, 1)
  `).run();

  // Ensure account 107 exists (Staff Advances & Loans) for HR loan JEs
  db.prepare(`
    INSERT OR IGNORE INTO accounts (id, code, nameAr, nameEn, type, parentCode, balance, isSystem)
    VALUES ('107', '1106001', 'سلف وعُهد الموظفين', 'Staff Advances & Loans', 'ASSET', null, 0, 1)
  `).run();

  // Ensure account 405 exists (Employee Penalties Income) for payroll deduction JEs
  db.prepare(`
    INSERT OR IGNORE INTO accounts (id, code, nameAr, nameEn, type, parentCode, balance, isSystem)
    VALUES ('405', '4107001', 'إيراد غرامات وجزاءات الموظفين', 'Employee Penalties Income', 'REVENUE', null, 0, 1)
  `).run();

  // Ensure account 606 exists (Allowances Expense) for payroll JEs
  db.prepare(`
    INSERT OR IGNORE INTO accounts (id, code, nameAr, nameEn, type, parentCode, balance, isSystem)
    VALUES ('606', '6106001', 'مصروف البدلات والإضافات', 'Allowances Expense', 'EXPENSE', null, 0, 1)
  `).run();

  // Seed default inventory items if empty/missing
  const insertInv = db.prepare(`
    INSERT OR IGNORE INTO inventory (id, code, nameAr, nameEn, category, unitAr, unitEn, cost, quantity, reorderPoint, yieldPercent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const defaultItems = [
    ['inv-seed-1', 'FTP-TOMATO', 'طماطم طازجة', 'Fresh Tomato', 'FOOD_RAW', 'كجم', 'kg', 18, 100, 15, 90],
    ['inv-seed-2', 'FTP-CHICKEN', 'دجاج كامل', 'Whole Chicken', 'FOOD_RAW', 'كجم', 'kg', 120, 50, 10, 85],
    ['inv-seed-3', 'PKG-BOX', 'علب كرتون وجبات', 'Meal Packing Box', 'PACKAGING', 'علبة', 'Box', 2.5, 200, 50, 100],
    ['inv-seed-4', 'BEV-PEPSI', 'علب بيبسي', 'Pepsi Can', 'BEVERAGE', 'قطعة', 'Piece', 10, 150, 20, 100],
    ['inv-seed-beef', 'RAW-BEEF', 'لحم مفروم بقري', 'Minced Beef', 'FOOD_RAW', 'كجم', 'kg', 280, 50, 5, 90],
    ['inv-seed-finished-1', 'FTP-BURGER', 'برجر لحم بالجبن', 'Cheeseburger', 'FINISHED_PRODUCT', 'وجبة', 'Meal', 0, 0, 0, 100]
  ];
  for (const item of defaultItems) {
    insertInv.run(...item);
  }

  // Seed default suppliers if missing
  const insertSup = db.prepare(`
    INSERT OR IGNORE INTO suppliers (id, code, nameAr, nameEn, phone, balance)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const defaultSuppliers = [
    ['sup-seed-1', 'SUP-001', 'مورد الأغذية الطازجة', 'Fresh Food Co', '01012345678', 0],
    ['sup-seed-2', 'SUP-002', 'شركة الأندلس للتعبئة', 'Al-Andalus Packaging', '01198765432', 0]
  ];
  for (const sup of defaultSuppliers) {
    insertSup.run(...sup);
  }

  // Seed default customers if missing
  const insertCust = db.prepare(`
    INSERT OR IGNORE INTO customers (id, code, nameAr, nameEn, phone, balance)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const defaultCustomers = [
    ['cust-seed-1', 'CUST-001', 'أحمد محمد (عميل آجل)', 'Ahmed Mohamed', '01234567890', 0],
    ['cust-seed-2', 'CUST-002', 'شركة الضيافة الحديثة', 'Modern Hospitality Co', '01511223344', 0]
  ];
  for (const cust of defaultCustomers) {
    insertCust.run(...cust);
  }

  // Seed default cheeseburger recipe if missing
  const recipeCount = db.prepare('SELECT COUNT(*) as cnt FROM recipes').get() as any;
  if (recipeCount.cnt === 0) {
    db.prepare(`
      INSERT INTO recipes (id, itemId, yieldAmount, laborCost, packagingCost, otherOperatingCost, calculatedCost, sellingPrice, marginPercent, foodCostPercent)
      VALUES ('rec-seed-1', 'inv-seed-finished-1', 1, 8.0, 2.0, 1.5, 68.0, 120.0, 43.3, 47.0)
    `).run();

    const insertComp = db.prepare('INSERT OR IGNORE INTO recipe_components (id, recipeId, componentItemId, quantity, lossPercent) VALUES (?, ?, ?, ?, ?)');
    insertComp.run('rec-seed-1-comp-1', 'rec-seed-1', 'inv-seed-beef', 0.2, 10);
    insertComp.run('rec-seed-1-comp-2', 'rec-seed-1', 'inv-seed-1', 0.05, 5);
    insertComp.run('rec-seed-1-comp-3', 'rec-seed-1', 'inv-seed-3', 1.0, 0);
  }


  // Seed default admin user (runs independently of accounts)
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any;
  if (userCount.cnt === 0) {
    const adminHash = hashPassword('admin123');
    db.prepare(
      'INSERT INTO users (id, username, passwordHash, role, nameAr, nameEn) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('user-admin', 'admin', adminHash, 'ADMIN', 'مدير النظام', 'System Admin');

    // Also create a cashier user for testing
    const cashierHash = hashPassword('cashier123');
    db.prepare(
      'INSERT INTO users (id, username, passwordHash, role, nameAr, nameEn) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('user-cashier', 'cashier', cashierHash, 'CASHIER', 'كاشير', 'Cashier');

    console.log('[Seed] Default users created: admin/admin123, cashier/cashier123');
  }

  console.log('[Seed] Database seeded successfully');
}
