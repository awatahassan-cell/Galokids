const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://galo.prodental.dev/API/api/products', {
    method: 'GET'
  });
  const data = await res.json();
  console.log("Array length no params:", data.length);
}
test();
