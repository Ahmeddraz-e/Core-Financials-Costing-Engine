import React, { useState } from 'react';
import { ShieldAlert, Search, FileLock2, Clock, UserCheck, ShieldCheck, Download, Trash2 } from 'lucide-react';
import { ERPData, AuditLog } from '../types';

interface AuditLogProps {
  data: ERPData;
  lang: 'ar' | 'en';
  onClearAuditLogs?: () => void;
}

export default function AuditLogView({ data, lang, onClearAuditLogs }: AuditLogProps) {
  const isAr = lang === 'ar';
  const [searchTerm, setSearchTerm] = useState('');

  // Filter logs based on search
  const filteredLogs = data.auditLogs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.actionAr.toLowerCase().includes(searchLower) ||
      log.actionEn.toLowerCase().includes(searchLower) ||
      log.details.toLowerCase().includes(searchLower) ||
      log.user.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div id="audit_log_view" className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] p-1">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-5.5 w-5.5 text-blue-600" />
            <span>{isAr ? 'سجل العمليات والرقابة الداخلية والأمن المحاسبي' : 'Corporate Security Audit Trail & Logs'}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">
            {isAr ? 'سجل تتبع تفصيلي غير قابل للتلاعب لعمليات الفوترة، ترحيل القيود اليومية، الصرف المخزني، وسلوك المستخدمين' : 'Forensic system logs capturing journal postings, material disposals, payroll dispatches, and user login vectors'}
          </p>
        </div>

        {onClearAuditLogs && (
          <button
            id="clear_logs_btn"
            onClick={onClearAuditLogs}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isAr ? 'تصفير سجل الرقابة' : 'Wipe Security Logs'}</span>
          </button>
        )}
      </div>

      {/* CORE SEARCH TOOLBAR */}
      <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center gap-4">
        <div className="relative w-full md:w-80">
          <span className={`absolute inset-y-0 ${isAr ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-slate-400`}>
            <Search className="h-4 w-4" />
          </span>
          <input
            id="audit_search_input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'ابحث في السجلات الأمنية والقيود...' : 'Search activity records...'}
            className={`w-full text-xs font-semibold py-2.5 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none`}
          />
        </div>

        <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2.5 py-1 rounded-full font-black uppercase font-mono tracking-wider">
          {filteredLogs.length} {isAr ? 'أحداث مرصودة' : 'Events Logged'}
        </span>
      </div>

      {/* DETAILED CHRONOLOGICAL EVENT LOGS CARDS */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs bg-white dark:bg-slate-950 rounded-2xl border">
            {isAr ? 'لا توجد قيود رقابية تطابق معايير البحث.' : 'No system logs found matching criteria.'}
          </div>
        ) : (
          filteredLogs.map(log => (
            <div 
              key={log.id} 
              className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/20"
            >
              {/* Event information */}
              <div className="space-y-1 text-start">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {isAr ? log.actionAr : log.actionEn}
                  </span>
                  
                  <span className="text-[9px] bg-slate-100 dark:bg-slate-900 text-slate-500 px-2 py-0.5 rounded font-bold font-mono">
                    IP: {log.ipAddress}
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  {log.details}
                </p>
              </div>

              {/* Timestamp & User metadata */}
              <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-1 text-end text-[10px] text-slate-400 font-bold font-mono shrink-0">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>{log.timestamp}</span>
                </div>

                <div className="flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-blue-500" />
                  <span className="text-blue-600 font-bold">{log.user}</span>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}
