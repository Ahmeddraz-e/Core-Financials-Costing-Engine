import React, { useState, useEffect } from 'react';
import { ShieldCheck, KeyRound, HardDrive, Cpu, Terminal, Copy, Check, RefreshCw, AlertTriangle, UserCheck, HelpCircle } from 'lucide-react';

interface LicenseManagerProps {
  lang: 'ar' | 'en';
  onDeactivate: () => void;
}

export default function LicenseManager({ lang, onDeactivate }: LicenseManagerProps) {
  const isAr = lang === 'ar';
  const [hardwareId, setHardwareId] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Client key generator state (for owner Emad Elarapy)
  const [inputClientHardwareId, setInputClientHardwareId] = useState('');
  const [generatedClientKey, setGeneratedClientKey] = useState('');

  useEffect(() => {
    const hid = localStorage.getItem('loding_erp_hardware_id') || 'LOD-9182-4103-EMAD';
    setHardwareId(hid);
  }, []);

  const handleCopyId = () => {
    navigator.clipboard.writeText(hardwareId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyKey = () => {
    if (!generatedClientKey) return;
    navigator.clipboard.writeText(generatedClientKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputClientHardwareId) return;
    
    const trimmedId = inputClientHardwareId.trim().toUpperCase();
    const parts = trimmedId.split('-');
    
    if (parts.length >= 3) {
      // e.g. "LOD-XXXX-YYYY-EMAD" -> "EMAD-XXXX-YYYY-ACTIVE"
      const generated = `EMAD-${parts[1]}-${parts[2]}-ACTIVE`;
      setGeneratedClientKey(generated);
    } else {
      alert(isAr 
        ? '⚠️ صيغة كود تعريف الجهاز غير صالحة! يجب أن تكون على هذا النمط: LOD-XXXX-YYYY-EMAD' 
        : '⚠️ Invalid Hardware ID format! Must follow pattern: LOD-XXXX-YYYY-EMAD');
    }
  };

  const handleLocalDeactivate = () => {
    if (confirm(isAr 
      ? '⚠️ هل أنت متأكد من إلغاء تفعيل ترخيص البرنامج على هذا الجهاز؟ سيتوقف البرنامج عن العمل حتى يتم إدخال كود التفعيل مجدداً.' 
      : '⚠️ Are you sure you want to deactivate the license on this machine? The software will lock until a valid key is provided again.')) {
      localStorage.removeItem('loding_erp_activated');
      onDeactivate();
    }
  };

  return (
    <div id="license_manager_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      
      {/* Dynamic Header */}
      <div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          <span>{isAr ? 'إدارة التراخيص والتنشيط وحماية البرمجية' : 'Software Licensing & Copy Protection'}</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-0.5">
          {isAr ? 'عرض حالة ترخيص النظام الحالي، وتوليد مفاتيح تنشيط للأجهزة الأخرى التابعة لعملائك' : 'Manage software activation state and generate license keys for client workstations.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Current Machine Activation Status */}
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-6">
          <div>
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">{isAr ? 'حالة الترخيص للجهاز الحالي' : 'Current Workstation License'}</h2>
            <span className="text-[10px] text-slate-400 block mt-0.5">{isAr ? 'تفاصيل ترخيص واستخدام البرنامج على هذا الحاسوب' : 'License details for this specific device.'}</span>
          </div>

          {/* Active Banner */}
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 block">{isAr ? 'البرنامج منشط بالكامل وجاهز للعمل' : 'System Fully Activated & Licensed'}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{isAr ? 'مفتاح ترخيص فريد معتمد مدى الحياة' : 'Lifetime workstation license granted.'}</span>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
              <span className="text-slate-400 font-bold">{isAr ? 'صاحب الترخيص والمطور للمشروع:' : 'Developer & Intellectual Owner:'}</span>
              <span className="font-black text-slate-900 dark:text-white">{isAr ? 'مدير النظام' : 'System Administrator'}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
              <span className="text-slate-400 font-bold">{isAr ? 'نوع الترخيص:' : 'License Scope:'}</span>
              <span className="px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-sky-400 font-black text-[10px] uppercase tracking-wide">{isAr ? 'مستقل / غير محدود' : 'Standalone / Unlimited ERP'}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
              <span className="text-slate-400 font-bold">{isAr ? 'معرف الجهاز (البصمة التعريفية):' : 'Workstation Hardware ID:'}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{hardwareId}</span>
                <button
                  onClick={handleCopyId}
                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  title={isAr ? 'نسخ معرف الجهاز' : 'Copy Hardware ID'}
                >
                  {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-900">
              <span className="text-slate-400 font-bold">{isAr ? 'مفتاح الترخيص الفعال:' : 'Active Key Signature:'}</span>
              <span className="font-mono font-bold text-slate-400 uppercase">LODING-EMAD-2026-ACTIVE-****</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleLocalDeactivate}
              className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 font-bold py-2.5 rounded-xl text-xs transition-colors border border-rose-100 dark:border-rose-900/40 flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{isAr ? 'إلغاء تفعيل هذا الجهاز (لأغراض الاختبار والتحقق)' : 'Deactivate This Computer License'}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Owner Control Panel - Software Activation Code Generator */}
        <div className="bg-[#0f172a] text-slate-200 p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
          
          {/* Subtle top indicator for Master Control Panel */}
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

          <div>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-blue-400 animate-pulse" />
              <h2 className="text-xs font-extrabold text-blue-400 uppercase tracking-widest">{isAr ? 'لوحة تحكم مدير النظام (مولد أكواد التفعيل)' : 'System Admin License Key Generator'}</h2>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {isAr ? 'تأمين برمجتك وحفظ حقوقك! عندما يطلب عميل تفعيل التطبيق، اطلب منه إرسال كود بصمة جهازه، والصقه هنا لتوليد الكود المناسب له فوراً.' 
                   : 'Monetize and protect your program! Paste any client Hardware ID here to generate their custom lifetime activation key.'}
            </span>
          </div>

          <form onSubmit={handleGenerateKey} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                {isAr ? 'كود تعريف جهاز العميل المستهدف:' : 'Client Workstation Hardware ID:'}
              </label>
              <input
                type="text"
                required
                value={inputClientHardwareId}
                onChange={(e) => setInputClientHardwareId(e.target.value)}
                placeholder="LOD-XXXX-YYYY-EMAD"
                className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-xl border bg-slate-900 text-white border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase tracking-widest"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <KeyRound className="h-4 w-4" />
              <span>{isAr ? 'توليد شفرة التفعيل الفورية للعميل' : 'Generate Secure Activation Code'}</span>
            </button>
          </form>

          {generatedClientKey && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 animate-fade-in">
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                {isAr ? '🎉 كود تفعيل العميل الجاهز للإرسال:' : '🎉 Client Activation Key Generated:'}
              </span>
              
              <div className="flex items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="font-mono text-xs font-black text-emerald-400 tracking-wider">
                  {generatedClientKey}
                </span>
                
                <button
                  onClick={handleCopyKey}
                  className="p-1.5 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-slate-900 transition-colors"
                  title={isAr ? 'نسخ كود تفعيل العميل' : 'Copy Client Key'}
                >
                  {copiedKey ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <div className="text-[10px] text-slate-400 font-semibold leading-relaxed p-1 bg-slate-950/40 rounded border border-slate-850">
                {isAr 
                  ? '💡 انسخ هذا الكود بالكامل وأرسله لعميلك ليقوم بلصقه في نافذة التفعيل على جهازه لفتح البرنامج.' 
                  : '💡 Copy this generated key and send it to your client. They must enter it exactly to authorize the software.'}
              </div>
            </div>
          )}

          {/* Master offline keys table guide */}
          <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-2">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
              {isAr ? 'أكواد ومفاتيح التنشيط الرئيسية (للطوارئ)' : 'Offline Master Key Records'}
            </span>
            
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 font-mono text-[10px]">
              <div className="flex justify-between">
                <span>{isAr ? 'المفتاح الرئيسي الدائم:' : 'Master Override Key:'}</span>
                <span className="text-amber-400 font-bold">LODING-EMAD-2026-ERP-ACTIVE</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
