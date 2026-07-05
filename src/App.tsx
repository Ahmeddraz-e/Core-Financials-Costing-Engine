import React, { useState, useEffect, useRef } from 'react';
import { 
  fetchERPData, 
  saveERPData, 
  createDatabaseBackup, 
  restoreDatabaseBackup, 
  resetDatabaseToDefault,
  getCurrentUser,
  logout,
  getAuthToken,
  clearAuthToken,
  fetchBadges,
  fetchNotifications
} from './services/api';
import { ERPData, UserSession, AuditLog } from './types';
import { initialERPData } from './initialData';
import CustomDialog from './components/CustomDialog';

declare global {
  interface Window {
    showAlert: (messageAr: string, messageEn: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
    showConfirm: (messageAr: string, messageEn: string, onConfirm: () => void) => void;
  }
}

// Importing modules
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import AccountsChart from './components/AccountsChart';
import JournalEntries from './components/JournalEntries';
import Sales from './components/Sales';
import Purchases from './components/Purchases';
import Inventory from './components/Inventory';
import Recipes from './components/Recipes';
import TreasuryModule from './components/Treasury';
import HRModule from './components/HR';
import FixedAssets from './components/FixedAssets';
import Budgets from './components/Budgets';
import Reports from './components/Reports';
import AuditLogView from './components/AuditLog';
import SalesInvoicesModule from './components/SalesInvoices';
import VouchersModule from './components/Vouchers';
import StatementOfAccount from './components/StatementOfAccount';
import GeneralLedger from './components/GeneralLedger';
import PayrollManager from './components/PayrollManager';
import PeriodClosing from './components/PeriodClosing';
import ReturnsManager from './components/ReturnsManager';
import UserManagement from './components/UserManagement';
import { ROLE_PERMISSIONS } from './types';

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [erpData, setErpData] = useState<ERPData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [badges, setBadges] = useState({ pendingPRs: 0, lowStockItems: 0, bouncedCheques: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);

  const isAr = lang === 'ar';

  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'info' | 'success' | 'warning' | 'danger' | 'confirm';
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {}
  });

  // Bind custom dialog functions to the global window object
  useEffect(() => {
    window.showAlert = (messageAr: string, messageEn: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') => {
      setDialogConfig({
        isOpen: true,
        type,
        title: lang === 'ar' 
          ? (type === 'success' ? 'نجاح العملية' : type === 'danger' ? 'تنبيه خطأ' : type === 'warning' ? 'تنبيه هام' : 'تنبيه النظام')
          : (type === 'success' ? 'Success' : type === 'danger' ? 'Error Alert' : type === 'warning' ? 'Warning' : 'System Message'),
        message: lang === 'ar' ? messageAr : messageEn,
        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false })),
        onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
    };

    window.showConfirm = (messageAr: string, messageEn: string, onConfirm: () => void) => {
      setDialogConfig({
        isOpen: true,
        type: 'confirm',
        title: lang === 'ar' ? 'تأكيد الإجراء' : 'Confirm Action',
        message: lang === 'ar' ? messageAr : messageEn,
        onConfirm: () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }));
          onConfirm();
        },
        onCancel: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
    };

    // Override native browser alert globally
    window.alert = (message: string) => {
      window.showAlert(message, message, 'info');
    };
  }, [lang]);

  // 1. Check for existing session on startup
  useEffect(() => {
    async function checkSession() {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        const role = currentUser.role || 'admin';
        const storedPerms = currentUser.permissions
          ? (() => { try { return JSON.parse(currentUser.permissions); } catch { return null; } })()
          : null;
        const permissions = storedPerms || ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['admin'];
        // Restore company/branch from localStorage (saved at login)
        const savedCompany = localStorage.getItem('erp_company') || 'loding-foods';
        const savedBranch  = localStorage.getItem('erp_branch')  || 'main';
        const savedPeriod  = localStorage.getItem('erp_period')  || '2026-06';
        setUser({
          username: currentUser.username,
          company: savedCompany,
          branch: savedBranch,
          period: savedPeriod,
          role,
          permissions
        });
        // Now load ERP data and merge with initial shape to prevent undefined errors
        const data = await fetchERPData();
        const mergedData = { ...initialERPData, ...data };
        setErpData(mergedData);
        // Load badges and notifications
        try {
          const [b, n] = await Promise.all([fetchBadges(), fetchNotifications()]);
          setBadges(b);
          setNotifications(n);
        } catch { /* non-critical */ }
        setLoading(false);
      } catch (err: any) {
        // Token expired or invalid
        clearAuthToken();
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  // 2. Dynamic Dark/Light Tailwind config
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Sequential write queue to serialize database saves in the background
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const updateErpState = (updater: (prev: ERPData) => ERPData) => {
    setErpData(prev => {
      if (!prev) return null;
      const next = updater(prev);
      saveQueueRef.current = saveQueueRef.current
        .then(() => saveERPData(next))
        .catch(err => {
          console.error('Database sync failed:', err);
        });
      return next;
    });
  };

  // Refresh badges after data changes
  const refreshBadges = async () => {
    try {
      const [b, n] = await Promise.all([fetchBadges(), fetchNotifications()]);
      setBadges(b);
      setNotifications(n);
    } catch { /* non-critical */ }
  };

  // 3. SECURE CENTRAL AUDIT LOG WRITER
  const handleAddAuditLog = (actionAr: string, actionEn: string, details: string) => {
    const newLog: AuditLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US'),
      user: user ? user.username : 'النظام (System)',
      actionAr,
      actionEn,
      details,
      ipAddress: '127.0.0.1 (Local Loopback)'
    };
    updateErpState(prev => ({
      ...prev,
      auditLogs: [newLog, ...prev.auditLogs]
    }));
  };

  // State update handlers passed to subcomponents using safe sequential updates
  const handleUpdateAccounts = (accounts: any) => {
    updateErpState(prev => ({ ...prev, accounts }));
    refreshBadges();
  };

  const handleUpdateEntries = (journalEntries: any) => {
    updateErpState(prev => ({ ...prev, journalEntries }));
  };

  const handleUpdateInventory = (inventory: any) => {
    updateErpState(prev => ({ ...prev, inventory }));
    refreshBadges();
  };

  const handleUpdateSuppliers = (suppliers: any) => {
    updateErpState(prev => ({ ...prev, suppliers }));
  };

  const handleUpdateCustomers = (customers: any) => {
    updateErpState(prev => ({ ...prev, customers }));
  };

  const handleUpdateRecipes = (recipes: any) => {
    updateErpState(prev => ({ ...prev, recipes }));
  };

  const handleUpdateTreasuries = (treasuries: any) => {
    updateErpState(prev => ({ ...prev, treasuries }));
  };

  const handleUpdateBankAccounts = (bankAccounts: any) => {
    updateErpState(prev => ({ ...prev, bankAccounts }));
  };

  const handleUpdateCheckbooks = (checkbooks: any) => {
    updateErpState(prev => ({ ...prev, checkbooks }));
  };

  const handleUpdateCheques = (cheques: any) => {
    updateErpState(prev => ({ ...prev, cheques }));
    refreshBadges();
  };

  const handleUpdateMoneyTransactions = (moneyTransactions: any) => {
    updateErpState(prev => ({ ...prev, moneyTransactions }));
  };

  const handleUpdateWastage = (wastage: any) => {
    updateErpState(prev => ({ ...prev, wastage }));
  };

  const handleUpdateEmployees = (employees: any) => {
    updateErpState(prev => ({ ...prev, employees }));
  };

  const handleUpdatePurchases = (purchases: any) => {
    updateErpState(prev => ({ ...prev, purchases }));
    refreshBadges();
  };

  const handleUpdateFixedAssets = (fixedAssets: any) => {
    updateErpState(prev => ({ ...prev, fixedAssets }));
  };

  const handleUpdateSales = (sales: any) => {
    updateErpState(prev => ({ ...prev, sales }));
  };

  const handleClearAuditLogs = () => {
    updateErpState(prev => ({ ...prev, auditLogs: [] }));
    handleAddAuditLog('تصفير السجلات', 'Cleared audit records', 'تم تصفير وحذف سجلات الرقابة الأمنية بالكامل.');
  };

  // New entity handlers
  const handleUpdateSalesInvoices = (salesInvoices: any) => {
    updateErpState(prev => ({ ...prev, salesInvoices }));
  };

  const handleUpdateVouchers = (vouchers: any) => {
    updateErpState(prev => ({ ...prev, vouchers }));
  };

  const handleUpdateSalesReturns = (salesReturns: any) => {
    updateErpState(prev => ({ ...prev, salesReturns }));
  };

  const handleUpdatePurchaseReturns = (purchaseReturns: any) => {
    updateErpState(prev => ({ ...prev, purchaseReturns }));
  };

  const handleUpdatePayrollRuns = (payrollRuns: any) => {
    updateErpState(prev => ({ ...prev, payrollRuns }));
  };

  const handleUpdateAccountingPeriods = (accountingPeriods: any) => {
    updateErpState(prev => ({ ...prev, accountingPeriods }));
  };

  // 4. DATABASE UTILITIES: BACKUP, RESTORE, RESET
  const handleBackupDb = async () => {
    try {
      const res = await createDatabaseBackup();
      window.showAlert(res.messageAr, res.messageEn, 'success');
      const updated = await fetchERPData();
      setErpData(updated);
    } catch (err: any) {
      window.showAlert('خطأ أثناء النسخ الاحتياطي: ' + err.message, 'Error during backup: ' + err.message, 'danger');
    }
  };

  const handleRestoreDb = async () => {
    window.showConfirm(
      '⚠️ هل أنت متأكد من استعادة النسخة الاحتياطية؟ سيؤدي ذلك لاستبدال البيانات الحالية.',
      '⚠️ Are you sure you want to restore the backup? Current changes will be overwritten.',
      async () => {
        try {
          const res = await restoreDatabaseBackup();
          window.showAlert(res.messageAr, res.messageEn, 'success');
          const updated = await fetchERPData();
          setErpData(updated);
        } catch (err: any) {
          window.showAlert('خطأ أثناء استعادة النسخة: ' + err.message, 'Error during restore: ' + err.message, 'danger');
        }
      }
    );
  };

  const handleResetDb = async () => {
    window.showConfirm(
      '⚠️ هل أنت متأكد من تصفير النظام بالكامل وإعادة ضبط المصنع للبيانات؟',
      '⚠️ Are you sure you want to reset the system database to factory default data?',
      async () => {
        try {
          const res = await resetDatabaseToDefault();
          window.showAlert(res.messageAr, res.messageEn, 'success');
          const updated = await fetchERPData();
          setErpData(updated);
          setCurrentTab('dashboard');
        } catch (err: any) {
          window.showAlert('خطأ أثناء إعادة الضبط: ' + err.message, 'Error during reset: ' + err.message, 'danger');
        }
      }
    );
  };

  // Handle successful login
  const handleLoginSuccess = async (session: UserSession) => {
    // Persist company/branch/period to localStorage for session restore
    localStorage.setItem('erp_company', session.company || 'loding-foods');
    localStorage.setItem('erp_branch',  session.branch  || 'main');
    localStorage.setItem('erp_period',  session.period  || '2026-06');

    // Enrich session with role and permissions from server
    try {
      const currentUser = await getCurrentUser();
      const role = currentUser.role || 'admin';
      const storedPerms = currentUser.permissions
        ? (() => { try { return JSON.parse(currentUser.permissions); } catch { return null; } })()
        : null;
      const permissions = storedPerms || ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['admin'];
      setUser({ ...session, role, permissions });
    } catch {
      setUser(session);
    }
    setLoading(true);
    try {
      const data = await fetchERPData();
      const mergedData = { ...initialERPData, ...data };
      setErpData(mergedData);
      const [b, n] = await Promise.all([fetchBadges(), fetchNotifications()]);
      setBadges(b);
      setNotifications(n);
    } catch (err: any) {
      setError(err.message || 'Error loading data');
    }
    setLoading(false);
  };

  // Handle logout
  const handleLogout = async () => {
    handleAddAuditLog(
      `تسجيل خروج مستخدم: ${user?.username || ''}`,
      `User logged out: ${user?.username || ''}`,
      `تم إنهاء جلسة العمل الآمنة للمستخدم.`
    );
    await logout();
    // Clear persisted session info
    localStorage.removeItem('erp_company');
    localStorage.removeItem('erp_branch');
    localStorage.removeItem('erp_period');
    setUser(null);
    setErpData(null);
  };

  // Render loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin"></div>
        </div>
        <p className="mt-4 text-slate-700 dark:text-slate-300 font-bold text-xs">
          {isAr ? 'جاري الاتصال بقاعدة بيانات LODing ERP والمزامنة...' : 'Connecting to offline-first LODing ERP local instance...'}
        </p>
      </div>
    );
  }

  // Render error screen
  if (error) {
    return (
      <div className="min-h-screen bg-rose-50 dark:bg-rose-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white dark:bg-slate-900 border border-rose-200 p-8 rounded-2xl max-w-md shadow-lg space-y-4">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-sm font-black text-rose-600">{isAr ? 'فشل الاتصال بخادم النظام المحلي' : 'Local ERP Server Offline'}</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isAr 
              ? 'لم يتمكن التطبيق من قراءة ملفات قواعد البيانات. يرجى التأكد من تشغيل خادم Express على منفذ 3000.' 
              : 'Failed to establish local loopback connection. Ensure Express background server is fully operational.'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-rose-600 text-white font-bold py-2 rounded-xl text-xs"
          >
            {isAr ? 'إعادة محاولة الاتصال' : 'Retry Loopback'}
          </button>
        </div>
      </div>
    );
  }

  // FORCE LOGIN IF SESSION IS EMPTY
  if (!user || !erpData) {
    return (
      <Login 
        lang={lang} 
        onLogin={handleLoginSuccess}
        setLang={setLang}
        darkMode={theme === 'dark'}
        setDarkMode={(val) => setTheme(val ? 'dark' : 'light')}
      />
    );
  }

  // DYNAMIC COMPONENT LOADER BASED ON ACTIVE TAB
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard data={erpData} lang={lang} setActiveTab={setCurrentTab} />;
      case 'accounts':
        return (
          <AccountsChart 
            data={erpData} 
            lang={lang} 
            onUpdateAccounts={handleUpdateAccounts}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'journal':
      case 'journals':
        return (
          <JournalEntries 
            data={erpData} 
            lang={lang} 
            onUpdateEntries={handleUpdateEntries}
            onUpdateAccounts={handleUpdateAccounts}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'general_ledger':
        return <GeneralLedger data={erpData} lang={lang} />;
      case 'statement_of_account':
        return <StatementOfAccount data={erpData} lang={lang} />;
      case 'vouchers':
        return (
          <VouchersModule 
            data={erpData} 
            lang={lang}
            onUpdateVouchers={handleUpdateVouchers}
            onUpdateTreasuries={handleUpdateTreasuries}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateCustomers={handleUpdateCustomers}
            onUpdateSuppliers={handleUpdateSuppliers}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'returns':
        return (
          <ReturnsManager 
            data={erpData}
            lang={lang}
            onUpdateSalesReturns={handleUpdateSalesReturns}
            onUpdatePurchaseReturns={handleUpdatePurchaseReturns}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateEntries={handleUpdateEntries}
            onUpdateCustomers={handleUpdateCustomers}
            onUpdateSuppliers={handleUpdateSuppliers}
            onUpdateTreasuries={handleUpdateTreasuries}
            onUpdateInventory={handleUpdateInventory}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'sales_invoices':
        return (
          <SalesInvoicesModule 
            data={erpData}
            lang={lang}
            onUpdateSalesInvoices={handleUpdateSalesInvoices}
            onUpdateInventory={handleUpdateInventory}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateEntries={handleUpdateEntries}
            onUpdateCustomers={handleUpdateCustomers}
            onUpdateTreasuries={handleUpdateTreasuries}
            onUpdateVouchers={handleUpdateVouchers}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'sales':
        return (
          <Sales 
            data={erpData} 
            lang={lang} 
            onUpdateSales={handleUpdateSales}
            onUpdateInventory={handleUpdateInventory}
            onUpdateTreasuries={handleUpdateTreasuries}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateEntries={handleUpdateEntries}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'purchases':
        return (
          <Purchases 
            data={erpData} 
            lang={lang} 
            onUpdatePurchases={handleUpdatePurchases}
            onUpdateInventory={handleUpdateInventory}
            onUpdateSuppliers={handleUpdateSuppliers}
            onUpdateAccounts={handleUpdateAccounts}
            onAddMoneyTransaction={(tx) => handleUpdateMoneyTransactions([tx, ...erpData.moneyTransactions])}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'inventory':
        return (
          <Inventory 
            data={erpData} 
            lang={lang} 
            onUpdateInventory={handleUpdateInventory}
            onUpdateWastage={handleUpdateWastage}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateEntries={handleUpdateEntries}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'recipes':
        return (
          <Recipes 
            data={erpData} 
            lang={lang} 
            onUpdateRecipes={handleUpdateRecipes}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'treasury':
        return (
          <TreasuryModule 
            data={erpData} 
            lang={lang} 
            onUpdateTreasuries={handleUpdateTreasuries}
            onUpdateBankAccounts={handleUpdateBankAccounts}
            onUpdateCheques={handleUpdateCheques}
            onUpdateMoneyTransactions={handleUpdateMoneyTransactions}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateEntries={handleUpdateEntries}
            onUpdateVouchers={handleUpdateVouchers}
            onUpdateCheckbooks={handleUpdateCheckbooks}
            onUpdateCustomers={handleUpdateCustomers}
            onUpdateSuppliers={handleUpdateSuppliers}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'fixed_assets':
        return (
          <FixedAssets 
            data={erpData} 
            lang={lang} 
            onUpdateFixedAssets={handleUpdateFixedAssets}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateEntries={handleUpdateEntries}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'budgets':
        return <Budgets data={erpData} lang={lang} />;
      case 'hr':
        return (
          <HRModule 
            data={erpData} 
            lang={lang} 
            onUpdateEmployees={handleUpdateEmployees}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateEntries={handleUpdateEntries}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'payroll_runs':
        return (
          <PayrollManager
            data={erpData}
            lang={lang}
            onUpdatePayrollRuns={handleUpdatePayrollRuns}
            onUpdateEmployees={handleUpdateEmployees}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateEntries={handleUpdateEntries}
            onUpdateTreasuries={handleUpdateTreasuries}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'period_closing':
        return (
          <PeriodClosing 
            data={erpData}
            lang={lang}
            onUpdatePeriods={handleUpdateAccountingPeriods}
            onUpdateEntries={handleUpdateEntries}
            onUpdateAccounts={handleUpdateAccounts}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case 'reports':
        return <Reports data={erpData} lang={lang} />;
      case 'audit_log':
        return (
          <AuditLogView 
            data={erpData} 
            lang={lang} 
            onClearAuditLogs={handleClearAuditLogs}
          />
        );
      case 'user_management':
        return (
          <UserManagement
            lang={lang}
            currentUsername={user.username}
          />
        );
      default:
        return <Dashboard data={erpData} lang={lang} setActiveTab={setCurrentTab} />;
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row antialiased select-none font-sans" 
      dir={isAr ? 'rtl' : 'ltr'}
    >
      
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <Sidebar 
        activeTab={currentTab} 
        setActiveTab={setCurrentTab} 
        lang={lang} 
        stats={badges}
        onLogout={handleLogout}
        userRole={user?.role}
        userPermissions={user?.permissions}
        username={user?.username}
      />

      {/* 2. MAIN CLIENT CONTAINER VIEWPORT (Fills right side on LTR, left on RTL) */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP STATUS HEADER BAR */}
        <Header 
          lang={lang} 
          activeBranch={user?.branch || 'main'}
          setActiveBranch={(branch) => setUser(user ? { ...user, branch } : null)}
          activePeriod={user?.period || '2026-06'}
          setActivePeriod={(period) => setUser(user ? { ...user, period } : null)}
          notifications={notifications}
          darkMode={theme === 'dark'}
          setDarkMode={(val) => setTheme(val ? 'dark' : 'light')}
        />

        {/* COMPONENT INTERACTION AREA */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-hidden">
          {renderTabContent()}
        </main>

      </div>

      <CustomDialog
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        onConfirm={dialogConfig.onConfirm}
        onCancel={dialogConfig.onCancel}
        lang={lang}
      />
    </div>
  );
}
