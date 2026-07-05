const fs = require('fs');

async function testPost() {
  try {
    const token = 'mock-jwt-token';
    const initialData = require('./dist/server.cjs'); // No we need initialData, but I can't require .ts from .cjs easily.
    
    // Read from /api/erp-data
    const getRes = await fetch('http://localhost:3000/api/erp-data', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await getRes.json();
    data.accounts.push({
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
      body: JSON.stringify(data)
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (e) {
    console.error('Error:', e);
  }
}
testPost();
