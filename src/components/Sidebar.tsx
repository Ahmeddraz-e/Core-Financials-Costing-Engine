import { LayoutDashboard, FolderTree, BookOpen, ShoppingBag, Boxes, UtensilsCrossed, TrendingUp, Coins, Users, Scale, FileText, ShieldAlert, LogOut, Landmark, RotateCcw, Lock, UserCog } from "lucide-react";
import { UserPermissions } from "../types";
interface SidebarProps { activeTab: string; setActiveTab: (tab: string) => void; lang: "ar" | "en"; onLogout: () => void; stats: { pendingPRs: number; lowStockItems: number; bouncedCheques: number; }; userRole?: string; userPermissions?: UserPermissions; username?: string; }
export default function Sidebar({ activeTab, setActiveTab, lang, onLogout, stats, userRole, userPermissions, username }: SidebarProps) {
  const isAr = lang === "ar";
  const normalizedRole = userRole?.toLowerCase() || "";
  const isAdmin = normalizedRole === "admin" || !userRole;
  const canAccess = (tabId: string): boolean => { if (isAdmin) return true; if (!userPermissions) return true; return !!(userPermissions as any)[tabId]; };
  type MenuItem = { id: string; labelAr: string; labelEn: string; icon: any; badge?: number; badgeColor?: string; };
  const groups: { titleAr: string; titleEn: string; items: MenuItem[] }[] = [
    { titleAr: "الرئيسية والتحليل", titleEn: "Overview & CFO", items: [{ id: "dashboard", labelAr: "لوحة التحكم والمؤشرات", labelEn: "CFO Dashboard", icon: LayoutDashboard }] },
    { titleAr: "النظام المحاسبي والمالي", titleEn: "Core Financials", items: [ { id: "accounts", labelAr: "دليل الحسابات الشجري", labelEn: "Chart of Accounts", icon: FolderTree }, { id: "journals", labelAr: "القيود اليومية والترحيل", labelEn: "Journal Entries", icon: BookOpen }, { id: "general_ledger", labelAr: "دفتر الأستاذ التفصيلي", labelEn: "General Ledger Detail", icon: BookOpen }, { id: "statement_of_account", labelAr: "كشوف حسابات (عملاء/موردين)", labelEn: "Statements of Account", icon: FileText }, { id: "treasury", labelAr: "الخزائن والبنوك والشيكات", labelEn: "Treasury & Cheques", icon: Coins, badge: stats.bouncedCheques > 0 ? stats.bouncedCheques : undefined, badgeColor: "bg-rose-500" }, { id: "fixed_assets", labelAr: "إدارة الأصول الثابتة", labelEn: "Fixed Assets Registry", icon: Landmark } ] },
    { titleAr: "سلسلة الإمداد والتشغيل", titleEn: "Supply & Operations", items: [ { id: "purchases", labelAr: "المشتريات والموردين", labelEn: "Purchases & Suppliers", icon: ShoppingBag, badge: stats.pendingPRs > 0 ? stats.pendingPRs : undefined, badgeColor: "bg-amber-500" }, { id: "inventory", labelAr: "المخزون والتحكم بالهالك", labelEn: "Inventory & Wastage", icon: Boxes, badge: stats.lowStockItems > 0 ? stats.lowStockItems : undefined, badgeColor: "bg-rose-500" }, { id: "recipes", labelAr: "تكلفة الوصفات والتشغيل", labelEn: "Recipes & Costing", icon: UtensilsCrossed }, { id: "sales_invoices", labelAr: "فواتير المبيعات", labelEn: "Sales Invoices", icon: FileText }, { id: "sales", labelAr: "نظام الكاشير (POS)", labelEn: "POS Sales Simulator", icon: TrendingUp }, { id: "returns", labelAr: "مرتجعات المبيعات والمشتريات", labelEn: "Sales & Purchase Returns", icon: RotateCcw } ] },
    { titleAr: "الإدارات والرقابة", titleEn: "Control & Audits", items: [ { id: "hr", labelAr: "الموارد البشرية وشؤون الموظفين", labelEn: "HR & Employees", icon: Users }, { id: "payroll_runs", labelAr: "مسيرات الرواتب (شهري)", labelEn: "Monthly Payroll Runs", icon: FileText }, { id: "budgets", labelAr: "الموازنات التخطيطية", labelEn: "Budget Planning", icon: Scale }, { id: "period_closing", labelAr: "إقفال الفترات المحاسبية", labelEn: "Period Closing", icon: Lock }, { id: "reports", labelAr: "التقارير المالية والختامية", labelEn: "Financial Reports", icon: FileText }, { id: "audit_log", labelAr: "سجل الرقابة والعمليات", labelEn: "Security Audit Logs", icon: ShieldAlert }, ...(isAdmin ? [{ id: "user_management", labelAr: "إدارة المستخدمين والصلاحيات", labelEn: "User & Permissions", icon: UserCog }] : []) ] }
  ];
  const roleMap: Record<string, { ar: string; en: string }> = { admin: { ar: "مدير النظام", en: "System Admin" }, accountant: { ar: "محاسب", en: "Accountant" }, cashier: { ar: "كاشير", en: "Cashier" }, store_manager: { ar: "مدير مخزون", en: "Store Manager" }, hr_manager: { ar: "مدير موارد بشرية", en: "HR Manager" }, viewer: { ar: "مشاهد", en: "Viewer" } };
  const roleLabel = isAr ? (roleMap[normalizedRole]?.ar || "مدير النظام") : (roleMap[normalizedRole]?.en || "System Admin");
  const initials = username ? username.substring(0, 2).toUpperCase() : (isAr ? "مد" : "AD");

  // Load custom company profile name from localStorage
  let companySubtitle = isAr ? "مجموعة لودينغ للأغذية" : "LODing Foods & Rest. Group";
  try {
    const saved = localStorage.getItem('erp_company_profile');
    if (saved) {
      const p = JSON.parse(saved);
      companySubtitle = (isAr ? p.nameAr : p.nameEn) || companySubtitle;
    }
  } catch (e) {}

  return (
    <aside id="sidebar_main" className="w-72 bg-[#0f172a] dark:bg-[#070e1d] text-slate-200 dark:text-slate-350 flex flex-col h-screen select-none border-[#1e293b] dark:border-slate-900 border-e shrink-0 z-30" dir={isAr ? "rtl" : "ltr"}>
      <div className="p-6 border-b border-[#1e293b] dark:border-slate-900 flex flex-col items-center justify-center bg-[#1e293b]/30 dark:bg-[#0a1526]/50">
        <h2 className="text-3xl font-black tracking-tight text-white dark:text-[#00c6ff] font-sans">LODing ERP</h2>
        <span className="text-[10px] text-slate-400 dark:text-slate-400 font-extrabold block text-center truncate w-full mt-1">
          {companySubtitle}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {groups.map((group, gi) => {
          const visible = group.items.filter(i => canAccess(i.id));
          if (!visible.length) return null;
          return (
            <div key={gi} className="space-y-1.5">
              <span className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{isAr ? group.titleAr : group.titleEn}</span>
              <nav className="space-y-0.5">
                {visible.map(item => {
                  const active = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button key={item.id} id={"sidebar_item_" + item.id} onClick={() => setActiveTab(item.id)} className={"w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer " + (active ? "bg-blue-750 text-white shadow-sm font-bold" : "text-slate-300 dark:text-slate-400 hover:text-white dark:hover:text-white hover:bg-white/5 dark:hover:bg-slate-900/50")}>
                      <div className="flex items-center gap-3">
                        <Icon className={"h-4 w-4 " + (active ? "text-white" : "text-slate-400 dark:text-slate-400")} />
                        <span>{isAr ? item.labelAr : item.labelEn}</span>
                      </div>
                      {item.badge !== undefined && <span className={"px-2 py-0.5 rounded-full text-[9px] font-bold text-white " + (item.badgeColor || "")}>{item.badge}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>
      <div className="p-4 border-t border-[#1e293b] dark:border-slate-900 space-y-2 bg-[#1e293b]/10 dark:bg-transparent">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-[#1e293b]/20 dark:bg-slate-900/40 border border-[#1e293b] dark:border-slate-800/40">
          <div className="h-9 w-9 rounded-full bg-slate-800/50 dark:bg-slate-800 flex items-center justify-center font-bold text-white dark:text-sky-400 border border-slate-700 dark:border-slate-700 text-xs">{initials}</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-200 dark:text-slate-200 truncate">{username || (isAr ? "مدير النظام" : "System Administrator")}</h4>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block truncate">{roleLabel}</span>
          </div>
        </div>
        <button id="logout_btn" onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 dark:text-slate-400 hover:text-rose-400 dark:hover:text-rose-400 hover:bg-rose-950/10 dark:hover:bg-rose-950/20 transition-all duration-150 cursor-pointer">
          <LogOut className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          <span>{isAr ? "تسجيل الخروج الآمن" : "Secure Log Out"}</span>
        </button>
      </div>
    </aside>
  );
}