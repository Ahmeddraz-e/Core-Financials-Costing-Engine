import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  fetchNotifications,
  getLicenseStatus,
  activateLicenseKey
} from './services/api';
import { ERPData, UserSession, AuditLog, Treasury, BankAccount } from './types';
import { initialERPData } from './initialData';
import CustomDialog from './components/CustomDialog';
import ActivationGate from './components/ActivationGate';
import { 
  Search, Bell, MessageSquare, CheckSquare, Globe, Sun, Moon, LogOut, 
  ChevronDown, User, Menu, X, Landmark, Coins, ShoppingBag, Boxes, 
  BookOpen, FileText, Settings, LayoutDashboard, Users, Activity, 
  ShieldAlert, Scale, Lock, UserCog, UserCheck, Briefcase, FileWarning
} from 'lucide-react';

declare global {
  interface Window {
    showAlert: (messageAr: string, messageEn: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
    showConfirm: (messageAr: string, messageEn: string, onConfirm: () => void) => void;
    electronAPI?: {
      selectFolder: () => Promise<string | null>;
      selectBackupFile: () => Promise<string | null>;
    };
  }
}

// Helper: fill missing accountId on treasuries & bankAccounts from initial data,
// and restore default entities that were accidentally deleted (only if linked account exists)
function fixAccountLinks(data: ERPData, initial: ERPData): ERPData {
  const accountIds = new Set((data.accounts || []).map(a => a.id));

  const treasuries: Treasury[] = (data.treasuries || []).map(t => ({
    ...t,
    accountId: t.accountId || (initial.treasuries.find(it => it.id === t.id)?.accountId || '')
  }));
  // Restore missing default treasuries only if linked account still exists
  for (const it of (initial.treasuries || [])) {
    const accId = it.accountId || '';
    if (!treasuries.find(t => t.id === it.id) && (!accId || accountIds.has(accId))) {
      treasuries.push({ ...it, accountId: accId });
    }
  }

  const bankAccounts: BankAccount[] = (data.bankAccounts || []).map(b => ({
    ...b,
    accountId: b.accountId || (initial.bankAccounts.find(ib => ib.id === b.id)?.accountId || '')
  }));
  // Restore missing default bank accounts only if linked account still exists
  for (const ib of (initial.bankAccounts || [])) {
    const accId = ib.accountId || '';
    if (!bankAccounts.find(b => b.id === ib.id) && (!accId || accountIds.has(accId))) {
      bankAccounts.push({ ...ib, accountId: accId });
    }
  }

  const checkbooks = (data.checkbooks || []).slice();
  for (const ic of (initial.checkbooks || [])) {
    if (!checkbooks.find(c => c.id === ic.id)) {
      checkbooks.push({ ...ic });
    }
  }

  const accounts = (data.accounts || []).slice();
  for (const ia of (initial.accounts || [])) {
    if (!accounts.find(a => a.id === ia.id)) {
      accounts.push({ ...ia });
    }
  }

  return { ...data, treasuries, bankAccounts, checkbooks, accounts };
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
  const [licenseStatus, setLicenseStatus] = useState<'checking' | 'activated' | 'needs-activation'>('checking');
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);

  const isAr = lang === 'ar';

  const branchList = useMemo(() => {
    try {
      const saved = localStorage.getItem('erp_company_profile');
      if (saved) {
        const p = JSON.parse(saved);
        if (p && p.branches) {
          return p.branches.split(',').map((b: string) => b.trim()).filter(Boolean);
        }
      }
    } catch (e) {}
    return ['الفرع الرئيسي', 'فرع الدقي', 'فرع مدينة نصر']; // Fallback
  }, []);

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

  // Check license activation status on startup (before anything else)
  useEffect(() => {
    async function checkLicense() {
      try {
        const status = await getLicenseStatus();
        if (status.isActivated) {
          setLicenseStatus('activated');
        } else {
          setLicenseStatus('needs-activation');
          setLoading(false);
        }
      } catch {
        setLicenseStatus('needs-activation');
        setLoading(false);
      }
    }
    checkLicense();
  }, []);

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

  // 1. Check for existing session on startup (only if license is activated)
  useEffect(() => {
    if (licenseStatus !== 'activated') return;
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
        const mergedData = fixAccountLinks({ ...initialERPData, ...data }, initialERPData);
        setErpData(mergedData);
        if (mergedData.companyProfile) {
          localStorage.setItem('erp_company_profile', JSON.stringify(mergedData.companyProfile));
        }
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
  }, [licenseStatus]);

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
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingSaveCountRef = useRef(0);

  const updateErpState = (updater: (prev: ERPData) => ERPData): Promise<void> => {
    pendingSaveCountRef.current++;
    let nextSnapshot: ERPData | null = null;
    setErpData(prev => {
      if (!prev) return null;
      nextSnapshot = updater(prev);
      if (nextSnapshot.companyProfile) {
        localStorage.setItem('erp_company_profile', JSON.stringify(nextSnapshot.companyProfile));
      }
      return nextSnapshot;
    });
    // The actual save operation — might reject
    const saveOp = saveQueueRef.current.then(() => {
      if (nextSnapshot) return saveERPData(nextSnapshot);
    });
    // Queue always stays resolved so subsequent saves can proceed
    saveQueueRef.current = saveOp
      .catch(err => {
        console.error('Database sync failed:', err);
        setSaveError(err.message || 'Unknown save error');
      })
      .finally(() => { pendingSaveCountRef.current--; });
    // Callers get a promise that rejects on failure
    return saveOp;
  };

  // Show user-facing alert when save fails
  useEffect(() => {
    if (saveError) {
      window.showAlert(
        `⚠️ فشل حفظ البيانات: ${saveError}`,
        `⚠️ Failed to save data: ${saveError}`,
        'danger'
      );
      setSaveError(null);
    }
  }, [saveError]);

  // Warn on unsaved changes before close/reload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingSaveCountRef.current > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Listen for auth expiration events (dispatched by api.ts on 401)
  useEffect(() => {
    const handler = () => {
      saveQueueRef.current = Promise.resolve();
      pendingSaveCountRef.current = 0;
      localStorage.removeItem('erp_company');
      localStorage.removeItem('erp_branch');
      localStorage.removeItem('erp_period');
      setUser(null);
      setErpData(null);
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

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
          const pass = prompt(isAr ? 'أدخل كلمة مرور المسؤول للتأكيد:' : 'Enter admin password to confirm:') || '';
          if (!pass) return;
          const res = await resetDatabaseToDefault(pass);
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
      const mergedData = fixAccountLinks({ ...initialERPData, ...data }, initialERPData);
      setErpData(mergedData);
      if (mergedData.companyProfile) {
        localStorage.setItem('erp_company_profile', JSON.stringify(mergedData.companyProfile));
      }
      try {
        const [b, n] = await Promise.all([fetchBadges(), fetchNotifications()]);
        setBadges(b);
        setNotifications(n);
      } catch { /* non-critical */ }
    } catch (err: any) {
      setError(err.message || 'Error loading data');
    }
    setLoading(false);
  };

  // Handle logout
  const handleLogout = async () => {
    // 1. Wait for all pending saves to finish with current valid token
    try { await saveQueueRef.current; } catch {}
    // 2. Drop the save queue so no stale saves execute after token is cleared
    saveQueueRef.current = Promise.resolve();
    pendingSaveCountRef.current = 0;
    // 3. Now safe to clear session
    await logout();
    // 4. Clear persisted session info
    localStorage.removeItem('erp_company');
    localStorage.removeItem('erp_branch');
    localStorage.removeItem('erp_period');
    setUser(null);
    setErpData(null);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetchERPData()
      .then(data => {
        setErpData(fixAccountLinks({ ...initialERPData, ...data }, initialERPData));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
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
              ? 'تعذر تحميل بيانات النظام. يرجى المحاولة مرة أخرى.' 
              : 'Failed to load system data. Please try again.'}
          </p>
          <p className="text-[10px] text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 rounded-lg font-mono break-all">
            {error}
          </p>
          <button 
            onClick={handleRetry}
            className="w-full bg-rose-600 text-white font-bold py-2 rounded-xl text-xs"
          >
            {isAr ? 'إعادة محاولة الاتصال' : 'Retry Loopback'}
          </button>
        </div>
      </div>
    );
  }

  // LICENSE ACTIVATION SCREEN (stays until user manually proceeds to login)
  if (licenseStatus !== 'activated' || !showLogin) {
    return <ActivationGate
      status={licenseStatus}
      error={licenseError}
      lang={lang}
      isAr={isAr}
      setLang={setLang}
      theme={theme}
      setTheme={setTheme}
      onActivate={async (key) => {
        setLicenseError(null);
        try {
          const result = await activateLicenseKey(key);
          if (result.success) {
            setLicenseStatus('activated');
          } else {
            setLicenseError(result.reason || (isAr ? 'رمز التفعيل غير صحيح' : 'Invalid license key'));
          }
        } catch {
          setLicenseError(isAr ? 'فشل الاتصال بخادم التفعيل' : 'Activation server error');
        }
      }}
      onProceedToLogin={() => setShowLogin(true)}
    />;
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
            onUpdateTreasuries={handleUpdateTreasuries}
            onUpdateBankAccounts={handleUpdateBankAccounts}
            onUpdateCheckbooks={handleUpdateCheckbooks}
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
            onUpdateTreasuries={handleUpdateTreasuries}
            onUpdateBankAccounts={handleUpdateBankAccounts}
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
            onUpdateSalesInvoices={handleUpdateSalesInvoices}
            onUpdatePurchases={handleUpdatePurchases}
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
            onUpdateBankAccounts={handleUpdateBankAccounts}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateEntries={handleUpdateEntries}
            onAddAuditLog={handleAddAuditLog}
            onUpdateERPState={updateErpState}
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
            onAddMoneyTransaction={(tx) => updateErpState(prev => ({
              ...prev,
              moneyTransactions: [tx, ...(prev.moneyTransactions || [])]
            }))}
            onAddAuditLog={handleAddAuditLog}
            onUpdateERPState={updateErpState}
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
            onUpdateInventory={handleUpdateInventory}
            onUpdateERPState={updateErpState}
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
            onUpdateERPState={updateErpState}
          />
        );
      case 'budgets':
        return <Budgets data={erpData} lang={lang} />;
      case 'hr':
        return (
          <HRModule 
            data={erpData} 
            lang={lang} 
            userRole={user?.role || 'admin'}
            onUpdateEmployees={handleUpdateEmployees}
            onUpdateAccounts={handleUpdateAccounts}
            onUpdateEntries={handleUpdateEntries}
            onAddAuditLog={handleAddAuditLog}
            onUpdateERPState={updateErpState}
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
            data={erpData}
            lang={lang}
            currentUsername={user.username}
            onUpdateErpData={(next) => updateErpState(() => next)}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      default:
        return <Dashboard data={erpData} lang={lang} setActiveTab={setCurrentTab} />;
    }
  };

  return (
    <div 
      className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row antialiased select-none font-sans overflow-hidden" 
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
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* TOP STATUS HEADER BAR */}
        <Header 
          lang={lang} 
          notifications={notifications}
          darkMode={theme === 'dark'}
          setDarkMode={(val) => setTheme(val ? 'dark' : 'light')}
        />

        {/* COMPONENT INTERACTION AREA */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto">
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

