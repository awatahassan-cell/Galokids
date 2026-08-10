const fetch = require('node-fetch');

async function test() {
  const paramsList = [
    '?name=xyz', '?search=xyz', '?q=xyz', '?query=xyz', '?keyword=xyz'
  ];
  for (const p of paramsList) {
    const res = await fetch('https://galo.prodental.dev/API/api/products' + p, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const data = await res.json();
    const len = Array.isArray(data) ? data.length : (data.data ? data.data.length : -1);
    console.log(p, len);
  }
}
test();
