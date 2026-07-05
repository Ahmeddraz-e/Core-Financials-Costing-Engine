import React, { useState } from 'react';
import { Shield, Key, Eye, EyeOff, Languages, Sun, Moon, Building2, MapPin, Laptop, Loader2 } from 'lucide-react';
import { UserSession } from '../types';
import { login } from '../services/api';

interface LoginProps {
  onLogin: (session: UserSession) => void;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export default function Login({ onLogin, lang, setLang, darkMode, setDarkMode }: LoginProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [company, setCompany] = useState('loding-foods');
  const [branch, setBranch] = useState('main');
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const result = await login(username, password, company, branch);
      onLogin({
        username: result.user.username,
        company: result.user.company || company,
        branch: result.user.branch || branch,
        period: '2026-06'
      });
    } catch (err: any) {
      setLoginError(
        lang === 'ar'
          ? 'اسم المستخدم أو كلمة المرور غير صحيحة'
          : err.message || 'Invalid username or password'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const isAr = lang === 'ar';

  return (
    <div id="login_container" className="min-h-screen flex font-sans bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      
      {/* LEFT SIDE - BRANDING & HERO */}
      <div id="login_left_hero" className="hidden lg:flex w-1/2 bg-slate-950 text-white flex-col justify-between p-12 relative overflow-hidden border-r border-slate-800">
        {/* Subtle geometric grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-700/10 blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl"></div>

        {/* Header brand */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="bg-gradient-to-tr from-blue-600 to-sky-400 p-2 rounded-xl shadow-lg shadow-blue-500/20">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-300 bg-clip-text text-transparent">
              LODing ERP
            </span>
            <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {isAr ? 'نظام الحسابات والتكاليف المتكامل' : 'Core Financials & Costing Engine'}
            </span>
          </div>
        </div>

        {/* Middle Message */}
        <div className="relative my-auto max-w-lg z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-sky-400">
            <Laptop className="h-3.5 w-3.5" />
            <span>Windows Desktop App Simulation • Offline-First</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            {isAr 
              ? 'إدارة الحسابات العامة وتكاليف الأغذية بكفاءة وموثوقية عالية' 
              : 'Empower Your Food Business with Absolute Financial Precision'}
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            {isAr
              ? 'نظام محاسبي وتكاليفي متكامل للمطاعم وسلاسل الأغذية. يجمع بين شجرة الحسابات المرنة، دورة المشتريات، مراقبة المخازن والهالك، التكلفة الدقيقة للوصفات (Food Cost)، مع حزمة تقارير مالية توافق معايير المراجعة الدولية.'
              : 'The comprehensive ERP engineered for restaurant chains. Consolidate general ledgers, monitor food costing and wastage, control supplier pipelines, and access real-time CFO metrics offline with zero lag.'}
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/60">
            <div>
              <span className="block text-2xl font-bold text-sky-400">0%</span>
              <span className="text-xs text-slate-500">{isAr ? 'اعتمادية إنترنت' : 'Internet Dependency'}</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-sky-400">&lt; 1s</span>
              <span className="text-xs text-slate-500">{isAr ? 'زمن الاستجابة' : 'Response Latency'}</span>
            </div>
            <div>
              <span className="block text-2xl font-bold text-sky-400">100%</span>
              <span className="text-xs text-slate-500">{isAr ? 'أمان وسرية بيانات' : 'Local Data Security'}</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="relative text-xs text-slate-500 z-10 flex justify-between items-center">
          <span>© 2026 LODing Systems</span>
          <span className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800/40">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
            {isAr ? 'الخادم المحلي نشط' : 'Local Host Active'}
          </span>
        </div>
      </div>

      {/* RIGHT SIDE - AUTHENTICATION FORM */}
      <div id="login_right_form" className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 md:p-16">
        
        {/* Quick actions top bar */}
        <div className="flex justify-end gap-3 items-center">
          {/* Language Switcher */}
          <button
            id="lang_switch"
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          >
            <Languages className="h-3.5 w-3.5" />
            <span>{isAr ? 'English' : 'العربية'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            id="theme_toggle"
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-700" />}
          </button>
        </div>

        {/* Form Container */}
        <div className="my-auto max-w-md w-full mx-auto space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
          {/* Brand header for mobile */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-6">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-slate-900 dark:text-white">LODing ERP</span>
          </div>

          <div className="text-center lg:text-start space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {isAr ? 'تسجيل الدخول للنظام' : 'System Authentication'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isAr ? 'الرجاء إدخال بيانات الاعتماد الممنوحة لك لتسجيل الدخول' : 'Provide your enterprise credentials to access the ERP ledger.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {isAr ? 'اسم المستخدم' : 'Username'}
              </label>
              <div className="relative">
                <span className={`absolute inset-y-0 ${isAr ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none text-slate-400`}>
                  <Shield className="h-4 w-4" />
                </span>
                <input
                  id="username_input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className={`w-full block py-2.5 ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium`}
                  placeholder="admin"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                <a href="#" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                  {isAr ? 'نسيت كلمة المرور؟' : 'Forgot?'}
                </a>
              </div>
              <div className="relative">
                <span className={`absolute inset-y-0 ${isAr ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none text-slate-400`}>
                  <Key className="h-4 w-4" />
                </span>
                <input
                  id="password_input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`w-full block py-2.5 ${isAr ? 'pr-10 pl-10' : 'pl-10 pr-10'} text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute inset-y-0 ${isAr ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300`}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Selection row: Company & Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Company Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'الشركة المستهدفة' : 'Corporate Entity'}
                </label>
                <div className="relative">
                  <span className={`absolute inset-y-0 ${isAr ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none text-slate-400`}>
                    <Building2 className="h-4 w-4" />
                  </span>
                  <select
                    id="company_select"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className={`w-full block py-2.5 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium`}
                  >
                    <option value="loding-foods">{isAr ? 'مجموعة لودينغ للأغذية' : 'LODing Foods & Rest. Group'}</option>
                    <option value="almarwa">{isAr ? 'سلسلة مطاعم المروة والشركاء' : 'El Marwa Grill Chains'}</option>
                  </select>
                </div>
              </div>

              {/* Branch Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'فرع التشغيل' : 'Active Branch'}
                </label>
                <div className="relative">
                  <span className={`absolute inset-y-0 ${isAr ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none text-slate-400`}>
                    <MapPin className="h-4 w-4" />
                  </span>
                  <select
                    id="branch_select"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className={`w-full block py-2.5 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium`}
                  >
                    <option value="main">{isAr ? 'الفرع الرئيسي (المهندسين)' : 'Main Branch (Mohandessin)'}</option>
                    <option value="dokki">{isAr ? 'فرع الدقي' : 'Dokki Branch'}</option>
                    <option value="nasr-city">{isAr ? 'فرع مدينة نصر' : 'Nasr City Branch'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="remember_me_checkbox"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {isAr ? 'تذكر بيانات الدخول' : 'Keep me authenticated'}
                </span>
              </label>
            </div>

            {/* Login Error */}
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 font-semibold text-center">
                ⚠️ {loginError}
              </div>
            )}

            {/* Submit Button */}
            <button
              id="login_submit_btn"
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-150 transform active:scale-[0.98] text-sm tracking-wide flex items-center justify-center gap-2"
            >
              {isLoggingIn && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoggingIn
                ? (isAr ? 'جاري التحقق...' : 'Authenticating...')
                : (isAr ? 'تسجيل الدخول الآمن' : 'Establish Secure Connection')}
            </button>
          </form>

          {/* Demo user tips */}
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs text-blue-600 dark:text-blue-400 space-y-1">
            <p className="font-bold">{isAr ? '💡 للتجربة السريعة:' : '💡 Quick trial accounts:'}</p>
            <p>{isAr ? '• مدير: admin / admin123' : '• Admin: admin / admin123'}</p>
            <p>{isAr ? '• كاشير: cashier / cashier123' : '• Cashier: cashier / cashier123'}</p>
          </div>
        </div>

        {/* Footer info for mobile */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-600 mt-8">
          <span>LODing ERP Desktop Environment • Version 4.8.1 (LTS)</span>
        </div>
      </div>
    </div>
  );
}
