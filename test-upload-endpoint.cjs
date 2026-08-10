const LARAVEL_API_BASE = "https://galo.prodental.dev/API/api";

async function run() {
  const formData = new FormData();
  const blob = new Blob(['dummy image content'], { type: 'image/jpeg' });
  formData.append('image', blob, 'test.jpg');

  try {
    const res2 = await fetch(`${LARAVEL_API_BASE}/upload`, {
      method: "POST",
      body: formData,
      headers: {
        'Accept': 'application/json',
      }
    });
    const text2 = await res2.text();
    console.log(res2.status, text2);
  } catch (err) {
    console.error(err);
  }
}
run();
