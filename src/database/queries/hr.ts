import Database from 'better-sqlite3';
import { generateId } from './utils';

function mapEmployee(r: any) {
  return {
    ...r,
    active: !!r.active,
    allowances: r.allowances ?? 0,
    deductions: r.deductions ?? 0,
    overtimeHours: r.overtimeHours ?? 0,
    workingDays: r.workingDays ?? 0,
    workingHours: r.workingHours ?? 0,
    annualLeaveBalance: r.annualLeaveBalance ?? 0
  };
}

export function getAllEmployees(db: Database.Database) {
  return (db.prepare('SELECT * FROM employees ORDER BY code').all() as any[]).map(mapEmployee);
}

export function getEmployeeById(db: Database.Database, id: string) {
  const r = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any;
  if (!r) return null;
  return mapEmployee(r);
}

export function createEmployee(db: Database.Database, data: {
  code: string; nameAr: string; nameEn: string; role: string;
  salary: number; shift: string; allowances?: number; deductions?: number;
  nationalId?: string; department?: string; email?: string; phone?: string;
  hireDate?: string; contractType?: string; manager?: string; status?: string;
  timelineJson?: string; contractStartDate?: string; contractEndDate?: string;
  overtimeHours?: number; workingDays?: number; workingHours?: number;
  annualLeaveBalance?: number;
}) {
  const existing = db.prepare('SELECT id FROM employees WHERE code = ?').get(data.code);
  if (existing) throw new Error('Employee code already exists');

  const id = generateId('emp');
  db.prepare(`
    INSERT INTO employees (id, code, nameAr, nameEn, role, salary, shift, loanBalance, active, allowances, deductions, overtimeHours, workingDays, workingHours, nationalId, department, email, phone, hireDate, contractType, manager, status, timelineJson, contractStartDate, contractEndDate, annualLeaveBalance)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.code, data.nameAr, data.nameEn, data.role, data.salary, data.shift, data.allowances ?? 0, data.deductions ?? 0, data.overtimeHours ?? 0, data.workingDays ?? 0, data.workingHours ?? 0, data.nationalId ?? '', data.department ?? '', data.email ?? '', data.phone ?? '', data.hireDate ?? '', data.contractType ?? '', data.manager ?? '', data.status ?? 'ACTIVE', data.timelineJson ?? '[]', data.contractStartDate ?? '', data.contractEndDate ?? '', data.annualLeaveBalance ?? 0);

  return getEmployeeById(db, id);
}

export function updateEmployee(db: Database.Database, id: string, data: Partial<{
  nameAr: string; nameEn: string; role: string; salary: number; shift: string;
  loanBalance: number; active: boolean; allowances: number; deductions: number;
  overtimeHours: number; workingDays: number; workingHours: number;
  nationalId: string; department: string; email: string; phone: string;
  hireDate: string; contractType: string; manager: string; status: string;
  timelineJson: string; contractStartDate: string; contractEndDate: string;
  annualLeaveBalance: number;
}>) {
  const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any;
  if (!existing) throw new Error('Employee not found');

  const fields: string[] = [];
  const values: any[] = [];

  if (data.nameAr !== undefined) { fields.push('nameAr = ?'); values.push(data.nameAr); }
  if (data.nameEn !== undefined) { fields.push('nameEn = ?'); values.push(data.nameEn); }
  if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }
  if (data.salary !== undefined) { fields.push('salary = ?'); values.push(data.salary); }
  if (data.shift !== undefined) { fields.push('shift = ?'); values.push(data.shift); }
  if (data.loanBalance !== undefined) { fields.push('loanBalance = ?'); values.push(data.loanBalance); }
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active ? 1 : 0); }
  if (data.allowances !== undefined) { fields.push('allowances = ?'); values.push(data.allowances); }
  if (data.deductions !== undefined) { fields.push('deductions = ?'); values.push(data.deductions); }
  if (data.overtimeHours !== undefined) { fields.push('overtimeHours = ?'); values.push(data.overtimeHours); }
  if (data.workingDays !== undefined) { fields.push('workingDays = ?'); values.push(data.workingDays); }
  if (data.workingHours !== undefined) { fields.push('workingHours = ?'); values.push(data.workingHours); }
  if (data.nationalId !== undefined) { fields.push('nationalId = ?'); values.push(data.nationalId); }
  if (data.department !== undefined) { fields.push('department = ?'); values.push(data.department); }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.hireDate !== undefined) { fields.push('hireDate = ?'); values.push(data.hireDate); }
  if (data.contractType !== undefined) { fields.push('contractType = ?'); values.push(data.contractType); }
  if (data.manager !== undefined) { fields.push('manager = ?'); values.push(data.manager); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.timelineJson !== undefined) { fields.push('timelineJson = ?'); values.push(data.timelineJson); }
  if (data.contractStartDate !== undefined) { fields.push('contractStartDate = ?'); values.push(data.contractStartDate); }
  if (data.contractEndDate !== undefined) { fields.push('contractEndDate = ?'); values.push(data.contractEndDate); }
  if (data.annualLeaveBalance !== undefined) { fields.push('annualLeaveBalance = ?'); values.push(data.annualLeaveBalance); }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getEmployeeById(db, id);
}

export function deleteEmployee(db: Database.Database, id: string) {
  const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any;
  if (!existing) throw new Error('Employee not found');
  db.prepare('DELETE FROM employees WHERE id = ?').run(id);
}
