const LARAVEL_API_BASE = "https://galo.prodental.dev/API/api";
async function run() {
  const res = await fetch(`${LARAVEL_API_BASE}/products`, {
    headers: { 'Accept': 'application/json' }
  });
  const data = await res.json();
  console.log(data.find(p => p.id === 4));
}
run();
