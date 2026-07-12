import { useState, FormEvent } from 'react';
import { Shield, Key, Eye, EyeOff, Languages, Sun, Moon, Loader2 } from 'lucide-react';
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const result = await login(username, password);
      onLogin({
        username: result.user.username,
        company: result.user.company || '',
        branch: result.user.branch || '',
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
    <div id="login_container" className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 px-4">
      
      <div className="absolute top-5 right-5 flex items-center gap-2">
        <button
          id="lang_switch"
          onClick={() => setLang(isAr ? 'en' : 'ar')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <Languages className="h-3.5 w-3.5" />
          <span>{isAr ? 'English' : 'العربية'}</span>
        </button>
        <button
          id="theme_toggle"
          onClick={() => setDarkMode(!darkMode)}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="w-full max-w-[360px]" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="text-center mb-10">
          <Shield className="h-10 w-10 text-blue-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">LODing ERP</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              id="username_input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="off"
              className="w-full py-2.5 px-3.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              placeholder={isAr ? 'اسم المستخدم' : 'Username'}
            />
          </div>

          <div className="relative">
            <input
              id="password_input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className={`w-full py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors ${isAr ? 'pl-9 pr-3.5' : 'pr-9 pl-3.5'}`}
              placeholder={isAr ? 'كلمة المرور' : 'Password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute inset-y-0 ${isAr ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors`}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {loginError && (
            <div className="py-2 px-3.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-xs text-red-600 dark:text-red-400 text-center">
              {loginError}
            </div>
          )}

          <button
            id="login_submit_btn"
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
          >
            {isLoggingIn && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoggingIn
              ? (isAr ? 'جاري التحقق...' : 'Authenticating...')
              : (isAr ? 'دخول' : 'Sign in')}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-8">
          &copy; 2026 LODing ERP
        </p>
      </div>
    </div>
  );
}
