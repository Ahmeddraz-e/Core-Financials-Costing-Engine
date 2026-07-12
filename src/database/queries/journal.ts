import Database from 'better-sqlite3';
import { generateId } from './utils';

function mapEntry(db: Database.Database, je: any) {
  const lines = db.prepare('SELECT accountId, debit, credit, itemsJson FROM journal_lines WHERE entryId = ?').all(je.id) as any[];
  return {
    id: je.id,
    entryNumber: je.entryNumber,
    date: je.date,
    type: je.type,
    description: je.description,
    approved: !!je.approved,
    approvedBy: je.approvedBy || undefined,
    lines: lines.map(l => ({
      accountId: l.accountId,
      debit: l.debit,
      credit: l.credit,
      items: l.itemsJson ? JSON.parse(l.itemsJson) : undefined
    }))
  };
}

export function getAllEntries(db: Database.Database) {
  const rows = db.prepare('SELECT * FROM journal_entries ORDER BY date DESC').all() as any[];
  return rows.map(je => mapEntry(db, je));
}

export function getEntryById(db: Database.Database, id: string) {
  const je = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as any;
  if (!je) return null;
  return mapEntry(db, je);
}

export function createEntry(db: Database.Database, data: {
  entryNumber: string;
  date: string;
  type: string;
  description: string;
  approved?: boolean;
  approvedBy?: string;
  lines: { accountId: string; debit: number; credit: number }[];
}) {
  // Validate: debits must equal credits
  const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal entry not balanced: Debit=${totalDebit}, Credit=${totalCredit}`);
  }

  if (data.lines.length < 2) {
    throw new Error('Journal entry must have at least 2 lines');
  }

  const id = generateId('je');
  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO journal_entries (id, entryNumber, date, type, description, approved, approvedBy) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.entryNumber, data.date, data.type, data.description, data.approved ? 1 : 0, data.approvedBy || null);

    const insertLine = db.prepare(
      'INSERT INTO journal_lines (id, entryId, accountId, debit, credit) VALUES (?, ?, ?, ?, ?)'
    );
    data.lines.forEach((l, i) => {
      insertLine.run(`${id}-line-${i}`, id, l.accountId, l.debit, l.credit);
    });

    // Update account balances
    data.lines.forEach(l => {
      const account = db.prepare('SELECT type FROM accounts WHERE id = ?').get(l.accountId) as any;
      if (account) {
        const isDebitNature = ['ASSET', 'EXPENSE', 'COST_OF_SALES'].includes(account.type);
        const delta = isDebitNature ? (l.debit - l.credit) : (l.credit - l.debit);
        db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(delta, l.accountId);
      }
    });
  });
  tx();

  return getEntryById(db, id);
}

export function approveEntry(db: Database.Database, id: string, approvedBy: string) {
  const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as any;
  if (!entry) throw new Error('Journal entry not found');
  if (entry.approved) throw new Error('Journal entry already approved');

  db.prepare('UPDATE journal_entries SET approved = 1, approvedBy = ? WHERE id = ?').run(approvedBy, id);
  return getEntryById(db, id);
}

export function deleteEntry(db: Database.Database, id: string) {
  const entry = getEntryById(db, id);
  if (!entry) throw new Error('Journal entry not found');

  const tx = db.transaction(() => {
    // Reverse account balances
    entry.lines.forEach((l: any) => {
      const account = db.prepare('SELECT type FROM accounts WHERE id = ?').get(l.accountId) as any;
      if (account) {
        const isDebitNature = ['ASSET', 'EXPENSE', 'COST_OF_SALES'].includes(account.type);
        const delta = isDebitNature ? -(l.debit - l.credit) : -(l.credit - l.debit);
        db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(delta, l.accountId);
      }
    });

    db.prepare('DELETE FROM journal_lines WHERE entryId = ?').run(id);
    db.prepare('DELETE FROM journal_entries WHERE id = ?').run(id);
  });
  tx();
}
