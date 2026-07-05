# LODing ERP System | نظام لودينج لإدارة موارد المؤسسات

A modern, integrated, and offline-first Enterprise Resource Planning (ERP) desktop application designed for small and medium businesses to manage accounts, invoicing, inventory, HR, and banking from a single interface.

نظام تخطيط موارد المؤسسات (ERP) متكامل وحديث، مصمم خصيصاً للشركات المتوسطة والصغيرة لإدارة الحسابات العامة، الفواتير، المخازن، الموارد البشرية، والخزائن والبنوك المركزية من واجهة مستخدم موحدة واحترافية.

---

## 🌟 Key Features | المميزات الرئيسية

### 🏦 Centralized Treasury & Banking | إدارة الخزائن والبنوك المركزية
* **Consolidated Dashboard:** Monitor all cash safes, bank accounts, and corporate checkbooks in one view.
* **Direct Voucher Processing:** Issue and register Receipt and Payment Vouchers directly within safe/bank accounts.
* **Interactive Double-Entry Preview:** View auto-balanced journal entries (Debits/Credits) before saving.
* **Audit Statement Logs:** View, print official PDF invoices, or export ledger transaction histories to Excel/CSV.
* **Checkbook Management:** Monitor active checks, cancel, or issue checks directly to invoices.

### 📊 Financial Ledger & Chart of Accounts | المحاسبة العامة وشجرة الحسابات
* Dynamic tree view of the Chart of Accounts (Assets, Liabilities, Equity, Revenues, Expenses).
* Automatic GL code proposal and account creation upon safe/bank registration.
* Manual and automatic journal entries with strict double-entry balancing.
* General ledger tracking and financial statement audit trail logs.

### 🛒 Sales & Purchases | المبيعات والمشتريات والفواتير
* Detailed Sales and Purchase Invoices with integrated VAT calculation.
* Customer and Supplier sub-ledger balance integration.
* Returns management for both sales and purchases.

### 📦 Inventory & Recipes | إدارة المخازن والتصنيع
* Live stock levels monitoring and wastage tracking.
* Component recipes for automated food/product production and cost auditing.

### 👥 HR & Payroll | شؤون الموظفين والرواتب
* Complete employee directory, shifts, and data registry.
* Direct monthly payroll sheets generator integrated with financial accounts.

---

## 💻 Tech Stack | التقنيات المستخدمة

* **Frontend:** React, TypeScript, Tailwind CSS, Vite.
* **Backend:** Node.js, Express.
* **Database:** SQLite (`better-sqlite3`).
* **Desktop Wrapper:** Electron (cross-platform desktop integration).

---

## 🚀 Getting Started | التشغيل والتهيئة

### Prerequisites | متطلبات التشغيل
Make sure you have **Node.js** (v18 or higher recommended) installed.

### Installation | التثبيت
```bash
# Clone the repository
git clone https://github.com/Ahmeddraz-e/Core-Financials-Costing-Engine.git

# Navigate into the project folder
cd Core-Financials-Costing-Engine

# Install dependencies
npm install
```

### Commands & Scripts | الأوامر البرمجية والتشغيل

#### 🖥️ Run desktop app in development | تشغيل نسخة الديسكتوب
This builds the files, compiles sqlite bindings for Electron, and opens the app:
```bash
npm run electron:start
```

#### 🌐 Run local web server | تشغيل خادم محلي
```bash
npm run dev
```

#### 📦 Build production assets | بناء التطبيق للإنتاج
```bash
npm run build
```

#### ⚙️ Recompile SQLite node bindings | إعادة تجميع قاعدة البيانات محلياً
If you experience database loading issues, compile node bindings for Electron:
```bash
npm run rebuild
```

---

## 📁 Project Structure | هيكل المشروع

```text
├── server.ts             # Express API Server & routing
├── electron.cjs          # Electron desktop wrapper configuration
├── src/
│   ├── App.tsx           # React root component and layout Router
│   ├── main.tsx          # Client entrypoint
│   ├── types.ts          # Global TypeScript interfaces & schemas
│   ├── components/       # UI Components (Treasury, Inventory, HR, etc.)
│   ├── database/         # SQLite schema, initial data seed, migrations
│   │   ├── db.ts         # SQLite connection & differential syncing logic
│   │   └── schema.ts     # SQL tables structure
│   └── utils/            # Helper print utilities & CSV exporters
```

---

## 📝 License | الترخيص
Copyright © 2026 Ahmed Deraz. All rights reserved.  
حقوق الطبع محفوظة لأحمد دراز 2026.
