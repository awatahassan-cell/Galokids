const fetch = require('node-fetch');

async function test() {
  const params = [
    '',
    '?category_id=1',
    '?category_id=9999',
    '?gender=Boy',
    '?gender=invalid_gender',
    '?colors[]=Red',
    '?sizes[]=M',
    '?in_stock=1'
  ];

  for (const p of params) {
    const res = await fetch('https://galo.prodental.dev/API/api/products' + p, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const data = await res.json();
    const count = Array.isArray(data) ? data.length : (data.data ? data.data.length : -1);
    console.log(`Query: ${p || '(none)'} -> Count: ${count}`);
    if (count > 0 && p) {
      const items = Array.isArray(data) ? data : data.data;
      console.log(`  Sample item keys:`, Object.keys(items[0]));
    }
  }
}
test();
