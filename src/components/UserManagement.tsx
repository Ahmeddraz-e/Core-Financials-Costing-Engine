import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, ShieldCheck, User, Eye, EyeOff, Save, X, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { getSystemUsers, createSystemUser, updateSystemUser, deleteSystemUser } from '../services/api';
import { UserPermissions, ROLE_PERMISSIONS } from '../types';

interface UserManagementProps {
  lang: 'ar' | 'en';
  currentUsername: string;
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

export default function UserManagement({ lang, currentUsername }: UserManagementProps) {
  const isAr = lang === 'ar';
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    nameAr: '',
    nameEn: '',
    username: '',
    password: '',
    role: 'accountant',
    permissions: ROLE_PERMISSIONS['accountant'] as UserPermissions,
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getSystemUsers();
      setUsers(data);
    } catch (err: any) {
      window.showAlert('فشل تحميل المستخدمين: ' + err.message, 'Failed to load users: ' + err.message, 'danger');
    }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = (role: string) => {
    setForm(prev => ({
      ...prev,
      role,
      permissions: role !== 'custom' ? { ...(ROLE_PERMISSIONS[role] || emptyPermissions()) } : prev.permissions
    }));
  };

  const handlePermToggle = (key: keyof UserPermissions) => {
    setForm(prev => ({
      ...prev,
      role: 'custom',
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
    }));
  };

  const openNew = () => {
    setEditingUser(null);
    setForm({ nameAr: '', nameEn: '', username: '', password: '', role: 'accountant', permissions: { ...ROLE_PERMISSIONS['accountant'] } });
    setShowForm(true);
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    const existingPerms = u.permissions ? (() => { try { return JSON.parse(u.permissions); } catch { return null; } })() : null;
    const role = u.role || 'viewer';
    const perms = existingPerms || ROLE_PERMISSIONS[role] || emptyPermissions();
    setForm({ nameAr: u.nameAr || '', nameEn: u.nameEn || '', username: u.username, password: '', role, permissions: perms });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.username.trim()) {
      window.showAlert('اسم المستخدم مطلوب', 'Username is required', 'warning');
      return;
    }
    if (!editingUser && !form.password.trim()) {
      window.showAlert('كلمة المرور مطلوبة للحسابات الجديدة', 'Password is required for new users', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        nameAr: form.nameAr,
        nameEn: form.nameEn,
        role: form.role,
        permissions: form.permissions,
      };
      if (!editingUser) {
        payload.username = form.username;
        payload.password = form.password;
        await createSystemUser(payload);
        window.showAlert('تم إنشاء الحساب بنجاح', 'Account created successfully', 'success');
      } else {
        if (form.password.trim()) payload.password = form.password;
        await updateSystemUser(editingUser.id, payload);
        window.showAlert('تم تحديث الحساب بنجاح', 'Account updated successfully', 'success');
      }
      setShowForm(false);
      loadUsers();
    } catch (err: any) {
      window.showAlert('خطأ: ' + err.message, 'Error: ' + err.message, 'danger');
    }
    setSaving(false);
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

  const handleDelete = async (u: any) => {
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

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            {isAr ? 'إدارة المستخدمين والصلاحيات' : 'User & Permissions Management'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isAr ? 'إنشاء حسابات الموظفين وتحديد صلاحيات وصولهم لكل قسم' : 'Create employee accounts and define their access to each module'}
          </p>
        </div>
        <button
          id="btn_add_user"
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          {isAr ? 'إضافة مستخدم جديد' : 'Add New User'}
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs font-bold">
            {isAr ? 'لا يوجد مستخدمون مسجلون' : 'No users found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-start font-bold text-slate-600 dark:text-slate-400">{isAr ? 'المستخدم' : 'User'}</th>
                  <th className="px-4 py-3 text-start font-bold text-slate-600 dark:text-slate-400">{isAr ? 'اسم المستخدم' : 'Username'}</th>
                  <th className="px-4 py-3 text-start font-bold text-slate-600 dark:text-slate-400">{isAr ? 'الدور' : 'Role'}</th>
                  <th className="px-4 py-3 text-start font-bold text-slate-600 dark:text-slate-400">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-start font-bold text-slate-600 dark:text-slate-400">{isAr ? 'آخر دخول' : 'Last Login'}</th>
                  <th className="px-4 py-3 text-start font-bold text-slate-600 dark:text-slate-400">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map(u => {
                  const roleInfo = getRoleInfo(u.role);
                  const isSelf = u.username === currentUsername;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-white text-[10px] ${roleInfo.color}`}>
                            {(u.nameAr || u.username).substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{isAr ? (u.nameAr || u.username) : (u.nameEn || u.username)}</div>
                            {isSelf && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">{isAr ? 'أنت' : 'You'}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{u.username}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black text-white ${roleInfo.color}`}>
                          {isAr ? roleInfo.labelAr : roleInfo.labelEn}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 font-bold text-[10px] ${u.active ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                          {u.active ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {u.active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Disabled')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : (isAr ? 'لم يسجل دخول' : 'Never')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            title={isAr ? 'تعديل' : 'Edit'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {!isSelf && (
                            <>
                              <button
                                onClick={() => handleToggleActive(u)}
                                title={u.active ? (isAr ? 'تعطيل' : 'Disable') : (isAr ? 'تفعيل' : 'Enable')}
                                className={`p-1.5 rounded-lg transition-colors ${u.active ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30' : 'text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30'}`}
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                              </button>
                              {u.role !== 'admin' && (
                                <button
                                  onClick={() => handleDelete(u)}
                                  title={isAr ? 'حذف' : 'Delete'}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
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

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">
                    {editingUser ? (isAr ? 'تعديل الحساب' : 'Edit Account') : (isAr ? 'إضافة مستخدم جديد' : 'Add New User')}
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isAr ? 'حدد الدور والصلاحيات المناسبة' : 'Set the role and appropriate permissions'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">{isAr ? 'الاسم بالعربي' : 'Name (Arabic)'}</label>
                  <input
                    value={form.nameAr}
                    onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="محمد أحمد"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">{isAr ? 'الاسم بالإنجليزي' : 'Name (English)'}</label>
                  <input
                    value={form.nameEn}
                    onChange={e => setForm(p => ({ ...p, nameEn: e.target.value }))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Mohamed Ahmed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">{isAr ? 'اسم المستخدم (للدخول)' : 'Username (for login)'}</label>
                  <input
                    value={form.username}
                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    disabled={!!editingUser}
                    className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                    placeholder="accountant01"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {editingUser ? (isAr ? 'كلمة مرور جديدة (اتركها فارغة للإبقاء)' : 'New password (leave blank to keep)') : (isAr ? 'كلمة المرور' : 'Password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      className="w-full text-xs px-3 py-2 pe-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 end-2.5 flex items-center text-slate-400">
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Role Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-2">{isAr ? 'الدور الوظيفي' : 'Role'}</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => handleRoleChange(r.value)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border-2 ${
                        form.role === r.value
                          ? `${r.color} text-white border-transparent shadow-sm`
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400 bg-transparent'
                      }`}
                    >
                      {isAr ? r.labelAr : r.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{isAr ? 'الصلاحيات التفصيلية' : 'Detailed Permissions'}</label>
                  <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg font-bold">
                    {isAr ? 'اضغط على أي صلاحية لتعديلها' : 'Click any permission to toggle it'}
                  </span>
                </div>
                <div className="space-y-3">
                  {groupedModules.map(group => (
                    <div key={group.key} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3">
                      <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        {isAr ? group.ar : group.en}
                      </h4>
                      <div className="grid grid-cols-2 gap-1.5">
                        {group.modules.map(mod => (
                          <button
                            key={mod.key}
                            type="button"
                            onClick={() => handlePermToggle(mod.key)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all text-start ${
                              form.permissions[mod.key]
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${form.permissions[mod.key] ? 'bg-white' : 'bg-slate-300 dark:bg-slate-600'}`} />
                            {isAr ? mod.labelAr : mod.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                id="btn_save_user"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isAr ? 'حفظ الحساب' : 'Save Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
