import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface CustomDialogProps {
  isOpen: boolean;
  type: 'info' | 'success' | 'warning' | 'danger' | 'confirm';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  lang: 'ar' | 'en';
}

export default function CustomDialog({
  isOpen,
  type,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  lang
}: CustomDialogProps) {
  if (!isOpen) return null;

  const isAr = lang === 'ar';

  // Theme styles based on type
  const typeStyles = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800/40',
      text: 'text-blue-600 dark:text-blue-400',
      icon: <CheckCircle2 className="h-6 w-6" />,
      btnBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/20'
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-800/40',
      text: 'text-emerald-600 dark:text-emerald-400',
      icon: <CheckCircle2 className="h-6 w-6" />,
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/20'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-800/40',
      text: 'text-amber-600 dark:text-amber-400',
      icon: <AlertTriangle className="h-6 w-6" />,
      btnBg: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/20'
    },
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      border: 'border-rose-200 dark:border-rose-800/40',
      text: 'text-rose-600 dark:text-rose-400',
      icon: <ShieldAlert className="h-6 w-6" />,
      btnBg: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/20'
    },
    confirm: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800/40',
      text: 'text-blue-600 dark:text-blue-400',
      icon: <AlertTriangle className="h-6 w-6" />,
      btnBg: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/20'
    }
  };

  const currentStyle = typeStyles[type] || typeStyles.info;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md transition-opacity duration-200"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xl p-6 space-y-4 transform scale-100 transition-all duration-200 animate-in fade-in zoom-in-95"
      >
        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl border ${currentStyle.bg} ${currentStyle.border} ${currentStyle.text} shrink-0`}>
            {currentStyle.icon}
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <h3 className="text-sm font-black text-slate-900 dark:text-white leading-none">
              {title}
            </h3>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed break-words whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {type === 'confirm' && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              {cancelText || (isAr ? 'إلغاء' : 'Cancel')}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-lg transition-colors ${currentStyle.btnBg}`}
          >
            {confirmText || (isAr ? 'موافق' : 'OK')}
          </button>
        </div>
      </div>
    </div>
  );
}
