const fetch = require('node-fetch');

async function test() {
  let res = await fetch('https://galo.prodental.dev/API/api/products/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ search: 'test' })
  });
  console.log('POST /products/search status:', res.status);
  
  res = await fetch('https://galo.prodental.dev/API/api/search/products?q=test', {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  console.log('GET /search/products status:', res.status);
}
test();
