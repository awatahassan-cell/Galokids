const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://galo.prodental.dev/API/api/products?search=shoes', {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  const data = await res.json();
  console.log("Search 'shoes':", Array.isArray(data) ? data.length : (data.data ? data.data.length : data));
  
  const res2 = await fetch('https://galo.prodental.dev/API/api/products?q=shoes', {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  const data2 = await res2.json();
  console.log("Search q 'shoes':", Array.isArray(data2) ? data2.length : (data2.data ? data2.data.length : data2));
}
test();
