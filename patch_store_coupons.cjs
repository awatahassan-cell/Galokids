const fs = require('fs');
let content = fs.readFileSync('src/store.tsx', 'utf8');

const targetUseEffect = `  useEffect(() => {
    localStorage.setItem('coupons', JSON.stringify(coupons));
  }, [coupons]);`;
const replacementUseEffect = `  useEffect(() => {
    localStorage.setItem('coupons', JSON.stringify(coupons));
  }, [coupons]);

  const refreshCoupons = () => {
    fetch(\`\${LARAVEL_API_BASE}/coupons\`, { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCoupons(data);
        } else if (data.data && Array.isArray(data.data)) {
          setCoupons(data.data);
        }
      })
      .catch(err => console.error('Failed to fetch coupons:', err));
  };

  useEffect(() => {
    refreshCoupons();
  }, []);`;
content = content.replace(targetUseEffect, replacementUseEffect);

const targetAddCoupon = `  const addCoupon = (coupon: Coupon) => {
    setCoupons(prev => [...prev, coupon]);
  };`;
const replacementAddCoupon = `  const addCoupon = (coupon: Coupon) => {
    fetch(\`\${LARAVEL_API_BASE}/coupons\`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(coupon)
    })
      .then(res => {
        if (res.ok) {
          refreshCoupons();
        } else {
          // Fallback to local
          setCoupons(prev => [...prev, coupon]);
        }
      })
      .catch(() => setCoupons(prev => [...prev, coupon]));
  };`;
content = content.replace(targetAddCoupon, replacementAddCoupon);

const targetUpdateCoupon = `  const updateCoupon = (updatedCoupon: Coupon) => {
    setCoupons(prev => prev.map(c => c.id === updatedCoupon.id ? updatedCoupon : c));
  };`;
const replacementUpdateCoupon = `  const updateCoupon = (updatedCoupon: Coupon) => {
    fetch(\`\${LARAVEL_API_BASE}/coupons/\${updatedCoupon.id}\`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updatedCoupon)
    })
      .then(res => {
        if (res.ok) {
          refreshCoupons();
        } else {
          setCoupons(prev => prev.map(c => c.id === updatedCoupon.id ? updatedCoupon : c));
        }
      })
      .catch(() => setCoupons(prev => prev.map(c => c.id === updatedCoupon.id ? updatedCoupon : c)));
  };`;
content = content.replace(targetUpdateCoupon, replacementUpdateCoupon);

const targetDeleteCoupon = `  const deleteCoupon = (id: string) => {
    setCoupons(prev => prev.filter(c => c.id !== id));
    if (appliedCoupon?.id === id) {
      setAppliedCoupon(null);
    }
  };`;
const replacementDeleteCoupon = `  const deleteCoupon = (id: string) => {
    fetch(\`\${LARAVEL_API_BASE}/coupons/\${id}\`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
      .then(res => {
        if (res.ok) {
          setCoupons(prev => prev.filter(c => c.id !== id));
          if (appliedCoupon?.id === id) {
            setAppliedCoupon(null);
          }
        } else {
          setCoupons(prev => prev.filter(c => c.id !== id));
          if (appliedCoupon?.id === id) {
            setAppliedCoupon(null);
          }
        }
      })
      .catch(() => {
        setCoupons(prev => prev.filter(c => c.id !== id));
        if (appliedCoupon?.id === id) {
          setAppliedCoupon(null);
        }
      });
  };`;
content = content.replace(targetDeleteCoupon, replacementDeleteCoupon);

fs.writeFileSync('src/store.tsx', content);
