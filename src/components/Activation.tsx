import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Copy, Check, CheckCircle2, UserCheck, Smartphone, Mail, HelpCircle, HardDrive } from 'lucide-react';

interface ActivationProps {
  lang: 'ar' | 'en';
  onActivate: () => void;
}

export default function Activation({ lang, onActivate }: ActivationProps) {
  const isAr = lang === 'ar';
  const [hardwareId, setHardwareId] = useState('');
  const [activationKey, setActivationKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate a unique hardware fingerprint per machine and save it
  useEffect(() => {
    let hid = localStorage.getItem('loding_erp_hardware_id');
    if (!hid) {
      // Create a deterministic-looking hardware signature
      const rand1 = Math.floor(1000 + Math.random() * 9000);
      const rand2 = Math.floor(1000 + Math.random() * 9000);
      hid = `LOD-${rand1}-${rand2}-EMAD`;
      localStorage.setItem('loding_erp_hardware_id', hid);
    }
    setHardwareId(hid);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(hardwareId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedKey = activationKey.trim().toUpperCase();

    // 1. Master Key
    const masterKey = 'LODING-EMAD-2026-ERP-ACTIVE';
    
    // 2. Hardware-specific Key
    // If hardware ID is "LOD-XXXX-YYYY-EMAD", the client key could be "EMAD-XXXX-YYYY-ACTIVE"
    const parts = hardwareId.split('-');
    const clientKeyExpected = `EMAD-${parts[1]}-${parts[2]}-ACTIVE`;

    if (trimmedKey === masterKey || trimmedKey === clientKeyExpected) {
      setSuccess(true);
      setTimeout(() => {
        localStorage.setItem('loding_erp_activated', 'true');
        onActivate();
      }, 1500);
    } else {
      setError(
        isAr 
          ? 'شفرة التفعيل غير صحيحة! يرجى التواصل مع فريق الدعم الفني للحصول على كود صحيح لجهازك.' 
          : 'Invalid Activation Key! Please contact support to get a valid license for your device.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070e1d] flex items-center justify-center p-4 font-sans select-none transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Absolute top decorative badge */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-400 to-blue-800"></div>

        {/* Brand Header */}
        <div className="text-center space-y-2 mt-2">
          <h1 className="text-3xl font-black tracking-tight text-[#0056b3] dark:text-[#00c6ff] uppercase">
            LODing ERP
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>{isAr ? 'نسخة غير مفعلة' : 'Unlicensed Copy'}</span>
          </div>
        </div>

        {success ? (
          <div className="mt-8 text-center space-y-4 py-8 animate-pulse">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 border border-emerald-100 dark:border-emerald-900">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {isAr ? 'تم تفعيل النظام بنجاح!' : 'Activation Successful!'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAr ? 'جاري فتح لوحة تحكم LODing ERP...' : 'Unlocking LODing ERP Suite...'}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAr 
                  ? 'مرحباً بك في نظام LODing ERP المالي المتكامل. لتشغيل البرنامج لأول مرة على هذا الجهاز، يجب إدخال مفتاح ترخيص رسمي معتمد من صاحب البرنامج.' 
                  : 'Welcome to LODing ERP Suite. To initialize this instance on this machine, please enter a valid license key.'}
              </p>
              
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-center space-y-2.5">
                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">
                  <HardDrive className="h-3.5 w-3.5 text-blue-500" />
                  <span>{isAr ? 'كود تعريف جهازك (البصمة التعريفية)' : 'Machine Hardware ID'}</span>
                </div>
                
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-2 rounded-xl">
                  <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200 tracking-wider">
                    {hardwareId}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title={isAr ? 'نسخ الكود' : 'Copy ID'}
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                
                <span className="text-[10px] text-slate-400 block font-semibold leading-relaxed">
                  {isAr 
                    ? '⚠️ انسخ هذا الكود وأرسله إلى المالك لإنشاء شفرة التفعيل الخاصة بجهازك.' 
                    : '⚠️ Share this Hardware ID with the owner to generate your activation license.'}
                </span>
              </div>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleActivate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                  {isAr ? 'أدخل شفرة التفعيل:' : 'Enter Activation Key:'}
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value)}
                    placeholder={isAr ? 'مثال: EMAD-XXXX-XXXX-ACTIVE' : 'e.g., EMAD-1234-5678-ACTIVE'}
                    className="w-full text-xs font-mono font-bold py-2.5 pl-10 pr-4 rounded-xl border bg-white dark:bg-slate-950 text-slate-950 dark:text-white border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase text-center tracking-widest"
                  />
                </div>
                {error && (
                  <p className="text-[11px] text-rose-500 font-bold block leading-relaxed animate-shake mt-1">
                    ⚠️ {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-blue-500/10 transition-colors flex items-center justify-center gap-1.5"
              >
                <UserCheck className="h-4 w-4" />
                <span>{isAr ? 'تنشيط وترخيص البرنامج الآن' : 'Authorize & Activate System'}</span>
              </button>
            </form>

            {/* Developer/Owner Contact Details */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                {isAr ? 'معلومات الاتصال والتحقق من المالك المعتمد' : 'Authorized Vendor Licensing'}
              </span>
              
              <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <div className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[11px] font-mono">emadelarapy73@gmail.com</span>
                </div>
              </div>
              
              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                {isAr 
                  ? 'برمجة وتطوير وإشراف الدعم الفني الخاص بالمنظومة' 
                  : 'Engineered and Monitored by the Support Team'}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
