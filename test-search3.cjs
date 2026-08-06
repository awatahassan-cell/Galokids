const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://galo.prodental.dev/API/api/products', {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  const data = await res.json();
  const arr = Array.isArray(data) ? data : (data.data ? data.data : []);
  console.log(arr.map(a => a.name));
}
test();
