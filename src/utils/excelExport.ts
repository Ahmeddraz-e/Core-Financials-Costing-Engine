import ExcelJS from 'exceljs';

const primaryColor = 'FF1E3A8A';
const accentColor = 'FF10B981';
const headerBg = 'FF1E3A8A';
const headerFg = 'FFFFFFFF';
const altRow = 'FFF1F5F9';
const borderColor = 'FFE2E8F0';
const highlightBg = 'FFEFF6FF';
const successBg = 'FFECFDF5';

const titleFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 20, bold: true, color: { argb: primaryColor } };
const subtitleFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 14, color: { argb: 'FF64748B' } };
const headerFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10, bold: true, color: { argb: headerFg } };
const dataFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
const moneyFmt = '#,##0.00 "ج.م"';
const pctFmt = '0.00%';

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: borderColor } },
  bottom: { style: 'thin', color: { argb: borderColor } },
  left: { style: 'thin', color: { argb: borderColor } },
  right: { style: 'thin', color: { argb: borderColor } },
};

const thickBottomBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: borderColor } },
  bottom: { style: 'medium', color: { argb: primaryColor } },
  left: { style: 'thin', color: { argb: borderColor } },
  right: { style: 'thin', color: { argb: borderColor } },
};

function colLetter(n: number): string {
  let s = '';
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

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

async function writeCompanyHeader(ws: ExcelJS.Worksheet, colCount: number) {
  const profile = getCompanyProfile();
  const lastCol = colLetter(colCount);

  const r = ws.addRow([`${profile.nameAr} — ${profile.nameEn}`]);
  ws.mergeCells(`A${r.number}:${lastCol}${r.number}`);
  r.font = titleFont;
  r.alignment = { horizontal: 'center', vertical: 'middle' };
  r.height = 36;

  const r2 = ws.addRow(['نظام إدارة الموارد المؤسسية — LODing ERP']);
  ws.mergeCells(`A${r2.number}:${lastCol}${r2.number}`);
  r2.font = subtitleFont;
  r2.alignment = { horizontal: 'center', vertical: 'middle' };

  const r3 = ws.addRow([`${profile.addressAr} | هاتف: ${profile.phone} | بريد: ${profile.email}`]);
  ws.mergeCells(`A${r3.number}:${lastCol}${r3.number}`);
  r3.font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };
  r3.alignment = { horizontal: 'center' };
}

function addTitleRow(ws: ExcelJS.Worksheet, title: string, colCount: number) {
  const lastCol = colLetter(colCount);
  const r = ws.addRow([title]);
  ws.mergeCells(`A${r.number}:${lastCol}${r.number}`);
  r.font = { name: 'Calibri', size: 16, bold: true, color: { argb: primaryColor } };
  r.alignment = { horizontal: 'center' };
  return r;
}

function addDateRow(ws: ExcelJS.Worksheet, text: string, colCount: number) {
  const lastCol = colLetter(colCount);
  const r = ws.addRow([text]);
  ws.mergeCells(`A${r.number}:${lastCol}${r.number}`);
  r.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  r.alignment = { horizontal: 'center' };
  return r;
}

function addPeriodRow(ws: ExcelJS.Worksheet, text: string, colCount: number) {
  const lastCol = colLetter(colCount);
  const r = ws.addRow([text]);
  ws.mergeCells(`A${r.number}:${lastCol}${r.number}`);
  r.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  r.alignment = { horizontal: 'center' };
  return r;
}

function addSpacer(ws: ExcelJS.Worksheet) {
  ws.addRow([]);
}

function applyHeaderStyle(row: ExcelJS.Row, count: number) {
  row.height = 24;
  for (let i = 1; i <= count; i++) {
    const cell = row.getCell(i);
    cell.font = headerFont;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  }
}

function applyDataStyle(row: ExcelJS.Row, idx: number, count: number, moneyCols: number[] = []) {
  for (let i = 1; i <= count; i++) {
    const cell = row.getCell(i);
    cell.font = dataFont;
    cell.alignment = { horizontal: i === 1 ? 'right' : 'center', vertical: 'middle' };
    cell.border = thinBorder;
    if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: altRow } };
    if (moneyCols.includes(i)) cell.numFmt = moneyFmt;
  }
}

function applyTotalStyle(row: ExcelJS.Row, count: number, moneyCols: number[] = []) {
  row.height = 24;
  for (let i = 1; i <= count; i++) {
    const cell = row.getCell(i);
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: headerFg } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentColor } };
    cell.alignment = { horizontal: i === 1 ? 'right' : 'center', vertical: 'middle' };
    cell.border = thickBottomBorder;
    if (moneyCols.includes(i)) cell.numFmt = moneyFmt;
  }
}

function applySectionStyle(row: ExcelJS.Row, colCount: number, color: string = 'FFF8FAFC') {
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: primaryColor } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
    cell.border = { ...thinBorder, bottom: { style: 'medium', color: { argb: primaryColor } } };
  }
}

function addRowValues(ws: ExcelJS.Worksheet, values: any[]): ExcelJS.Row {
  return ws.addRow(values);
}

async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════
// 1. TRIAL BALANCE EXPORT
// ═══════════════════════════════════════════════
export async function exportTrialBalanceExcel(
  accounts: { code: string; name: string; type: string; debit: number; credit: number }[],
  totalDebit: number,
  totalCredit: number,
  startDate: string,
  endDate: string,
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();

  const isAr = lang === 'ar';
  const colCount = 5;
  const ws = wb.addWorksheet(isAr ? 'ميزان المراجعة' : 'Trial Balance', {
    properties: { tabColor: { argb: primaryColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'ميزان المراجعة التفصيلي' : 'Trial Balance Report', colCount);
  addPeriodRow(ws, isAr ? `الفترة: من ${startDate} إلى ${endDate}` : `Period: From ${startDate} to ${endDate}`, colCount);
  addSpacer(ws);

  const headers = [
    isAr ? 'الكود' : 'Code',
    isAr ? 'اسم الحساب' : 'Account Name',
    isAr ? 'النوع' : 'Type',
    isAr ? 'مدين (Dr)' : 'Debit',
    isAr ? 'دائن (Cr)' : 'Credit',
  ];

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);

  accounts.forEach((acc, idx) => {
    const row = addRowValues(ws, [acc.code, acc.name, acc.type, acc.debit, acc.credit]);
    applyDataStyle(row, idx, colCount, [4, 5]);
  });

  const totalRow = addRowValues(ws, [
    '', isAr ? 'الإجمالي الكلي' : 'Grand Total', '', totalDebit, totalCredit,
  ]);
  applyTotalStyle(totalRow, colCount, [4, 5]);

  ws.getColumn(1).width = 14;
  ws.getColumn(2).width = 36;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 22;
  ws.getColumn(5).width = 22;

  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  await downloadWorkbook(wb, 'Trial_Balance');
}

// ═══════════════════════════════════════════════
// 2. INCOME STATEMENT EXPORT
// ═══════════════════════════════════════════════
export async function exportIncomeStatementExcel(
  rows: {
    id: string;
    name: string;
    current: number;
    compare: number;
    isHeader?: boolean;
    isTotal?: boolean;
    isHighlight?: boolean;
    isDeduction?: boolean;
    isFinalTotal?: boolean;
    indent?: number;
  }[],
  totalRevenue: number,
  startDate: string,
  endDate: string,
  lang: 'ar' | 'en',
  compareMode: string
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();

  const isAr = lang === 'ar';
  const showCompare = compareMode !== 'NONE';
  const colCount = showCompare ? 5 : 3;

  const ws = wb.addWorksheet(isAr ? 'قائمة الأرباح والخسائر' : 'Income Statement', {
    properties: { tabColor: { argb: accentColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'قائمة الأرباح والخسائر' : 'Profit & Loss Statement', colCount);
  addPeriodRow(ws, isAr ? `الفترة: من ${startDate} إلى ${endDate}` : `Period: From ${startDate} to ${endDate}`, colCount);
  addSpacer(ws);

  const headers = [
    isAr ? 'البيان والتفاصيل' : 'Statement Item',
    isAr ? 'المبلغ' : 'Amount',
    isAr ? '% من الإيرادات' : '% of Revenue',
  ];
  if (showCompare) {
    headers.push(isAr ? 'المقارن' : 'Compare');
    headers.push(isAr ? '% التغير' : 'Change %');
  }

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);

  let dataIdx = 0;
  rows.forEach(row => {
    if (row.isHeader) {
      const r = addRowValues(ws, [row.name]);
      ws.mergeCells(`A${r.number}:${colLetter(colCount)}${r.number}`);
      applySectionStyle(r, colCount);
      return;
    }

    const amount = row.current ?? 0;
    const compareVal = row.compare ?? 0;
    const revPct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
    const displayAmount = row.isDeduction ? -amount : amount;
    const displayCompare = row.isDeduction ? -compareVal : compareVal;

    let changePct = 0;
    if (compareVal !== 0) {
      changePct = ((amount - compareVal) / compareVal) * 100;
    } else if (amount !== 0) {
      changePct = amount > 0 ? 100 : -100;
    }

    const vals = [row.name, displayAmount, revPct / 100];
    if (showCompare) {
      vals.push(displayCompare);
      vals.push(changePct / 100);
    }

    const r = addRowValues(ws, vals);
    r.height = 20;

    for (let i = 1; i <= colCount; i++) {
      const cell = r.getCell(i);
      cell.border = thinBorder;

      if (row.isTotal || row.isHighlight || row.isFinalTotal) {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
        if (row.isTotal && !row.isHighlight && !row.isFinalTotal) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        }
        if (row.isHighlight) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: highlightBg } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
        }
        if (row.isFinalTotal) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: successBg } };
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF065F46' } };
        }
      } else {
        cell.font = dataFont;
        if (dataIdx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: altRow } };
      }

      if (i === 1) {
        cell.alignment = { horizontal: 'right', vertical: 'middle', indent: row.indent || 0 };
      } else if (i === 3) {
        cell.numFmt = pctFmt;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.numFmt = moneyFmt;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    if (showCompare) {
      r.getCell(4).numFmt = moneyFmt;
      r.getCell(5).numFmt = pctFmt;
    }

    dataIdx++;
  });

  ws.getColumn(1).width = 44;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 18;
  if (showCompare) {
    ws.getColumn(4).width = 20;
    ws.getColumn(5).width = 16;
  }

  await downloadWorkbook(wb, 'Income_Statement');
}

// ═══════════════════════════════════════════════
// 3. BALANCE SHEET EXPORT
// ═══════════════════════════════════════════════
export async function exportBalanceSheetExcel(
  treeData: {
    label: string;
    children: { code: string; name: string; balance: number; compareBalance?: number }[];
  }[],
  startDate: string,
  endDate: string,
  lang: 'ar' | 'en',
  compareMode: string
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();

  const isAr = lang === 'ar';
  const showCompare = compareMode !== 'NONE';
  const colCount = showCompare ? 4 : 2;

  const ws = wb.addWorksheet(isAr ? 'الميزانية العمومية' : 'Balance Sheet', {
    properties: { tabColor: { argb: primaryColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'الميزانية العمومية والمركز المالي' : 'Balance Sheet & Financial Position', colCount);
  addPeriodRow(ws, isAr ? `كما في: ${endDate}` : `As of: ${endDate}`, colCount);
  addSpacer(ws);

  const headers = [isAr ? 'البيان' : 'Item', isAr ? 'الرصيد' : 'Balance'];
  if (showCompare) {
    headers.push(isAr ? 'المقارن' : 'Compare');
    headers.push(isAr ? 'الفرق' : 'Variance');
  }

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);

  let rowIdx = 0;
  treeData.forEach(group => {
    const sectionRow = addRowValues(ws, [group.label]);
    ws.mergeCells(`A${sectionRow.number}:${colLetter(colCount)}${sectionRow.number}`);
    applySectionStyle(sectionRow, colCount);
    rowIdx++;

    let groupTotal = 0;
    let groupCompareTotal = 0;

    group.children.forEach(child => {
      const groupCompare = child.compareBalance || 0;
      const variance = (child.balance || 0) - groupCompare;
      groupTotal += child.balance || 0;
      groupCompareTotal += groupCompare;

      const vals = [child.name, child.balance || 0];
      if (showCompare) {
        vals.push(groupCompare);
        vals.push(variance);
      }

      const r = addRowValues(ws, vals);
      r.height = 20;
      for (let i = 1; i <= colCount; i++) {
        const cell = r.getCell(i);
        cell.font = dataFont;
        cell.border = thinBorder;
        if (rowIdx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: altRow } };
        if (i === 1) {
          cell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
        } else {
          cell.numFmt = moneyFmt;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }
      rowIdx++;
    });

    const totalVariance = groupTotal - groupCompareTotal;
    const totalVals = [isAr ? `إجمالي ${group.label}` : `Total ${group.label}`, groupTotal];
    if (showCompare) {
      totalVals.push(groupCompareTotal);
      totalVals.push(totalVariance);
    }

    const totalRow = addRowValues(ws, totalVals);
    totalRow.height = 22;
    for (let i = 1; i <= colCount; i++) {
      const cell = totalRow.getCell(i);
      cell.font = headerFont;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentColor } };
      cell.alignment = { horizontal: i === 1 ? 'right' : 'center', vertical: 'middle' };
      cell.border = thickBottomBorder;
      if (i > 1) cell.numFmt = moneyFmt;
    }
    rowIdx++;
    addSpacer(ws);
    rowIdx += 2;
  });

  ws.getColumn(1).width = 40;
  ws.getColumn(2).width = 22;
  if (showCompare) {
    ws.getColumn(3).width = 22;
    ws.getColumn(4).width = 22;
  }

  await downloadWorkbook(wb, 'Balance_Sheet');
}

// ═══════════════════════════════════════════════
// 4. HR LEAVES EXPORT
// ═══════════════════════════════════════════════
export async function exportHRLeavesExcel(
  leaves: { employeeName: string; type: string; from: string; to: string; duration: string; reason: string; status: string }[],
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();

  const isAr = lang === 'ar';
  const colCount = 7;
  const ws = wb.addWorksheet(isAr ? 'الإجازات' : 'Leaves Report', {
    properties: { tabColor: { argb: primaryColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'سجل الإجازات والغيابات' : 'Leaves & Absences Report', colCount);
  addDateRow(ws, isAr ? `تاريخ التصدير: ${new Date().toLocaleDateString('en-CA')}` : `Export Date: ${new Date().toLocaleDateString('en-CA')}`, colCount);
  addSpacer(ws);

  const headers = [
    isAr ? 'الموظف' : 'Employee',
    isAr ? 'نوع الإجازة' : 'Leave Type',
    isAr ? 'من تاريخ' : 'Start Date',
    isAr ? 'إلى تاريخ' : 'End Date',
    isAr ? 'المدة' : 'Duration',
    isAr ? 'السبب' : 'Reason',
    isAr ? 'الحالة' : 'Status',
  ];

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);

  leaves.forEach((leave, idx) => {
    const vals = [leave.employeeName, leave.type, leave.from, leave.to, leave.duration, leave.reason, leave.status];
    const row = addRowValues(ws, vals);
    applyDataStyle(row, idx, colCount);

    const statusCell = row.getCell(7);
    if (leave.status === 'APPROVED' || leave.status === 'معتمدة') {
      statusCell.font = { ...dataFont, bold: true, color: { argb: 'FF059669' } };
    } else if (leave.status === 'PENDING' || leave.status === 'معلق') {
      statusCell.font = { ...dataFont, bold: true, color: { argb: 'FFD97706' } };
    } else if (leave.status === 'REJECTED' || leave.status === 'مرفوض') {
      statusCell.font = { ...dataFont, bold: true, color: { argb: 'FFDC2626' } };
    }
  });

  ws.getColumn(1).width = 26;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 30;
  ws.getColumn(7).width = 14;

  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  await downloadWorkbook(wb, 'HR_Leaves_Report');
}

// ═══════════════════════════════════════════════
// 5. HR LOANS EXPORT
// ═══════════════════════════════════════════════
export async function exportHRLoansExcel(
  loans: { empName: string; amount: number; installment: number; months: number; paid: number; remaining: number; date: string; reason: string }[],
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();

  const isAr = lang === 'ar';
  const colCount = 8;
  const ws = wb.addWorksheet(isAr ? 'السلف' : 'Loans Report', {
    properties: { tabColor: { argb: accentColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'سجل السلف والعهد الجارية' : 'Loans & Advances Report', colCount);
  addDateRow(ws, isAr ? `تاريخ التصدير: ${new Date().toLocaleDateString('en-CA')}` : `Export Date: ${new Date().toLocaleDateString('en-CA')}`, colCount);
  addSpacer(ws);

  const headers = [
    isAr ? 'اسم الموظف' : 'Employee',
    isAr ? 'إجمالي مبلغ السلفة' : 'Loan Principal',
    isAr ? 'القسط الشهري' : 'Monthly Installment',
    isAr ? 'فترة التقسيط' : 'Period (Months)',
    isAr ? 'المسدد' : 'Paid Back',
    isAr ? 'المتبقي' : 'Outstanding',
    isAr ? 'تاريخ المنح' : 'Date',
    isAr ? 'السبب' : 'Reason',
  ];

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);

  loans.forEach((loan, idx) => {
    const vals = [loan.empName, loan.amount, loan.installment, loan.months, loan.paid, loan.remaining, loan.date, loan.reason];
    const row = addRowValues(ws, vals);
    applyDataStyle(row, idx, colCount, [2, 3, 5, 6]);

    const remainingCell = row.getCell(6);
    if (loan.remaining <= 0) {
      remainingCell.font = { ...dataFont, bold: true, color: { argb: 'FF059669' } };
    }
  });

  // Summary row
  const totalPrincipal = loans.reduce((s, l) => s + l.amount, 0);
  const totalPaid = loans.reduce((s, l) => s + l.paid, 0);
  const totalRemaining = loans.reduce((s, l) => s + l.remaining, 0);
  const summaryRow = addRowValues(ws, [
    isAr ? 'الإجمالي' : 'Grand Total', totalPrincipal, '', '',
    totalPaid, totalRemaining, '', '',
  ]);
  applyTotalStyle(summaryRow, colCount, [2, 5, 6]);

  ws.getColumn(1).width = 26;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 16;
  ws.getColumn(5).width = 18;
  ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 14;
  ws.getColumn(8).width = 28;

  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  await downloadWorkbook(wb, 'HR_Loans_Report');
}

// ═══════════════════════════════════════════════
// 6. HR PAYROLL EXPORT
// ═══════════════════════════════════════════════
export async function exportHRPayrollExcel(
  payroll: { code: string; name: string; basic: number; allowances: number; overtime: number; deductions: number; loans: number; net: number }[],
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();

  const isAr = lang === 'ar';
  const colCount = 8;
  const ws = wb.addWorksheet(isAr ? 'كشف الرواتب' : 'Payroll Sheet', {
    properties: { tabColor: { argb: primaryColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'كشف الرواتب الموحد' : 'Consolidated Payroll Sheet', colCount);
  addDateRow(ws, isAr ? `تاريخ التصدير: ${new Date().toLocaleDateString('en-CA')}` : `Export Date: ${new Date().toLocaleDateString('en-CA')}`, colCount);
  addSpacer(ws);

  const headers = [
    isAr ? 'الكود' : 'Code',
    isAr ? 'الاسم' : 'Employee',
    isAr ? 'الراتب الأساسي' : 'Base Salary',
    isAr ? 'البدلات' : 'Allowances',
    isAr ? 'الإضافي' : 'Overtime',
    isAr ? 'الخصومات' : 'Deductions',
    isAr ? 'خصم السلف' : 'Loans',
    isAr ? 'صافي الراتب' : 'Net Salary',
  ];

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const totals = { basic: 0, allowances: 0, overtime: 0, deductions: 0, loans: 0, net: 0 };

  payroll.forEach((emp, idx) => {
    totals.basic += emp.basic;
    totals.allowances += emp.allowances;
    totals.overtime += emp.overtime;
    totals.deductions += emp.deductions;
    totals.loans += emp.loans;
    totals.net += emp.net;
    const vals = [emp.code, emp.name, emp.basic, emp.allowances, emp.overtime, emp.deductions, emp.loans, emp.net];
    const row = addRowValues(ws, vals);
    applyDataStyle(row, idx, colCount, [3, 4, 5, 6, 7, 8]);
  });

  const summaryRow = addRowValues(ws, [
    '', isAr ? 'الإجمالي' : 'Grand Total',
    totals.basic,
    totals.allowances,
    totals.overtime,
    totals.deductions,
    totals.loans,
    totals.net,
  ]);
  applyTotalStyle(summaryRow, colCount, [3, 4, 5, 6, 7, 8]);

  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 16;
  ws.getColumn(8).width = 22;

  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  await downloadWorkbook(wb, 'HR_Payroll_Sheet');
}

// ═══════════════════════════════════════════════
// 7. HR DEPARTMENTS SUMMARY EXPORT
// ═══════════════════════════════════════════════
export async function exportHRDepartmentsExcel(
  departments: { name: string; employeesCount: number; onLeave: number; withLoans: number; budget: number; avgSalary: number }[],
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();

  const isAr = lang === 'ar';
  const colCount = 6;
  const ws = wb.addWorksheet(isAr ? 'الأقسام' : 'Departments', {
    properties: { tabColor: { argb: accentColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'ملخص الأقسام والتقارير' : 'Departments Summary Report', colCount);
  addDateRow(ws, isAr ? `تاريخ التصدير: ${new Date().toLocaleDateString('en-CA')}` : `Export Date: ${new Date().toLocaleDateString('en-CA')}`, colCount);
  addSpacer(ws);

  const headers = [
    isAr ? 'القسم' : 'Department',
    isAr ? 'عدد الموظفين' : 'Staff Count',
    isAr ? 'في إجازة' : 'On Leave',
    isAr ? 'لديه سلف' : 'With Loans',
    isAr ? 'الميزانية السنوية' : 'Annual Budget',
    isAr ? 'متوسط الراتب' : 'Avg Salary',
  ];

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);

  departments.forEach((dept, idx) => {
    const vals = [dept.name, dept.employeesCount, dept.onLeave, dept.withLoans, dept.budget, dept.avgSalary];
    const row = addRowValues(ws, vals);
    applyDataStyle(row, idx, colCount, [5, 6]);
  });

  const totalEmployees = departments.reduce((s, d) => s + d.employeesCount, 0);
  const totalBudget = departments.reduce((s, d) => s + d.budget, 0);
  const summaryRow = addRowValues(ws, [
    isAr ? 'الإجمالي' : 'Grand Total',
    totalEmployees,
    departments.reduce((s, d) => s + d.onLeave, 0),
    departments.reduce((s, d) => s + d.withLoans, 0),
    totalBudget,
    Math.round(totalBudget / (totalEmployees || 1)),
  ]);
  applyTotalStyle(summaryRow, colCount, [5, 6]);

  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 22;
  ws.getColumn(6).width = 20;

  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  await downloadWorkbook(wb, 'HR_Departments_Summary');
}

// ═══════════════════════════════════════════════
// 8. SALES INVOICES REGISTER EXPORT
// ═══════════════════════════════════════════════
export async function exportSalesInvoicesExcel(
  invoices: { invoiceNumber: string; date: string; dueDate: string; customerId: string; customerName: string; subtotal: number; discountTotal: number; taxRate: number; taxAmount: number; totalAmount: number; paidAmount: number; outstanding: number; status: string; paymentMethod: string; notes: string }[],
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();
  const isAr = lang === 'ar';
  const colCount = 14;
  const ws = wb.addWorksheet(isAr ? 'سجل الفواتير' : 'Invoices Register', {
    properties: { tabColor: { argb: primaryColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'سجل فواتير البيع' : 'Sales Invoices Register', colCount);
  addDateRow(ws, isAr ? `تاريخ التصدير: ${new Date().toLocaleDateString('en-CA')}` : `Export Date: ${new Date().toLocaleDateString('en-CA')}`, colCount);
  addSpacer(ws);

  const headers = [
    isAr ? 'رقم الفاتورة' : 'Invoice #',
    isAr ? 'التاريخ' : 'Date',
    isAr ? 'تاريخ الاستحقاق' : 'Due Date',
    isAr ? 'العميل' : 'Customer',
    isAr ? 'المبلغ الفرعي' : 'Subtotal',
    isAr ? 'إجمالي الخصم' : 'Discount',
    isAr ? 'نسبة الضريبة' : 'Tax Rate',
    isAr ? 'قيمة الضريبة' : 'Tax Amount',
    isAr ? 'الإجمالي' : 'Total',
    isAr ? 'المسدد' : 'Paid',
    isAr ? 'المتبقي' : 'Outstanding',
    isAr ? 'الحالة' : 'Status',
    isAr ? 'طريقة الدفع' : 'Payment',
    isAr ? 'ملاحظات' : 'Notes',
  ];

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  invoices.forEach((inv, idx) => {
    const vals = [
      inv.invoiceNumber, inv.date, inv.dueDate, inv.customerName,
      inv.subtotal, inv.discountTotal, `${inv.taxRate}%`, inv.taxAmount,
      inv.totalAmount, inv.paidAmount, inv.outstanding,
      inv.status, inv.paymentMethod, inv.notes,
    ];
    const row = addRowValues(ws, vals);
    applyDataStyle(row, idx, colCount, [5, 6, 8, 9, 10, 11]);

    const statusCell = row.getCell(12);
    if (inv.status === 'PAID' || inv.status === 'مدفوعة') {
      statusCell.font = { ...dataFont, bold: true, color: { argb: 'FF059669' } };
    } else if (inv.status === 'CANCELLED' || inv.status === 'ملغاة') {
      statusCell.font = { ...dataFont, bold: true, color: { argb: 'FFDC2626' } };
    }
  });

  const tTotal = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const tPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const tDue = invoices.reduce((s, i) => s + i.outstanding, 0);
  const summaryRow = addRowValues(ws, [
    '', '', '', isAr ? 'الإجمالي' : 'Grand Total',
    invoices.reduce((s, i) => s + i.subtotal, 0),
    invoices.reduce((s, i) => s + i.discountTotal, 0),
    '', invoices.reduce((s, i) => s + i.taxAmount, 0),
    tTotal, tPaid, tDue, '', '', '',
  ]);
  applyTotalStyle(summaryRow, colCount, [5, 6, 8, 9, 10, 11]);

  ws.getColumn(1).width = 18; ws.getColumn(2).width = 14; ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 26; ws.getColumn(5).width = 18; ws.getColumn(6).width = 16;
  ws.getColumn(7).width = 14; ws.getColumn(8).width = 16; ws.getColumn(9).width = 18;
  ws.getColumn(10).width = 18; ws.getColumn(11).width = 18; ws.getColumn(12).width = 16;
  ws.getColumn(13).width = 16; ws.getColumn(14).width = 30;

  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  await downloadWorkbook(wb, 'Sales_Invoices_Register');
}

// ═══════════════════════════════════════════════
// 9. INVENTORY STOCKS EXPORT
// ═══════════════════════════════════════════════
export async function exportInventoryStocksExcel(
  items: { code: string; nameAr: string; nameEn: string; category: string; unitAr: string; unitEn: string; type: string; cost: number; quantity: number; reorderPoint: number; valuation: number; safetyStatus: string }[],
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();
  const isAr = lang === 'ar';
  const colCount = 10;
  const ws = wb.addWorksheet(isAr ? 'أرصدة المخازن' : 'Stock Balances', {
    properties: { tabColor: { argb: primaryColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'أرصدة المخازن والمواد الخام' : 'Inventory Stock Balances', colCount);
  addDateRow(ws, isAr ? `تاريخ التصدير: ${new Date().toLocaleDateString('en-CA')}` : `Export Date: ${new Date().toLocaleDateString('en-CA')}`, colCount);
  addSpacer(ws);

  const headers = [
    isAr ? 'كود الصنف' : 'Code',
    isAr ? 'الاسم' : 'Name',
    isAr ? 'النوع' : 'Type',
    isAr ? 'المجموعة' : 'Category',
    isAr ? 'وحدة القياس' : 'Unit',
    isAr ? 'تكلفة الوحدة' : 'Unit Cost',
    isAr ? 'الكمية' : 'Quantity',
    isAr ? 'قيمة المخزون' : 'Valuation',
    isAr ? 'حد إعادة الطلب' : 'Reorder Pt',
    isAr ? 'حالة التنبيه' : 'Alert',
  ];

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  items.forEach((item, idx) => {
    const vals = [item.code, isAr ? item.nameAr : item.nameEn, item.type, item.category, isAr ? item.unitAr : item.unitEn, item.cost, item.quantity, item.valuation, item.reorderPoint, item.safetyStatus];
    const row = addRowValues(ws, vals);
    applyDataStyle(row, idx, colCount, [6, 8]);

    if (item.quantity <= item.reorderPoint) {
      row.getCell(10).font = { ...dataFont, bold: true, color: { argb: 'FFDC2626' } };
    }
  });

  const totalValuation = items.reduce((s, i) => s + i.valuation, 0);
  const summaryRow = addRowValues(ws, [
    '', isAr ? 'الإجمالي' : 'Grand Total', '', '', '',
    items.reduce((s, i) => s + i.quantity, 0).toFixed(1),
    totalValuation, '', '',
  ]);
  applyTotalStyle(summaryRow, colCount, [7, 8]);

  ws.getColumn(1).width = 16; ws.getColumn(2).width = 24; ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 18; ws.getColumn(5).width = 14; ws.getColumn(6).width = 20;
  ws.getColumn(7).width = 14; ws.getColumn(8).width = 22; ws.getColumn(9).width = 14;
  ws.getColumn(10).width = 18;

  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  await downloadWorkbook(wb, 'Inventory_Stocks');
}

// ═══════════════════════════════════════════════
// 10. WASTAGE LOG EXPORT
// ═══════════════════════════════════════════════
export async function exportWastageLogExcel(
  records: { date: string; itemName: string; quantity: number; reason: string; cost: number }[],
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();
  const isAr = lang === 'ar';
  const colCount = 5;
  const ws = wb.addWorksheet(isAr ? 'سجل التالف' : 'Wastage Log', {
    properties: { tabColor: { argb: accentColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'سجل تالف وهدر المواد' : 'Spoilage & Wastage Log', colCount);
  addDateRow(ws, isAr ? `تاريخ التصدير: ${new Date().toLocaleDateString('en-CA')}` : `Export Date: ${new Date().toLocaleDateString('en-CA')}`, colCount);
  addSpacer(ws);

  const headers = [
    isAr ? 'التاريخ' : 'Date',
    isAr ? 'الخامة' : 'Item',
    isAr ? 'الكمية' : 'Quantity',
    isAr ? 'السبب' : 'Reason',
    isAr ? 'الخسارة' : 'Loss',
  ];

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);

  records.forEach((r, idx) => {
    const vals = [r.date, r.itemName, r.quantity, r.reason, r.cost];
    const row = addRowValues(ws, vals);
    applyDataStyle(row, idx, colCount, [5]);
  });

  const totalLoss = records.reduce((s, r) => s + r.cost, 0);
  const summaryRow = addRowValues(ws, [
    '', isAr ? 'الإجمالي' : 'Grand Total', records.reduce((s, r) => s + r.quantity, 0),
    '', totalLoss,
  ]);
  applyTotalStyle(summaryRow, colCount, [3, 5]);

  ws.getColumn(1).width = 14; ws.getColumn(2).width = 28; ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 30; ws.getColumn(5).width = 20;

  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  await downloadWorkbook(wb, 'Wastage_Log');
}

// ═══════════════════════════════════════════════
// 11. PURCHASE TRANSACTIONS EXPORT
// ═══════════════════════════════════════════════
export async function exportPurchaseTransactionsExcel(
  purchases: { number: string; date: string; supplierName: string; status: string; itemsSummary: string; subtotal: number; taxAmount: number; totalAmount: number; type: string }[],
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();
  const isAr = lang === 'ar';
  const colCount = 9;
  const ws = wb.addWorksheet(isAr ? 'حركات الشراء' : 'Purchases', {
    properties: { tabColor: { argb: primaryColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'سجل حركات المشتريات' : 'Purchase Transactions Log', colCount);
  addDateRow(ws, isAr ? `تاريخ التصدير: ${new Date().toLocaleDateString('en-CA')}` : `Export Date: ${new Date().toLocaleDateString('en-CA')}`, colCount);
  addSpacer(ws);

  const headers = [
    isAr ? 'رقم السند' : 'Doc #',
    isAr ? 'التاريخ' : 'Date',
    isAr ? 'المورد' : 'Supplier',
    isAr ? 'الحالة' : 'Status',
    isAr ? 'الخامات' : 'Items',
    isAr ? 'الإجمالي الفرعي' : 'Subtotal',
    isAr ? 'الضريبة' : 'Tax',
    isAr ? 'الإجمالي' : 'Total',
    isAr ? 'النوع' : 'Type',
  ];

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  purchases.forEach((tx, idx) => {
    const vals = [tx.number, tx.date, tx.supplierName, tx.status, tx.itemsSummary, tx.subtotal, tx.taxAmount, tx.totalAmount, tx.type];
    const row = addRowValues(ws, vals);
    applyDataStyle(row, idx, colCount, [6, 7, 8]);
  });

  const tSub = purchases.reduce((s, p) => s + p.subtotal, 0);
  const tTax = purchases.reduce((s, p) => s + p.taxAmount, 0);
  const tTotal = purchases.reduce((s, p) => s + p.totalAmount, 0);
  const summaryRow = addRowValues(ws, [
    '', '', '', '', isAr ? 'الإجمالي' : 'Grand Total',
    tSub, tTax, tTotal, '',
  ]);
  applyTotalStyle(summaryRow, colCount, [6, 7, 8]);

  ws.getColumn(1).width = 18; ws.getColumn(2).width = 14; ws.getColumn(3).width = 24;
  ws.getColumn(4).width = 22; ws.getColumn(5).width = 44; ws.getColumn(6).width = 18;
  ws.getColumn(7).width = 16; ws.getColumn(8).width = 18; ws.getColumn(9).width = 14;

  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  await downloadWorkbook(wb, 'Purchase_Transactions');
}

// ═══════════════════════════════════════════════
// 12. SUPPLIERS EXPORT
// ═══════════════════════════════════════════════
export async function exportSuppliersExcel(
  suppliers: { code: string; name: string; phone: string; balance: number }[],
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();
  const isAr = lang === 'ar';
  const colCount = 4;
  const ws = wb.addWorksheet(isAr ? 'الموردين' : 'Suppliers', {
    properties: { tabColor: { argb: accentColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'شبكة الموردين' : 'Suppliers Network', colCount);
  addDateRow(ws, isAr ? `تاريخ التصدير: ${new Date().toLocaleDateString('en-CA')}` : `Export Date: ${new Date().toLocaleDateString('en-CA')}`, colCount);
  addSpacer(ws);

  const headers = [
    isAr ? 'الكود' : 'Code',
    isAr ? 'الاسم' : 'Name',
    isAr ? 'الهاتف' : 'Phone',
    isAr ? 'الرصيد' : 'Balance',
  ];

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);

  suppliers.forEach((s, idx) => {
    const vals = [s.code, s.name, s.phone, s.balance];
    const row = addRowValues(ws, vals);
    applyDataStyle(row, idx, colCount, [4]);
  });

  const totalBal = suppliers.reduce((s, sp) => s + sp.balance, 0);
  const summaryRow = addRowValues(ws, ['', isAr ? 'الإجمالي' : 'Grand Total', '', totalBal]);
  applyTotalStyle(summaryRow, colCount, [4]);

  ws.getColumn(1).width = 16; ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 20; ws.getColumn(4).width = 22;

  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  await downloadWorkbook(wb, 'Suppliers_List');
}

// ═══════════════════════════════════════════════
// 13. TREASURY STATEMENT EXPORT
// ═══════════════════════════════════════════════
export async function exportTreasuryStatementExcel(
  entityName: string,
  entityType: string,
  transactions: { number: string; date: string; type: string; debit: number; credit: number; balance: number; description: string }[],
  startDate: string,
  endDate: string,
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();
  const isAr = lang === 'ar';
  const colCount = 7;
  const ws = wb.addWorksheet(entityName, {
    properties: { tabColor: { argb: primaryColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'كشف حساب' : 'Account Statement', colCount);
  addTitleRow(ws, entityName, colCount);
  addPeriodRow(ws, isAr ? `من: ${startDate}  إلى: ${endDate}` : `From: ${startDate}  To: ${endDate}`, colCount);
  addSpacer(ws);

  const headers = [
    isAr ? 'رقم المستند' : 'Doc #',
    isAr ? 'التاريخ' : 'Date',
    isAr ? 'النوع' : 'Type',
    isAr ? 'وارد (مدين)' : 'Inflow (Dr)',
    isAr ? 'صادر (دائن)' : 'Outflow (Cr)',
    isAr ? 'الرصيد' : 'Balance',
    isAr ? 'البيان' : 'Description',
  ];

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  transactions.forEach((tx, idx) => {
    const vals = [tx.number, tx.date, tx.type, tx.debit, tx.credit, tx.balance, tx.description];
    const row = addRowValues(ws, vals);
    applyDataStyle(row, idx, colCount, [4, 5, 6]);

    const typeCell = row.getCell(3);
    if (tx.type === 'RECEIPT' || tx.type === 'قبض') {
      typeCell.font = { ...dataFont, bold: true, color: { argb: 'FF059669' } };
    } else if (tx.type === 'PAYMENT' || tx.type === 'صرف') {
      typeCell.font = { ...dataFont, bold: true, color: { argb: 'FFDC2626' } };
    }
  });

  const tDebit = transactions.reduce((s, t) => s + t.debit, 0);
  const tCredit = transactions.reduce((s, t) => s + t.credit, 0);
  const lastBal = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;
  const summaryRow = addRowValues(ws, [
    '', '', isAr ? 'الإجمالي' : 'Grand Total',
    tDebit, tCredit, lastBal, '',
  ]);
  applyTotalStyle(summaryRow, colCount, [4, 5, 6]);

  ws.getColumn(1).width = 18; ws.getColumn(2).width = 14; ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 20; ws.getColumn(5).width = 20; ws.getColumn(6).width = 20;
  ws.getColumn(7).width = 40;

  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  await downloadWorkbook(wb, `Statement_${entityName.replace(/\s+/g, '_')}`);
}

// ═══════════════════════════════════════════════
// 14. TREASURY CHECKBOOK EXPORT
// ═══════════════════════════════════════════════
export async function exportTreasuryCheckbookExcel(
  checkbook: { code: string; bankName: string; bankAccount: string },
  checks: { number: number; status: string }[],
  summary: { unused: number; used: number; cancelled: number },
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();
  const isAr = lang === 'ar';
  const colCount = 4;
  const ws = wb.addWorksheet(isAr ? 'دفتر الشيكات' : 'Checkbook', {
    properties: { tabColor: { argb: accentColor } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'دفتر الشيكات' : 'Checkbook Register', colCount);
  addTitleRow(ws, `${checkbook.code} - ${checkbook.bankName}`, colCount);
  addSpacer(ws);

  addRowValues(ws, [isAr ? 'ملخص' : 'Summary', '', '', '']);
  addRowValues(ws, [isAr ? 'إجمالي الشيكات' : 'Total Checks', checks.length, isAr ? 'المستخدمة' : 'Used', summary.used]);
  addRowValues(ws, [isAr ? 'غير المستخدمة' : 'Unused', summary.unused, isAr ? 'ملغية' : 'Cancelled', summary.cancelled]);
  addSpacer(ws);

  const headers = [
    isAr ? 'رقم الشيك' : 'Check #',
    isAr ? 'الحالة' : 'Status',
    isAr ? 'البنك' : 'Bank',
    isAr ? 'رقم الحساب' : 'Account #',
  ];

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);

  checks.forEach((ch, idx) => {
    const vals = [ch.number, ch.status, checkbook.bankName, checkbook.bankAccount];
    const row = addRowValues(ws, vals);
    applyDataStyle(row, idx, colCount);
    const statusCell = row.getCell(2);
    if (ch.status === 'USED' || ch.status === 'مستخدم') {
      statusCell.font = { ...dataFont, bold: true, color: { argb: 'FF2563EB' } };
    } else if (ch.status === 'CANCELLED' || ch.status === 'ملغي') {
      statusCell.font = { ...dataFont, bold: true, color: { argb: 'FFDC2626' } };
    } else {
      statusCell.font = { ...dataFont, bold: true, color: { argb: 'FF059669' } };
    }
  });

  ws.getColumn(1).width = 16; ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 24; ws.getColumn(4).width = 22;

  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  await downloadWorkbook(wb, `Checkbook_${checkbook.code}`);
}

// ═══════════════════════════════════════════════
// 15. TREASURY DASHBOARD EXPORT (Multi-sheet)
// ═══════════════════════════════════════════════
export async function exportTreasuryDashboardExcel(
  safes: { name: string; branch: string; responsible: string; balance: number; accountId: string }[],
  banks: { name: string; accountNumber: string; branch: string; responsible: string; balance: number }[],
  transactions: { number: string; date: string; type: string; amount: number; sourceId: string; destId: string; description: string }[],
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();
  const isAr = lang === 'ar';

  // Sheet 1: Safes
  const ws1 = wb.addWorksheet(isAr ? 'الخزائن' : 'Safes', {
    properties: { tabColor: { argb: primaryColor } },
  });
  const c1 = 5;
  await writeCompanyHeader(ws1, c1);
  addSpacer(ws1);
  addTitleRow(ws1, isAr ? 'الخزائن النقدية' : 'Cash Safes', c1);
  addDateRow(ws1, isAr ? `تاريخ التصدير: ${new Date().toLocaleDateString('en-CA')}` : `Export Date: ${new Date().toLocaleDateString('en-CA')}`, c1);
  addSpacer(ws1);
  const h1 = addRowValues(ws1, [
    isAr ? 'الاسم' : 'Name', isAr ? 'الفرع' : 'Branch',
    isAr ? 'المسؤول' : 'Responsible', isAr ? 'حساب الأستاذ' : 'GL Account', isAr ? 'الرصيد' : 'Balance',
  ]);
  applyHeaderStyle(h1, c1);
  safes.forEach((s, i) => {
    const r = addRowValues(ws1, [s.name, s.branch, s.responsible, s.accountId, s.balance]);
    applyDataStyle(r, i, c1, [5]);
  });
  const tSafe = safes.reduce((s, sf) => s + sf.balance, 0);
  const sr1 = addRowValues(ws1, ['', isAr ? 'الإجمالي' : 'Grand Total', '', '', tSafe]);
  applyTotalStyle(sr1, c1, [5]);
  ws1.getColumn(1).width = 26; ws1.getColumn(2).width = 16; ws1.getColumn(3).width = 20;
  ws1.getColumn(4).width = 16; ws1.getColumn(5).width = 22;

  // Sheet 2: Banks
  const ws2 = wb.addWorksheet(isAr ? 'البنوك' : 'Banks', {
    properties: { tabColor: { argb: accentColor } },
  });
  const c2 = 5;
  await writeCompanyHeader(ws2, c2);
  addSpacer(ws2);
  addTitleRow(ws2, isAr ? 'الحسابات البنكية' : 'Bank Accounts', c2);
  addDateRow(ws2, isAr ? `تاريخ التصدير: ${new Date().toLocaleDateString('en-CA')}` : `Export Date: ${new Date().toLocaleDateString('en-CA')}`, c2);
  addSpacer(ws2);
  const h2 = addRowValues(ws2, [
    isAr ? 'اسم البنك' : 'Bank Name', isAr ? 'رقم الحساب' : 'Account #',
    isAr ? 'الفرع' : 'Branch', isAr ? 'المسؤول' : 'Responsible', isAr ? 'الرصيد' : 'Balance',
  ]);
  applyHeaderStyle(h2, c2);
  banks.forEach((b, i) => {
    const r = addRowValues(ws2, [b.name, b.accountNumber, b.branch, b.responsible, b.balance]);
    applyDataStyle(r, i, c2, [5]);
  });
  const tBank = banks.reduce((s, b) => s + b.balance, 0);
  const sr2 = addRowValues(ws2, ['', isAr ? 'الإجمالي' : 'Grand Total', '', '', tBank]);
  applyTotalStyle(sr2, c2, [5]);
  ws2.getColumn(1).width = 26; ws2.getColumn(2).width = 22; ws2.getColumn(3).width = 16;
  ws2.getColumn(4).width = 20; ws2.getColumn(5).width = 22;

  // Sheet 3: Recent Transactions
  const ws3 = wb.addWorksheet(isAr ? 'الحركات' : 'Transactions', {
    properties: { tabColor: { argb: 'FF8B5CF6' } },
  });
  const c3 = 7;
  await writeCompanyHeader(ws3, c3);
  addSpacer(ws3);
  addTitleRow(ws3, isAr ? 'سجل الحركات المالية' : 'Financial Transactions Log', c3);
  addDateRow(ws3, isAr ? `تاريخ التصدير: ${new Date().toLocaleDateString('en-CA')}` : `Export Date: ${new Date().toLocaleDateString('en-CA')}`, c3);
  addSpacer(ws3);
  const h3 = addRowValues(ws3, [
    isAr ? 'رقم المستند' : 'Doc #', isAr ? 'التاريخ' : 'Date',
    isAr ? 'النوع' : 'Type', isAr ? 'المبلغ' : 'Amount',
    isAr ? 'المصدر' : 'Source', isAr ? 'الوجهة' : 'Destination',
    isAr ? 'البيان' : 'Description',
  ]);
  applyHeaderStyle(h3, c3);
  ws3.views = [{ state: 'frozen', ySplit: 1 }];
  transactions.forEach((tx, i) => {
    const r = addRowValues(ws3, [tx.number, tx.date, tx.type, tx.amount, tx.sourceId, tx.destId, tx.description]);
    applyDataStyle(r, i, c3, [4]);
  });
  const tAmt = transactions.reduce((s, t) => s + t.amount, 0);
  const sr3 = addRowValues(ws3, ['', '', isAr ? 'الإجمالي' : 'Grand Total', tAmt, '', '', '']);
  applyTotalStyle(sr3, c3, [4]);
  ws3.getColumn(1).width = 18; ws3.getColumn(2).width = 14; ws3.getColumn(3).width = 16;
  ws3.getColumn(4).width = 20; ws3.getColumn(5).width = 20; ws3.getColumn(6).width = 20;
  ws3.getColumn(7).width = 36;

  await downloadWorkbook(wb, 'Treasury_Dashboard');
}

// ═══════════════════════════════════════════════
// 16. POS INVOICES (CASHIER) EXPORT
// ═══════════════════════════════════════════════
export async function exportPOSInvoicesExcel(
  invoices: { orderNumber: string; date: string; cashierName: string; description: string; dineInAmount: number; takeawayAmount: number; deliveryAmount: number; deliveryAppsAmount: number; cashAmount: number; cardAmount: number; serviceCharge: number; taxAmount: number; totalAmount: number; foodCost: number; }[],
  lang: 'ar' | 'en'
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LODing ERP';
  wb.created = new Date();
  const isAr = lang === 'ar';
  const colCount = 14;
  const ws = wb.addWorksheet(isAr ? 'فواتير الكاشير' : 'POS Invoices', {
    properties: { tabColor: { argb: 'FF7C3AED' } },
  });

  await writeCompanyHeader(ws, colCount);
  addSpacer(ws);
  addTitleRow(ws, isAr ? 'سجل فواتير نقطة البيع (الكاشير)' : 'POS Invoice Register', colCount);
  addDateRow(ws, isAr ? `تاريخ التصدير: ${new Date().toLocaleDateString('en-CA')}` : `Export Date: ${new Date().toLocaleDateString('en-CA')}`, colCount);
  addSpacer(ws);

  addRowValues(ws, [
    isAr ? `عدد الفواتير: ${invoices.length}` : `Invoice Count: ${invoices.length}`,
    '', '', '', '', '', '', '', '', '', '', '', '', '',
  ]);

  const lastRowNum = ws.lastRow.number;
  const lastColLetter = colLetter(colCount);
  ws.mergeCells(`A${lastRowNum}:${lastColLetter}${lastRowNum}`);
  ws.getRow(lastRowNum).font = { name: 'Calibri', size: 12, bold: true, color: { argb: primaryColor } };
  ws.getRow(lastRowNum).alignment = { horizontal: 'center' };

  addSpacer(ws);

  const headers = [
    isAr ? 'رقم الفاتورة' : 'Invoice #',
    isAr ? 'التاريخ' : 'Date',
    isAr ? 'الكاشير' : 'Cashier',
    isAr ? 'صالة' : 'Dine-In',
    isAr ? 'تيك أواي' : 'Takeaway',
    isAr ? 'دليفري' : 'Delivery',
    isAr ? 'تطبيقات' : 'Apps',
    isAr ? 'نقدي' : 'Cash',
    isAr ? 'فيزا' : 'Card',
    isAr ? 'خدمة' : 'Service',
    isAr ? 'الضريبة' : 'Tax',
    isAr ? 'الإجمالي' : 'Total',
    isAr ? 'تكلفة الطعام' : 'Food Cost',
    isAr ? 'الوصف' : 'Description',
  ];

  const headerRow = addRowValues(ws, headers);
  applyHeaderStyle(headerRow, colCount);
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  invoices.forEach((inv, idx) => {
    const vals = [
      inv.orderNumber, inv.date, inv.cashierName,
      inv.dineInAmount, inv.takeawayAmount, inv.deliveryAmount, inv.deliveryAppsAmount,
      inv.cashAmount, inv.cardAmount, inv.serviceCharge, inv.taxAmount,
      inv.totalAmount, inv.foodCost, inv.description,
    ];
    const row = addRowValues(ws, vals);
    applyDataStyle(row, idx, colCount, [4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  const tTotal = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const tCash = invoices.reduce((s, i) => s + i.cashAmount, 0);
  const tCard = invoices.reduce((s, i) => s + i.cardAmount, 0);
  const tFood = invoices.reduce((s, i) => s + i.foodCost, 0);
  const summaryRow = addRowValues(ws, [
    '', '', isAr ? 'الإجمالي' : 'Grand Total',
    invoices.reduce((s, i) => s + i.dineInAmount, 0),
    invoices.reduce((s, i) => s + i.takeawayAmount, 0),
    invoices.reduce((s, i) => s + i.deliveryAmount, 0),
    invoices.reduce((s, i) => s + i.deliveryAppsAmount, 0),
    tCash, tCard,
    invoices.reduce((s, i) => s + i.serviceCharge, 0),
    invoices.reduce((s, i) => s + i.taxAmount, 0),
    tTotal, tFood, '',
  ]);
  applyTotalStyle(summaryRow, colCount, [4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);

  ws.getColumn(1).width = 18; ws.getColumn(2).width = 14; ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 14; ws.getColumn(5).width = 14; ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 14; ws.getColumn(8).width = 16; ws.getColumn(9).width = 16;
  ws.getColumn(10).width = 14; ws.getColumn(11).width = 14; ws.getColumn(12).width = 18;
  ws.getColumn(13).width = 18; ws.getColumn(14).width = 36;

  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: colCount },
  };

  await downloadWorkbook(wb, 'POS_Invoices_Register');
}
