const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://galo.prodental.dev/API/api/products?page=1&per_page=2', {
    method: 'GET'
  });
  const data = await res.json();
  console.log("Products response type:", Array.isArray(data) ? 'Array' : typeof data);
  if (Array.isArray(data)) {
    console.log("Array length:", data.length);
  } else {
    console.log("Keys:", Object.keys(data));
  }
}
test();
