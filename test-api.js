const fetch = require('node-fetch');

async function test() {
  // Try to login if we can find credentials, or maybe admin@example.com?
  const res = await fetch('https://galo.prodental.dev/API/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email: 'admin@admin.com', password: 'password' })
  });
  const data = await res.json();
  console.log("Login:", data);
  if (!data.access_token) return;
  
  const token = data.access_token;
  
  // Get product
  const prodRes = await fetch('https://galo.prodental.dev/API/api/products', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const prods = await prodRes.json();
  const prod = prods[1] || prods[0];
  console.log("Prod variations:", prod.variations);
  
  // Try PUT
  const putRes = await fetch(`https://galo.prodental.dev/API/api/products/${prod.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      ...prod,
      variations: prod.variations.map(v => {
        const {id, ...rest} = v; // delete id
        return { ...rest, stock_quantity: 99 };
      })
    })
  });
  console.log("PUT result:", await putRes.text());
}
test();
