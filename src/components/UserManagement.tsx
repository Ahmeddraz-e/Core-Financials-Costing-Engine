import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, ShieldCheck, User, Eye, EyeOff, Save, X, RefreshCw, CheckCircle, XCircle, Landmark, Settings, RefreshCcw, Database, AlertCircle, FolderOpen, Download, Upload } from 'lucide-react';
import { getSystemUsers, createSystemUser, updateSystemUser, deleteSystemUser, resetDatabaseToDefault, restoreDatabaseBackup, fetchBackupsList, createDatabaseBackup, restoreFromExternalFile } from '../services/api';
import { UserPermissions, ROLE_PERMISSIONS, ERPData, BackupSchedule } from '../types';

interface UserManagementProps {
  data: ERPData;
  lang: 'ar' | 'en';
  currentUsername: string;
  onUpdateErpData: (next: ERPData) => Promise<void>;
  onAddAuditLog: (actionAr: string, actionEn: string, details: string) => void;
}

const ROLES = [
  { value: 'admin', labelAr: 'مدير النظام', labelEn: 'System Admin', color: 'bg-purple-500' },
  { value: 'accountant', labelAr: 'محاسب', labelEn: 'Accountant', color: 'bg-blue-500' },
  { value: 'cashier', labelAr: 'كاشير', labelEn: 'Cashier', color: 'bg-green-500' },
  { value: 'store_manager', labelAr: 'مدير مخزون', labelEn: 'Store Manager', color: 'bg-amber-500' },
  { value: 'hr_manager', labelAr: 'مدير موارد بشرية', labelEn: 'HR Manager', color: 'bg-rose-500' },
  { value: 'viewer', labelAr: 'مشاهد فقط', labelEn: 'Viewer Only', color: 'bg-slate-400' },
  { value: 'custom', labelAr: 'صلاحيات مخصصة', labelEn: 'Custom Permissions', color: 'bg-indigo-500' },
];

const PERMISSION_MODULES: { key: keyof UserPermissions; labelAr: string; labelEn: string; group: string }[] = [
  { key: 'dashboard', labelAr: 'لوحة التحكم', labelEn: 'Dashboard', group: 'overview' },
  { key: 'accounts', labelAr: 'دليل الحسابات', labelEn: 'Chart of Accounts', group: 'financials' },
  { key: 'journals', labelAr: 'القيود اليومية', labelEn: 'Journal Entries', group: 'financials' },
  { key: 'general_ledger', labelAr: 'دفتر الأستاذ', labelEn: 'General Ledger', group: 'financials' },
  { key: 'statement_of_account', labelAr: 'كشوف الحسابات', labelEn: 'Statements of Account', group: 'financials' },
  { key: 'vouchers', labelAr: 'سندات القبض والصرف', labelEn: 'Vouchers', group: 'financials' },
  { key: 'treasury', labelAr: 'الخزائن والبنوك', labelEn: 'Treasury & Banks', group: 'financials' },
  { key: 'fixed_assets', labelAr: 'الأصول الثابتة', labelEn: 'Fixed Assets', group: 'financials' },
  { key: 'purchases', labelAr: 'المشتريات والموردين', labelEn: 'Purchases & Suppliers', group: 'operations' },
  { key: 'inventory', labelAr: 'المخزون', labelEn: 'Inventory', group: 'operations' },
  { key: 'recipes', labelAr: 'الوصفات والتكاليف', labelEn: 'Recipes & Costing', group: 'operations' },
  { key: 'sales_invoices', labelAr: 'فواتير المبيعات', labelEn: 'Sales Invoices', group: 'operations' },
  { key: 'sales', labelAr: 'نظام الكاشير (POS)', labelEn: 'POS Sales', group: 'operations' },
  { key: 'returns', labelAr: 'المرتجعات', labelEn: 'Returns', group: 'operations' },
  { key: 'hr', labelAr: 'الموارد البشرية', labelEn: 'HR & Employees', group: 'control' },
  { key: 'payroll_runs', labelAr: 'مسيرات الرواتب', labelEn: 'Payroll Runs', group: 'control' },
  { key: 'budgets', labelAr: 'الموازنات', labelEn: 'Budget Planning', group: 'control' },
  { key: 'period_closing', labelAr: 'إقفال الفترات', labelEn: 'Period Closing', group: 'control' },
  { key: 'reports', labelAr: 'التقارير المالية', labelEn: 'Financial Reports', group: 'control' },
  { key: 'audit_log', labelAr: 'سجل الرقابة', labelEn: 'Audit Logs', group: 'control' },
  { key: 'user_management', labelAr: 'إدارة المستخدمين', labelEn: 'User Management', group: 'control' },
];

const GROUPS = {
  overview: { ar: 'نظرة عامة', en: 'Overview' },
  financials: { ar: 'النظام المالي والمحاسبي', en: 'Financials & Accounting' },
  operations: { ar: 'العمليات والإمداد', en: 'Operations & Supply' },
  control: { ar: 'الإدارة والرقابة', en: 'Control & Management' },
};

const emptyPermissions = (): UserPermissions => ({
  dashboard: false, accounts: false, journals: false, general_ledger: false,
  statement_of_account: false, vouchers: false, treasury: false, fixed_assets: false,
  purchases: false, inventory: false, recipes: false, sales_invoices: false,
  sales: false, returns: false, hr: false, payroll_runs: false, budgets: false,
  period_closing: false, reports: false, audit_log: false, user_management: false,
});

export default function UserManagement({ 
  data, 
  lang, 
  currentUsername, 
  onUpdateErpData, 
  onAddAuditLog 
}: UserManagementProps) {
  const isAr = lang === 'ar';
  
  // Tabs: 'company' | 'general' | 'users' | 'reset'
  const [activeTab, setActiveTab] = useState<'company' | 'general' | 'users' | 'reset'>('company');

  // 1. Company Profile Profile State
  const [companyForm, setCompanyForm] = useState({
    nameAr: data.companyProfile?.nameAr || 'لودينغ للأغذية',
    nameEn: data.companyProfile?.nameEn || 'LODing Foods',
    registrationNumber: data.companyProfile?.registrationNumber || 'ERP-2026-01',
    taxNumber: data.companyProfile?.taxNumber || '123456789',
    addressAr: data.companyProfile?.addressAr || '123 شارع المهندسين، الجيزة',
    addressEn: data.companyProfile?.addressEn || 'Mohandessin St, Giza 123',
    email: data.companyProfile?.email || 'info@loding-erp.com',
    phone: data.companyProfile?.phone || '+20 2 1234 5678',
    branches: data.companyProfile?.branches || 'الفرع الرئيسي, فرع الدقي, فرع مدينة نصر',
    zakatRate: data.companyProfile?.zakatRate ?? 15
  });

  // 2. Backup General Settings State
  const [backupForm, setBackupForm] = useState({
    frequency: data.backupSchedule?.frequency || 'DAILY',
    time: data.backupSchedule?.time || '23:00',
    target: data.backupSchedule?.target || 'LOCAL',
    enabled: data.backupSchedule?.enabled !== false,
    customPath: data.backupSchedule?.customPath || ''
  });

  const [backupsList, setBackupsList] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const list = await fetchBackupsList();
      setBackupsList(list);
    } catch (e) {
      console.error('Failed to load backups list:', e);
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'general') {
      loadBackups();
    }
  }, [activeTab, data.backupSchedule?.customPath]);

  // 3. User Management States
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [userForm, setUserForm] = useState({
    nameAr: '',
    nameEn: '',
    username: '',
    password: '',
    role: 'accountant',
    permissions: ROLE_PERMISSIONS['accountant'] as UserPermissions,
  });

  // 4. System Reset states
  const [resetConfirm, setResetConfirm] = useState<string>('');
  const [resetPassword, setResetPassword] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Sync state changes from parent data
  useEffect(() => {
    if (data.companyProfile) {
      setCompanyForm(data.companyProfile);
    }
    if (data.backupSchedule) {
      setBackupForm({
        frequency: data.backupSchedule.frequency,
        time: data.backupSchedule.time,
        target: data.backupSchedule.target,
        enabled: data.backupSchedule.enabled !== false,
        customPath: data.backupSchedule.customPath || ''
      });
    }
  }, [data]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const uData = await getSystemUsers();
      setUsers(uData);
    } catch (err: any) {
      window.showAlert('فشل تحميل المستخدمين', 'Failed to load users', 'danger');
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  // Handle Save changes globally (based on current active setting tab)
  const handleSaveSettings = async () => {
    try {
      if (activeTab === 'company') {
        const nextData: ERPData = {
          ...data,
          companyProfile: companyForm
        };
        await onUpdateErpData(nextData);
        onAddAuditLog('تحديث بيانات الشركة', 'Updated Company Profile', `تم تحديث ملف تعريف الشركة إلى: ${companyForm.nameAr}`);
        window.showAlert('تم حفظ بيانات الشركة بنجاح', 'Company profile saved successfully', 'success');
      } else if (activeTab === 'general') {
        const nextData: ERPData = {
          ...data,
          backupSchedule: backupForm
        };
        await onUpdateErpData(nextData);
        onAddAuditLog('تحديث إعدادات النسخ الاحتياطي', 'Updated Backup settings', `التردد: ${backupForm.frequency}`);
        window.showAlert('تم حفظ إعدادات النظام بنجاح', 'General settings saved successfully', 'success');
        loadBackups();
      }
    } catch (err: any) {
      window.showAlert('فشل الحفظ: ' + (err.message || 'خطأ غير معروف'), 'Save failed: ' + (err.message || 'Unknown error'), 'danger');
    }
  };

  const handleRoleChange = (role: string) => {
    setUserForm(prev => ({
      ...prev,
      role,
      permissions: role !== 'custom' ? { ...(ROLE_PERMISSIONS[role] || emptyPermissions()) } : prev.permissions
    }));
  };

  const handlePermToggle = (key: keyof UserPermissions) => {
    setUserForm(prev => ({
      ...prev,
      role: 'custom',
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
    }));
  };

  const openNewUser = () => {
    setEditingUser(null);
    setUserForm({ nameAr: '', nameEn: '', username: '', password: '', role: 'accountant', permissions: { ...ROLE_PERMISSIONS['accountant'] } });
    setShowUserForm(true);
  };

  const openEditUser = (u: any) => {
    setEditingUser(u);
    const existingPerms = u.permissions ? (() => { try { return JSON.parse(u.permissions); } catch { return null; } })() : null;
    const role = u.role || 'viewer';
    const perms = existingPerms || ROLE_PERMISSIONS[role] || emptyPermissions();
    setUserForm({ nameAr: u.nameAr || '', nameEn: u.nameEn || '', username: u.username, password: '', role, permissions: perms });
    setShowUserForm(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.username.trim()) {
      window.showAlert('اسم المستخدم مطلوب', 'Username is required', 'warning');
      return;
    }
    if (!editingUser && !userForm.password.trim()) {
      window.showAlert('كلمة المرور مطلوبة', 'Password is required', 'warning');
      return;
    }
    setSavingUser(true);
    try {
      const payload: any = {
        nameAr: userForm.nameAr,
        nameEn: userForm.nameEn,
        role: userForm.role,
        permissions: userForm.permissions,
      };
      if (!editingUser) {
        payload.username = userForm.username;
        payload.password = userForm.password;
        await createSystemUser(payload);
        onAddAuditLog('إنشاء مستخدم جديد', 'Created new user', `تم إنشاء مستخدم: ${userForm.username}`);
        window.showAlert('تم إنشاء الحساب بنجاح', 'Account created successfully', 'success');
      } else {
        if (userForm.password.trim()) payload.password = userForm.password;
        await updateSystemUser(editingUser.id, payload);
        onAddAuditLog('تعديل صلاحيات مستخدم', 'Updated user settings', `تم تعديل مستخدم: ${userForm.username}`);
        window.showAlert('تم تحديث الحساب بنجاح', 'Account updated successfully', 'success');
      }
      setShowUserForm(false);
      loadUsers();
    } catch (err: any) {
      window.showAlert('خطأ: ' + err.message, 'Error: ' + err.message, 'danger');
    }
    setSavingUser(false);
  };

  const handleToggleActive = async (u: any) => {
    const newActive = !u.active;
    try {
      await updateSystemUser(u.id, { active: newActive });
      loadUsers();
    } catch (err: any) {
      window.showAlert('فشل تحديث الحالة', 'Failed to update status', 'danger');
    }
  };

  const handleDeleteUser = async (u: any) => {
    window.showConfirm(
      `هل أنت متأكد من حذف حساب "${u.username}"؟`,
      `Are you sure you want to delete "${u.username}"?`,
      async () => {
        try {
          await deleteSystemUser(u.id);
          window.showAlert('تم حذف الحساب', 'Account deleted', 'success');
          loadUsers();
        } catch (err: any) {
          window.showAlert('خطأ: ' + err.message, 'Error: ' + err.message, 'danger');
        }
      }
    );
  };

  const getRoleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[ROLES.length - 1];

  const groupedModules = Object.keys(GROUPS).map(g => ({
    key: g,
    ...GROUPS[g as keyof typeof GROUPS],
    modules: PERMISSION_MODULES.filter(m => m.group === g)
  }));

  // Handle system database operational reset
  const handleSystemReset = () => {
    const cleanConfirm = resetConfirm.trim().toLowerCase();
    const cleanAr = resetConfirm.trim().replace('أ', 'ا').replace('إ', 'ا');
    if (cleanConfirm !== 'reset' && cleanAr !== 'إعادة تعيين' && cleanAr !== 'اعادة تعيين') {
      window.showAlert('يرجى كتابة الكلمة التأكيدية بشكل صحيح (RESET أو إعادة تعيين)', 'Please enter validation key to confirm (RESET or إعادة تعيين)', 'warning');
      return;
    }
    if (!resetPassword.trim()) {
      window.showAlert('يرجى إدخال كلمة المرور الحالية للتحقق', 'Password is required to proceed', 'warning');
      return;
    }

    setIsResetting(true);
    window.showConfirm(
      'تحذير! هل أنت متأكد تماماً من حذف كافة العمليات والبيانات المالية وتصفير الأرصدة؟ لا يمكن الرجوع عن هذا الإجراء.',
      'WARNING! Are you absolutely sure you want to wipe all operational data and reset balances to zero? This action is irreversible.',
      async () => {
        try {
          const res = await resetDatabaseToDefault(resetPassword);
          window.showAlert(res.messageAr, res.messageEn, 'success');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (err: any) {
          window.showAlert('فشل إعادة التهيئة: ' + err.message, 'Reset failed: ' + err.message, 'danger');
        } finally {
          setIsResetting(false);
        }
      }
    );
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* 1. Header with Global Save changes button */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-4 border border-slate-150/60 dark:border-slate-850 rounded-2xl">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {isAr ? 'الإعدادات وإدارة المستخدمين' : 'System Settings & Users'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
            {isAr ? 'تكوين بيانات الشركة، إعدادات النظام، وصلاحيات المستخدمين' : 'Configure company profile, general configurations, and user access permissions'}
          </p>
        </div>

        {(activeTab === 'company' || activeTab === 'general') && (
          <button
            onClick={handleSaveSettings}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{isAr ? 'حفظ التغييرات' : 'Save Changes'}</span>
          </button>
        )}

        {activeTab === 'users' && !showUserForm && (
          <button
            onClick={openNewUser}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>{isAr ? 'إضافة مستخدم جديد' : 'Add New User'}</span>
          </button>
        )}
      </div>

      {/* 2. Side-by-Side Flex Layout (Tabs on Right, Content Panel on Left in RTL) */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT PANEL: Form Contents (expands) */}
        <div className="flex-1 bg-white dark:bg-slate-955 border border-slate-150/60 dark:border-slate-850 rounded-2xl p-6 shadow-xs min-h-[450px]">
          
          {/* TAB 1: Company Profile (بيانات الشركة) */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-900">
                <Landmark className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'بيانات الشركة' : 'Company Profile details'}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold text-slate-700 dark:text-slate-350">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'اسم الشركة (عربي)' : 'Company Name (Arabic)'}</label>
                  <input 
                    type="text" 
                    value={companyForm.nameAr}
                    onChange={e => setCompanyForm({ ...companyForm, nameAr: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'اسم الشركة (إنجليزي)' : 'Company Name (English)'}</label>
                  <input 
                    type="text" 
                    value={companyForm.nameEn}
                    onChange={e => setCompanyForm({ ...companyForm, nameEn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'رقم التسجيل (السجل التجاري)' : 'Commercial Registration Number'}</label>
                  <input 
                    type="text" 
                    value={companyForm.registrationNumber}
                    onChange={e => setCompanyForm({ ...companyForm, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'رقم ضريبي' : 'Tax Card Number (VAT)'}</label>
                  <input 
                    type="text" 
                    value={companyForm.taxNumber}
                    onChange={e => setCompanyForm({ ...companyForm, taxNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'العنوان (عربي)' : 'Location Address (Arabic)'}</label>
                  <input 
                    type="text" 
                    value={companyForm.addressAr}
                    onChange={e => setCompanyForm({ ...companyForm, addressAr: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'العنوان (إنجليزي)' : 'Location Address (English)'}</label>
                  <input 
                    type="text" 
                    value={companyForm.addressEn}
                    onChange={e => setCompanyForm({ ...companyForm, addressEn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'البريد الإلكتروني' : 'Official Email Address'}</label>
                  <input 
                    type="email" 
                    value={companyForm.email}
                    onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'الهاتف' : 'Contact Telephone'}</label>
                  <input 
                    type="text" 
                    value={companyForm.phone}
                    onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white font-mono"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'الفروع الفعالة بالنظام (مفصولة بفاصلة ,)' : 'Active System Branches (comma-separated ,)'}</label>
                  <input 
                    type="text" 
                    value={companyForm.branches || ''}
                    onChange={e => setCompanyForm({ ...companyForm, branches: e.target.value })}
                    placeholder={isAr ? 'مثال: الفرع الرئيسي, فرع الدقي, فرع التجمع' : 'e.g. Main Branch, Dokki Branch, Tagamoa Branch'}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'نسبة مخصص الزكاة وضريبة الدخل (%)' : 'Zakat & Tax Provision Rate (%)'}</label>
                  <input 
                    type="number" 
                    min="0" max="100" step="0.5"
                    value={companyForm.zakatRate}
                    onChange={e => setCompanyForm({ ...companyForm, zakatRate: +e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-850 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: General settings (الإعدادات العامة) */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-900">
                <Settings className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'إعدادات النظام والنسخ الاحتياطي' : 'General Configuration & Backup Schedule'}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-bold text-slate-700 dark:text-slate-350">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'تكرار النسخ الاحتياطي التلقائي' : 'Backup Frequency'}</label>
                  <select 
                    value={backupForm.frequency}
                    onChange={e => setBackupForm({ ...backupForm, frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white"
                  >
                    <option value="DAILY">{isAr ? 'يومياً' : 'Daily'}</option>
                    <option value="WEEKLY">{isAr ? 'أسبوعياً' : 'Weekly'}</option>
                    <option value="MONTHLY">{isAr ? 'شهرياً' : 'Monthly'}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'وقت النسخ (صيغة 24 ساعة)' : 'Backup Execution Time (24h format)'}</label>
                  <input 
                    type="text" 
                    value={backupForm.time}
                    onChange={e => setBackupForm({ ...backupForm, time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'الوجهة المستهدفة لحفظ الملف' : 'Backup Target Destination'}</label>
                  <select 
                    value={backupForm.target}
                    onChange={e => setBackupForm({ ...backupForm, target: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white"
                  >
                    <option value="LOCAL">{isAr ? 'تخزين محلي (Local Disk)' : 'Local Storage Disk'}</option>
                    <option value="USB">{isAr ? 'قرص خارجي USB' : 'External USB Flash'}</option>
                    <option value="LAN">{isAr ? 'الشبكة المحلية LAN' : 'Local LAN Drive'}</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input 
                    type="checkbox" 
                    id="auto_backup_enabled"
                    checked={backupForm.enabled}
                    onChange={e => setBackupForm({ ...backupForm, enabled: e.target.checked })}
                    className="h-4.5 w-4.5 rounded border-slate-250 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="auto_backup_enabled" className="text-xs font-black text-slate-800 dark:text-slate-200 select-none cursor-pointer">
                    {isAr ? 'تفعيل النسخ الاحتياطي التلقائي المبرمج' : 'Enable automated backup schedule'}
                  </label>
                </div>

                {/* Custom backup directory path input */}
                <div className="md:col-span-2">
                  <label className="text-[10px] text-slate-400 block mb-1">
                    {isAr ? 'مسار مجلد النسخ الاحتياطي المخصص (اختر من المجلدات أو اكتب يدوياً)' : 'Custom Backup Folder Path (pick a folder or type path)'}
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={backupForm.customPath || ''}
                      onChange={e => setBackupForm({ ...backupForm, customPath: e.target.value })}
                      placeholder={isAr ? 'مثال: D:\\backups (اتركه فارغاً للحفظ في المسار الافتراضي للبرنامج)' : 'e.g. D:\\backups (Leave empty for default app path)'}
                      className="w-full px-3 py-2.5 border border-slate-250 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.electronAPI?.selectFolder) {
                          const folder = await window.electronAPI.selectFolder();
                          if (folder) setBackupForm({ ...backupForm, customPath: folder });
                        }
                      }}
                      className={`absolute ${isAr ? 'left-3' : 'right-3'} top-3 cursor-pointer`}
                    >
                      <FolderOpen className="h-4.5 w-4.5 text-slate-400 hover:text-blue-500 transition-colors" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-450 mt-1 font-semibold">
                    {isAr 
                      ? '⚠️ يرجى التأكد من كتابة اسم القرص والمسار بشكل صحيح. سيقوم النظام بإنشاء المجلد تلقائياً إذا لم يكن موجوداً.' 
                      : '⚠️ Please ensure you write the disk letter and folder path correctly. The system will create the folder if it does not exist.'}
                  </p>
                </div>

                {/* Backups list & Action center */}
                <div className="md:col-span-2 mt-4 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Database className="h-4 w-4 text-emerald-600" />
                      {isAr ? 'سجل النسخ الاحتياطية المتاحة على هذا المسار' : 'Available Backups Registry'}
                    </span>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await createDatabaseBackup();
                            window.showAlert(res.messageAr, res.messageEn, 'success');
                            loadBackups();
                          } catch (err: any) {
                            window.showAlert('خطأ أثناء النسخ الاحتياطي: ' + err.message, 'Error: ' + err.message, 'danger');
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        {isAr ? 'إنشاء نسخة احتياطية الآن' : 'Backup Now'}
                      </button>
                      
                      <button
                        type="button"
                        onClick={loadBackups}
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-350 font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`h-3 w-3 ${loadingBackups ? 'animate-spin' : ''}`} />
                        {isAr ? 'تحديث القائمة' : 'Refresh list'}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.electronAPI?.selectBackupFile) {
                            window.showAlert('هذه الميزة متاحة فقط في تطبيق سطح المكتب', 'This feature is only available in the desktop app', 'warning');
                            return;
                          }
                          const filePath = await window.electronAPI.selectBackupFile();
                          if (!filePath) return;
                          window.showConfirm(
                            `⚠️ هل أنت متأكد من استعادة النسخة الاحتياطية من هذا الملف؟ (${filePath})
سيؤدي ذلك إلى استبدال كافة البيانات الحالية بالبيانات التاريخية المحفوظة في هذا الملف، وإعادة تشغيل التطبيق تلقائياً.`,
                            `⚠️ Are you sure you want to restore from this backup file? (${filePath})
This will overwrite all active transaction ledgers with the contents of this file, and automatically restart the application.`,
                            async () => {
                              try {
                                const res = await restoreFromExternalFile(filePath);
                                window.showAlert(res.messageAr, res.messageEn, 'success');
                              } catch (err: any) {
                                window.showAlert('خطأ أثناء استعادة النسخة: ' + err.message, 'Error restoring: ' + err.message, 'danger');
                              }
                            }
                          );
                        }}
                        className="bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1 cursor-pointer border border-amber-200 dark:border-amber-900/50"
                      >
                        <Upload className="h-3 w-3" />
                        {isAr ? 'استعادة من ملف' : 'Restore from file'}
                      </button>
                    </div>
                  </div>

                  {loadingBackups ? (
                    <div className="py-6 text-center text-slate-400 font-bold">
                      {isAr ? 'جاري قراءة قائمة النسخ الاحتياطية...' : 'Scanning backup directory...'}
                    </div>
                  ) : backupsList.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 font-bold border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      {isAr 
                        ? '⚠️ لا يوجد ملفات نسخ احتياطي حالياً في هذا المجلد. اضغط على "إنشاء نسخة احتياطية الآن" لحفظ أول نسخة.' 
                        : '⚠️ No backup files found in this folder. Click "Backup Now" to create your first backup.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-850 rounded-xl">
                      <table className="w-full text-start border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-450 border-b border-slate-100 dark:border-slate-850 font-black">
                            <th className="p-3 text-start">{isAr ? 'اسم ملف النسخة الاحتياطية' : 'Backup File Name'}</th>
                            <th className="p-3 text-center">{isAr ? 'تاريخ الحفظ' : 'Created Date'}</th>
                            <th className="p-3 text-center">{isAr ? 'الحجم' : 'File Size'}</th>
                            <th className="p-3 text-center">{isAr ? 'الإجراء' : 'Action'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                          {backupsList.map((backup, idx) => {
                            const sizeMB = (backup.sizeBytes / (1024 * 1024)).toFixed(2);
                            const dateStr = new Date(backup.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-US');
                            return (
                              <tr key={backup.fileName} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors font-semibold text-slate-700 dark:text-slate-350">
                                <td className="p-3 font-mono text-xs max-w-xs truncate text-blue-600 dark:text-blue-400" title={backup.fileName}>
                                  📄 {backup.fileName}
                                </td>
                                <td className="p-3 text-center font-bold">{dateStr}</td>
                                <td className="p-3 text-center font-bold font-mono">{sizeMB} MB</td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      window.showConfirm(
                                        `⚠️ هل أنت متأكد من استعادة هذه النسخة الاحتياطية المحددة؟ (${backup.fileName})
سيؤدي ذلك إلى استبدال كافة البيانات الحالية بالبيانات التاريخية المحفوظة في هذا الملف، وإعادة تشغيل التطبيق تلقائياً.`,
                                        `⚠️ Are you sure you want to restore this specific backup? (${backup.fileName})
This will overwrite all active transaction ledgers with the contents of this file, and automatically restart the application.`,
                                        async () => {
                                          try {
                                            const res = await restoreDatabaseBackup(backup.fileName);
                                            window.showAlert(res.messageAr, res.messageEn, 'success');
                                          } catch (err: any) {
                                            window.showAlert('خطأ أثناء استعادة النسخة: ' + err.message, 'Error restoring: ' + err.message, 'danger');
                                          }
                                        }
                                      );
                                    }}
                                    className="bg-blue-55 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-bold px-3 py-1 rounded-lg transition-all cursor-pointer border border-blue-100 dark:border-blue-900/50"
                                  >
                                    🔄 {isAr ? 'استعادة هذه النسخة' : 'Restore'}
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
              </div>
            </div>
          )}

          {/* TAB 3: User list & access permissions (إدارة المستخدمين) */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              
              {!showUserForm ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-900">
                    <User className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'مستخدمي النظام وصلاحياتهم' : 'System Accounts & Staff Roles'}</h3>
                  </div>

                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-start">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 font-extrabold uppercase">
                            <th className="py-2.5 px-3 text-start">{isAr ? 'المستخدم' : 'User'}</th>
                            <th className="py-2.5 px-3 text-start">{isAr ? 'اسم الدخول' : 'Username'}</th>
                            <th className="py-2.5 px-3 text-start">{isAr ? 'الدور الوظيفي' : 'Role'}</th>
                            <th className="py-2.5 px-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                            <th className="py-2.5 px-3 text-start">{isAr ? 'الإجراءات' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(u => {
                            const roleInfo = getRoleInfo(u.role);
                            const isSelf = u.username === currentUsername;
                            return (
                              <tr key={u.id} className="border-b border-slate-50 dark:border-slate-900/60 hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-white">
                                  {isAr ? (u.nameAr || u.username) : (u.nameEn || u.username)}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-550">{u.username}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black text-white ${roleInfo.color}`}>
                                    {isAr ? roleInfo.labelAr : roleInfo.labelEn}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <button 
                                    onClick={() => !isSelf && handleToggleActive(u)}
                                    disabled={isSelf}
                                    className={`font-black text-[10px] cursor-pointer hover:underline ${u.active ? 'text-green-600' : 'text-slate-405'}`}
                                  >
                                    {u.active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Disabled')}
                                  </button>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex gap-2">
                                    <button onClick={() => openEditUser(u)} className="p-1 rounded bg-slate-100 hover:bg-slate-205 text-slate-600 cursor-pointer"><Edit2 className="h-3 w-3" /></button>
                                    {!isSelf && u.role !== 'admin' && (
                                      <button onClick={() => handleDeleteUser(u)} className="p-1 rounded bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 cursor-pointer"><Trash2 className="h-3 w-3" /></button>
                                    )}
                                  </div>
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
                
                // Add/Edit User Access Form
                <div className="space-y-5">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-900">
                    <span className="text-sm font-black text-slate-950 dark:text-white">
                      {editingUser ? (isAr ? 'تعديل حساب مستخدم' : 'Edit User Settings') : (isAr ? 'إنشاء حساب جديد' : 'New User Setup')}
                    </span>
                    <button onClick={() => setShowUserForm(false)} className="p-1 text-slate-400 hover:bg-slate-150 rounded"><X className="h-4 w-4" /></button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-700 dark:text-slate-350">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'الاسم بالكامل (عربي)' : 'Full Name (Arabic)'}</label>
                      <input type="text" value={userForm.nameAr} onChange={e => setUserForm({ ...userForm, nameAr: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'الاسم بالكامل (إنجليزي)' : 'Full Name (English)'}</label>
                      <input type="text" value={userForm.nameEn} onChange={e => setUserForm({ ...userForm, nameEn: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'اسم المستخدم للدخول' : 'Access Username'}</label>
                      <input type="text" disabled={!!editingUser} value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white font-mono disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'كلمة المرور' : 'Secret Password'}</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white font-mono" />
                        <button onClick={() => setShowPassword(!showPassword)} className={`absolute ${isAr ? 'left-2.5' : 'right-2.5'} top-2.5 text-slate-405`}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'الدور والصلاحية الافتراضية' : 'System Role Group'}</label>
                      <select value={userForm.role} onChange={e => handleRoleChange(e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white font-bold">
                        {ROLES.map(r => (
                          <option key={r.value} value={r.value}>{isAr ? r.labelAr : r.labelEn}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Modules Permissions list */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{isAr ? 'تفاصيل صلاحيات الدخول للوحدات والصفحات:' : 'Fine-grained module access rights:'}</span>
                    
                    {groupedModules.map(group => (
                      <div key={group.key} className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-850">
                        <span className="text-[11px] font-black text-blue-650 block">{isAr ? group.ar : group.en}</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                          {group.modules.map(mod => (
                            <button
                              key={mod.key}
                              onClick={() => handlePermToggle(mod.key)}
                              className={`p-2 rounded-lg text-start flex items-center gap-2 border font-bold transition-all ${
                                userForm.permissions[mod.key]
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              <div className={`h-3 w-3 rounded-full ${userForm.permissions[mod.key] ? 'bg-white' : 'bg-slate-350'}`} />
                              <span>{isAr ? mod.labelAr : mod.labelEn}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                    <button onClick={() => setShowUserForm(false)} className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800">{isAr ? 'إلغاء' : 'Cancel'}</button>
                    <button onClick={handleSaveUser} disabled={savingUser} className="px-5 py-2 text-xs font-black rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-md">
                      {savingUser ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الحساب' : 'Save User')}
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: System Reset Console (إعادة تهيئة النظام) */}
          {activeTab === 'reset' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-900">
                <RefreshCcw className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">{isAr ? 'إعادة تهيئة النظام' : 'System Reset & Data Wipe'}</h3>
              </div>

              {/* Warning Alert Banner (Matches Image 1 layout) */}
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 space-y-3 shadow-xs">
                <div className="flex items-center gap-2 font-black text-xs">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-600 animate-pulse" />
                  <span>{isAr ? 'تحذير: إعادة تهيئة النظام (System Reset)' : 'Warning: ERP System Reset'}</span>
                </div>
                <p className="text-[11px] font-semibold leading-relaxed">
                  {isAr 
                    ? 'هذه العملية تحذف جميع البيانات التشغيلية فقط، مثل القيود اليومية، سندات القبض والصرف، الحركات المالية، فواتير المبيعات والمشتريات، المرتجعات، أوامر التشغيل، والرواتب، مع إعادة ترقيم المستندات إلى البداية. لن يتم حذف البيانات الأساسية مثل المستخدمين، الحسابات، الأصناف، المخازن، والخزائن.'
                    : 'This operation wipes all transaction ledgers, journals, sales, purchases, payroll runs, and vouchers, resetting counters to start. Chart of Accounts, users list, inventory list, and vaults config are retained.'}
                </p>
              </div>

              {/* Inputs */}
              <div className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-350 max-w-md">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'اكتب RESET أو إعادة تعيين للتأكيد' : 'Type RESET to validate'}</label>
                  <input 
                    type="text" 
                    value={resetConfirm}
                    onChange={e => setResetConfirm(e.target.value)}
                    placeholder="RESET"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white font-mono"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">{isAr ? 'كلمة المرور الحالية للتأكيد' : 'Current password verification'}</label>
                  <input 
                    type="password" 
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white font-mono"
                  />
                </div>

                <div className="pt-3">
                  <button
                    onClick={handleSystemReset}
                    disabled={isResetting}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 justify-center"
                  >
                    <Database className="h-4 w-4" />
                    <span>{isResetting ? (isAr ? 'جاري إعادة التهيئة...' : 'Resetting...') : (isAr ? 'بدء إعادة التهيئة' : 'Execute Reset Now')}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* RIGHT PANEL: Vertical tabs sidebar (width: 64) */}
        <div className="w-full lg:w-64 shrink-0 bg-white dark:bg-slate-955 border border-slate-150/60 dark:border-slate-850 rounded-2xl p-4 shadow-xs self-start">
          <div className="flex flex-col gap-2">
            
            <button
              onClick={() => { setActiveTab('company'); setShowUserForm(false); }}
              className={`w-full px-4 py-3 text-xs font-black rounded-xl text-start transition-all cursor-pointer ${
                activeTab === 'company' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              {isAr ? 'بيانات الشركة' : 'Company Profile'}
            </button>

            <button
              onClick={() => { setActiveTab('general'); setShowUserForm(false); }}
              className={`w-full px-4 py-3 text-xs font-black rounded-xl text-start transition-all cursor-pointer ${
                activeTab === 'general' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              {isAr ? 'الإعدادات العامة' : 'General Configuration'}
            </button>

            <button
              onClick={() => { setActiveTab('users'); setShowUserForm(false); }}
              className={`w-full px-4 py-3 text-xs font-black rounded-xl text-start transition-all cursor-pointer ${
                activeTab === 'users' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              {isAr ? 'إدارة المستخدمين' : 'Users Management'}
            </button>

            <button
              onClick={() => { setActiveTab('reset'); setShowUserForm(false); }}
              className={`w-full px-4 py-3 text-xs font-black rounded-xl text-start transition-all cursor-pointer ${
                activeTab === 'reset' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              {isAr ? 'إعادة تهيئة النظام' : 'System Reset Console'}
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}
