const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://galo.prodental.dev/API/api/products?page=1', {
    method: 'GET'
  });
  const data = await res.json();
  console.log("Products response keys:", Object.keys(data));
  if (!Array.isArray(data)) {
    console.log(data);
  } else {
    console.log("Returned array of length", data.length);
  }
}
test();
