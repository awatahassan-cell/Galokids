const fs = require('fs');

async function test() {
  const formData = new FormData();
  formData.append('name', 'Test');
  formData.append('price', '10');
  formData.append('category_id', '1');
  
  // Create a small dummy image
  const blob = new Blob(['dummy image content'], { type: 'image/jpeg' });
  formData.append('image', blob, 'test.jpg');

  try {
    const res = await fetch("https://galo.prodental.dev/API/api/products", {
      method: "POST",
      body: formData
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (err) {
    console.error(err);
  }
}
test();
