import React from 'react';

interface ActivationGateProps {
  status: string;
  error: string | null;
  lang: 'ar' | 'en';
  isAr: boolean;
  setLang: (l: 'ar' | 'en') => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  onActivate: (key: string) => Promise<void>;
  onProceedToLogin?: () => void;
}

export default function ActivationGate({ 
  status, error, lang, isAr, setLang, theme, setTheme, onActivate, onProceedToLogin 
}: ActivationGateProps) {
  const [key, setKey] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) onActivate(key.trim());
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="h-12 w-12 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
        <p className="mt-4 text-slate-700 dark:text-slate-300 font-bold text-xs">
          {isAr ? 'جاري التحقق من الترخيص...' : 'Checking license...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-6 font-sans" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Language / Theme toggles */}
      <div className="absolute top-4 end-4 flex gap-2">
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
        >
          {isAr ? 'English' : 'العربية'}
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-xl space-y-6">
        {/* Logo / Icon */}
        <div className="flex flex-col items-center space-y-2">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-black">
            L
          </div>
          <h1 className="text-lg font-black text-slate-800 dark:text-white">
            {isAr ? 'LODing ERP' : 'LODing ERP'}
          </h1>

          {status === 'activated' ? (
            <>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center leading-relaxed font-bold">
                {isAr ? '✓ تم تفعيل الترخيص بنجاح' : '✓ License activated successfully'}
              </p>
              <button
                onClick={onProceedToLogin}
                className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 rounded-xl text-sm transition-all"
              >
                {isAr ? 'تسجيل الدخول' : 'Proceed to Login'}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                {isAr
                  ? 'قم بتفعيل النظام باستخدام رمز الترخيص الخاص بك'
                  : 'Activate your copy with a license key'}
              </p>

              {/* Activation form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder={isAr ? 'أدخل رمز التفعيل' : 'Enter license key'}
                    className="w-full px-4 py-3 text-sm font-mono text-center tracking-widest rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-3 py-2 rounded-lg text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!key.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all"
                >
                  {isAr ? 'تفعيل' : 'Activate'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
