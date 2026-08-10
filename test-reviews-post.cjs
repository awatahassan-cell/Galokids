const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://galo.prodental.dev/API/api/reviews', {
    method: 'POST'
  });
  const data = await res.text();
  console.log(data.substring(0, 200));
}
test();
