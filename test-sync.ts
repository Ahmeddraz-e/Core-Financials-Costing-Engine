import { initDatabase, saveERPDataDiff } from './src/database/db';
import { initialERPData } from './src/initialData';

try {
  const db = initDatabase(':memory:');
  saveERPDataDiff(db, initialERPData);
  console.log('Sync initial data SUCCESS!');
  
  const newData = JSON.parse(JSON.stringify(initialERPData));
  newData.accounts.push({
    id: 'acc-test',
    code: '999',
    nameAr: 'Test',
    nameEn: 'Test',
    type: 'ASSET',
    parentCode: null,
    balance: 0
  });
  saveERPDataDiff(db, newData);
  console.log('Sync new account SUCCESS!');
} catch (e: any) {
  console.error('ERROR:', e.message);
}
