const LARAVEL_API_BASE = "https://galo.prodental.dev/API/api";

function convertKeysToSnakeCase(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToSnakeCase);
  if (typeof obj === 'object') {
    const newObj = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = key.replace(/[A-Z0-9]/g, (letter) => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = convertKeysToSnakeCase(obj[key]);
    }
    return newObj;
  }
  return obj;
}

async function run() {
  // Try login
  let res = await fetch(`${LARAVEL_API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(convertKeysToSnakeCase({ email: 'test@example.com', password: 'password' }))
  });
  let data = await res.json();
  if (!res.ok) {
    // Try register
    res = await fetch(`${LARAVEL_API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(convertKeysToSnakeCase({ name: 'Test', email: 'test@example.com', password: 'password', passwordConfirmation: 'password', role: 1 }))
    });
    data = await res.json();
  }
  
  const token = data.access_token || data.accessToken;
  console.log("Token:", token);

  const formData = new FormData();
  formData.append('name', 'Test Image Upload');
  formData.append('price', '10');
  formData.append('category_id', '1');
  
  // Create a small dummy image
  const blob = new Blob(['dummy image content'], { type: 'image/jpeg' });
  formData.append('image', blob, 'test.jpg');

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
