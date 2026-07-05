import { useState } from 'react';
import { Search, Bell, Calendar, MapPin, CheckCircle, Database, ChevronDown, Laptop, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  lang: 'ar' | 'en';
  activeBranch: string;
  setActiveBranch: (branch: string) => void;
  activePeriod: string;
  setActivePeriod: (period: string) => void;
  notifications: { id: string; titleAr: string; titleEn: string; type: 'warning' | 'info' | 'danger' }[];
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export default function Header({ 
  lang, 
  activeBranch, 
  setActiveBranch, 
  activePeriod, 
  setActivePeriod, 
  notifications,
  darkMode,
  setDarkMode
}: HeaderProps) {
  const [showNotif, setShowNotif] = useState(false);
  const isAr = lang === 'ar';

  const branchLabels: Record<string, { ar: string; en: string }> = {
    main: { ar: 'الفرع الرئيسي - المهندسين', en: 'Main Branch - Mohandessin' },
    dokki: { ar: 'فرع الدقي الجديد', en: 'Dokki Branch' },
    'nasr-city': { ar: 'فرع مدينة نصر', en: 'Nasr City Branch' }
  };

  return (
    <header 
      id="header_main"
      className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 flex items-center justify-between select-none shrink-0"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Search & Status */}
      <div className="flex items-center gap-4 w-96">
        <div className="relative w-full">
          <span className={`absolute inset-y-0 ${isAr ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-slate-400`}>
            <Search className="h-4 w-4" />
          </span>
          <input
            id="global_search_input"
            type="text"
            placeholder={isAr ? 'بحث سريع عن الحسابات، الموردين، الوصفات...' : 'Search accounts, recipes, suppliers...'}
            className={`w-full text-xs font-semibold py-2 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
          />
        </div>
      </div>

      {/* Center metadata / Desktop app status removed */}

      {/* Right controls: branch, period, dark mode, notifications */}
      <div className="flex items-center gap-4">
        
        {/* Branch Selector */}
        <div className="relative flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300">
          <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
          <select
            id="header_branch_select"
            value={activeBranch}
            onChange={(e) => setActiveBranch(e.target.value)}
            className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1"
          >
            <option value="main" className="dark:bg-slate-950">{isAr ? 'الفرع الرئيسي' : 'Main Branch'}</option>
            <option value="dokki" className="dark:bg-slate-950">{isAr ? 'فرع الدقي' : 'Dokki Branch'}</option>
            <option value="nasr-city" className="dark:bg-slate-950">{isAr ? 'فرع مدينة نصر' : 'Nasr City Branch'}</option>
          </select>
        </div>

        {/* Accounting Period Selector */}
        <div className="relative flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300">
          <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
          <select
            id="header_period_select"
            value={activePeriod}
            onChange={(e) => setActivePeriod(e.target.value)}
            className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 font-mono"
          >
            <option value="2026-06" className="dark:bg-slate-950">06/2026</option>
            <option value="2026-07" className="dark:bg-slate-950">07/2026</option>
            <option value="2026-08" className="dark:bg-slate-950">08/2026</option>
          </select>
        </div>

        {/* Light/Dark Toggle */}
        <button
          id="header_theme_toggle"
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
        >
          {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            id="notifications_bell_btn"
            onClick={() => setShowNotif(!showNotif)}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 relative"
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950"></span>
            )}
          </button>

          {showNotif && (
            <div 
              id="notifications_menu"
              className={`absolute mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-40 ${
                isAr ? 'left-0' : 'right-0'
              }`}
            >
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{isAr ? 'الإشعارات والتنبيهات المباشرة' : 'Local Alerts Center'}</span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">{notifications.length}</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    {isAr ? 'لا توجد تنبيهات نشطة' : 'No warnings at this time'}
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className="px-4 py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    >
                      <div className="flex gap-2 items-start">
                        <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                          n.type === 'danger' ? 'bg-rose-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {isAr ? n.titleAr : n.titleEn}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
