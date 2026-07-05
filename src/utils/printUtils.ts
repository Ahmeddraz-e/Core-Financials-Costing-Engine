/**
 * LODing ERP — Print & Export Utility
 * 
 * Provides print-to-PDF and Excel export capabilities for:
 * - Invoices (Sales & Purchase)
 * - Vouchers (Receipt & Payment)
 * - Statements of Account
 * - Financial Reports
 * - Payslips
 */

/** Opens a new print window with styled HTML content */
export function printDocument(htmlContent: string, title: string): void {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Cairo', sans-serif;
          color: #1e293b;
          background: #fff;
          padding: 0;
          font-size: 11px;
          line-height: 1.6;
          direction: rtl;
        }
        
        .print-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 12mm 15mm;
          position: relative;
        }
        
        /* Company Header */
        .company-header {
          text-align: center;
          border-bottom: 3px solid #1e40af;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .company-header h1 {
          font-size: 22px;
          font-weight: 900;
          color: #1e40af;
          margin-bottom: 2px;
        }
        .company-header .subtitle {
          font-size: 10px;
          color: #64748b;
          font-weight: 600;
        }
        
        /* Document Title */
        .doc-title {
          text-align: center;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 16px;
          margin-bottom: 15px;
        }
        .doc-title h2 {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }
        .doc-title .doc-number {
          font-size: 12px;
          color: #3b82f6;
          font-weight: 700;
        }
        
        /* Info Grid */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 15px;
        }
        .info-box {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 12px;
        }
        .info-box .label {
          font-size: 9px;
          color: #94a3b8;
          font-weight: 700;
          text-transform: uppercase;
        }
        .info-box .value {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
        }
        
        /* Table */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        thead th {
          background: #1e40af;
          color: #fff;
          padding: 8px 10px;
          font-size: 10px;
          font-weight: 700;
          text-align: right;
        }
        thead th:first-child { border-radius: 0 6px 0 0; }
        thead th:last-child { border-radius: 6px 0 0 0; }
        tbody td {
          padding: 7px 10px;
          font-size: 11px;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 600;
        }
        tbody tr:nth-child(even) { background: #f8fafc; }
        tbody tr:hover { background: #eff6ff; }
        
        /* Totals */
        .totals-section {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 15px;
        }
        .totals-box {
          min-width: 250px;
          border: 2px solid #1e40af;
          border-radius: 8px;
          overflow: hidden;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 700;
        }
        .totals-row:not(:last-child) { border-bottom: 1px solid #e2e8f0; }
        .totals-row.grand {
          background: #1e40af;
          color: #fff;
          font-size: 13px;
          font-weight: 900;
        }
        
        /* Amount in words */
        .amount-words {
          background: #fffbeb;
          border: 1px solid #fbbf24;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 15px;
          font-size: 11px;
          font-weight: 700;
          color: #92400e;
        }
        
        /* Signatures */
        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          margin-top: 40px;
          padding-top: 15px;
          border-top: 1px dashed #cbd5e1;
        }
        .sig-box {
          text-align: center;
        }
        .sig-box .sig-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 30px;
        }
        .sig-box .sig-line {
          border-top: 1px solid #334155;
          padding-top: 4px;
          font-size: 9px;
          color: #94a3b8;
        }
        
        /* Footer */
        .print-footer {
          position: absolute;
          bottom: 10mm;
          left: 15mm;
          right: 15mm;
          text-align: center;
          font-size: 8px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          padding-top: 6px;
        }
        
        /* Voucher specific */
        .voucher-amount {
          text-align: center;
          font-size: 28px;
          font-weight: 900;
          color: #1e40af;
          margin: 15px 0;
          padding: 15px;
          border: 3px solid #1e40af;
          border-radius: 12px;
          background: #eff6ff;
        }
        
        /* Statement specific */
        .balance-summary {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }
        .balance-card {
          flex: 1;
          text-align: center;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .balance-card.debit { border-color: #ef4444; background: #fef2f2; }
        .balance-card.credit { border-color: #22c55e; background: #f0fdf4; }
        .balance-card.net { border-color: #3b82f6; background: #eff6ff; }
        .balance-card .amount {
          font-size: 18px;
          font-weight: 900;
        }
        .balance-card .card-label {
          font-size: 9px;
          font-weight: 700;
          color: #64748b;
        }

        @media print {
          body { padding: 0; }
          .print-page { 
            width: 100%; 
            margin: 0; 
            padding: 8mm 12mm;
            min-height: auto;
          }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align:center; padding:10px; background:#f1f5f9;">
        <button onclick="window.print()" style="padding:8px 24px; background:#1e40af; color:#fff; border:none; border-radius:6px; font-family:Cairo; font-weight:700; cursor:pointer; font-size:13px;">
          🖨️ طباعة
        </button>
        <button onclick="window.close()" style="padding:8px 24px; background:#64748b; color:#fff; border:none; border-radius:6px; font-family:Cairo; font-weight:700; cursor:pointer; margin-right:8px; font-size:13px;">
          ✕ إغلاق
        </button>
      </div>
      ${htmlContent}
    </body>
    </html>
  `);
  printWindow.document.close();
}

/** Format currency with EGP */
export function fmtCurrency(val: number, lang: 'ar' | 'en' = 'ar'): string {
  const formattedNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);
  return lang === 'ar' ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
}

/** Format date */
export function fmtDate(dateStr: string, lang: 'ar' | 'en' = 'ar'): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/** Convert number to Arabic words (simplified for amounts) */
export function numberToArabicWords(num: number): string {
  if (num === 0) return 'صفر جنيه';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
    'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر',
    'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  const wholeNum = Math.floor(Math.abs(num));
  const piasters = Math.round((Math.abs(num) - wholeNum) * 100);
  
  function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const o = n % 10;
      return o > 0 ? `${ones[o]} و${tens[t]}` : tens[t];
    }
    if (n < 1000) {
      const h = Math.floor(n / 100);
      const remainder = n % 100;
      return remainder > 0 ? `${hundreds[h]} و${convertGroup(remainder)}` : hundreds[h];
    }
    if (n < 1000000) {
      const thousands = Math.floor(n / 1000);
      const remainder = n % 1000;
      let prefix = '';
      if (thousands === 1) prefix = 'ألف';
      else if (thousands === 2) prefix = 'ألفان';
      else if (thousands <= 10) prefix = `${convertGroup(thousands)} آلاف`;
      else prefix = `${convertGroup(thousands)} ألف`;
      return remainder > 0 ? `${prefix} و${convertGroup(remainder)}` : prefix;
    }
    // Millions
    const millions = Math.floor(n / 1000000);
    const remainder = n % 1000000;
    let prefix = '';
    if (millions === 1) prefix = 'مليون';
    else if (millions === 2) prefix = 'مليونان';
    else prefix = `${convertGroup(millions)} مليون`;
    return remainder > 0 ? `${prefix} و${convertGroup(remainder)}` : prefix;
  }
  
  let result = convertGroup(wholeNum) + ' جنيه';
  if (piasters > 0) {
    result += ` و${convertGroup(piasters)} قرش`;
  }
  result += ' مصري فقط لا غير';
  return result;
}

/** Company header HTML block */
export function companyHeaderHTML(companyName: string = 'LODing Group'): string {
  return `
    <div class="company-header">
      <h1>${companyName}</h1>
      <div class="subtitle">نظام إدارة الموارد المؤسسية — LODing ERP</div>
      <div class="subtitle" style="font-size:8px;">السجل التجاري: ________ | الرقم الضريبي: ________ | العنوان: ________</div>
    </div>
  `;
}

/** Signature block HTML */
export function signaturesHTML(labels: string[]): string {
  return `
    <div class="signatures">
      ${labels.map(l => `
        <div class="sig-box">
          <div class="sig-label">${l}</div>
          <div class="sig-line">التوقيع والتاريخ</div>
        </div>
      `).join('')}
    </div>
  `;
}

/** Footer HTML */
export function footerHTML(): string {
  return `
    <div class="print-footer">
      تم الإنشاء بواسطة نظام LODing ERP — ${new Date().toLocaleDateString('ar-EG-u-nu-latn')} — هذا المستند صادر آلياً ولا يحتاج توقيع إلا في حال الاعتماد اليدوي
    </div>
  `;
}

/** Export data to CSV (Excel-compatible) */
export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (!data.length) return;

  // BOM for Arabic support in Excel
  const BOM = '\uFEFF';
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        let cell = row[h] ?? '';
        cell = String(cell).replace(/"/g, '""');
        return `"${cell}"`;
      }).join(',')
    )
  ];

  const blob = new Blob([BOM + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
