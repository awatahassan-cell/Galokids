fetch('https://galo.prodental.dev/API/api/products', {
  method: 'GET'
}).then(r => r.json()).then(data => {
  const prod = data[1];
  console.log("Prod ID:", prod.id);
  fetch(`https://galo.prodental.dev/API/api/products/${prod.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(prod)
  }).then(r => r.text()).then(t => console.log("PUT Result:", t.substring(0, 1000)));
})
