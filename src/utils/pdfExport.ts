function getCompanyProfile() {
  try {
    const saved = localStorage.getItem('erp_company_profile');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    nameAr: 'لودينغ للأغذية',
    nameEn: 'LODing Foods',
    registrationNumber: 'ERP-2026-01',
    taxNumber: '123456789',
    addressAr: '123 شارع المهندسين، الجيزة',
    addressEn: 'Mohandessin St, Giza 123',
    email: 'info@loding-erp.com',
    phone: '+20 2 1234 5678',
  };
}

function getStyles() {
  return `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
        font-family: 'Cairo', 'Segoe UI', sans-serif;
        color: #1e293b;
        background: #fff;
        padding: 0;
        font-size: 10px;
        line-height: 1.5;
        direction: rtl;
      }

      .print-page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 10mm 12mm;
        position: relative;
      }

      .company-header {
        text-align: center;
        border-bottom: 3px solid #1e40af;
        padding-bottom: 8px;
        margin-bottom: 12px;
      }
      .company-header h1 {
        font-size: 20px;
        font-weight: 900;
        color: #1e40af;
        margin-bottom: 2px;
        letter-spacing: 1px;
      }
      .company-header .subtitle {
        font-size: 9px;
        color: #64748b;
        font-weight: 700;
      }
      .company-header .contact {
        font-size: 7px;
        color: #94a3b8;
        margin-top: 3px;
      }

      .report-title {
        text-align: center;
        margin-bottom: 10px;
        padding: 6px 12px;
      }
      .report-title h2 {
        font-size: 14px;
        font-weight: 900;
        color: #1e3a8a;
        letter-spacing: 0.5px;
      }
      .report-title .period {
        font-size: 9px;
        color: #64748b;
        font-weight: 600;
      }

      .report-meta {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        font-size: 8px;
        color: #94a3b8;
        font-weight: 600;
        padding: 4px 8px;
        background: #f8fafc;
        border-radius: 4px;
        border: 1px solid #e2e8f0;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
        font-size: 9px;
      }

      thead th {
        background: #1e40af;
        color: #ffffff;
        padding: 6px 8px;
        font-size: 8px;
        font-weight: 800;
        text-align: center;
        border: 1px solid #1e3a8a;
        letter-spacing: 0.3px;
      }
      thead th:first-child { text-align: right; border-radius: 0 4px 0 0; }
      thead th:last-child { border-radius: 4px 0 0 0; }

      tbody td {
        padding: 5px 8px;
        font-size: 9px;
        border: 1px solid #e2e8f0;
        font-weight: 600;
        vertical-align: middle;
      }
      tbody tr:nth-child(even) { background: #f8fafc; }
      tbody tr:hover { background: #eff6ff; }

      .section-header td {
        font-weight: 900;
        font-size: 10px;
        background: #f1f5f9;
        color: #1e3a8a;
        border-bottom: 2px solid #1e40af;
      }

      .total-row td {
        font-weight: 900;
        background: #f1f5f9;
        border-top: 2px solid #94a3b8;
        border-bottom: 3px double #94a3b8;
      }

      .highlight-row td {
        font-weight: 900;
        background: #eff6ff;
        color: #1e40af;
        border-top: 1px solid #bfdbfe;
        border-bottom: 2px solid #bfdbfe;
      }

      .final-row td {
        font-weight: 900;
        font-size: 10px;
        background: #ecfdf5;
        color: #065f46;
        border-top: 2px solid #059669;
        border-bottom: 4px double #059669;
      }

      .text-left { text-align: left; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .font-mono { font-family: 'Courier New', monospace; }
      .text-danger { color: #dc2626; }
      .text-success { color: #059669; }

      .totals-section {
        display: flex;
        justify-content: flex-start;
        margin: 10px 0;
      }
      .totals-box {
        min-width: 200px;
        border: 2px solid #1e40af;
        border-radius: 6px;
        overflow: hidden;
      }
      .totals-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 10px;
        font-size: 9px;
        font-weight: 700;
      }
      .totals-row:not(:last-child) { border-bottom: 1px solid #e2e8f0; }
      .totals-row.grand {
        background: #1e40af;
        color: #fff;
        font-size: 10px;
        font-weight: 900;
      }

      .signatures {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 15px;
        margin-top: 30px;
        padding-top: 12px;
        border-top: 1px dashed #cbd5e1;
      }
      .sig-box { text-align: center; }
      .sig-box .sig-label {
        font-size: 8px;
        font-weight: 700;
        color: #64748b;
        margin-bottom: 24px;
      }
      .sig-box .sig-line {
        border-top: 1px solid #334155;
        padding-top: 3px;
        font-size: 7px;
        color: #94a3b8;
      }

      .print-footer {
        position: absolute;
        bottom: 8mm;
        left: 12mm;
        right: 12mm;
        text-align: center;
        font-size: 7px;
        color: #94a3b8;
        border-top: 1px solid #e2e8f0;
        padding-top: 4px;
      }

      .no-print { display: block; }
      @media print {
        body { padding: 0; }
        .print-page { width: 100%; margin: 0; padding: 6mm 10mm; min-height: auto; }
        .no-print { display: none !important; }
      }
    </style>
  `;
}

function buildHTML(content: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      ${getStyles()}
    </head>
    <body>
      <div class="no-print" style="text-align:center; padding:8px; background:#f1f5f9; border-bottom:1px solid #e2e8f0;">
        <button onclick="window.print()" style="padding:6px 20px; background:#1e40af; color:#fff; border:none; border-radius:4px; font-family:Cairo; font-weight:700; cursor:pointer; font-size:11px;">
          🖨️ طباعة / حفظ PDF
        </button>
        <button onclick="window.close()" style="padding:6px 20px; background:#64748b; color:#fff; border:none; border-radius:4px; font-family:Cairo; font-weight:700; cursor:pointer; margin-right:6px; font-size:11px;">
          ✕ إغلاق
        </button>
      </div>
      <div class="print-page">
        ${content}
        <div class="print-footer">
          تم الإنشاء بواسطة نظام LODing ERP — ${new Date().toLocaleDateString('ar-EG-u-nu-latn')} — هذا المستند صادر آلياً
        </div>
      </div>
    </body>
    </html>
  `;
}

export function printPDF(htmlContent: string, title: string): void {
  const fullHtml = buildHTML(htmlContent, title);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.title = title;
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(fullHtml);
    doc.close();
  }

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }, 500);

  const onPrint = () => {
    document.body.removeChild(iframe);
    window.removeEventListener('focus', onPrint);
  };
  window.addEventListener('focus', onPrint);
}

export function formatCurrency(val: number, isAr: boolean = true): string {
  const formattedNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
  return isAr ? `${formattedNum} ج.م` : `${formattedNum} EGP`;
}

// ═══════════════════════════════════════════════
// REPORT HTML BUILDERS
// ═══════════════════════════════════════════════

function companyHeaderHTML(): string {
  const profile = getCompanyProfile();
  return `
    <div class="company-header">
      <h1>${profile.nameAr} — ${profile.nameEn}</h1>
      <div class="subtitle">نظام إدارة الموارد المؤسسية — LODing ERP</div>
      <div class="contact">
        السجل التجاري: ${profile.registrationNumber} | الرقم الضريبي: ${profile.taxNumber} | 
        ${profile.addressAr} | هاتف: ${profile.phone} | بريد: ${profile.email}
      </div>
    </div>
  `;
}

function signaturesHTML(labels: string[]): string {
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

// ── TRIAL BALANCE ──
export function buildTrialBalancePDF(
  accounts: { code: string; name: string; type: string; debit: number; credit: number }[],
  totalDebit: number,
  totalCredit: number,
  startDate: string,
  endDate: string,
  isAr: boolean
): string {
  let rows = '';
  accounts.forEach(acc => {
    rows += `
      <tr>
        <td class="font-mono" style="text-align:center;">${acc.code}</td>
        <td style="text-align:right;">${acc.name}</td>
        <td style="text-align:center; font-size:8px;">${acc.type}</td>
        <td class="font-mono text-left">${acc.debit > 0 ? formatCurrency(acc.debit) : '-'}</td>
        <td class="font-mono text-left">${acc.credit > 0 ? formatCurrency(acc.credit) : '-'}</td>
      </tr>
    `;
  });

  return `
    ${companyHeaderHTML()}
    <div class="report-title">
      <h2>${isAr ? 'ميزان المراجعة التفصيلي' : 'Trial Balance Report'}</h2>
      <div class="period">${isAr ? `الفترة: من ${startDate} إلى ${endDate}` : `Period: From ${startDate} to ${endDate}`}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:10%;">${isAr ? 'الكود' : 'Code'}</th>
          <th style="width:38%;">${isAr ? 'اسم الحساب' : 'Account Name'}</th>
          <th style="width:16%;">${isAr ? 'النوع' : 'Type'}</th>
          <th style="width:18%;">${isAr ? 'مدين (Dr)' : 'Debit'}</th>
          <th style="width:18%;">${isAr ? 'دائن (Cr)' : 'Credit'}</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="3" style="text-align:center;">${isAr ? 'الإجمالي الكلي' : 'Grand Total'}</td>
          <td class="font-mono text-left">${formatCurrency(totalDebit)}</td>
          <td class="font-mono text-left">${formatCurrency(totalCredit)}</td>
        </tr>
      </tbody>
    </table>

    ${signaturesHTML([
      isAr ? 'رئيس الحسابات' : 'Head of Accounting',
      isAr ? 'المدير المالي' : 'Finance Manager',
      isAr ? 'المدير العام' : 'General Manager',
    ])}
  `;
}

// ── INCOME STATEMENT ──
export function buildIncomeStatementPDF(
  rows: { id: string; name: string; current: number; compare: number; isHeader?: boolean; isTotal?: boolean; isHighlight?: boolean; isDeduction?: boolean; isFinalTotal?: boolean; indent?: number }[],
  totalRevenue: number,
  startDate: string,
  endDate: string,
  isAr: boolean,
  compareMode: string
): string {
  const showCompare = compareMode !== 'NONE';
  let tableRows = '';

  rows.forEach(row => {
    if (row.isHeader) {
      tableRows += `<tr class="section-header"><td colspan="${showCompare ? 4 : 3}" style="text-align:right;">${row.name}</td></tr>`;
      return;
    }

    const amount = row.current ?? 0;
    const compareVal = row.compare ?? 0;
    const revPct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
    const displayVal = row.isDeduction ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount);
    const displayPct = `${revPct.toFixed(2)}%`;

    let changeHtml = '';
    if (showCompare) {
      let changePct = 0;
      if (compareVal !== 0) {
        changePct = ((amount - compareVal) / compareVal) * 100;
      } else if (amount !== 0) {
        changePct = amount > 0 ? 100 : -100;
      }
      const displayCompare = row.isDeduction ? `(${formatCurrency(Math.abs(compareVal))})` : formatCurrency(compareVal);
      const changeStr = changePct >= 0 ? `▲ ${changePct.toFixed(2)}%` : `▼ ${changePct.toFixed(2)}%`;
      changeHtml = `<td class="font-mono text-left">${displayCompare}</td><td class="font-mono text-center">${changeStr}</td>`;
    }

    let rowClass = '';
    if (row.isTotal && !row.isHighlight && !row.isFinalTotal) rowClass = 'total-row';
    if (row.isHighlight) rowClass = 'highlight-row';
    if (row.isFinalTotal) rowClass = 'final-row';

    tableRows += `
      <tr class="${rowClass}">
        <td style="text-align:right;${row.indent ? ` padding-right:${row.indent * 16}px;` : ''}">${row.name}</td>
        <td class="font-mono text-left">${displayVal}</td>
        <td class="font-mono text-center">${displayPct}</td>
        ${changeHtml}
      </tr>
    `;
  });

  const colHeaders = `
    <th style="text-align:right;">${isAr ? 'البيان' : 'Item'}</th>
    <th style="text-align:left;">${isAr ? 'المبلغ' : 'Amount'}</th>
    <th style="text-align:center;">${isAr ? '% من الإيرادات' : '% of Revenue'}</th>
    ${showCompare ? `<th style="text-align:left;">${isAr ? 'المقارن' : 'Compare'}</th><th style="text-align:center;">${isAr ? '% التغير' : 'Change %'}</th>` : ''}
  `;

  return `
    ${companyHeaderHTML()}
    <div class="report-title">
      <h2>${isAr ? 'قائمة الأرباح والخسائر' : 'Profit & Loss Statement'}</h2>
      <div class="period">${isAr ? `الفترة: من ${startDate} إلى ${endDate}` : `Period: From ${startDate} to ${endDate}`}</div>
    </div>

    <table>
      <thead><tr>${colHeaders}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>

    ${signaturesHTML([
      isAr ? 'رئيس الحسابات' : 'Head of Accounting',
      isAr ? 'المدير المالي' : 'Finance Manager',
      isAr ? 'المدير العام' : 'General Manager',
    ])}
  `;
}

// ── BALANCE SHEET ──
export function buildBalanceSheetPDF(
  treeData: { label: string; children: { code: string; name: string; balance: number; compareBalance?: number }[] }[],
  endDate: string,
  isAr: boolean,
  compareMode: string
): string {
  const showCompare = compareMode !== 'NONE';
  let tableRows = '';

  treeData.forEach(group => {
    tableRows += `<tr class="section-header"><td colspan="${showCompare ? 4 : 2}" style="text-align:right;">${group.label}</td></tr>`;

    group.children.forEach(child => {
      const variance = (child.balance || 0) - (child.compareBalance || 0);
      tableRows += `
        <tr>
          <td style="text-align:right; padding-right:16px;">${child.name}</td>
          <td class="font-mono text-left">${formatCurrency(child.balance || 0)}</td>
          ${showCompare ? `<td class="font-mono text-left">${formatCurrency(child.compareBalance || 0)}</td><td class="font-mono text-center">${variance >= 0 ? '+' : ''}${formatCurrency(variance)}</td>` : ''}
        </tr>
      `;
    });

    const total = group.children.reduce((s, c) => s + (c.balance || 0), 0);
    const compareTotal = group.children.reduce((s, c) => s + (c.compareBalance || 0), 0);
    const totalVariance = total - compareTotal;

    tableRows += `
      <tr class="total-row">
        <td style="text-align:right;">${isAr ? `إجمالي ${group.label}` : `Total ${group.label}`}</td>
        <td class="font-mono text-left">${formatCurrency(total)}</td>
        ${showCompare ? `<td class="font-mono text-left">${formatCurrency(compareTotal)}</td><td class="font-mono text-center">${totalVariance >= 0 ? '+' : ''}${formatCurrency(totalVariance)}</td>` : ''}
      </tr>
    `;
  });

  const colHeaders = `
    <th style="text-align:right;">${isAr ? 'البيان' : 'Item'}</th>
    <th style="text-align:left;">${isAr ? 'الرصيد' : 'Balance'}</th>
    ${showCompare ? `<th style="text-align:left;">${isAr ? 'المقارن' : 'Compare'}</th><th style="text-align:center;">${isAr ? 'الفرق' : 'Variance'}</th>` : ''}
  `;

  return `
    ${companyHeaderHTML()}
    <div class="report-title">
      <h2>${isAr ? 'الميزانية العمومية والمركز المالي' : 'Balance Sheet & Financial Position'}</h2>
      <div class="period">${isAr ? `كما في: ${endDate}` : `As of: ${endDate}`}</div>
    </div>

    <table>
      <thead><tr>${colHeaders}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>

    ${signaturesHTML([
      isAr ? 'رئيس الحسابات' : 'Head of Accounting',
      isAr ? 'المدير المالي' : 'Finance Manager',
      isAr ? 'المدير العام' : 'General Manager',
    ])}
  `;
}
