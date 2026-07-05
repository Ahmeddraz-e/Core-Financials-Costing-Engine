const fs = require('fs');

async function testPost() {
  try {
    const token = 'mock-jwt-token';
    const initialData = require('./src/initialData').initialERPData;
    initialData.accounts.push({
        id: 'acc-test2',
        code: '888',
        nameAr: 'Test',
        nameEn: 'Test',
        type: 'ASSET',
        parentCode: null,
        balance: 0
    });
    
    const res = await fetch('http://localhost:3000/api/erp-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(initialData)
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (e) {
    console.error('Error:', e);
  }
}
testPost();
