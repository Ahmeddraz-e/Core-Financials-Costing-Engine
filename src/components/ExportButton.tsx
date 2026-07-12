import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';

interface ExportAction {
  labelAr: string;
  labelEn: string;
  icon: React.ReactNode;
  action: () => void;
  description: string;
}

interface ExportButtonProps {
  lang: 'ar' | 'en';
  actions: ExportAction[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ExportButton({ lang, actions, size = 'sm', className = '' }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isAr = lang === 'ar';

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`${sizeClasses[size]} font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-sm cursor-pointer ${className}`}
      >
        <Download className={iconSizes[size]} />
        <span>{isAr ? 'تصدير' : 'Export'}</span>
      </button>

      {open && (
        <div
          className={`absolute ${isAr ? 'left-0' : 'right-0'} top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 min-w-[220px] overflow-hidden`}
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="px-3 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
            {isAr ? 'اختيار طريقة التصدير' : 'Choose export format'}
          </div>
          {actions.map((act, idx) => (
            <button
              key={act.labelEn}
              onClick={() => {
                act.action();
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-start border-b border-slate-50 dark:border-slate-850 last:border-0 cursor-pointer group"
            >
              <span className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                {act.icon}
              </span>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {isAr ? act.labelAr : act.labelEn}
                </span>
                <span className="text-[9px] text-slate-400 font-semibold">
                  {act.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const exportIcons = {
  excel: <FileSpreadsheet className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
  printer: <Printer className="h-4 w-4" />,
};
