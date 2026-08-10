const LARAVEL_API_BASE = "https://galo.prodental.dev/API/api";

async function run() {
  let res = await fetch(`${LARAVEL_API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ name: 'Admin', email: `admin_${Date.now()}@example.com`, password: 'password', password_confirmation: 'password', role: 2 })
  });
  let data = await res.json();
  const token = data.access_token || data.accessToken;

  const formData = new FormData();
  formData.append('name', 'Test Image URL File 2');
  formData.append('price', '10');
  formData.append('category_id', '1');
  const blob = new Blob(['dummy image content'], { type: 'image/jpeg' });
  formData.append('image_url', blob, 'test.jpg');

  try {
    const res2 = await fetch(`${LARAVEL_API_BASE}/products`, {
      method: "POST",
      body: formData,
      headers: {
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
