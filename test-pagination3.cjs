const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://galo.prodental.dev/API/api/products?page=1&limit=2', {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  const data = await res.json();
  console.log(Object.keys(data));
}
test();
