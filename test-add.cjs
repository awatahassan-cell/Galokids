const LARAVEL_API_BASE = "https://galo.prodental.dev/API/api";

async function run() {
  let res = await fetch(`${LARAVEL_API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email: 'admin_1720186910609@example.com', password: 'password' })
  });
  let data = await res.json();
  const token = data.access_token || data.accessToken;
  console.log("Token:", token);
  
  if (!token) return;

  const product = {
    category_id: 1,
    name: 'Test Add Product FrontEnd logic',
    price: 19.99,
    cost: 10,
    image_url: 'https://images.unsplash.com/photo-1560243563-062bfc001d68?auto=format&fit=crop&q=80&w=800'
  };

  try {
    const res2 = await fetch(`${LARAVEL_API_BASE}/products`, {
      method: "POST",
      body: JSON.stringify(product),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    const text2 = await res2.text();
    console.log(res2.status, text2);
  } catch (err) {
    console.error(err);
  }
}
run();
